import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { GradientButton, StatusPill, BalanceSummary, ExpenseCard, MemberAvatar, Skeleton } from '../components';
import { getGroup, getGroupExpenses, getGroupBalanceForUser } from '../services/localDatabase';
import { Group, Expense } from '../models/types';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MAX_VISIBLE_AVATARS = 4;
const COLLAPSED_EXPENSE_COUNT = 3;

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const insets = useSafeAreaInsets();
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroupDetails = useCallback(async () => {
    try {
      const g = await getGroup(groupId);
      if (g) {
        const exps = await getGroupExpenses(groupId);
        
        // Calculate balances for each member
        const membersWithBalances = await Promise.all(
          g.members.map(async (m: any) => ({
            id: m.id,
            name: m.id === 'me' ? 'You' : m.name,
            balance: await getGroupBalanceForUser(groupId, m.id),
          }))
        );

        setGroup({
          ...g,
          members: membersWithBalances,
        });
        setExpenses(exps);
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadGroupDetails();
    }, [loadGroupDetails])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadGroupDetails();
    setRefreshing(false);
  }, [loadGroupDetails]);

  if (loading || !group) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.background }}>
        <View style={[styles.cover, { paddingTop: insets.top + Spacing.xl, height: 200 }]} />
        
        <View style={{ paddingHorizontal: Spacing.xl, marginTop: -40 }}>
          <View style={{ backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.xl, ...CardShadow }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
              <View>
                <Skeleton width={100} height={16} style={{ marginBottom: Spacing.sm }} />
                <Skeleton width={150} height={32} />
              </View>
              <Skeleton width={50} height={50} borderRadius={25} />
            </View>
            <Skeleton width="100%" height={1} style={{ marginBottom: Spacing.lg }} />
            <Skeleton width={120} height={20} />
          </View>

          <View style={{ marginTop: Spacing.xxl }}>
            <Skeleton width={150} height={24} style={{ marginBottom: Spacing.xl }} />
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
                <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Skeleton width={120} height={16} style={{ marginBottom: Spacing.xs }} />
                  <Skeleton width={80} height={14} />
                </View>
                <Skeleton width={60} height={20} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const getGroupEmoji = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'roommates': return '🏠';
      case 'family': return '👨‍👩‍👧';
      case 'trip': return '✈️';
      case 'friends': return '👥';
      default: return '📦';
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const equalShare = totalExpenses / group.members.length;
  const visibleExpenses = showAllExpenses ? expenses : expenses.slice(0, COLLAPSED_EXPENSE_COUNT);
  const visibleAvatars = group.members.slice(0, MAX_VISIBLE_AVATARS);
  const avatarOverflow = group.members.length - visibleAvatars.length;

  const pendingMember = group.members.find((m: any) => m.balance < 0);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.accent} />}
    >
      <View style={[styles.cover, { paddingTop: insets.top + Spacing.xl }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + Spacing.lg }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={Palette.white} />
        </TouchableOpacity>
        <Text style={styles.coverEmoji}>{getGroupEmoji(group.type)}</Text>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.dateRange}>Created on {new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        <View style={styles.avatarRow}>
          {visibleAvatars.map((member: any, i: number) => (
            <View key={member.id} style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}>
              <MemberAvatar name={member.name} size={32} />
            </View>
          ))}
          {avatarOverflow > 0 && (
            <View style={[styles.avatarWrap, styles.avatarOverlap, styles.overflowBadge]}>
              <Text style={styles.overflowText}>+{avatarOverflow}</Text>
            </View>
          )}
        </View>
      </View>

      <BalanceSummary label="Total Expenses" amount={totalExpenses} trendLabel="+8% vs last trip" trendPositive icon="bar-chart-outline" />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          {expenses.length > COLLAPSED_EXPENSE_COUNT && (
            <TouchableOpacity onPress={() => setShowAllExpenses((v) => !v)}>
              <Text style={styles.viewAll}>{showAllExpenses ? 'Show Less' : 'View All'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {visibleExpenses.map((expense) => {
          const payer = group.members.find((m: any) => m.id === expense.paidBy);
          const payerName = payer ? (payer.id === 'me' ? 'You' : payer.name) : 'You';
          const formattedDate = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <ExpenseCard
              key={expense.id}
              description={expense.description}
              amount={expense.amount}
              paidBy={payerName}
              date={formattedDate}
              category={expense.category}
            />
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.splitCard}>
          <Text style={styles.splitTitle}>Equal Split</Text>
          <Text style={styles.splitSubtitle}>Each Member Owes {peso(equalShare)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Member Balances</Text>
        {group.members.map((member: any) => (
          <View key={member.id} style={styles.memberRow}>
            <MemberAvatar name={member.name} size={36} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={[styles.memberBalance, { color: member.balance >= 0 ? Palette.positive : Palette.negative }]}>
                {member.balance >= 0 ? 'gets back ' : 'owes '}{peso(Math.abs(member.balance))}
              </Text>
            </View>
            <StatusPill
              label={member.balance === 0 ? 'Paid' : 'Pending'}
              status={member.balance === 0 ? 'positive' : 'pending'}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <GradientButton
          title="Request Payment"
          onPress={() =>
            navigation.navigate('SettleUp', {
              groupId,
              fromUserId: pendingMember?.id ?? group.members[1].id,
              toUserId: 'me',
              amount: Math.abs(pendingMember?.balance ?? equalShare),
            })
          }
        />
        <Text style={styles.secureCaption}>🛡 Secure payments via Stellar</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  cover: {
    backgroundColor: Palette.navy,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: Radii.card,
    borderBottomRightRadius: Radii.card,
  },
  backButton: { position: 'absolute', left: Spacing.lg, zIndex: 1 },
  coverEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  groupName: { fontSize: 22, fontWeight: '700', color: Palette.white },
  dateRange: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  avatarRow: { flexDirection: 'row', marginTop: Spacing.lg },
  avatarWrap: { borderRadius: 16 },
  avatarOverlap: { marginLeft: -10 },
  overflowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.textMuted,
    borderWidth: 2,
    borderColor: Palette.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: { fontSize: 11, fontWeight: '700', color: Palette.white },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Palette.textPrimary, marginBottom: Spacing.md },
  viewAll: { fontSize: 13, fontWeight: '600', color: Palette.accent },
  splitCard: {
    backgroundColor: Palette.card,
    padding: Spacing.lg,
    borderRadius: Radii.card,
    ...CardShadow,
  },
  splitTitle: { fontSize: 15, fontWeight: '600', color: Palette.textPrimary },
  splitSubtitle: { fontSize: 14, color: Palette.textSecondary, marginTop: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: Spacing.md,
    borderRadius: Radii.card,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...CardShadow,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '500', color: Palette.textPrimary },
  memberBalance: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  secureCaption: { fontSize: 12, color: Palette.textMuted, textAlign: 'center', marginTop: Spacing.md },
});
