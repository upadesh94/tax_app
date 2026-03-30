import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  React.useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRegister = async () => {
    if (cooldown > 0) {
      Alert.alert('Please Wait', `Try again in ${cooldown} seconds.`);
      return;
    }

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, name);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Success',
        'Registration successful! Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      if (result.error?.toLowerCase().includes('too many sign-up attempts')) {
        setCooldown(60);
      }
      Alert.alert('Registration Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🏛️</Text>
            </View>
            <Text style={styles.title}>THE AUTHORITATIVE</Text>
            <Text style={styles.title}>LEDGER</Text>
            <Text style={styles.subtitle}>
              Create your account to manage property taxes
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={styles.tabInactive}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.tabTextInactive}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabActive}>
                <Text style={styles.tabTextActive}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword((prev) => !prev)}
            >
              <Text style={styles.passwordToggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading || cooldown > 0}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {cooldown > 0 ? `Try Again in ${cooldown}s` : 'Create Account'}
                  </Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>By continuing, you agree to our</Text>
              <View style={styles.footerLinks}>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}> and </Text>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: colors.glassStrong,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    backgroundColor: colors.glass,
    borderRadius: 8,
    padding: 4,
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabTextActive: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextInactive: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  passwordToggle: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 12,
  },
  passwordToggleText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.accent,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonArrow: {
    color: colors.background,
    fontSize: 18,
    marginLeft: 8,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    marginTop: 4,
  },
  footerLink: {
    color: colors.accent,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
