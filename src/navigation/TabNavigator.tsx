import React from 'react';
import { StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import GroupsScreen from '../screens/GroupsScreen';
import WalletScreen from '../screens/WalletScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../constants/colors';
import { APP_NAME } from '../constants';

export type TabParamList = {
  Home: undefined;
  Groups: undefined;
  Wallet: undefined;
  Reports: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Groups': iconName = focused ? 'people' : 'people-outline'; break;
            case 'Wallet': iconName = focused ? 'wallet' : 'wallet-outline'; break;
            case 'Reports': iconName = focused ? 'bar-chart' : 'bar-chart-outline'; break;
            case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
            default: iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size + 1} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginTop: -4,
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          shadowColor: '#1A2320',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 8,
        },
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fontSize: 22,
          color: Colors.text,
        },
        headerTitleAlign: 'left',
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});

