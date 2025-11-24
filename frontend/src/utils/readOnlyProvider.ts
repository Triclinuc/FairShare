import { Account, Web3Provider } from "@massalabs/massa-web3";
import { CURRENT_NETWORK } from "../config/contract";

/**
 * Read-only provider singleton for public smart contract reads
 * This allows querying the blockchain without requiring wallet connection
 */
let readOnlyProviderInstance: Web3Provider | null = null;

/**
 * Get or create a read-only provider instance
 * Uses a temporary generated account for read-only operations
 * @returns Promise<Web3Provider> A read-only Web3 provider instance
 */
export async function getReadOnlyProvider(): Promise<Web3Provider> {
  if (!readOnlyProviderInstance) {
    try {
      // Generate a temporary account for read-only operations
      // This account is only used to initialize the provider, no private key is exposed
      const tempAccount = await Account.generate();

      // Initialize provider from RPC URL with the temporary account
      readOnlyProviderInstance = Web3Provider.fromRPCUrl(
        CURRENT_NETWORK.rpcUrl,
        tempAccount
      );
    } catch (error) {
      throw new Error("Failed to initialize read-only provider for blockchain queries");
    }
  }

  return readOnlyProviderInstance;
}

/**
 * Reset the read-only provider (useful for testing or network changes)
 */
export function resetReadOnlyProvider(): void {
  readOnlyProviderInstance = null;
}
