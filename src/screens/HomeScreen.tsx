import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '../components/Logo';
import { Palette, Radii, Spacing, CardShadow, peso, Gradient } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getCurrentUser } from '../services/session';
import { getUserNetBalance, getRecentExpenses, getUserPayments } from '../services/localDatabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper component for animated quick actions
function AnimatedActionCard({ action }: { action: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={action.onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()}
      style={{ width: '48%', marginBottom: Spacing.md }}
    >
      <Animated.View style={[styles.actionCard, { transform: [{ scale }] }]}>
        <View style={styles.actionIconWrap}>
          <Ionicons name={action.icon} size={22} color={Palette.accent} />
        </View>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [balance, setBalance] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        try {
          const userBalance = await getUserNetBalance('me');
          const recentExps = await getRecentExpenses('me', 5);
          const recentPays = await getUserPayments('me', 5);
          
          // Merge and sort by date descending
          const combined = [
            ...recentExps.map(e => ({ ...e, activityType: 'expense' as const })),
            ...recentPays.map(p => ({ ...p, activityType: 'payment' as const })),
          ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

          setBalance(userBalance);
          setActivities(combined);
        } catch (err) {
          console.error('Failed to load local DB data in HomeScreen:', err);
        }
      }
      loadData();
    }, [])
  );

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'food_dining':
      case 'food': return 'restaurant-outline' as const;
      case 'groceries': return 'cart-outline' as const;
      case 'travel': return 'airplane-outline' as const;
      case 'utilities': return 'flash-outline' as const;
      default: return 'card-outline' as const;
    }
  };

  const quickActions = [
    { id: 'add', label: 'Add Expense', icon: 'add-circle-outline' as const, onPress: () => navigation.navigate('AddExpense', {}) },
    { id: 'split', label: 'Split Bill', icon: 'people-outline' as const, onPress: () => navigation.navigate('AddExpense', {}) },
    { id: 'request', label: 'Request', icon: 'cash-outline' as const, onPress: () => navigation.navigate('SettleUp', { groupId: '1', fromUserId: 'me', toUserId: '1', amount: 0 }) },
    { id: 'scan', label: 'Scan', icon: 'camera-outline' as const, onPress: () => navigation.navigate('ScanReceipt', {}) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Logo size={18} />
          <Ionicons name="notifications-outline" size={24} color={Palette.textPrimary} />
        </View>

        <Text style={styles.greeting}>Hello, {getCurrentUser()?.name.split(' ')[0] ?? 'Alex'} 👋</Text>
        <Text style={styles.tagline}>Share smarter. Live better.</Text>

        {/* Total Balance Card */}
        <TouchableOpacity onPress={() => navigation.navigate('Reports')} activeOpacity={0.9} style={{ marginBottom: Spacing.md }}>
          <LinearGradient
            colors={Gradient.primary}
            start={Gradient.start}
            end={Gradient.end}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeaderRow}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Ionicons name="bar-chart-outline" size={20} color={Palette.white} />
            </View>
            <Text style={styles.balanceAmount}>{peso(balance)}</Text>
            <View style={styles.changePill}>
              <Ionicons name="trending-up" size={12} color={Palette.positive} />
              <Text style={styles.changePillText}>+12.5% vs last month</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <AnimatedActionCard key={action.id} action={action} />
          ))}
        </View>
        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activities.length === 0 ? (
            <Text style={{ color: Palette.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>No recent activity.</Text>
          ) : (
            activities.map((item) => {
              const relativeDate = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              if (item.activityType === 'payment') {
                const isSentByMe = item.fromUserId === 'me';
                const displayAmount = isSentByMe ? -item.amount : item.amount;
                const paymentLabel = isSentByMe ? 'Settle Payment' : 'Payment Received';

                return (
                  <View key={item.id} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="cash-outline" size={20} color={Palette.accent} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{paymentLabel}</Text>
                      <Text style={styles.activityMeta}>{item.note || 'No note'} · {relativeDate}</Text>
                    </View>
                    <Text style={[styles.activityAmount, { color: displayAmount >= 0 ? Palette.positive : Palette.negative }]}>
                      {peso(displayAmount, { sign: true })}
                    </Text>
                  </View>
                );
              }

              const isPaidByMe = item.paidBy === 'me';
              const displayAmount = isPaidByMe 
                ? item.amount - (item.splits?.find((s: any) => s.userId === 'me')?.amount || 0) // what others owe me
                : -(item.splits?.find((s: any) => s.userId === 'me')?.amount || 0); // what I owe
              
              return (
                <View key={item.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={getCategoryIcon(item.category)} size={20} color={Palette.accent} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{item.description}</Text>
                    <Text style={styles.activityMeta}>Split {item.splits?.length || 0} ways · {relativeDate}</Text>
                  </View>
                  <Text style={[styles.activityAmount, { color: displayAmount >= 0 ? Palette.positive : Palette.negative }]}>
                    {peso(displayAmount, { sign: true })}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoText}>Smart sharing, made simple</Text>
        </View>
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
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: Spacing.sm,
  },
  tagline: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  balanceCard: {
    backgroundColor: Palette.gradientStart,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    ...CardShadow,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Palette.white,
    marginTop: Spacing.xs,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Palette.positiveBg,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.md,
    gap: 4,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.positive,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  actionCard: {
    width: '100%',
    backgroundColor: Palette.card,
    borderRadius: Radii.card,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...CardShadow,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: Spacing.md,
    borderRadius: Radii.card,
    marginBottom: Spacing.sm,
    ...CardShadow,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  activityMeta: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  promoBanner: {
    backgroundColor: Palette.navy,
    borderRadius: Radii.card,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  promoText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
