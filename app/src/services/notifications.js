import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const isExpoGoAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';

const toAmount = (tax) => Number(tax?.amount ?? tax?.total_amount ?? 0);

const buildReminderDates = (dueDateRaw) => {
  const dueDate = new Date(dueDateRaw);
  if (!Number.isFinite(dueDate.getTime())) return [];

  const makeAtHour = (baseDate, daysBefore, hour) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysBefore);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  return [
    makeAtHour(dueDate, 3, 10),
    makeAtHour(dueDate, 1, 10),
    makeAtHour(dueDate, 0, 9),
  ];
};

export const requestNotificationPermissions = async () => {
  // Expo Go on Android does not support remote push tokens from SDK 53+.
  // We keep local reminders enabled and explicitly disable server registration.
  if (isExpoGoAndroid && Notifications.setAutoServerRegistrationEnabledAsync) {
    try {
      await Notifications.setAutoServerRegistrationEnabledAsync(false);
    } catch (error) {
      console.log('Auto server registration not available in this runtime:', error?.message || error);
    }
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return { granted: true };
  }

  const requested = await Notifications.requestPermissionsAsync();
  return { granted: !!requested.granted };
};

export const clearAllScheduledNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const scheduleTestNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tax Reminder Demo',
      body: 'This is a demo reminder notification from Estate Tax app.',
      data: { type: 'demo' },
    },
    trigger: {
      seconds: 5,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });
};

export const syncTaxDueNotifications = async (userId) => {
  if (!userId) {
    return { scheduled: 0, skipped: true, reason: 'No user session.' };
  }

  const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  if (enabled === 'false') {
    await clearAllScheduledNotifications();
    return { scheduled: 0, skipped: true, reason: 'Notifications disabled by user.' };
  }

  const permission = await requestNotificationPermissions();
  if (!permission.granted) {
    return { scheduled: 0, skipped: true, reason: 'Notification permission denied.' };
  }

  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, location, address')
    .eq('owner_id', userId);

  if (propertiesError) {
    if (propertiesError.code === 'PGRST205') {
      return { scheduled: 0, skipped: true, reason: 'Missing properties table.' };
    }
    throw propertiesError;
  }

  if (!properties || properties.length === 0) {
    await clearAllScheduledNotifications();
    return { scheduled: 0, skipped: true, reason: 'No properties found.' };
  }

  const propertyIds = properties.map((property) => property.id);
  const propertyById = properties.reduce((acc, property) => {
    acc[property.id] = property;
    return acc;
  }, {});

  const { data: taxes, error: taxesError } = await supabase
    .from('taxes')
    .select('id, property_id, due_date, amount, total_amount, status')
    .in('property_id', propertyIds)
    .neq('status', 'paid');

  if (taxesError) {
    if (taxesError.code === 'PGRST205') {
      return { scheduled: 0, skipped: true, reason: 'Missing taxes table.' };
    }
    throw taxesError;
  }

  await clearAllScheduledNotifications();

  if (!taxes || taxes.length === 0) {
    return { scheduled: 0, reason: 'No pending taxes.' };
  }

  const now = new Date();
  let scheduledCount = 0;

  for (const tax of taxes) {
    const property = propertyById[tax.property_id];
    const propertyLabel = property?.location || property?.address || 'your property';
    const amount = toAmount(tax);
    const reminderDates = buildReminderDates(tax.due_date);

    for (const reminderDate of reminderDates) {
      if (reminderDate.getTime() <= now.getTime() + 60 * 1000) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Property Tax Payment Reminder',
          body: `Tax due for ${propertyLabel}. Amount: ₹${amount.toLocaleString('en-IN')}.`,
          data: {
            type: 'tax_due',
            taxId: tax.id,
            propertyId: tax.property_id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });

      scheduledCount += 1;
    }
  }

  return { scheduled: scheduledCount };
};

export const notify = async (message) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Estate Tax',
      body: message,
      data: { type: 'generic' },
    },
    trigger: {
      seconds: 1,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });

  return { delivered: true, message };
};
