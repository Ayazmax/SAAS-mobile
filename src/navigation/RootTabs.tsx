import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import {
  AccountIcon,
  IncomeIcon,
  ScheduleIcon,
} from '../components/TabIcons';
import { AccountScreen } from '../screens/AccountScreen';
import { IncomeScreen } from '../screens/IncomeScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { colors } from '../theme';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        tabBarActiveTintColor: colors.brandText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <ScheduleIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Income"
        component={IncomeScreen}
        options={{
          title: 'Income',
          tabBarIcon: ({ color, size }) => (
            <IncomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <AccountIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
