import { useState, useCallback } from 'react';

interface ActionHandlerReturn {
  isLoading: boolean;
  snackMessage: string;
  showSnack: boolean;
  dismissSnack: () => void;
  execute: (
    action: () => Promise<any>,
    successMsg: string,
    errorMsg: string,
    onSuccess?: () => void,
  ) => Promise<void>;
}

/**
 * Shared hook to handle async actions with loading + snackbar feedback.
 * Eliminates repetitive try/catch/loading/snack patterns.
 */
export function useActionHandler(): ActionHandlerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const dismissSnack = useCallback(() => setShowSnack(false), []);

  const execute = useCallback(
    async (
      action: () => Promise<any>,
      successMsg: string,
      errorMsg: string,
      onSuccess?: () => void,
    ) => {
      setIsLoading(true);
      try {
        await action();
        setSnackMessage(`✓ ${successMsg}`);
        setShowSnack(true);
        onSuccess?.();
      } catch {
        setSnackMessage(`✗ ${errorMsg}`);
        setShowSnack(true);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, snackMessage, showSnack, dismissSnack, execute };
}
