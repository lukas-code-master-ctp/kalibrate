import { Redirect } from 'expo-router';
import { useUserStore } from '@/stores/user';

/**
 * Landing — redirige según haya o no usuario onboardeado.
 * El loading global se maneja en _layout.
 */
export default function Index() {
  const user = useUserStore((s) => s.user);

  if (!user) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/today" />;
}
