import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen';
import { colors } from '../theme';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { status } = useAuth();
  const verificationRequired = status === 'verificationRequired';

  return (
    <Stack.Navigator
      key={verificationRequired ? 'verification' : 'signed-out'}
      initialRouteName={verificationRequired ? 'VerifyEmail' : 'Login'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.brandText,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
      }}
    >
      {verificationRequired ? (
        <Stack.Screen
          name="VerifyEmail"
          component={VerifyEmailScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Create account' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
