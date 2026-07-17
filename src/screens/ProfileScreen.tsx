import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MemberAvatar from '../components/MemberAvatar';
import { Skeleton } from '../components';
import { Palette, Radii, Spacing, CardShadow } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getCurrentUser } from '../services/session';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock fallback when no backend session exists (see getCurrentUser below)

interface MenuRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
}

interface MenuSection {
  title: string;
  rows: MenuRow[];
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const sessionUser = getCurrentUser();
  const user = {
    name: sessionUser?.name ?? 'Alex Reyes',
    email: sessionUser?.email ?? 'alex.reyes@email.com',
  };

  const sections: MenuSection[] = [
    {
      title: 'Payment & Wallet',
      rows: [
        { id: 'wallet', icon: 'card-outline', label: 'Linked Payment Methods', subtitle: '2 cards · 1 e-wallet', onPress: () => navigation.navigate('Wallet') },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        { id: 'notifications', icon: 'notifications-outline', label: 'Notification Settings' },
      ],
    },
    {
      title: 'Security',
      rows: [
        { id: 'security', icon: 'shield-checkmark-outline', label: 'Security & Privacy', subtitle: 'Identity verification (KYC)', onPress: () => navigation.navigate('KYC') },
        { id: 'mfa', icon: 'key-outline', label: 'Two-Factor Authentication' },
      ],
    },
    {
      title: 'Support & Information',
      rows: [
        { id: 'help', icon: 'help-circle-outline', label: 'Help & Support' },
        { id: 'about', icon: 'information-circle-outline', label: 'About MyShare', subtitle: 'App version 1.0.0' },
      ],
    },
  ];

  const handleSignOut = () => {
    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setInitialLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    setInitialLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.accent} />}
      >
        {initialLoading ? (
          <View style={styles.userCard}>
            <Skeleton width={64} height={64} borderRadius={32} style={{ marginBottom: Spacing.md }} />
            <Skeleton width={150} height={24} style={{ marginBottom: Spacing.sm }} />
            <Skeleton width={180} height={16} style={{ marginBottom: Spacing.lg }} />
            <Skeleton width={140} height={24} borderRadius={Radii.pill} />
          </View>
        ) : (
          <View style={styles.userCard}>
            <MemberAvatar name={user.name} size={64} backgroundColor={Palette.accent} />
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.premiumChip}>
              <Text style={styles.premiumChipText}>⭐ Premium Member</Text>
            </View>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => (
                <TouchableOpacity
                  key={row.id}
                  style={[styles.row, index < section.rows.length - 1 && styles.rowDivider]}
                  onPress={row.onPress}
                  disabled={!row.onPress}
                  activeOpacity={row.onPress ? 0.7 : 1}
                >
                  <Ionicons name={row.icon} size={20} color={Palette.textPrimary} />
                  <View style={styles.rowLabelWrap}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    {row.subtitle && <Text style={styles.rowSubtitle}>{row.subtitle}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Palette.negative} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.card,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    ...CardShadow,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: Spacing.md,
  },
  userEmail: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  premiumChip: {
    backgroundColor: Palette.pendingBg,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.md,
  },
  premiumChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.pending,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textMuted,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: Palette.card,
    borderRadius: Radii.card,
    overflow: 'hidden',
    ...CardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    minHeight: 56,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  rowLabelWrap: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  rowLabel: {
    fontSize: 15,
    color: Palette.textPrimary,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.negativeBg,
    borderRadius: Radii.card,
    padding: Spacing.md,
    minHeight: 52,
  },
  signOutText: {
    marginLeft: Spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.negative,
  },
});
