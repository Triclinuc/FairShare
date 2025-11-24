import { EventPoller, type Provider } from '@massalabs/massa-web3'
import type { SCOutputEvent } from '@massalabs/massa-web3/dist/esm/generated/client-types'

interface IEventPollerResult {
  isError: boolean
  events: SCOutputEvent[]
}

const MASSA_EXEC_ERROR = 'massa_execution_error'

/**
 * Poll for smart contract events from a transaction
 * @param client - Massa provider (account)
 * @param txId - Operation/transaction ID
 * @param noEventTx - If true, skip polling (for transactions that don't emit events)
 * @param timeoutMs - Maximum time to wait for events in milliseconds (default: 30 seconds)
 * @returns Promise resolving to event polling result with error status and events
 */
export const pollAsyncEvents = async (
  client: Provider,
  txId: string,
  noEventTx = false,
  timeoutMs = 30000
): Promise<IEventPollerResult> => {
  if (noEventTx) return { isError: false, events: [] }

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const { stopPolling } = EventPoller.start(
      client,
      { operationId: txId },
      (events) => {
        // Check for contract execution errors
        const errorEvents = events.filter((e) => e.data.includes(MASSA_EXEC_ERROR))
        if (errorEvents.length > 0) {
          if (timeoutId) clearTimeout(timeoutId);
          stopPolling()
          return resolve({ isError: true, events })
        }

        // If events received, transaction succeeded
        if (events.length > 0) {
          if (timeoutId) clearTimeout(timeoutId);
          stopPolling()
          return resolve({ isError: false, events })
        }

        // No events yet, keep polling
        console.log('No events have been emitted yet, continuing to poll...')
      },
      (error) => {
        // Polling error
        if (timeoutId) clearTimeout(timeoutId);
        stopPolling()
        reject(error)
      },
      2000 // Poll every 2 seconds
    )

    // Set timeout to prevent indefinite polling
    timeoutId = setTimeout(() => {
      stopPolling();
      reject(new Error(`Event polling timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  })
}

/**
 * Extract error message from contract events
 */
export const extractErrorMessage = (events: SCOutputEvent[]): string | null => {
  const errorEvent = events.find((e) => e.data.includes(MASSA_EXEC_ERROR))
  if (!errorEvent) return null

  // Try to extract readable error message
  try {
    const errorData = errorEvent.data
    // Remove the massa_execution_error prefix and parse
    const message = errorData.replace(MASSA_EXEC_ERROR, '').trim()
    return message || 'Contract execution failed'
  } catch {
    return 'Contract execution failed'
  }
}
