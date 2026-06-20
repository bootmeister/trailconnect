import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { signIn, signInWithGoogle } from '@/services/auth'
import { loginSchema } from '@/utils/validation'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Toggle from '@/components/Toggle'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { useOfflineStore } from '@/store/offlineStore'

const REMEMBER_KEY = 'remember_credentials'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isOnline = useOfflineStore(s => s.isOnline)
  const router = useRouter()

  useEffect(() => {
    loadSavedCredentials()
  }, [])

  async function loadSavedCredentials() {
    try {
      const saved = await AsyncStorage.getItem(REMEMBER_KEY)
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved)
        setEmail(savedEmail)
        setPassword(savedPassword)
        setRememberMe(true)
      }
    } catch (err) {
      console.error('Error loading saved credentials:', err)
    }
  }

  async function handleLogin() {
    setError('')
    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      return
    }

    setLoading(true)
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }))
      } else {
        await AsyncStorage.removeItem(REMEMBER_KEY)
      }
      await signIn(email, password)
      router.replace('/(tabs)')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
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
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="white" />
            <Text style={styles.offlineBannerText}>No internet — sign-in requires a connection</Text>
          </View>
        )}
        <View style={styles.header}>
          <Text style={styles.logo}>⛰️</Text>
          <Text style={styles.title}>TrailConnect</Text>
          <Text style={styles.subtitle}>Connect with fellow hikers</Text>
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
            placeholder="Enter your password"
            secureTextEntry
          />

          <View style={styles.rememberRow}>
            <Toggle value={rememberMe} onValueChange={setRememberMe} />
            <Text style={styles.rememberText}>Remember me</Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title="Sign In" onPress={handleLogin} loading={loading} disabled={!isOnline} style={styles.button} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button title="Continue with Google" onPress={handleGoogleSignIn} variant="outline" disabled={!isOnline} style={styles.button} />

          <View style={styles.signup}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" style={styles.signupLink}>
              Sign Up
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.warning,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  offlineBannerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  rememberText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
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
  signup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  signupText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  signupLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
})