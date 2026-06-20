import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorText}>{this.state.error?.message}</Text>
            <Text style={styles.errorStack}>{this.state.error?.stack}</Text>
          </ScrollView>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.error,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  errorStack: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
})
