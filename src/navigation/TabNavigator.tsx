import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Palette, Gradient, CardShadow } from '../constants/theme';
import { RootStackParamList } from './RootNavigator';

export type TabParamList = {
  Home: undefined;
  Groups: undefined;
  Pay: undefined;
  Activity: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Pay is a launcher, not a real screen — tabPress is intercepted below to open
// the SettleUp modal on the root stack, so this never actually mounts.
function PayLauncherScreen() {
  return null;
}

function PayTabButton({ onPress }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.fabWrapper}>
      <LinearGradient colors={Gradient.primary} start={Gradient.start} end={Gradient.end} style={styles.fab}>
        <Ionicons name="cash-outline" size={26} color={Palette.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Groups': iconName = focused ? 'people' : 'people-outline'; break;
            case 'Activity': iconName = focused ? 'time' : 'time-outline'; break;
            case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
            default: iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Palette.accent,
        tabBarInactiveTintColor: Palette.textMuted,
        tabBarStyle: styles.tabBar,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen
        name="Pay"
        component={PayLauncherScreen}
        options={{ tabBarButton: (props) => <PayTabButton {...props} /> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const parent = navigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
            parent?.navigate('SettleUp', { groupId: '1', fromUserId: 'me', toUserId: '1', amount: 0 });
          },
        })}
      />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0,
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
    ...CardShadow,
  },
  fabWrapper: {
    flex: 1,
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...CardShadow,
    shadowOpacity: 0.25,
  },
});
