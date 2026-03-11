import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initNativeDb } from '../src/save/db';

export default function RootLayout() {
  useEffect(() => {
    initNativeDb();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
