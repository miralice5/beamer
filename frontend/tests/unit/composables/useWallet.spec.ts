import { ref, shallowRef } from 'vue';

import { useWallet } from '@/composables/useWallet';
import * as web3ProviderService from '@/services/web3-provider';
import { WalletType } from '@/types/settings';
import {
  MockedCoinbaseProvider,
  MockedInjectedProvider,
  MockedMetaMaskProvider,
  MockedWalletConnectProvider,
} from '~/utils/mocks/ethereum-provider';

vi.mock('@/services/web3-provider');

describe('useWallets', () => {
  beforeEach(() => {
    Object.defineProperties(web3ProviderService, {
      createMetaMaskProvider: {
        value: vi.fn().mockResolvedValue(new MockedMetaMaskProvider()),
      },
      createWalletConnectProvider: {
        value: vi.fn().mockResolvedValue(new MockedWalletConnectProvider()),
      },
      createCoinbaseProvider: {
        value: vi.fn().mockResolvedValue(new MockedCoinbaseProvider()),
      },
      createInjectedProvider: {
        value: vi.fn().mockResolvedValue(new MockedInjectedProvider()),
      },
    });
  });

  describe('connectMetaMask()', () => {
    it('creates a MetaMask provider instance', async () => {
      const wallet = new MockedMetaMaskProvider();
      Object.defineProperty(web3ProviderService, 'createMetaMaskProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });
      const provider = shallowRef(undefined);
      const { connectMetaMask } = useWallet(provider, ref(undefined), ref({}));

      await connectMetaMask();

      expect(web3ProviderService.createMetaMaskProvider).toHaveBeenCalledOnce();
      expect(provider.value).toBe(wallet);
    });

    it('requests the signer from the provider', async () => {
      const wallet = new MockedMetaMaskProvider();
      Object.defineProperty(web3ProviderService, 'createMetaMaskProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });
      const { connectMetaMask } = useWallet(ref(undefined), ref(undefined), ref({}));

      await connectMetaMask();

      expect(wallet.requestSigner).toHaveBeenCalledOnce();
    });

    it('sets the connected wallet type', async () => {
      const connectedWallet = ref(undefined);
      const { connectMetaMask } = useWallet(ref(undefined), connectedWallet, ref({}));

      await connectMetaMask();

      expect(connectedWallet.value).toBe('metamask');
    });

    it('listens on wallet provider disconnect events', async () => {
      const wallet = new MockedMetaMaskProvider();
      Object.defineProperty(web3ProviderService, 'createMetaMaskProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });
      const { connectMetaMask, disconnectWallet } = useWallet(
        ref(undefined),
        ref(undefined),
        ref({}),
      );

      await connectMetaMask();

      expect(wallet.on).toHaveBeenCalledWith('disconnect', disconnectWallet);
    });

    describe('when onboarding is enabled', () => {
      it('starts onboarding process when metamask instance is not found', async () => {
        Object.defineProperty(web3ProviderService, 'createMetaMaskProvider', {
          value: vi.fn().mockResolvedValue(undefined),
        });

        const { connectMetaMask } = useWallet(ref(undefined), ref(undefined), ref({}));
        await connectMetaMask(true);
        expect(web3ProviderService.onboardMetaMask).toHaveBeenCalledOnce();
      });
    });
  });

  describe('connectWalletConnect()', () => {
    it('creates WalletConnect provider instance', async () => {
      const wallet = new MockedWalletConnectProvider();
      Object.defineProperty(web3ProviderService, 'createWalletConnectProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });

      const provider = shallowRef(undefined);
      const rpcUrls = ref({ 5: 'fakeRpc.url' });
      const { connectWalletConnect } = useWallet(provider, ref(undefined), rpcUrls);

      await connectWalletConnect();

      expect(web3ProviderService.createWalletConnectProvider).toHaveBeenNthCalledWith(
        1,
        rpcUrls.value,
      );
      expect(provider.value).toBe(wallet);
    });

    it('sets the connected wallet type', async () => {
      const connectedWallet = ref(undefined);
      const { connectWalletConnect } = useWallet(ref(undefined), connectedWallet, ref({}));

      await connectWalletConnect();

      expect(connectedWallet.value).toBe('wallet_connect');
    });
  });

  describe('connectCoinbase()', () => {
    it('creates Coinbase provider instance', async () => {
      const wallet = new MockedCoinbaseProvider();
      Object.defineProperty(web3ProviderService, 'createCoinbaseProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });

      const provider = shallowRef(undefined);
      const rpcUrls = ref({ 5: 'fakeRpc.url' });
      const { connectCoinbase } = useWallet(provider, ref(undefined), rpcUrls);

      await connectCoinbase();

      expect(web3ProviderService.createCoinbaseProvider).toHaveBeenNthCalledWith(1, rpcUrls.value);
      expect(provider.value).toBe(wallet);
    });

    it('sets the connected wallet type', async () => {
      const connectedWallet = ref(undefined);
      const { connectCoinbase } = useWallet(ref(undefined), connectedWallet, ref({}));

      await connectCoinbase();

      expect(connectedWallet.value).toBe('coinbase');
    });
  });

  describe('connectInjected()', () => {
    it('creates an injected provider instance', async () => {
      const wallet = new MockedInjectedProvider();
      Object.defineProperty(web3ProviderService, 'createInjectedProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });
      const provider = shallowRef(undefined);

      const { connectInjected } = useWallet(provider, ref(undefined), ref({}));

      await connectInjected();

      expect(web3ProviderService.createInjectedProvider).toHaveBeenCalledOnce();
      expect(provider.value).toBe(wallet);
    });

    it('requests the signer from the provider', async () => {
      const wallet = new MockedInjectedProvider();
      Object.defineProperty(web3ProviderService, 'createInjectedProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });
      const { connectInjected } = useWallet(ref(undefined), ref(undefined), ref({}));

      await connectInjected();

      expect(wallet.requestSigner).toHaveBeenCalledOnce();
    });

    it('sets the connected wallet type', async () => {
      const connectedWallet = ref(undefined);
      const { connectInjected } = useWallet(ref(undefined), connectedWallet, ref({}));

      await connectInjected();

      expect(connectedWallet.value).toBe('injected');
    });
    it('listens on wallet provider disconnect events', async () => {
      const wallet = new MockedInjectedProvider();
      Object.defineProperty(web3ProviderService, 'createInjectedProvider', {
        value: vi.fn().mockResolvedValue(wallet),
      });
      const { connectInjected, disconnectWallet } = useWallet(
        ref(undefined),
        ref(undefined),
        ref({}),
      );

      await connectInjected();

      expect(wallet.on).toHaveBeenCalledWith('disconnect', disconnectWallet);
    });
  });

  describe('reconnectToWallet()', () => {
    it('can reconnect to MetaMask', async () => {
      const provider = ref(undefined);
      const { reconnectToWallet } = useWallet(provider, ref(WalletType.MetaMask), ref({}));

      await reconnectToWallet();

      expect(provider.value).toBeInstanceOf(MockedMetaMaskProvider);
    });

    it('can reconnect to WalletConnect', async () => {
      const provider = ref(undefined);
      const { reconnectToWallet } = useWallet(provider, ref(WalletType.WalletConnect), ref({}));

      await reconnectToWallet();

      expect(provider.value).toBeInstanceOf(MockedWalletConnectProvider);
    });

    it('can reconnect to Coinbase', async () => {
      const provider = ref(undefined);
      const { reconnectToWallet } = useWallet(provider, ref(WalletType.Coinbase), ref({}));

      await reconnectToWallet();

      expect(provider.value).toBeInstanceOf(MockedCoinbaseProvider);
    });

    it('can reconnect to an injected provider', async () => {
      const provider = ref(undefined);
      const { reconnectToWallet } = useWallet(provider, ref(WalletType.Injected), ref({}));

      await reconnectToWallet();

      expect(provider.value).toBeInstanceOf(MockedInjectedProvider);
    });
  });

  describe('disconnectWallet()', () => {
    it('disconnects from the currently connected wallet', async () => {
      const provider = ref(undefined);
      const connectedWallet = ref(undefined);
      const { connectMetaMask, disconnectWallet } = useWallet(provider, connectedWallet, ref({}));

      await connectMetaMask();

      expect(provider.value).toBeInstanceOf(MockedMetaMaskProvider);
      expect(connectedWallet.value).toBe('metamask');

      disconnectWallet();
      expect(provider.value).toBeUndefined();
      expect(connectedWallet.value).toBeUndefined();
    });
  });
});
