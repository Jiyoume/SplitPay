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
  card: { backgroundColor: Colors.surface, margin: 16, padding: 24, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  title: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  item: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: Colors.border },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '600' },
});
