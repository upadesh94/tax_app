import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { syncTaxDueNotifications } from './src/services/notifications';

function ThemedApp() {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    syncTaxDueNotifications(user.id).catch((error) => {
      console.error('Notification sync failed:', error);
    });
  }, [user?.id]);

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
