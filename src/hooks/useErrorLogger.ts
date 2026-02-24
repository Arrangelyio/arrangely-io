
import { useCallback } from 'react';
import { logDatabaseError, logApiError, logValidationError } from '@/utils/centralizedErrorLogger';

export const useErrorLogger = () => {
  const logError = useCallback(async (
    operation: string,
    error: any,
    type: 'database' | 'api' | 'validation' = 'database',
    additionalContext?: any
  ) => {
    try {
      switch (type) {
        case 'database':
          await logDatabaseError(operation, error, additionalContext?.payload, additionalContext);
          break;
        case 'api':
          await logApiError(
            operation, 
            additionalContext?.endpoint || 'Unknown endpoint', 
            error, 
            additionalContext?.payload, 
            additionalContext
          );
          break;
        case 'validation':
          await logValidationError(operation, error, additionalContext?.payload);
          break;
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }, []);

  return { logError };
};
