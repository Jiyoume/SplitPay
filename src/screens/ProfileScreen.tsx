import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

export default function ProfileScreen() {
  const user = {
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 234 567 890',
    memberSince: 'January 2026',
  };

  const menuItems = [
    { id: '1', icon: 'settings-outline' as const, label: 'Settings', badge: null },
    { id: '2', icon: 'notifications-outline' as const, label: 'Notifications', badge: '3' },
    { id: '3', icon: 'card-outline' as const, label: 'Payment Methods', badge: null },
    { id: '4', icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', badge: null },
    { id: '5', icon: 'help-circle-outline' as const, label: 'Help & Support', badge: null },
    { id: '6', icon: 'information-circle-outline' as const, label: 'About', badge: null },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Curved Header */}
      <LinearGradient
        colors={['#064E3B', '#022C22']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.profileHeader}
      >
        <Text style={styles.headerTitleText}>Profile</Text>
        <TouchableOpacity style={styles.headerSettingsButton}>
          <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Placeholder for overlapping avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* User Information */}
      <View style={styles.userInfoSection}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>Member since Jan 2026</Text>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>23</Text>
          <Text style={styles.statLabel}>Expenses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>$1,250</Text>
          <Text style={styles.statLabel}>Total Split</Text>
        </View>
      </View>

      {/* Menu Cards */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuCard}>
        {menuItems.slice(0, 2).map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              idx === 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.menuCard, { marginTop: 16 }]}>
        {menuItems.slice(2).map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              idx === menuItems.slice(2).length - 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    height: 160,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: -20,
  },
  headerSettingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -44,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E6F4EA',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  userInfoSection: {
    alignItems: 'center',
    marginTop: 56,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  memberBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.12)',
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginLeft: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 12,
    fontWeight: '700',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '800',
  },
});

