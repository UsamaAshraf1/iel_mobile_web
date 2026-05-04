// encryptionkey.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // fallback
import CryptoJS from 'crypto-js';

const DEVICE_SECRET_KEY_PREFIX = 'device-bound-secret-for-user-encryption_';

export async function getEncryptionKey(userId: string): Promise<string> {
  if (!userId) throw new Error('User ID required');

  let deviceSecret: string | null = null;

  try {
    const storageKey = `${DEVICE_SECRET_KEY_PREFIX}${userId}`;

    if (Platform.OS === 'web') {
      // Web: use AsyncStorage (or localStorage directly)
      deviceSecret = await AsyncStorage.getItem(storageKey);
    } else {
      // iOS/Android: use SecureStore
      deviceSecret = await SecureStore.getItemAsync(storageKey);
    }

    if (!deviceSecret) {
      // Generate once
      deviceSecret = CryptoJS.lib.WordArray.random(32).toString(); // 64 hex chars

      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(storageKey, deviceSecret);
      } else {
        await SecureStore.setItemAsync(storageKey, deviceSecret);
      }
    }
  } catch (err) {
    console.error('Storage error:', err);
    // Fallback: generate ephemeral secret (less secure, but prevents crash)
    deviceSecret = CryptoJS.lib.WordArray.random(32).toString();
  }

  // Derive key (same as before)
  const derivedKey = CryptoJS.PBKDF2(
    `${userId}_${deviceSecret}`,
    'fixed-app-salt-2026-do-not-change',
    { keySize: 256 / 32, iterations: 100000 }
  ).toString();

  return derivedKey;
}