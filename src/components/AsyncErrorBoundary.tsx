// ABOUTME: Async error boundary component for handling promise rejections
// Provides error recovery for async operations with ADHD-friendly UI

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

import React, { type ReactNode, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { logError } from '../utils/ErrorHandler';
import { theme } from '../styles';

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Async error boundary that handles unhandled promise rejections
 * Provides automatic retry functionality with ADHD-friendly feedback
 */
const AsyncErrorBoundary: React.FC<Props> = ({
  children,
  onError,
  retryDelay = 1000,
  maxRetries = 3,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleUnhandledRejection = (event: any): void => {
      const reason = event?.reason as { message?: string } | string | undefined;

      let errorMessage = 'Unhandled promise rejection';
      if (typeof reason === 'string') {
        errorMessage = reason;
      } else if (reason && typeof reason === 'object' && 'message' in reason) {
        errorMessage = String(reason.message);
      }

      const asyncError = new Error(errorMessage);

      logError('AsyncErrorBoundary', asyncError);
      setError(asyncError);

      if (onError) {
        onError(asyncError);
      }

      // Prevent default error handling

      if (event && typeof event.preventDefault === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.preventDefault();
      }
    };

    // Use global window object for web compatibility

    const globalWindow = (global as any).window ?? ({} as any);

    if (globalWindow.addEventListener) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      globalWindow.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      if (globalWindow.removeEventListener) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        globalWindow.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [onError]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      logError('AsyncErrorBoundary', new Error('Max retries exceeded'));
      return;
    }

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    // Wait before retrying
    await new Promise<void>((resolve) => {
      setTimeout(resolve, retryDelay);
    });

    // Clear error to re-render children
    setError(null);
    setIsRetrying(false);
  }, [retryCount, maxRetries, retryDelay]);

  const handleReset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🔄</Text>
        <Text style={styles.title}>Connection Issue</Text>
        <Text style={styles.message}>
          Having trouble connecting. Let&apos;s give it another shot!
        </Text>

        {isRetrying ? (
          <View style={styles.retryingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.retryingText}>Retrying...</Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            {retryCount < maxRetries && (
              <Button
                title={`Retry (${maxRetries - retryCount} left)`}
                onPress={() => {
                  void handleRetry();
                }}
                color={theme.colors.primary}
              />
            )}
            <Button title="Start Fresh" onPress={handleReset} color={theme.colors.primary} />
          </View>
        )}

        {global.__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Debug: {error.message}</Text>
          </View>
        )}
      </View>
    );
  }

  return children as React.ReactElement;
};

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',

    padding: theme.spacing.xl,

    backgroundColor: theme.colors.background,
  },
  emoji: {
    fontSize: 72,

    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: '700',

    color: theme.colors.text.primary,

    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.bodyMedium.fontSize,

    color: theme.colors.text.secondary,
    textAlign: 'center',

    marginBottom: theme.spacing.xl,
  },
  buttonContainer: {
    marginTop: theme.spacing.lg,

    gap: theme.spacing.md,
  },
  retryingContainer: {
    alignItems: 'center',

    marginTop: theme.spacing.lg,
  },
  retryingText: {
    marginTop: theme.spacing.md,

    fontSize: theme.typography.bodyMedium.fontSize,

    color: theme.colors.text.secondary,
  },
  debugContainer: {
    marginTop: theme.spacing.xl,

    padding: theme.spacing.sm,

    backgroundColor: theme.colors.surface,

    borderRadius: theme.borderRadius.sm,
  },
  debugText: {
    fontSize: theme.typography.caption.fontSize,

    color: theme.colors.semantic.error,
    fontFamily: 'monospace',
  },
});

export default AsyncErrorBoundary;

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
