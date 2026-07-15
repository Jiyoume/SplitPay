import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ExpenseCardProps {
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  category?: string;
  onPress?: () => void;
}

export default function ExpenseCard({ description, amount, paidBy, date, onPress }: ExpenseCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.icon}>
        <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.meta}>Paid by {paidBy} • {date}</Text>
      </View>
      <Text style={styles.amount}>${amount.toFixed(2)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '500', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  amount: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: Colors.text,
  },
});
