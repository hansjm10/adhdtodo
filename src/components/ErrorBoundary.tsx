// ABOUTME: React error boundary component for catching and displaying runtime errors
// Provides ADHD-friendly error messages and recovery options

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { logError } from '../utils/ErrorHandler';
import { theme } from '../styles';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component that catches JavaScript errors anywhere in the child component tree
 * Logs those errors and displays a fallback UI instead of the component tree that crashed
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error reporting service
    logError('ErrorBoundary', error);

    // Store error info in state for potential display
    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>Don&apos;t worry, it happens! Let&apos;s try again.</Text>

          <View style={styles.buttonContainer}>
            <Button title="Try Again" onPress={this.handleReset} color={theme.colors.primary} />
          </View>

          {this.props.showDetails && global.__DEV__ && this.state.error && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Error Details:</Text>
              <Text style={styles.detailsText}>{this.state.error.toString()}</Text>
              {this.state.errorInfo && (
                <Text style={styles.detailsText}>{this.state.errorInfo.componentStack}</Text>
              )}
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',

    padding: theme.spacing.xl,

    backgroundColor: theme.colors.background,
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
  },
  detailsContainer: {
    marginTop: theme.spacing.xl,

    padding: theme.spacing.md,

    backgroundColor: theme.colors.surface,

    borderRadius: theme.borderRadius.md,
    maxWidth: '100%',
  },
  detailsTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',

    color: theme.colors.text.primary,

    marginBottom: theme.spacing.sm,
  },
  detailsText: {
    fontSize: theme.typography.caption.fontSize,

    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
