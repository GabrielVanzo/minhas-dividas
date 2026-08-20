import '@/global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Cores } from '@/constants/theme';
import { initDatabase } from '@/data/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setPronto(true);
        SplashScreen.hideAsync();
      });
  }, []);

  if (!pronto) return null;

  if (erro) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900 px-8">
        <Text className="mb-2 text-lg font-semibold text-danger">
          Não foi possível abrir o banco local
        </Text>
        <Text className="text-center text-sm text-mist-300">{erro}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Cores.fundo }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Cores.fundo },
            headerTintColor: Cores.texto,
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Cores.fundo },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="divida/nova" options={{ title: 'Nova dívida' }} />
          <Stack.Screen name="divida/[id]" options={{ title: 'Editar dívida' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
