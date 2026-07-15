import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import * as localDB from '../services/localDatabase';
import { calculateGroupBalances } from '../utils/balance';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [totalBalance, setTotalBalance] = useState(0);
  const [youOwe, setYouOwe] = useState(0);
  const [youAreOwed, setYouAreOwed] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadData() {
        try {
          // 1. Calculate balances
          const userGroups = await localDB.getUserGroups('1');
          let totalOwed = 0;
          let totalOwe = 0;

          for (const g of userGroups) {
            const fullGroup = await localDB.getGroup(g.id);
            if (!fullGroup) continue;

            const expenses = await localDB.getGroupExpenses(g.id);
            const payments = await localDB.getGroupPayments(g.id);

            const balances = calculateGroupBalances(
              fullGroup.members || [],
              expenses,
              payments
            );

            const myBalance = balances.find((b) => b.userId === '1')?.balance || 0;
            if (myBalance > 0) {
              totalOwed += myBalance;
            } else if (myBalance < 0) {
              totalOwe += Math.abs(myBalance);
            }
          }

          // 2. Fetch recent expenses
          const recentExpenses = await localDB.getRecentExpenses('1', 5);
          const activityItems = [];

          for (const exp of recentExpenses) {
            const groupInfo = await localDB.getGroup(exp.groupId);
            activityItems.push({
              id: exp.id,
              description: exp.description,
              amount: exp.amount,
              group: groupInfo?.name || 'Unknown Group',
              date: new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            });
          }

          if (active) {
            setTotalBalance(totalOwed - totalOwe);
            setYouOwe(totalOwe);
            setYouAreOwed(totalOwed);
            setRecentActivity(activityItems);
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to load home screen data:', err);
        }
      }
      loadData();
      return () => {
        active = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Balance Summary Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Total Balance</Text>
        <Text style={[styles.balanceAmount, { color: totalBalance >= 0 ? Colors.positive : Colors.negative }]}>
          {totalBalance >= 0 ? '+' : ''}{totalBalance >= 0 ? '$' : '-$'}{Math.abs(totalBalance).toFixed(2)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>You owe</Text>
            <Text style={[styles.balanceValue, { color: Colors.negative }]}>
              ${youOwe.toFixed(2)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>You are owed</Text>
            <Text style={[styles.balanceValue, { color: Colors.positive }]}>
              ${youAreOwed.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddExpense', {})}
        >
          <Ionicons name="add-circle" size={32} color={Colors.primary} />
          <Text style={styles.actionLabel}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name="people-circle" size={32} color={Colors.secondary} />
          <Text style={styles.actionLabel}>New Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="wallet" size={32} color={Colors.accent} />
          <Text style={styles.actionLabel}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentActivity.map((item) => (
          <View key={item.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityDescription}>{item.description}</Text>
              <Text style={styles.activityMeta}>{item.group} • {item.date}</Text>
            </View>
            <Text style={styles.activityAmount}>${item.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  balanceTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
