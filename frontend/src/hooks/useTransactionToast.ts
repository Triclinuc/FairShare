import { toast } from 'sonner'

/**
 * Hook for displaying transaction-related toast notifications
 */
export const useTransactionToast = () => {
  /**
   * Show a loading toast for a pending transaction
   * @returns toastId to update/dismiss later
   */
  const showPending = (message: string = 'Transaction pending...') => {
    return toast.loading(message, {
      description: 'Please confirm in your wallet',
    })
  }

  /**
   * Show a success toast for a completed transaction
   */
  const showSuccess = (
    message: string,
    description?: string,
    toastId?: string | number
  ) => {
    if (toastId) {
      toast.success(message, {
        id: toastId,
        description,
        duration: 5000,
      })
    } else {
      toast.success(message, {
        description,
        duration: 5000,
      })
    }
  }

  /**
   * Show an error toast for a failed transaction
   */
  const showError = (
    message: string,
    error?: Error | unknown,
    toastId?: string | number
  ) => {
    const description =
      error instanceof Error ? error.message : 'Please try again'

    if (toastId) {
      toast.error(message, {
        id: toastId,
        description,
        duration: 7000,
      })
    } else {
      toast.error(message, {
        description,
        duration: 7000,
      })
    }
  }

  /**
   * Show an info toast
   */
  const showInfo = (
    message: string,
    description?: string,
    toastId?: string | number
  ) => {
    if (toastId) {
      toast.info(message, {
        id: toastId,
        description,
        duration: 4000,
      })
    } else {
      toast.info(message, {
        description,
        duration: 4000,
      })
    }
  }

  /**
   * Update a loading toast with new message (keeps it in loading state)
   */
  const updatePending = (
    message: string,
    description?: string,
    toastId?: string | number
  ) => {
    if (toastId) {
      toast.loading(message, {
        id: toastId,
        description,
      })
    }
  }

  /**
   * Show a warning toast
   */
  const showWarning = (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    })
  }

  /**
   * Helper to handle a transaction promise with automatic toast updates
   */
  const handleTransaction = async <T,>(
    promise: Promise<T>,
    messages: {
      pending: string
      success: string
      error: string
    }
  ): Promise<T> => {
    const toastId = showPending(messages.pending)

    try {
      const result = await promise
      showSuccess(messages.success, undefined, toastId)
      return result
    } catch (error) {
      showError(messages.error, error, toastId)
      throw error
    }
  }

  return {
    showPending,
    updatePending,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    handleTransaction,
  }
}
