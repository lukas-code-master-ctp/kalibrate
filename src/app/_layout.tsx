import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores/user';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  const loadUser = useUserStore((s) => s.loadUser);
  const isLoaded = useUserStore((s) => s.isLoaded);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (!isLoaded) {
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
        <Stack.Screen name="onboarding" />
      </Stack>
    </SafeAreaProvider>
  );
}
