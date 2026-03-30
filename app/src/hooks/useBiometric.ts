import * as LocalAuthentication from 'expo-local-authentication';

export const useBiometric = () => {
  const isAvailable = async () => {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hardware && enrolled;
  };

  const authenticate = async () => {
    try {
      const available = await isAvailable();
      if (!available) {
        return { success: false, reason: 'not-available' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      return { success: false, reason: result.error || 'failed' };
    } catch (_error) {
      return { success: false, reason: 'error' };
    }
  };

  return {
    isAvailable,
    authenticate,
  };
};
