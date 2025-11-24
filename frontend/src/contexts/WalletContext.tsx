import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { getWallets } from "@massalabs/wallet-provider";
import type { Wallet } from "@massalabs/wallet-provider";
import type { Provider } from "@massalabs/massa-web3";
import { walletSupportsFeature } from "../config/wallets";
import { CURRENT_NETWORK } from "../config/contract";

interface WalletContextType {
  availableWallets: Wallet[];
  isDetecting: boolean;
  selectedWallet: Wallet | null;
  availableAccounts: Provider[] | null;
  selectedAccountIndex: number | null;
  account: Provider | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  networkError: string | null;
  selectWallet: (wallet: Wallet) => Promise<Provider[]>;
  selectAccount: (index: number) => Promise<void>;
  disconnect: () => void;
  error: string | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "fairshare_selected_wallet";
const ACCOUNT_STORAGE_KEY = "fairshare_selected_account";

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [availableWallets, setAvailableWallets] = useState<Wallet[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Provider[] | null>(null);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number | null>(null);
  const [account, setAccount] = useState<Provider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [hasAttemptedReconnect, setHasAttemptedReconnect] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const selectWalletRef = useRef<((wallet: Wallet) => Promise<Provider[]>) | null>(null);
  const selectAccountRef = useRef<((index: number) => Promise<void>) | null>(null);

  const validateNetwork = useCallback(async (provider: Provider) => {
    try {
      if ("chainId" in provider && provider.chainId !== undefined) {
        const providerChainId = BigInt(provider.chainId as string | number | bigint);
        const expectedChainId = CURRENT_NETWORK.chainId;

        if (providerChainId !== expectedChainId) {
          setIsCorrectNetwork(false);
          setNetworkError(
            `Wrong network! Please switch to ${CURRENT_NETWORK.name} (chainId: ${expectedChainId})`
          );
          return false;
        }
      }
      setIsCorrectNetwork(true);
      setNetworkError(null);
      return true;
    } catch (err) {
      console.warn("Could not validate network:", err);
      setIsCorrectNetwork(true);
      setNetworkError(null);
      return true;
    }
  }, []);

  const selectWallet = useCallback(
    async (wallet: Wallet): Promise<Provider[]> => {
      try {
        setIsConnecting(true);
        setError(null);

        if (walletSupportsFeature(wallet.name(), "connect")) {
          const connected = await wallet.connect();
          if (!connected) {
            throw new Error("Connection rejected by user");
          }
        }

        const accounts = await wallet.accounts();
        if (accounts.length === 0) {
          throw new Error("No accounts found in wallet");
        }

        setSelectedWallet(wallet);
        setAvailableAccounts(accounts);
        localStorage.setItem(WALLET_STORAGE_KEY, wallet.name());

        return accounts;
      } catch (err) {
        console.error("Failed to select wallet:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
        setError(errorMessage);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const selectAccount = useCallback(
    async (index: number) => {
      if (!availableAccounts || index < 0 || index >= availableAccounts.length) {
        return;
      }

      const selectedAccount = availableAccounts[index];
      const accountAddress = selectedAccount.address;

      setSelectedAccountIndex(index);
      setAccount(selectedAccount);
      setAddress(accountAddress);

      await validateNetwork(selectedAccount);

      const accountData = { accountIndex: index, address: accountAddress };
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accountData));
    },
    [availableAccounts, validateNetwork]
  );

  useEffect(() => {
    selectWalletRef.current = selectWallet;
    selectAccountRef.current = selectAccount;
  });

  // Detect wallets
  useEffect(() => {
    let isMounted = true;

    const detectWallets = async () => {
      try {
        const wallets = await getWallets();
        if (isMounted) {
          setAvailableWallets(wallets);
          setIsDetecting(false);
        }
      } catch (err) {
        console.error("Failed to detect wallets:", err);
        if (isMounted) {
          setIsDetecting(false);
          setError("Failed to detect wallets");
        }
      }
    };

    detectWallets();
    return () => { isMounted = false; };
  }, []);

  // Auto-reconnect
  useEffect(() => {
    if (hasAttemptedReconnect || isDetecting || selectedWallet || availableWallets.length === 0) {
      return;
    }

    const attemptReconnect = async () => {
      const savedWalletName = localStorage.getItem(WALLET_STORAGE_KEY);
      const savedAccountData = localStorage.getItem(ACCOUNT_STORAGE_KEY);

      if (!savedWalletName) {
        setHasAttemptedReconnect(true);
        return;
      }

      const lastWallet = availableWallets.find(
        (w) => w.name().toUpperCase() === savedWalletName.toUpperCase()
      );

      if (!lastWallet) {
        setHasAttemptedReconnect(true);
        return;
      }

      try {
        setIsReconnecting(true);
        const accounts = await selectWalletRef.current?.(lastWallet);

        if (accounts && savedAccountData && selectAccountRef.current) {
          const { accountIndex, address: savedAddress } = JSON.parse(savedAccountData);
          if (accountIndex >= 0 && accountIndex < accounts.length && accounts[accountIndex].address === savedAddress) {
            await selectAccountRef.current(accountIndex);
          } else if (accounts.length === 1) {
            await selectAccountRef.current(0);
          }
        } else if (accounts?.length === 1 && selectAccountRef.current) {
          await selectAccountRef.current(0);
        }
      } catch (err) {
        console.error("Failed to reconnect:", err);
        localStorage.removeItem(WALLET_STORAGE_KEY);
        localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      } finally {
        setHasAttemptedReconnect(true);
        setIsReconnecting(false);
      }
    };

    attemptReconnect();
  }, [availableWallets, isDetecting, selectedWallet, hasAttemptedReconnect]);

  const disconnect = useCallback(() => {
    if (selectedWallet && walletSupportsFeature(selectedWallet.name(), "disconnect")) {
      try {
        selectedWallet.disconnect?.();
      } catch (err) {
        console.warn("Failed to disconnect:", err);
      }
    }

    setSelectedWallet(null);
    setAvailableAccounts(null);
    setSelectedAccountIndex(null);
    setAccount(null);
    setAddress(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  }, [selectedWallet]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: WalletContextType = {
    availableWallets,
    isDetecting,
    selectedWallet,
    availableAccounts,
    selectedAccountIndex,
    account,
    address,
    isConnected: (!!selectedWallet && !!account) || isReconnecting,
    isConnecting,
    isCorrectNetwork,
    networkError,
    selectWallet,
    selectAccount,
    disconnect,
    error,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};
