import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createStackNavigator, StackCardInterpolationProps } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TopUpScreen from '../screens/TopUpScreen';
import KYCScreen from '../screens/KYCScreen';
import ReportsScreen from '../screens/ReportsScreen';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

export type RootStackParamList = {
  // Auth flow
  Login: undefined;
  Register: undefined;
  
  // App flow
  MainTabs: undefined;
  AddExpense: { groupId?: string };
  GroupDetail: { groupId: string };
  CreateGroup: undefined;
  SettleUp: { groupId: string; fromUserId: string; toUserId: string; amount: number };
  TopUp: undefined;
  KYC: undefined;
  Reports: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: Colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: { 
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fontSize: 18,
        },
        cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps) => {
          const translateX = current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          });
          const opacity = current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          });
          return {
            cardStyle: {
              transform: [{ translateX }],
              opacity,
            },
          };
        },
        gestureEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // App Stack
        <>
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{ title: 'Add Expense' }}
          />
          <Stack.Screen
            name="GroupDetail"
            component={GroupDetailScreen}
            options={{ title: 'Group Details' }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{ title: 'Create Group' }}
          />
          <Stack.Screen
            name="SettleUp"
            component={SettleUpScreen}
            options={{ title: 'Settle Up' }}
          />
          <Stack.Screen
            name="TopUp"
            component={TopUpScreen}
            options={{ title: 'Top Up' }}
          />
          <Stack.Screen
            name="KYC"
            component={KYCScreen}
            options={{ title: 'Verify Identity' }}
          />
          <Stack.Screen
            name="Reports"
            component={ReportsScreen}
            options={{ title: 'Reports' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
