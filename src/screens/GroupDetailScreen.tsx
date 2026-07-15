import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;

  const group = {
    id: groupId,
    name: 'Apartment 4B',
    totalExpenses: 450.0,
    members: [
      { id: '1', name: 'You', balance: 45.0 },
      { id: '2', name: 'Sarah', balance: -20.0 },
      { id: '3', name: 'Mike', balance: -25.0 },
    ],
  };

  const expenses = [
    { id: '1', description: 'Electricity bill', amount: 120.0, paidBy: 'You', date: 'Jul 10' },
    { id: '2', description: 'Groceries', amount: 85.0, paidBy: 'Sarah', date: 'Jul 8' },
    { id: '3', description: 'Internet', amount: 65.0, paidBy: 'Mike', date: 'Jul 5' },
    { id: '4', description: 'Cleaning supplies', amount: 32.0, paidBy: 'You', date: 'Jul 3' },
  ];

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Summary Card */}
      <LinearGradient
        colors={['#0A84FF', '#00C6FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryTop}>
          <Text style={styles.totalExpensesLabel}>Total Expense</Text>
          <Ionicons name="pie-chart" size={24} color="rgba(255,255,255,0.8)" />
        </View>
        <Text style={styles.totalExpensesAmount}>
          ₱{group.totalExpenses.toFixed(2)}
        </Text>
      </LinearGradient>


      {/* Balances Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balances</Text>
        {group.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={[styles.memberAvatar, { backgroundColor: member.balance >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' }]}>
              <Text style={[styles.avatarText, { color: member.balance >= 0 ? Colors.positive : Colors.negative }]}>
                {member.name[0]}
              </Text>
            </View>
            <Text style={styles.memberName}>{member.name}</Text>
            <View style={styles.memberRight}>
              <Text style={[styles.memberBalance, { color: member.balance >= 0 ? Colors.positive : Colors.negative }]}>
                {member.balance >= 0 ? 'Gets back ' : 'Owes '}₱{Math.abs(member.balance).toFixed(2)}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: member.balance >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)' }]}>
                <Text style={[styles.statusPillText, { color: member.balance >= 0 ? Colors.positive : Colors.warning }]}>
                  {member.balance >= 0 ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Expenses Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {expenses.map((expense) => (
          <View key={expense.id} style={styles.expenseItem}>
            <View style={styles.expenseIcon}>
              <Text style={styles.avatarText}>{expense.paidBy[0]}</Text>
            </View>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseDesc}>{expense.description}</Text>
              <Text style={styles.expenseMeta}>{expense.paidBy} • {expense.date}</Text>
            </View>
            <Text style={styles.expenseAmount}>₱{expense.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={styles.requestButton}
        onPress={() => navigation.navigate('SettleUp', { groupId, fromUserId: '3', toUserId: '1', amount: 25.0 })}
      >
        <LinearGradient
          colors={['#0A84FF', '#00C6FF']}
          style={styles.requestButtonGradient}
        >
          <Text style={styles.requestButtonText}>Request Payment</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
    </>
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
  summaryCard: {
    padding: 24,
    margin: 16,
    borderRadius: 24,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalExpensesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalExpensesAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberBalance: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  expenseMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  requestButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  requestButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

