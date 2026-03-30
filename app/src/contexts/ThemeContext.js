import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default dark theme if provider is not available
    return {
      isDarkMode: true,
      colors: darkColors,
      toggleTheme: () => console.warn('ThemeProvider not found'),
    };
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      // Try to load AsyncStorage if available
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      // AsyncStorage not available or error loading, use default
      console.log('Theme preference not loaded:', error.message);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      
      // Try to save with AsyncStorage if available
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
      
      console.log('Theme toggled:', newTheme ? 'dark' : 'light');
    } catch (error) {
      // AsyncStorage not available, just toggle without saving
      console.log('Theme preference not saved:', error.message);
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
    }
  };

  const theme = {
    isDarkMode,
    colors: isDarkMode ? darkColors : lightColors,
  };

  return (
    <ThemeContext.Provider value={{ ...theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const darkColors = {
  background: '#0B1220',
  cardBackground: '#111B2E',
  headerBackground: '#0E1A2E',
  textPrimary: '#EAF0FA',
  textSecondary: '#A7B6CE',
  textTertiary: '#7F91AB',
  accent: '#37C7A6',
  accentLight: '#64D7BD',
  border: '#22314A',
  borderLight: '#2F4361',
  success: '#37D39A',
  error: '#FF7474',
  warning: '#F6B14A',
  info: '#68AFFF',
  glass: 'rgba(255, 255, 255, 0.06)',
  glassStrong: 'rgba(255, 255, 255, 0.12)',
};

const lightColors = {
  background: '#F2F6FB',
  cardBackground: '#FFFFFF',
  headerBackground: '#FFFFFF',
  textPrimary: '#14233B',
  textSecondary: '#4C607D',
  textTertiary: '#7387A4',
  accent: '#127DCC',
  accentLight: '#3B99DF',
  border: '#D9E3EF',
  borderLight: '#E8EEF6',
  success: '#1FA66D',
  error: '#D9534F',
  warning: '#D28A00',
  info: '#1C7ED6',
  glass: 'rgba(18, 125, 204, 0.06)',
  glassStrong: 'rgba(18, 125, 204, 0.12)',
};
