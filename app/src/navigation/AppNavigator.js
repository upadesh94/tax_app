import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/home/HomeScreen';
import PropertiesScreen from '../screens/properties/PropertiesScreen';
import TaxCalculatorScreen from '../screens/taxes/TaxCalculatorScreen';
import IncomeTaxCalculatorScreen from '../screens/taxes/IncomeTaxCalculatorScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Modern SVG Icons
const HomeIcon = ({ color }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PropertiesIcon = ({ color }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 9h18M9 21V9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CalculatorIcon = ({ color }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect
      x="4"
      y="2"
      width="16"
      height="20"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 6h8M8 10h8M8 14h2M8 18h2M14 14h2M14 18h2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PaymentsIcon = ({ color }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect
      x="1"
      y="4"
      width="22"
      height="16"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1 10h22"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.headerBackground,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Properties"
        component={PropertiesScreen}
        options={{
          tabBarLabel: 'Properties',
          tabBarIcon: ({ color }) => <PropertiesIcon color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="TaxCalculator"
        component={TaxCalculatorScreen}
        options={{
          title: 'Property Tax',
          tabBarLabel: 'Property',
          tabBarIcon: ({ color }) => <CalculatorIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="IncomeTax"
        component={IncomeTaxCalculatorScreen}
        options={{
          title: 'Income Tax',
          tabBarLabel: 'Income Tax',
          tabBarIcon: ({ color }) => <CalculatorIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color }) => <PaymentsIcon color={color} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.headerBackground,
          },
          headerTintColor: colors.textPrimary,
          headerTitle: 'Profile',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
