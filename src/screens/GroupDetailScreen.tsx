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
    <ScrollView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.totalExpenses}>
          Total expenses: ${group.totalExpenses.toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balances</Text>
        {group.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>{member.name[0]}</Text>
            </View>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={[styles.memberBalance, { color: member.balance >= 0 ? Colors.positive : Colors.negative }]}>
              {member.balance >= 0 ? 'gets back ' : 'owes '}${Math.abs(member.balance).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddExpense', { groupId })}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.actionBtnText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.settleBtn]}
          onPress={() => navigation.navigate('SettleUp', { groupId, fromUserId: '3', toUserId: '1', amount: 25.0 })}
        >
          <Ionicons name="wallet" size={20} color={Colors.white} />
          <Text style={styles.actionBtnText}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {expenses.map((expense) => (
          <View key={expense.id} style={styles.expenseItem}>
            <View style={styles.expenseIcon}>
              <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseDesc}>{expense.description}</Text>
              <Text style={styles.expenseMeta}>Paid by {expense.paidBy} • {expense.date}</Text>
            </View>
            <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summaryCard: { backgroundColor: Colors.primary, padding: 24, margin: 16, borderRadius: 16, alignItems: 'center' },
  groupName: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 6 },
  totalExpenses: { fontSize: 14, color: Colors.primaryLight },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 10, marginBottom: 6 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },
  memberName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  memberBalance: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, padding: 14, borderRadius: 12, gap: 8 },
  settleBtn: { backgroundColor: Colors.secondary },
  actionBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  expenseItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 10, marginBottom: 6 },
  expenseIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: '500', color: Colors.text },
  expenseMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  expenseAmount: { fontSize: 16, fontWeight: '600', color: Colors.text },
});
