import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import * as localDB from '../services/localDatabase';
import { calculateGroupBalances } from '../utils/balance';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadData() {
        try {
          const fullGroup = await localDB.getGroup(groupId);
          if (!fullGroup) return;

          const groupExpenses = await localDB.getGroupExpenses(groupId);
          const groupPayments = await localDB.getGroupPayments(groupId);

          const memberBalances = calculateGroupBalances(
            fullGroup.members || [],
            groupExpenses,
            groupPayments
          );

          // Calculate total expenses for the group
          const totalExpenses = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

          // Map expenses to display names for paidBy
          const memberMap: Record<string, string> = {};
          fullGroup.members?.forEach((m: any) => {
            memberMap[m.id] = m.id === '1' ? 'You' : m.name;
          });

          const formattedExpenses = groupExpenses.map((exp) => ({
            id: exp.id,
            description: exp.description,
            amount: exp.amount,
            paidBy: memberMap[exp.paidBy] || 'Unknown User',
            date: new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          }));

          const formattedMembers = (fullGroup.members || []).map((m: any) => {
            const bal = memberBalances.find((b) => b.userId === m.id)?.balance || 0;
            return {
              id: m.id,
              name: m.id === '1' ? 'You' : m.name,
              balance: bal,
            };
          });

          if (active) {
            setGroup({
              id: fullGroup.id,
              name: fullGroup.name,
              totalExpenses,
              members: formattedMembers,
            });
            setExpenses(formattedExpenses);
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to load group details:', err);
        }
      }
      loadData();
      return () => {
        active = false;
      };
    }, [groupId])
  );

  if (loading || !group) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

    const debtor = group.members.find((m: any) => m.balance < 0);
    const creditor = group.members.find((m: any) => m.balance > 0);
    
    if (myBalance > 0) {
      // You are owed money. Find who owes the most (largest negative balance)
      const sortedDebtors = [...group.members]
        .filter((m: any) => m.balance < 0)
        .sort((a, b) => a.balance - b.balance);
      const mainDebtor = sortedDebtors[0];
      
      if (mainDebtor) {
        return {
          fromUserId: mainDebtor.id,
          toUserId: '1',
          amount: Math.abs(mainDebtor.balance)
        };
      }
    } else if (myBalance < 0) {
      // You owe money. Find who gets back the most (largest positive balance)
      const sortedCreditors = [...group.members]
        .filter((m: any) => m.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      const mainCreditor = sortedCreditors[0];
      
      if (mainCreditor) {
        return {
          fromUserId: '1',
          toUserId: mainCreditor.id,
          amount: Math.abs(myBalance)
        };
      }
    }
    
    // Fallback: if settled or no matching, check if any debtor/creditor exists at all
    const anyDebtor = group.members.find((m: any) => m.balance < 0);
    const anyCreditor = group.members.find((m: any) => m.balance > 0);
    if (anyDebtor && anyCreditor) {
      return {
        fromUserId: anyDebtor.id,
        toUserId: anyCreditor.id,
        amount: Math.min(Math.abs(anyDebtor.balance), Math.abs(anyCreditor.balance))
      };
    }
    
    return { fromUserId: '1', toUserId: '1', amount: 0 };
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.totalExpenses}>
          Total expenses: ₱{group.totalExpenses.toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balances</Text>
        {group.members.map((member: any) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>{member.name[0]}</Text>
            </View>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={[styles.memberBalance, { color: member.balance >= 0 ? Colors.positive : Colors.negative }]}>
              {member.balance >= 0 ? 'gets back ' : 'owes '}₱{Math.abs(member.balance).toFixed(2)}
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
          onPress={() => {
            const params = getSettleUpParams();
            if (params.amount > 0) {
              navigation.navigate('SettleUp', {
                groupId,
                fromUserId: params.fromUserId,
                toUserId: params.toUserId,
                amount: params.amount
              });
            } else {
              Alert.alert('All Settled!', 'No outstanding balances to settle in this group.');
            }
          }}
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
