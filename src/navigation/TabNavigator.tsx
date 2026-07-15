import React from 'react';
import { StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

export type TabParamList = {
  Home: undefined;
  Groups: undefined;
  Pay: undefined;
  Activity: undefined;
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
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Groups':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Pay':
              // Managed by custom tabBarButton
              iconName = 'wallet';
              break;
            case 'Activity':
              iconName = focused ? 'pulse' : 'pulse-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size + 1} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 10,
          marginTop: -4,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          shadowColor: '#000',
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
          fontWeight: '800',
          fontSize: 22,
          color: Colors.text,
        },
        headerTitleAlign: 'left',
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerRightContainerStyle: {
          paddingRight: 16,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <View style={styles.headerLeftContainer}>
              <View style={styles.logoGradientContainer}>
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoIconText}>M</Text>
                  <View style={styles.logoInnerP}>
                    <Text style={styles.logoInnerPText}>P</Text>
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.logoText}>My<Text style={{color: Colors.secondary}}>Share</Text></Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={Colors.text} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={({ navigation }) => ({
          title: 'Groups',
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <TouchableOpacity style={styles.headerIconButton}>
                <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <Tab.Screen
        name="Pay"
        component={View} // Dummy component, handled by button press
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // In a real app this might open a modal or AddExpense screen
          },
        })}
        options={{
          tabBarLabel: 'Pay',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={styles.payButtonContainer}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.payButton}
              >
                <Text style={styles.payButtonText}>P</Text>
              </LinearGradient>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          title: 'Activity',
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <TouchableOpacity style={styles.headerIconButton}>
                <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 0,
  },
  logoGradientContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoIconText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },
  logoInnerP: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInnerPText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0A84FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  payButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
});
