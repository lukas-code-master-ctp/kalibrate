import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores/user';
import { useWeightStore } from '@/stores/weight';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  const loadUser = useUserStore((s) => s.loadUser);
  const isUserLoaded = useUserStore((s) => s.isLoaded);
  const loadWeights = useWeightStore((s) => s.loadLogs);

  useEffect(() => {
    void loadUser();
    void loadWeights();
  }, [loadUser, loadWeights]);

  if (!isUserLoaded) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.bg,
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </SafeAreaProvider>
  );
}
