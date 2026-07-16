import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { GradientButton, StatusPill, BalanceSummary, ExpenseCard, MemberAvatar } from '../components';

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

  const group = {
    id: groupId,
    name: 'Apartment 4B',
    emoji: '🏠',
    dateRange: 'Jul 1 – Jul 15, 2026',
    members: [
      { id: '1', name: 'You', balance: 2250.0 },
      { id: '2', name: 'Sarah Cruz', balance: -1000.0 },
      { id: '3', name: 'Mike Tan', balance: -1250.0 },
    ],
  };

  const expenses = [
    { id: '1', description: 'Electricity bill', amount: 6000.0, paidBy: 'You', date: 'Jul 10', category: 'utilities' },
    { id: '2', description: 'Groceries', amount: 4250.0, paidBy: 'Sarah Cruz', date: 'Jul 8', category: 'groceries' },
    { id: '3', description: 'Internet', amount: 3250.0, paidBy: 'Mike Tan', date: 'Jul 5', category: 'utilities' },
    { id: '4', description: 'Cleaning supplies', amount: 1600.0, paidBy: 'You', date: 'Jul 3', category: 'shopping' },
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const equalShare = totalExpenses / group.members.length;
  const visibleExpenses = showAllExpenses ? expenses : expenses.slice(0, COLLAPSED_EXPENSE_COUNT);
  const visibleAvatars = group.members.slice(0, MAX_VISIBLE_AVATARS);
  const avatarOverflow = group.members.length - visibleAvatars.length;

  const pendingMember = group.members.find((m) => m.balance < 0);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.cover, { paddingTop: insets.top + Spacing.xl }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + Spacing.lg }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={Palette.white} />
        </TouchableOpacity>
        <Text style={styles.coverEmoji}>{group.emoji}</Text>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.dateRange}>{group.dateRange}</Text>
        <View style={styles.avatarRow}>
          {visibleAvatars.map((member, i) => (
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
        {visibleExpenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            description={expense.description}
            amount={expense.amount}
            paidBy={expense.paidBy}
            date={expense.date}
            category={expense.category}
          />
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.splitCard}>
          <Text style={styles.splitTitle}>Equal Split</Text>
          <Text style={styles.splitSubtitle}>Each Member Owes {peso(equalShare)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Member Balances</Text>
        {group.members.map((member) => (
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
              toUserId: '1',
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
