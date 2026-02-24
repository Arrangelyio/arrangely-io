
import { supabase } from "@/integrations/supabase/client";

interface ErrorLogData {
  errorType: string;
  errorMessage: string;
  errorDetails?: any;
  operationType: string;
  tableName?: string;
  stackTrace?: string;
}

export const logError = async (errorData: ErrorLogData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const logEntry = {
      user_id: user?.id || null,
      error_type: errorData.errorType,
      error_message: errorData.errorMessage,
      error_details: errorData.errorDetails ? JSON.stringify(errorData.errorDetails) : null,
      operation_type: errorData.operationType,
      table_name: errorData.tableName || null,
      stack_trace: errorData.stackTrace || null,
      user_agent: navigator.userAgent,
      // Note: ip_address will be null from client-side, could be added via edge function if needed
    };

    

    const { error } = await supabase
      .from('error_logs')
      .insert(logEntry);

    if (error) {
      console.error('Failed to log error to database:', error);
    } else {
      
    }
  } catch (loggingError) {
    // Don't let logging errors break the application
    console.error('Error in error logging system:', loggingError);
  }
};

// Utility function for database operation errors
export const logDatabaseError = async (
  error: any,
  operation: string,
  tableName?: string,
  additionalDetails?: any
) => {
  await logError({
    errorType: 'DATABASE_ERROR',
    errorMessage: error.message || 'Unknown database error',
    errorDetails: {
      originalError: error,
      ...additionalDetails
    },
    operationType: operation,
    tableName,
    stackTrace: error.stack
  });
};

// Utility function for authentication errors
export const logAuthError = async (
  error: any,
  operation: string,
  additionalDetails?: any
) => {
  await logError({
    errorType: 'AUTH_ERROR',
    errorMessage: error.message || 'Unknown authentication error',
    errorDetails: {
      originalError: error,
      ...additionalDetails
    },
    operationType: operation,
    stackTrace: error.stack
  });
};

// Utility function for API errors
export const logApiError = async (
  error: any,
  operation: string,
  endpoint?: string,
  additionalDetails?: any
) => {
  await logError({
    errorType: 'API_ERROR',
    errorMessage: error.message || 'Unknown API error',
    errorDetails: {
      originalError: error,
      endpoint,
      ...additionalDetails
    },
    operationType: operation,
    stackTrace: error.stack
  });
};
