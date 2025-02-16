import { BigNumber } from "ethers";
import { keccak256 } from "ethers/lib/utils";

import { EthereumL2Messenger__factory, Resolver__factory } from "../../types-gen/contracts";
import { parseFillInvalidatedEvent } from "../common/events/FillInvalidated";
import { parseRequestFilledEvent } from "../common/events/RequestFilled";
import type { TransactionHash } from "./types";
import { BaseRelayerService } from "./types";

type RelayCallParams = {
  requestId: string;
  fillId: string;
  sourceChainId: BigNumber;
  filler: string;
};

const L1_CONTRACTS: Record<number, { ETHEREUM_L2_MESSENGER: string }> = {
  1: {
    ETHEREUM_L2_MESSENGER: "0x3222C9a1e5d7856FCBc551A30a63634e7Fd634Da",
  },
  5: {
    ETHEREUM_L2_MESSENGER: "0x656b26DCF80ea2c25772143636D5B024F7f5183b",
  },
  1337: {
    ETHEREUM_L2_MESSENGER: process.env.ETHEREUM_L2_MESSENGER || "",
  },
};

const FILTER_BLOCKS_PER_ITERATION = 5000;
// TODO: import from `deployments` npm package once ready
const RESOLVER_DEPLOY_BLOCK_NUMBER = 16946576;

export class EthereumRelayerService extends BaseRelayerService {
  async parseEventDataFromTxHash(
    l1TransactionHash: TransactionHash,
  ): Promise<RelayCallParams | null> {
    const receipt = await this.l2RpcProvider.getTransactionReceipt(l1TransactionHash);

    if (!receipt) {
      throw new Error(`Transaction "${l1TransactionHash}" cannot be found on Ethereum...`);
    }

    const requestFilledEvent = parseRequestFilledEvent(receipt.logs);

    if (requestFilledEvent) {
      return {
        requestId: requestFilledEvent.requestId,
        fillId: requestFilledEvent.fillId,
        sourceChainId: requestFilledEvent.sourceChainId,
        filler: requestFilledEvent.filler,
      };
    }

    const fillInvalidatedEvent = parseFillInvalidatedEvent(receipt.logs);

    if (fillInvalidatedEvent) {
      return {
        ...fillInvalidatedEvent,
        sourceChainId: BigNumber.from(this.toL2ChainId),
        filler: "0x0000000000000000000000000000000000000000",
      };
    }

    return null;
  }

  private async findTransactionHashForMessage(
    requestId: string,
    fillId: string,
    sourceChainId: BigNumber,
    filler: string,
    fillChainId: BigNumber,
    resolverAddress: string,
  ): Promise<string | null> {
    const resolver = Resolver__factory.connect(resolverAddress, this.l1Wallet);
    const currentBlock = await this.l1Wallet.provider.getBlock("latest");
    let currentBlockNumber = currentBlock.number;

    while (currentBlockNumber > RESOLVER_DEPLOY_BLOCK_NUMBER) {
      const events = await resolver.queryFilter(
        "Resolution" as unknown,
        currentBlockNumber - FILTER_BLOCKS_PER_ITERATION,
        currentBlockNumber,
      );

      for (const event of events) {
        if (event.event === "Resolution") {
          const args = event.args;

          if (
            sourceChainId.eq(args.sourceChainId) &&
            fillChainId.eq(args.fillChainId) &&
            args.requestId === requestId &&
            args.filler === filler &&
            args.fillId === fillId
          ) {
            return event.transactionHash;
          }
        }
      }
      currentBlockNumber -= FILTER_BLOCKS_PER_ITERATION;
    }

    return null;
  }

  private createMessageHash(
    requestId: string,
    fillId: string,
    sourceChainId: BigNumber,
    filler: string,
    fillChainId: BigNumber,
  ): string {
    const contractInterface = Resolver__factory.createInterface();
    const encodedCall = contractInterface.encodeFunctionData("resolve", [
      requestId,
      fillId,
      fillChainId,
      sourceChainId,
      filler,
    ]);

    return keccak256(encodedCall);
  }

  async prepare(): Promise<boolean> {
    return true;
  }

  async relayTxToL1(l1TransactionHash: TransactionHash): Promise<string | undefined> {
    console.log("Ethereum execution");

    const callParameters = await this.parseEventDataFromTxHash(l1TransactionHash);

    if (!callParameters) {
      throw new Error("Couldn't find a matching event in transaction logs.");
    }

    // Execute EthereumL2Messenger.relayMessage
    const l2ChainId = await this.getL2ChainId();
    const ethereumMessengerAddress = L1_CONTRACTS[l2ChainId].ETHEREUM_L2_MESSENGER;
    const ethereumMessenger = EthereumL2Messenger__factory.connect(
      ethereumMessengerAddress,
      this.l2Wallet,
    );

    const parameters = [
      callParameters.requestId,
      callParameters.fillId,
      callParameters.sourceChainId,
      callParameters.filler,
    ] as const;

    const messageHash = this.createMessageHash(...parameters, BigNumber.from(l2ChainId));
    const storedMessageHashStatus = await ethereumMessenger.messageHashes(messageHash);
    const isMessageRelayed = storedMessageHashStatus == 2;

    if (isMessageRelayed) {
      console.log("Message has already been relayed..");

      const resolverAddress = await ethereumMessenger.resolver();
      return await this.findTransactionHashForMessage(
        ...parameters,
        BigNumber.from(l2ChainId),
        resolverAddress,
      );
    }

    const estimatedGasLimit = await ethereumMessenger.estimateGas.relayMessage(...parameters);

    const transaction = await ethereumMessenger.relayMessage(...parameters, {
      gasLimit: estimatedGasLimit,
    });
    const transactionReceipt = await transaction.wait();

    return transactionReceipt.transactionHash;
  }

  async finalize(): Promise<void> {
    return;
  }
}
