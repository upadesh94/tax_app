import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../config/supabase';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    const safeEmail = (email || '').trim().toLowerCase();
    const safePassword = password || '';
    const safeName = (name || '').trim();

    if (!safeName || !safeEmail || !safePassword) {
      return { success: false, error: 'Please fill in all fields.' };
    }

    if (!safeEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: safeEmail,
        password: safePassword,
        options: {
          data: { name: safeName },
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      if (error?.status === 429) {
        return {
          success: false,
          error:
            'Too many sign-up attempts. Please wait 60 seconds and try again.',
        };
      }

      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    const identifier = (email || '').trim();
    const safePassword = password || '';

    if (!identifier || !safePassword) {
      return { success: false, error: 'Please enter email and password' };
    }

    // Demo mode - bypass authentication for testing
    if (identifier.toLowerCase() === 'demo@test.com' && safePassword === 'demo123') {
      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@test.com',
        user_metadata: {
          name: 'Demo User',
        },
      };
      setUser(demoUser);
      return { success: true, data: { user: demoUser } };
    }

    if (!identifier.includes('@')) {
      return {
        success: false,
        error: 'Please login with a valid email address.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.toLowerCase(),
        password: safePassword,
      });
      if (error) throw error;
      setUser(data.user);
      await SecureStore.setItemAsync('userToken', data.session.access_token);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unable to login right now. Please try again.',
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const requestPasswordReset = async (email) => {
    const safeEmail = (email || '').trim().toLowerCase();

    if (!safeEmail) {
      return { success: false, error: 'Please enter your email address first.' };
    }

    if (!safeEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(safeEmail);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unable to send reset email right now.',
      };
    }
  };

  const changePassword = async (newPassword) => {
    const safePassword = (newPassword || '').trim();
    if (safePassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: safePassword,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unable to change password right now.',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
