import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Body, BottomBar, Button, Hint, Screen, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Title>Kalibrate</Title>
        <Body>Tracking calórico que se calibra a tu cuerpo real, no al promedio de una tabla.</Body>
        <View style={{ height: spacing.lg }} />
        <Hint>
          Vamos a hacerte algunas preguntas para tener un punto de partida. Después aprendemos de
          tus datos.
        </Hint>
        <View style={{ height: spacing.lg }} />
        <Hint>
          Nada de esto sale de tu teléfono por ahora. La sincronización con la nube llega más
          adelante.
        </Hint>
      </View>

      <BottomBar>
        <Button label="Empezar" onPress={() => router.push('/onboarding/basics')} />
      </BottomBar>
    </Screen>
  );
}
