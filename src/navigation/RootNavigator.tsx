import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { JobDetailScreen } from '../screens/JobDetailScreen';
import { colors } from '../theme';
import { RootTabs } from './RootTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={RootTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          title: 'Visit',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.brandText,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
        }}
      />
    </Stack.Navigator>
  );
}
