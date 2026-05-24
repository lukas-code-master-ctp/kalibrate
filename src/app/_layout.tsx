import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCycleStore } from '@/stores/cycle';
import { useFoodStore } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { useWeightStore } from '@/stores/weight';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  const loadUser = useUserStore((s) => s.loadUser);
  const isUserLoaded = useUserStore((s) => s.isLoaded);
  const loadWeights = useWeightStore((s) => s.loadLogs);
  const loadFood = useFoodStore((s) => s.loadEntries);
  const loadCycle = useCycleStore((s) => s.loadEvents);

  useEffect(() => {
    void loadUser();
    void loadWeights();
    void loadFood();
    void loadCycle();
  }, [loadUser, loadWeights, loadFood, loadCycle]);

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
        <Stack.Screen name="food/add" options={{ headerShown: true, presentation: 'modal' }} />
        <Stack.Screen name="cycle/log" options={{ headerShown: true, presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
