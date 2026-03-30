import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Path } from 'react-native-svg';
import {
  requestNotificationPermissions,
  clearAllScheduledNotifications,
  scheduleTestNotification,
  syncTaxDueNotifications,
} from '../services/notifications';

export default function ProfileScreen() {
  const { user, signOut, requestPasswordReset, changePassword } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [preferredTaxRegime, setPreferredTaxRegime] = useState('new');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('Aditya Barandwal');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');

  const userName = profileName;
  const userEmail = user?.email || 'demo@test.com';

  React.useEffect(() => {
    const loadSettings = async () => {
      const savedNotification = await AsyncStorage.getItem('notificationsEnabled');
      const savedRegime = await AsyncStorage.getItem('preferredTaxRegime');
      const savedName = await AsyncStorage.getItem('profileName');
      const savedPhone = await AsyncStorage.getItem('profilePhone');
      const savedAddress = await AsyncStorage.getItem('profileAddress');

      if (savedNotification !== null) {
        setNotificationsEnabled(savedNotification === 'true');
      }

      if (savedRegime === 'old' || savedRegime === 'new') {
        setPreferredTaxRegime(savedRegime);
      }

      if (savedName) {
        setProfileName(savedName);
      }

      if (savedPhone) {
        setProfilePhone(savedPhone);
      }

      if (savedAddress) {
        setProfileAddress(savedAddress);
      }
    };

    loadSettings();
  }, []);

  const handleNotificationToggle = async () => {
    const updated = !notificationsEnabled;

    if (updated) {
      const permission = await requestNotificationPermissions();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow notifications to receive tax due reminders.'
        );
        return;
      }
    }

    setNotificationsEnabled(updated);
    await AsyncStorage.setItem('notificationsEnabled', String(updated));

    if (!updated) {
      await clearAllScheduledNotifications();
    } else if (user?.id) {
      await syncTaxDueNotifications(user.id);
    }

    Alert.alert(
      'Notifications',
      `Notifications ${updated ? 'enabled' : 'disabled'} successfully!`
    );
  };

  const handleTestNotification = async () => {
    if (!notificationsEnabled) {
      Alert.alert('Enable Notifications', 'Turn on notifications first to test reminders.');
      return;
    }

    await scheduleTestNotification();
    Alert.alert('Test Scheduled', 'You will receive a test reminder in about 5 seconds.');
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handleSendResetLink = async () => {
    const result = await requestPasswordReset(userEmail);
    if (result.success) {
      Alert.alert('Success', 'Password reset link sent to your email.');
      return;
    }

    Alert.alert('Error', result.error || 'Unable to send reset link.');
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(newPassword);
    setIsChangingPassword(false);

    if (result.success) {
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
      Alert.alert('Success', 'Password updated successfully.');
      return;
    }

    Alert.alert('Error', result.error || 'Unable to update password.');
  };

  const handleTaxRegimePreference = async (regime) => {
    setPreferredTaxRegime(regime);
    await AsyncStorage.setItem('preferredTaxRegime', regime);
    Alert.alert('Tax Preference Saved', `Default regime set to ${regime.toUpperCase()}.`);
  };

  const handleEditProfile = () => {
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      Alert.alert('Invalid Name', 'Please enter your full name.');
      return;
    }

    await AsyncStorage.setItem('profileName', profileName.trim());
    await AsyncStorage.setItem('profilePhone', profilePhone.trim());
    await AsyncStorage.setItem('profileAddress', profileAddress.trim());
    setShowEditProfileModal(false);
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your data is secure and encrypted. We never share your personal information with third parties.',
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'By using this app, you agree to our terms and conditions for estate tax collection services.',
      [{ text: 'OK' }]
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Need help? Contact us:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => Linking.openURL('mailto:support@estatetax.gov.in'),
        },
        {
          text: 'Call Support',
          onPress: () => Linking.openURL('tel:1800-123-4567'),
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About',
      'Estate Tax Collection System\nVersion 1.0.0\n\nA modern solution for managing property taxes and payments.\n\n© 2026 Government of India',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      {/* Header with Profile */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.statusDot} />
        </View>
        
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.email}>{userEmail}</Text>
        
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Properties</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹45K</Text>
          <Text style={styles.statLabel}>Paid</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                    fill={colors.accent}
                  />
                  <Path
                    d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"
                    fill={colors.accent}
                  />
                </Svg>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingSubtitle}>
                  {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D0D0D0', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.settingCard} onPress={handleNotificationToggle}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
                    fill={colors.info}
                  />
                </Svg>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#D0D0D0', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </TouchableOpacity>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                <Text style={styles.preferenceIcon}>₹</Text>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Default Tax Regime</Text>
                <Text style={styles.settingSubtitle}>Used as default in income tax calculator</Text>
              </View>
            </View>
          </View>

          <View style={styles.taxPreferenceRow}>
            <TouchableOpacity
              style={[
                styles.taxPreferenceChip,
                preferredTaxRegime === 'new' && styles.taxPreferenceChipActive,
              ]}
              onPress={() => handleTaxRegimePreference('new')}
            >
              <Text
                style={[
                  styles.taxPreferenceText,
                  preferredTaxRegime === 'new' && styles.taxPreferenceTextActive,
                ]}
              >
                NEW
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.taxPreferenceChip,
                preferredTaxRegime === 'old' && styles.taxPreferenceChipActive,
              ]}
              onPress={() => handleTaxRegimePreference('old')}
            >
              <Text
                style={[
                  styles.taxPreferenceText,
                  preferredTaxRegime === 'old' && styles.taxPreferenceTextActive,
                ]}
              >
                OLD
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                  fill={colors.warning}
                />
              </Svg>
            </View>
            <Text style={styles.menuText}>Change Password</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
                  fill={colors.success}
                />
              </Svg>
            </View>
            <Text style={styles.menuText}>Privacy Policy</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleTermsOfService}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
                  fill={colors.info}
                />
              </Svg>
            </View>
            <Text style={styles.menuText}>Terms of Service</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleTestNotification}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                  fill={colors.warning}
                />
              </Svg>
            </View>
            <Text style={styles.menuText}>Test Notification</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelpSupport}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"
                  fill={colors.accent}
                />
              </Svg>
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.textSecondary + '20' }]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                  fill={colors.textSecondary}
                />
              </Svg>
            </View>
            <Text style={styles.menuText}>About</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
            fill="#FFFFFF"
          />
        </Svg>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>Update your account password securely.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="New password"
              placeholderTextColor={colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.primaryModalButton}
              onPress={handleUpdatePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryModalButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryModalButton} onPress={handleSendResetLink}>
              <Text style={styles.secondaryModalButtonText}>Send Reset Link Instead</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => {
                setShowPasswordModal(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.modalSubtitle}>Update your basic account details.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
              value={profileName}
              onChangeText={setProfileName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone number"
              placeholderTextColor={colors.textSecondary}
              value={profilePhone}
              onChangeText={setProfilePhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Address"
              placeholderTextColor={colors.textSecondary}
              value={profileAddress}
              onChangeText={setProfileAddress}
            />

            <TouchableOpacity style={styles.primaryModalButton} onPress={handleSaveProfile}>
              <Text style={styles.primaryModalButtonText}>Save Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowEditProfileModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.headerBackground,
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.headerBackground,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  preferenceIcon: {
    color: colors.warning,
    fontSize: 18,
    fontWeight: '700',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  taxPreferenceRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  taxPreferenceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  taxPreferenceChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  taxPreferenceText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  taxPreferenceTextActive: {
    color: colors.accent,
  },
  menuItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  menuArrow: {
    fontSize: 28,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: colors.error,
    margin: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  primaryModalButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryModalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryModalButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cancelModalButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  cancelModalButtonText: {
    color: colors.error,
    fontWeight: '600',
  },
});
