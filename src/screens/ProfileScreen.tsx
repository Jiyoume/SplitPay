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

  const menuSections = [
    {
      title: 'Payment & Wallet',
      items: [
        { id: '1', icon: 'card' as const, label: 'Linked Payment Methods', subtitle: '2 cards • 1 e-wallet' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: '2', icon: 'notifications' as const, label: 'Notification Settings', subtitle: 'Manage your alerts and updates', iconBg: 'rgba(10, 132, 255, 0.1)', iconColor: '#0A84FF' },
      ]
    },
    {
      title: 'Security',
      items: [
        { id: '3', icon: 'shield-checkmark' as const, label: 'Security & Privacy', subtitle: 'Password, biometrics, and privacy', iconBg: 'rgba(52, 199, 89, 0.1)', iconColor: '#34C759' },
        { id: '4', icon: 'key' as const, label: 'Two-Factor Authentication', subtitle: 'Add an extra layer of security', iconBg: 'rgba(10, 132, 255, 0.1)', iconColor: '#0A84FF' },
      ]
    },
    {
      title: 'Support & Information',
      items: [
        { id: '5', icon: 'help-circle' as const, label: 'Help & Support', subtitle: 'FAQs, contact support', iconBg: 'rgba(10, 132, 255, 0.1)', iconColor: '#0A84FF' },
        { id: '6', icon: 'information-circle' as const, label: 'About MyShare', subtitle: 'App version 1.2.0', iconBg: 'rgba(52, 199, 89, 0.1)', iconColor: '#34C759' },
      ]
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Header Card */}
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={['#0A84FF', '#00C6FF']}
          style={styles.avatarGradient}
        >
          <Ionicons name="person" size={48} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.userInfoSection}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#0A84FF" />
            <Text style={styles.memberBadgeText}>Premium Member</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
      </View>

      {/* Menu Sections */}
      {menuSections.map((section, idx) => (
        <View key={idx} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, itemIdx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  itemIdx === section.items.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={[styles.menuIconContainer, item.iconBg && { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor || Colors.primary} />
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoSection: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 24,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabelContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FFF0F0',
    borderRadius: 24,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '700',
  },
});

