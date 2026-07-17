import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo, Skeleton } from '../components';
import TourTooltipContent from '../components/TourTooltipContent';
import { Palette, Radii, Spacing, CardShadow, peso, Gradient } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getCurrentUser } from '../services/session';
import { getUserNetBalance, getRecentExpenses, getUserPayments } from '../services/localDatabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TOUR_HIGHLIGHT = '#6366f1';
const TOUR_TOTAL = 4;

// Helper component for animated quick action cards
function AnimatedActionCard({ action, isHighlighted }: { action: any, isHighlighted?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <View style={{ width: '48%', marginBottom: Spacing.md }}>
      <Pressable
        onPress={action.onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()}
        style={{ flex: 1 }}
      >
        <Animated.View style={[
          styles.actionCard,
          { flex: 1, transform: [{ scale }] },
          isHighlighted && styles.tourHighlight,
        ]}>
          <View style={styles.actionIconWrap}>
            <Ionicons name={action.icon} size={22} color={Palette.accent} />
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [balance, setBalance] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tourStep, setTourStep] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const userBalance = await getUserNetBalance('me');
      const recentExps = await getRecentExpenses('me', 5);
      const recentPays = await getUserPayments('me', 5);
      
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
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setInitialLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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

  // Tour step configs — panel position (top) places it just below each highlighted element
  const tourSteps = [
    null, // 0 = tour off
    { icon: 'wallet-outline', title: 'Your Balance', body: "This card shows your total net balance across all groups and friends — positive means you're owed money!", onNext: () => setTourStep(2), panelTop: 310 },
    { icon: 'grid-outline', title: 'Quick Actions', body: 'Quickly split a bill, request money back, scan a receipt, or add an expense — all from here.', onNext: () => setTourStep(3), panelTop: 490 },
    { icon: 'time-outline', title: 'Recent Activity', body: 'Keep track of all your recent expenses, payments, and settlements in one place.', onNext: () => setTourStep(4), panelTop: 580 },
    { icon: 'grid-outline', title: 'Navigation Bar', body: "🏠 Home — Dashboard\n👥 Groups — Shared groups\n💰 Pay — Settle up fast\n⏱ Activity — Transaction history\n👤 Profile — Account & settings", onNext: () => setTourStep(0), panelTop: undefined },
  ];
  const activeTourStep = tourSteps[tourStep];
  const isTourActive = tourStep > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Logo size={18} />
          <Ionicons name="notifications-outline" size={24} color={Palette.textPrimary} />
        </View>

        <Text style={styles.greeting}>Hello, {getCurrentUser()?.name.split(' ')[0] ?? 'Alex'} 👋</Text>
        <Text style={styles.tagline}>Share smarter. Live better.</Text>

        {/* Total Balance Card — highlighted on step 1 */}
        {initialLoading ? (
          <Skeleton width="100%" height={140} borderRadius={Radii.card} style={{ marginBottom: Spacing.md }} />
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Reports')}
            activeOpacity={0.9}
            style={[{ marginBottom: Spacing.md }, tourStep === 1 && styles.tourHighlightWrapper]}
          >
            <LinearGradient
              colors={Gradient.primary}
              start={Gradient.start}
              end={Gradient.end}
              style={[styles.balanceCard, tourStep === 1 && styles.tourHighlight]}
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
        )}

        {/* Quick Actions — all 4 cards highlighted on step 2 */}
        <View style={[styles.quickActionsGrid, tourStep === 2 && styles.tourHighlightWrapper]}>
          {quickActions.map((action) => (
            <AnimatedActionCard
              key={action.id}
              action={action}
              isHighlighted={tourStep === 2}
            />
          ))}
        </View>

        {/* Recent Activity — section title highlighted on step 3 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, tourStep === 3 && styles.tourHighlightText]}>
            Recent Activity
          </Text>
          {initialLoading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.card, padding: Spacing.md, borderRadius: Radii.card, marginBottom: Spacing.sm }}>
                  <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: Spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Skeleton width={100} height={16} style={{ marginBottom: Spacing.xs }} />
                    <Skeleton width={60} height={12} />
                  </View>
                  <Skeleton width={50} height={16} />
                </View>
              ))}
            </View>
          ) : activities.length === 0 ? (
            <Text style={{ color: Palette.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>No recent activity.</Text>
          ) : (
            activities.map((item) => {
              const relativeDate = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              if (item.activityType === 'payment') {
                const isSentByMe = item.fromUserId === 'me';
                const displayAmount = isSentByMe ? -item.amount : item.amount;
                const paymentLabel = isSentByMe ? 'Settle Payment' : 'Payment Received';

                return (
                  <View key={item.id} style={[styles.activityItem, tourStep === 3 && styles.tourHighlight]}>
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
                ? item.amount - (item.splits?.find((s: any) => s.userId === 'me')?.amount || 0)
                : -(item.splits?.find((s: any) => s.userId === 'me')?.amount || 0);
              
              return (
                <View key={item.id} style={[styles.activityItem, tourStep === 3 && styles.tourHighlight]}>
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

      {/* Tour panel — positioned near the highlighted element */}
      {activeTourStep && (
        <View style={[
          styles.tourPanel,
          activeTourStep.panelTop !== undefined
            ? { top: activeTourStep.panelTop, bottom: undefined }
            : { bottom: 72, top: undefined },
        ]}>
          <TourTooltipContent
            icon={activeTourStep.icon}
            title={activeTourStep.title}
            body={activeTourStep.body}
            step={tourStep}
            totalSteps={TOUR_TOTAL}
            onNext={activeTourStep.onNext}
            onSkip={() => setTourStep(0)}
            isLast={tourStep === TOUR_TOTAL}
          />
        </View>
      )}
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
  // Tour highlight styles
  tourHighlight: {
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tourHighlightWrapper: {
    borderRadius: Radii.card,
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    padding: 4,
  },
  tourHighlightText: {
    color: '#6366f1',
  },
  tourPanel: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
});
