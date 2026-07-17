import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StatusPill, { PillStatus } from '../components/StatusPill';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import { Skeleton } from '../components';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ActivityType = 'sent' | 'received' | 'pending';

interface ActivityItem {
  id: string;
  type: ActivityType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  splitCount: number;
  time: string;
  amount: number;
  statusLabel: string;
  status: PillStatus;
}

interface ActivitySection {
  date: string;
  items: ActivityItem[];
}

// Mock data for demonstration
const SECTIONS: ActivitySection[] = [
  {
    date: 'Today',
    items: [
      { id: '1', type: 'sent', icon: 'restaurant-outline', title: 'Dinner at restaurant', caption: 'You paid Mike', splitCount: 4, time: '7:30 PM', amount: -850.0, statusLabel: 'Paid', status: 'negative' },
      { id: '2', type: 'pending', icon: 'cash-outline', title: 'Weekend trip fund', caption: 'Owed by Sarah', splitCount: 3, time: '3:15 PM', amount: 500.0, statusLabel: 'Pending', status: 'pending' },
    ],
  },
  {
    date: 'Yesterday',
    items: [
      { id: '3', type: 'received', icon: 'cart-outline', title: 'Groceries', caption: 'Received from Sarah', splitCount: 3, time: '11:05 AM', amount: 620.0, statusLabel: 'Received', status: 'positive' },
    ],
  },
  {
    date: '3 days ago',
    items: [
      { id: '4', type: 'sent', icon: 'film-outline', title: 'Movie tickets', caption: 'You paid Alex', splitCount: 5, time: '9:00 PM', amount: -350.0, statusLabel: 'Paid', status: 'negative' },
      { id: '5', type: 'pending', icon: 'people-outline', title: 'Office lunch', caption: 'Owed by Mike', splitCount: 6, time: '12:30 PM', amount: 210.0, statusLabel: 'Pending', status: 'pending' },
    ],
  },
];

const FILTERS: { label: string; value: 'All' | ActivityType }[] = [
  { label: 'All', value: 'All' },
  { label: 'Sent', value: 'sent' },
  { label: 'Received', value: 'received' },
  { label: 'Pending', value: 'pending' },
];

export default function ActivityScreen() {
  const [filter, setFilter] = useState<'All' | ActivityType>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false); // we default to false but use it during refresh

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setInitialLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    setInitialLoading(false);
  }, []);

  const handleFilterChange = (newFilter: 'All' | ActivityType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilter(newFilter);
  };

  const sections = SECTIONS.map((section) => ({
    date: section.date,
    items: filter === 'All' ? section.items : section.items.filter((item) => item.type === filter),
  })).filter((section) => section.items.length > 0);

  // Render skeleton loaders for ActivityItems
  const renderSkeletons = () => (
    <View style={{ paddingTop: Spacing.md }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.card, padding: Spacing.md, borderRadius: Radii.card, marginBottom: Spacing.sm }}>
          <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <Skeleton width={120} height={16} style={{ marginBottom: Spacing.xs }} />
            <Skeleton width={80} height={14} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Skeleton width={60} height={18} style={{ marginBottom: Spacing.xs }} />
            <Skeleton width={40} height={20} borderRadius={Radii.pill} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.accent} />}
      >
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subCopy}>All your expenses and payments in one place</Text>

        <View style={styles.chipsRow}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleFilterChange(f.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {initialLoading ? (
          renderSkeletons()
        ) : sections.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={48} color={Palette.accent} />
            </View>
            <Text style={styles.emptyText}>No activity found</Text>
            <Text style={styles.emptySubText}>Try changing your filter or start a new expense.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.date} style={styles.section}>
              <Text style={styles.sectionDate}>{section.date}</Text>
              {section.items.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.iconBubble}>
                    <Ionicons name={item.icon} size={20} color={Palette.accent} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowCaption}>{item.caption} · Split {item.splitCount} ways</Text>
                    <Text style={styles.rowTime}>{item.time}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowAmount, { color: item.amount >= 0 ? Palette.positive : Palette.negative }]}>
                      {peso(item.amount, { sign: true })}
                    </Text>
                    <StatusPill label={item.statusLabel} status={item.status} />
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  subCopy: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipActive: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: Palette.white,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionDate: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textMuted,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: Spacing.md,
    borderRadius: Radii.card,
    marginBottom: Spacing.sm,
    ...CardShadow,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  rowCaption: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  rowTime: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...CardShadow,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubText: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
