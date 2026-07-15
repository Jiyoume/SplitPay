import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface BalanceSummaryProps {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
}

export default function BalanceSummary({ totalBalance, youOwe, youAreOwed }: BalanceSummaryProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Total Balance</Text>
      <Text style={[styles.amount, { color: totalBalance >= 0 ? Colors.positive : Colors.negative }]}>
        {totalBalance >= 0 ? '+$' : '-$'}{Math.abs(totalBalance).toFixed(2)}
      </Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.label}>You owe</Text>
          <Text style={[styles.value, { color: Colors.negative }]}>${youOwe.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.label}>You are owed</Text>
          <Text style={[styles.value, { color: Colors.positive }]}>${youAreOwed.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 2,
  },
  title: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  amount: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  item: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: Colors.border },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  value: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
