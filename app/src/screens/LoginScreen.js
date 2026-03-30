import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBiometric } from '../hooks/useBiometric';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { signIn, requestPasswordReset } = useAuth();
  const { authenticate, isAvailable } = useBiometric();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const loadRemembered = async () => {
      const shouldRemember = await AsyncStorage.getItem('rememberMe');
      const rememberedEmail = await AsyncStorage.getItem('rememberedEmail');

      if (shouldRemember === 'true' && rememberedEmail) {
        setRememberMe(true);
        setEmail(rememberedEmail);
      }
    };

    loadRemembered();
  }, []);

  const syncRememberedEmail = async (safeEmail) => {
    if (rememberMe) {
      await AsyncStorage.setItem('rememberMe', 'true');
      await AsyncStorage.setItem('rememberedEmail', safeEmail);
      return;
    }

    await AsyncStorage.removeItem('rememberMe');
    await AsyncStorage.removeItem('rememberedEmail');
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await signIn(trimmedEmail, trimmedPassword);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
      return;
    }

    await syncRememberedEmail(trimmedEmail);
  };

  const handleForgotPassword = async () => {
    const safeEmail = email.trim();

    if (!safeEmail) {
      Alert.alert('Email Required', 'Enter your email address to reset password.');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(safeEmail);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Reset Email Sent',
        'Please check your inbox for password reset instructions.'
      );
      return;
    }

    Alert.alert('Reset Failed', result.error);
  };

  const handleBiometricPress = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Biometric Login',
        'Enter your email and password once, then tap Sign In.'
      );
      return;
    }

    const available = await isAvailable();
    if (!available) {
      Alert.alert(
        'Biometric Unavailable',
        'No biometric method is enrolled. Use password login instead.'
      );
      return;
    }

    const result = await authenticate();
    if (!result.success) {
      Alert.alert('Biometric Failed', 'Authentication failed. Please try again.');
      return;
    }

    handleLogin();
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBackground}>
        <View style={[styles.gradientCircle, styles.circle1]} />
        <View style={[styles.gradientCircle, styles.circle2]} />
        <View style={[styles.gradientCircle, styles.circle3]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} />
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🏛️</Text>
            </View>
          </View>
          <Text style={styles.appName}>Estate Tax Portal</Text>
          <Text style={styles.tagline}>Secure • Fast • Reliable</Text>
        </View>

        {/* Glass Card */}
        <View style={styles.glassCard}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <View style={styles.tabActive}>
              <Text style={styles.tabTextActive}>Sign In</Text>
            </View>
            <TouchableOpacity 
              style={styles.tabInactive}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.tabTextInactive}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <View style={styles.form}>
            <View style={[
              styles.inputContainer,
              focusedInput === 'email' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[
              styles.inputContainer,
              focusedInput === 'password' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.visibilityToggle}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.buttonGradient}>
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Text style={styles.buttonArrow}>→</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Biometric Login */}
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricPress}>
              <Text style={styles.biometricIcon}>👆</Text>
              <Text style={styles.biometricText}>Use Biometric</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Protected by 256-bit encryption
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gradientCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.15,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: colors.accent,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: colors.info,
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: colors.accentLight,
    top: '40%',
    left: '50%',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.glassStrong,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accentLight,
  },
  logoIcon: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  glassCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.glassStrong,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabTextActive: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainerFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.glassStrong,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  visibilityToggle: {
    fontSize: 18,
    marginLeft: 8,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: colors.cardBackground,
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxTick: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonArrow: {
    color: colors.background,
    fontSize: 20,
    marginLeft: 8,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  biometricText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
