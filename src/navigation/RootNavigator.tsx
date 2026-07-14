import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import { Colors } from '../constants/colors';

export type RootStackParamList = {
  MainTabs: undefined;
  AddExpense: { groupId?: string };
  GroupDetail: { groupId: string };
  CreateGroup: undefined;
  SettleUp: { groupId: string; fromUserId: string; toUserId: string; amount: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ title: 'Group Details' }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: 'Create Group', presentation: 'modal' }}
      />
      <Stack.Screen
        name="SettleUp"
        component={SettleUpScreen}
        options={{ title: 'Settle Up', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
