import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import KYCScreen from '../screens/KYCScreen';
import TopUpScreen from '../screens/TopUpScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  AddExpense: { groupId?: string };
  GroupDetail: { groupId: string };
  CreateGroup: undefined;
  SettleUp: { groupId: string; fromUserId: string; toUserId: string; amount: number };
  KYC: undefined;
  TopUp: undefined;
  ScanReceipt: { groupId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense', presentation: 'modal' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Group Details' }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group', presentation: 'modal' }} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ title: 'Settle Up', presentation: 'modal' }} />
      <Stack.Screen name="KYC" component={KYCScreen} options={{ title: 'Identity Verification', presentation: 'modal' }} />
      <Stack.Screen name="TopUp" component={TopUpScreen} options={{ title: 'Top Up Wallet', presentation: 'modal' }} />
      <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ title: 'Scan Receipt', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
