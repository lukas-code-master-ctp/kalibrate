import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, fontSizes } from '@/ui/theme';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 22,
        opacity: focused ? 1 : 0.6,
      }}
    >
      {symbol}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ focused }) => <TabIcon symbol="⊙" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="trend"
        options={{
          title: 'Tendencia',
          tabBarIcon: ({ focused }) => <TabIcon symbol="∿" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon symbol="◐" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
