import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import StatusPill from './StatusPill';

interface BalanceSummaryProps {
  label: string;
  amount: number;
  trendLabel?: string;
  trendPositive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onIconPress?: () => void;
}

export default function BalanceSummary({
  label,
  amount,
  trendLabel,
  trendPositive = true,
  icon = 'bar-chart-outline',
  onIconPress,
}: BalanceSummaryProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onIconPress}
          disabled={!onIconPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={icon} size={18} color={Palette.accent} />
        </TouchableOpacity>
      </View>
      <Text style={styles.amount}>{peso(amount)}</Text>
      {trendLabel && <StatusPill label={trendLabel} status={trendPositive ? 'positive' : 'negative'} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radii.card,
    ...CardShadow,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, color: Palette.textSecondary },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amount: { fontSize: 32, fontWeight: '700', color: Palette.textPrimary, marginTop: Spacing.sm, marginBottom: Spacing.sm },
});
