import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import { EXPENSE_CATEGORIES } from '../constants';

interface ExpenseCardProps {
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  category?: string;
  onPress?: () => void;
}

function iconForCategory(category?: string): keyof typeof Ionicons.glyphMap {
  const match = EXPENSE_CATEGORIES.find((c) => c.id === category);
  return (match?.icon as keyof typeof Ionicons.glyphMap) ?? 'receipt-outline';
}

export default function ExpenseCard({ description, amount, paidBy, date, category, onPress }: ExpenseCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.85 : 1}>
      <View style={styles.icon}>
        <Ionicons name={iconForCategory(category)} size={20} color={Palette.accent} />
      </View>
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>{description}</Text>
        <Text style={styles.meta}>Paid by {paidBy} · {date}</Text>
      </View>
      <Text style={styles.amount}>{peso(amount)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: Spacing.md,
    borderRadius: Radii.card,
    marginBottom: Spacing.sm,
    ...CardShadow,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  info: { flex: 1, marginRight: Spacing.sm },
  description: { fontSize: 15, fontWeight: '500', color: Palette.textPrimary },
  meta: { fontSize: 12, color: Palette.textSecondary, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '600', color: Palette.textPrimary },
});
