import type { EthereumAddress, TransactionHash } from '@/types/data';
import type { Encodable } from '@/types/encoding';

export class RequestInformation implements Encodable<RequestInformationData> {
  readonly transactionHash: TransactionHash;
  readonly requestAccount: EthereumAddress;
  readonly blockNumberOnTargetChain: number;
  private _identifier?: string;

  constructor(data: RequestInformationData) {
    this.transactionHash = data.transactionHash;
    this.requestAccount = data.requestAccount;
    this.blockNumberOnTargetChain = data.blockNumberOnTargetChain ?? 0;
    this._identifier = data.identifier ?? undefined;
  }

  get identifier(): string | undefined {
    return this._identifier;
  }

  public setIdentifier(value: string): void {
    if (this._identifier === undefined) {
      this._identifier = value;
    } else {
      throw new Error('Attempt to overwrite already existing identifier of a request!');
    }
  }

  public encode(): RequestInformationData {
    return {
      transactionHash: this.transactionHash,
      requestAccount: this.requestAccount,
      blockNumberOnTargetChain: this.blockNumberOnTargetChain,
      identifier: this.identifier,
    };
  }
}

export type RequestInformationData = {
  transactionHash: TransactionHash;
  requestAccount: EthereumAddress;
  blockNumberOnTargetChain?: number;
  identifier?: string;
};
