import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { ApiError } from '@dashboard/api';
import { useAuth } from '@/state/AuthContext';
import { usePrefs } from '@/state/PrefsContext';
import { devicesApi, routeForPush } from './devicesApi';

/** Push setup state shown on the Settings screen. */
export type PushStatus = 'unknown' | 'registered' | 'denied' | 'notConfigured' | 'unsupported' | 'simulator' | 'failed';

let lastStatus: PushStatus = 'unknown';
const statusListeners = new Set<(status: PushStatus) => void>();

export function pushStatus(): PushStatus {
  return lastStatus;
}

export function onPushStatus(listener: (status: PushStatus) => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function setStatus(status: PushStatus) {
  lastStatus = status;
  for (const l of statusListeners) l(status);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Registers the device for push after sign-in and opens the right conversation when a notification is tapped.
 * Without an EAS project id (development) push stays off and the app works normally.
 */
export function PushRegistrar() {
  const { auth, state } = useAuth();
  const { prefs, update } = usePrefs();
  const registered = useRef<string | null>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeForPush(response.notification.request.content.data);
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (state.status !== 'signedIn') {
      registered.current = null;
      return;
    }
    if (registered.current === state.serverUrl) return;
    registered.current = state.serverUrl;
    void (async () => {
      if (!Device.isDevice) return setStatus('simulator');
      const id = projectId();
      if (!id) return setStatus('notConfigured');
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', { name: 'Mux', importance: AndroidImportance.HIGH });
      }
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return setStatus('denied');
      try {
        const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
        const device = await devicesApi.register(auth.client, {
          expoPushToken: token.data,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          name: Device.deviceName || Device.modelName || 'Mobile device',
        });
        update({ pushDeviceId: device?.id ?? null });
        setStatus('registered');
      } catch (e) {
        setStatus(e instanceof ApiError && (e.status === 404 || e.status === 501) ? 'unsupported' : 'failed');
      }
    })();
  }, [auth, state.status, state.serverUrl, update]);

  // Forget the device registration on sign-out (best effort; the server drops tokens Expo reports as invalid).
  useEffect(() => {
    if (state.status === 'signedOut' && prefs.pushDeviceId) update({ pushDeviceId: null });
  }, [state.status, prefs.pushDeviceId, update]);

  return null;
}

/** Remove this device's push registration (called just before signing out). */
export async function unregisterPush(client: Parameters<typeof devicesApi.remove>[0], deviceId: string | null): Promise<void> {
  if (!deviceId) return;
  try {
    await devicesApi.remove(client, deviceId);
  } catch {
    // The server prunes devices whose sessions are gone.
  }
}
