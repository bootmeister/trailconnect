import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { signUp, signInWithGoogle } from '@/services/auth'
import { signupSchema } from '@/utils/validation'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSignup() {
    setError('')
    const validation = signupSchema.safeParse({ email, password, confirmPassword })
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      return
    }

    setLoading(true)
    try {
      const user = await signUp(email, password)
      router.replace({ pathname: '/(auth)/onboarding', params: { userId: user.uid } })
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      router.replace('/(tabs)')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>⛰️</Text>
          <Text style={styles.title}>Join TrailConnect</Text>
          <Text style={styles.subtitle}>Start your hiking journey</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="hiker@trailconnect.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title="Create Account" onPress={handleSignup} loading={loading} style={styles.button} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button title="Continue with Google" onPress={handleGoogleSignIn} variant="outline" style={styles.button} />

          <View style={styles.login}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.loginLink}>
              Sign In
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: SPACING.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginHorizontal: SPACING.md,
  },
  login: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  loginLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
})
