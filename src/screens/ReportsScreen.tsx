import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';

const BUDGET_ITEMS = [
  { icon: '🍜', cat: 'Food & Dining', spent: 4200, budget: 5000, color: Palette.accent },
  { icon: '🚐', cat: 'Transport', spent: 1800, budget: 2000, color: Palette.pending },
  { icon: '⚡', cat: 'Utilities', spent: 3100, budget: 3000, color: Palette.negative },
  { icon: '🛍️', cat: 'Shopping', spent: 900, budget: 3000, color: Palette.gradientStart },
];

export default function ReportsScreen() {
  const navigation = useNavigation();
  const [month] = useState('July 2026');

  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingTop: insets.top }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Reports</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <View style={s.monthSelector}>
          <TouchableOpacity style={s.monthNav}><Ionicons name="chevron-back" size={18} color={Palette.textPrimary} /></TouchableOpacity>
          <Text style={s.monthText}>{month}</Text>
          <TouchableOpacity style={s.monthNav}><Ionicons name="chevron-forward" size={18} color={Palette.textPrimary} /></TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Monthly Statement</Text>
          <View style={s.row}><Text style={s.label}>Opening Balance</Text><Text style={s.value}>{peso(3200)}</Text></View>
          <View style={s.divider} />
          <View style={s.row}><Text style={s.label}>Total Inflows</Text><Text style={[s.value, { color: Palette.positive }]}>{peso(8750, { sign: true })}</Text></View>
          <View style={s.row}><Text style={s.label}>Total Outflows</Text><Text style={[s.value, { color: Palette.negative }]}>{peso(-7699.5, { sign: true })}</Text></View>
          <View style={s.divider} />
          <View style={s.row}><Text style={s.label}>Closing Balance</Text><Text style={[s.value, { fontSize: 18 }]}>{peso(4250.5)}</Text></View>
        </View>

        <View style={s.statsGrid}>
          <View style={s.stat}><Text style={s.statLabel}>Total Spent</Text><Text style={s.statVal}>₱12.4K</Text><Text style={s.statChangePos}>↑ 8%</Text></View>
          <View style={s.stat}><Text style={s.statLabel}>Owed to You</Text><Text style={s.statVal}>₱3.2K</Text><Text style={s.statChangeNeutral}>2 pending</Text></View>
          <View style={s.stat}><Text style={s.statLabel}>Groups</Text><Text style={s.statVal}>4</Text><Text style={s.statChangeNeutral}>1 new</Text></View>
          <View style={s.stat}><Text style={s.statLabel}>Transactions</Text><Text style={s.statVal}>28</Text><Text style={s.statChangePos}>↑ 12%</Text></View>
        </View>

        <Text style={s.sectionTitle}>Budget Tracker</Text>
        <View style={s.card}>
          {BUDGET_ITEMS.map((b, idx) => (
            <View key={b.cat} style={[s.budgetItem, idx === BUDGET_ITEMS.length - 1 && { marginBottom: 0 }]}>
              <View style={s.budgetIcon}><Text style={{ fontSize: 18 }}>{b.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.budgetLabel}>{b.cat}</Text>
                <View style={s.bar}><View style={[s.barFill, { width: `${Math.min(100, (b.spent / b.budget) * 100)}%`, backgroundColor: b.color }]} /></View>
              </View>
              <Text style={[s.budgetMeta, b.spent > b.budget && { color: Palette.negative }]}>
                {peso(b.spent)} / {peso(b.budget)}
              </Text>
            </View>
          ))}
        </View>

        <GradientButton
          title="Export CSV"
          onPress={() => Alert.alert('Export', 'Statement exported to CSV!')}
          style={{ marginBottom: Spacing.xl }}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Palette.textPrimary, textAlign: 'center' },

  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.md },
  monthNav: { width: 36, height: 36, borderRadius: 18, backgroundColor: Palette.card, alignItems: 'center', justifyContent: 'center', ...CardShadow },
  monthText: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, minWidth: 120, textAlign: 'center' },

  card: { backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.lg, ...CardShadow },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  label: { color: Palette.textSecondary, fontSize: 13 },
  value: { color: Palette.textPrimary, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Spacing.sm },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  stat: { width: '48%', backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.md, ...CardShadow },
  statLabel: { color: Palette.textSecondary, fontSize: 11, fontWeight: '600' },
  statVal: { color: Palette.textPrimary, fontSize: 20, fontWeight: '700', marginTop: Spacing.xs },
  statChangePos: { color: Palette.positive, fontSize: 11, marginTop: Spacing.xs, fontWeight: '600' },
  statChangeNeutral: { color: Palette.textMuted, fontSize: 11, marginTop: Spacing.xs, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.md },
  budgetItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  budgetIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center' },
  budgetLabel: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: Spacing.xs },
  bar: { height: 6, borderRadius: 3, backgroundColor: Palette.background, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  budgetMeta: { color: Palette.textSecondary, fontSize: 11, fontWeight: '600', minWidth: 90, textAlign: 'right' },
});
