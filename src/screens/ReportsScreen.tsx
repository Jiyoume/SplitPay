import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function ReportsScreen() {
  const [month, setMonth] = useState('July 2026');

  return (
    <ScrollView style={s.container}>
      {/* Month Selector */}
      <View style={s.monthSelector}>
        <TouchableOpacity style={s.monthNav}><Text style={s.navText}>‹</Text></TouchableOpacity>
        <Text style={s.monthText}>{month}</Text>
        <TouchableOpacity style={s.monthNav}><Text style={s.navText}>›</Text></TouchableOpacity>
      </View>

      {/* Statement Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📋 Monthly Statement</Text>
        <View style={s.row}><Text style={s.label}>Opening Balance</Text><Text style={s.value}>₱3,200.00</Text></View>
        <View style={s.divider} />
        <View style={s.row}><Text style={s.label}>Total Inflows</Text><Text style={[s.value, { color: '#30D158' }]}>+₱8,750.00</Text></View>
        <View style={s.row}><Text style={s.label}>Total Outflows</Text><Text style={[s.value, { color: '#FF453A' }]}>-₱7,699.50</Text></View>
        <View style={s.divider} />
        <View style={s.row}><Text style={s.label}>Closing Balance</Text><Text style={[s.value, { fontSize: 18 }]}>₱4,250.50</Text></View>
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        <View style={s.stat}><Text style={s.statLabel}>Total Spent</Text><Text style={s.statVal}>₱12.4K</Text><Text style={s.statChange}>↑ 8%</Text></View>
        <View style={s.stat}><Text style={s.statLabel}>Owed to You</Text><Text style={s.statVal}>₱3.2K</Text><Text style={s.statChange}>2 pending</Text></View>
        <View style={s.stat}><Text style={s.statLabel}>Groups</Text><Text style={s.statVal}>4</Text><Text style={s.statChange}>1 new</Text></View>
        <View style={s.stat}><Text style={s.statLabel}>Transactions</Text><Text style={s.statVal}>28</Text><Text style={s.statChange}>↑ 12%</Text></View>
      </View>

      {/* Budget Tracker */}
      <Text style={s.sectionTitle}>Budget Tracker</Text>
      <View style={s.card}>
        {[
          { icon: '🍜', cat: 'Food & Dining', spent: 4200, budget: 5000, color: '#0A84FF' },
          { icon: '🚐', cat: 'Transport', spent: 1800, budget: 2000, color: '#FF9F0A' },
          { icon: '⚡', cat: 'Utilities', spent: 3100, budget: 3000, color: '#FF453A' },
          { icon: '🛍️', cat: 'Shopping', spent: 900, budget: 3000, color: '#5E5CE6' },
        ].map(b => (
          <View key={b.cat} style={s.budgetItem}>
            <View style={s.budgetIcon}><Text style={{ fontSize: 18 }}>{b.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.budgetLabel}>{b.cat}</Text>
              <View style={s.bar}><View style={[s.barFill, { width: `${Math.min(100, (b.spent / b.budget) * 100)}%`, backgroundColor: b.color }]} /></View>
            </View>
            <Text style={[s.budgetMeta, b.spent > b.budget && { color: '#FF453A' }]}>₱{b.spent.toLocaleString()}/{b.budget.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {/* Export */}
      <TouchableOpacity style={s.exportBtn} onPress={() => Alert.alert('Export', 'Statement exported to CSV!')}>
        <Text style={s.exportText}>📤 Export CSV</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  monthNav: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  monthText: { color: '#fff', fontSize: 17, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  card: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: '#1C1C1E', borderRadius: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#8E8E93', fontSize: 13 },
  value: { color: '#fff', fontSize: 14, fontWeight: '700' },
  divider: { height: 0.5, backgroundColor: '#3A3A3C', marginVertical: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 20 },
  stat: { width: '47%', backgroundColor: '#1C1C1E', borderRadius: 14, padding: 14 },
  statLabel: { color: '#8E8E93', fontSize: 11, fontWeight: '600' },
  statVal: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4 },
  statChange: { color: '#30D158', fontSize: 11, marginTop: 4, fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginHorizontal: 16, marginBottom: 12 },
  budgetItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  budgetIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  budgetLabel: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#2C2C2E', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  budgetMeta: { color: '#8E8E93', fontSize: 11, fontWeight: '600', minWidth: 80, textAlign: 'right' },
  exportBtn: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#30D158', alignItems: 'center' },
  exportText: { color: '#30D158', fontSize: 15, fontWeight: '700' },
});
