import toast from 'react-hot-toast'

/**
 * Hook for displaying transaction-related toast notifications
 */
export const useTransactionToast = () => {
  /**
   * Helper to format message with optional description
   */
  const formatMessage = (message: string, description?: string) => {
    return description ? `${message}\n${description}` : message
  }

  /**
   * Show a loading toast for a pending transaction
   * @returns toastId to update/dismiss later
   */
  const showPending = (message: string = 'Processing transaction...') => {
    return toast.loading(
      formatMessage(message, 'Confirm this action in your wallet'),
      {
        duration: Infinity,
        style: {
          whiteSpace: 'pre-line',
        },
      }
    )
  }

  /**
   * Show a success toast for a completed transaction
   */
  const showSuccess = (
    message: string,
    description?: string,
    toastId?: string | number
  ) => {
    const options = {
      id: toastId as string,
      duration: 5000,
      style: {
        whiteSpace: 'pre-line' as const,
      },
    }

    if (toastId) {
      toast.success(formatMessage(message, description), options)
    } else {
      const { id, ...optionsWithoutId } = options
      toast.success(formatMessage(message, description), optionsWithoutId)
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
      error instanceof Error ? error.message : 'Retry the operation'

    const options = {
      id: toastId as string,
      duration: 7000,
      style: {
        whiteSpace: 'pre-line' as const,
      },
    }

    if (toastId) {
      toast.error(formatMessage(message, description), options)
    } else {
      const { id, ...optionsWithoutId } = options
      toast.error(formatMessage(message, description), optionsWithoutId)
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
    const options = {
      id: toastId as string,
      duration: 4000,
      icon: 'ℹ️',
      style: {
        whiteSpace: 'pre-line' as const,
      },
    }

    if (toastId) {
      toast(formatMessage(message, description), options)
    } else {
      const { id, ...optionsWithoutId } = options
      toast(formatMessage(message, description), optionsWithoutId)
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
      toast.loading(formatMessage(message, description), {
        id: toastId as string,
        style: {
          whiteSpace: 'pre-line',
        },
      })
    }
  }

  /**
   * Show a warning toast
   */
  const showWarning = (message: string, description?: string) => {
    toast(formatMessage(message, description), {
      duration: 5000,
      icon: '⚠️',
      style: {
        whiteSpace: 'pre-line',
      },
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
