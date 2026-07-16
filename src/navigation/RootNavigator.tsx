import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import KYCScreen from '../screens/KYCScreen';
import TopUpScreen from '../screens/TopUpScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import WalletScreen from '../screens/WalletScreen';
import ReportsScreen from '../screens/ReportsScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  MainTabs: undefined;
  AddExpense: { groupId?: string; title?: string; amount?: string; category?: string };
  GroupDetail: { groupId: string };
  CreateGroup: undefined;
  SettleUp: { groupId: string; fromUserId: string; toUserId: string; amount: number };
  KYC: undefined;
  TopUp: undefined;
  ScanReceipt: { groupId?: string };
  Wallet: undefined;
  Reports: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        // Every screen renders its own in-page header per the redesign.
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="KYC" component={KYCScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="TopUp" component={TopUpScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}
