
import { supabase } from "@/integrations/supabase/client";

interface ErrorLogEntry {
  timestamp: string;
  operation_type: string;
  endpoint_or_function: string;
  request_payload?: any;
  error_message: string;
  stack_trace?: string;
  user_context?: {
    user_id?: string;
    email?: string;
  };
  error_type: 'DATABASE_ERROR' | 'AUTH_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  user_agent?: string;
  additional_context?: any;
}

class CentralizedErrorLogger {
  private static instance: CentralizedErrorLogger;
  private logQueue: ErrorLogEntry[] = [];
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): CentralizedErrorLogger {
    if (!CentralizedErrorLogger.instance) {
      CentralizedErrorLogger.instance = new CentralizedErrorLogger();
    }
    return CentralizedErrorLogger.instance;
  }

  async logError(entry: Omit<ErrorLogEntry, 'timestamp' | 'user_agent'>) {
    const errorEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    };

    // Add to queue for batch processing
    this.logQueue.push(errorEntry);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    if (this.logQueue.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // Get current user context
      const { data: { user } } = await supabase.auth.getUser();
      
      // Process all queued errors
      const entriesToProcess = [...this.logQueue];
      this.logQueue = [];
      
      for (const entry of entriesToProcess) {
        try {
          await supabase.from('error_logs').insert({
            user_id: entry.user_context?.user_id || user?.id || null,
            error_type: entry.error_type,
            error_message: entry.error_message,
            error_details: JSON.stringify({
              operation_type: entry.operation_type,
              endpoint_or_function: entry.endpoint_or_function,
              request_payload: entry.request_payload,
              severity: entry.severity,
              user_context: entry.user_context,
              additional_context: entry.additional_context,
              timestamp: entry.timestamp
            }),
            operation_type: entry.operation_type,
            stack_trace: entry.stack_trace,
            user_agent: entry.user_agent
          });
        } catch (logError) {
          // Fallback to console if database logging fails
          console.error('Failed to log error to database:', logError);
          console.error('Original error entry:', entry);
        }
      }
    } catch (error) {
      console.error('Error processing error log queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Process any new entries that were added while processing
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  // Convenience methods for different error types
  async logDatabaseError(
    operation: string, 
    error: any, 
    payload?: any, 
    additionalContext?: any
  ) {
    await this.logError({
      operation_type: operation,
      endpoint_or_function: 'Database Operation',
      request_payload: payload,
      error_message: error.message || 'Unknown database error',
      stack_trace: error.stack,
      error_type: 'DATABASE_ERROR',
      severity: 'HIGH',
      additional_context: {
        ...additionalContext,
        supabase_error: error
      }
    });
  }

  async logAuthError(
    operation: string, 
    error: any, 
    userEmail?: string, 
    additionalContext?: any
  ) {
    await this.logError({
      operation_type: operation,
      endpoint_or_function: 'Authentication',
      error_message: error.message || 'Unknown authentication error',
      stack_trace: error.stack,
      error_type: 'AUTH_ERROR',
      severity: 'CRITICAL',
      user_context: userEmail ? { email: userEmail } : undefined,
      additional_context: {
        ...additionalContext,
        auth_error_code: error.status,
        auth_error_name: error.name
      }
    });
  }

  async logApiError(
    operation: string, 
    endpoint: string, 
    error: any, 
    payload?: any,
    additionalContext?: any
  ) {
    await this.logError({
      operation_type: operation,
      endpoint_or_function: endpoint,
      request_payload: payload,
      error_message: error.message || 'Unknown API error',
      stack_trace: error.stack,
      error_type: 'API_ERROR',
      severity: 'MEDIUM',
      additional_context: additionalContext
    });
  }

  async logValidationError(
    operation: string, 
    validationErrors: any, 
    payload?: any
  ) {
    await this.logError({
      operation_type: operation,
      endpoint_or_function: 'Validation',
      request_payload: payload,
      error_message: 'Validation failed',
      error_type: 'VALIDATION_ERROR',
      severity: 'LOW',
      additional_context: { validation_errors: validationErrors }
    });
  }
}

// Export singleton instance
export const errorLogger = CentralizedErrorLogger.getInstance();

// Export convenience functions
export const logDatabaseError = (operation: string, error: any, payload?: any, context?: any) => 
  errorLogger.logDatabaseError(operation, error, payload, context);

export const logAuthError = (operation: string, error: any, userEmail?: string, context?: any) => 
  errorLogger.logAuthError(operation, error, userEmail, context);

export const logApiError = (operation: string, endpoint: string, error: any, payload?: any, context?: any) => 
  errorLogger.logApiError(operation, endpoint, error, payload, context);

export const logValidationError = (operation: string, validationErrors: any, payload?: any) => 
  errorLogger.logValidationError(operation, validationErrors, payload);
