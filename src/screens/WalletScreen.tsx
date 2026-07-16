import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const METHODS = [
  { icon: '💚', label: 'GCash' },
  { icon: '💜', label: 'Maya' },
  { icon: '🏦', label: 'Bank' },
  { icon: '💳', label: 'Card' },
  { icon: '⭐', label: 'Stellar' },
];

export default function WalletScreen() {
  const navigation = useNavigation<Nav>();
  const srtBalance = 2500.0; // 1 SRT ≈ ₱1 (testnet peg)
  const xlmBalance = '124.50';
  const address = 'GBKX...Q4F7...STELLAR';

  const transactions = [
    { id: '1', type: 'in', desc: 'Received from Maria', time: 'Today, 2:30 PM', amount: 350 },
    { id: '2', type: 'out', desc: 'Sent to Carlos', time: 'Yesterday, 8:15 PM', amount: -180 },
    { id: '3', type: 'topup', desc: 'Top-up via GCash', time: 'Jul 13, 10:00 AM', amount: 1000 },
    { id: '4', type: 'in', desc: 'Received from Jake', time: 'Jul 12, 5:00 PM', amount: 600 },
  ];

  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingTop: insets.top }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Wallet</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceValue}>{peso(srtBalance)}</Text>
          <View style={s.xlmRow}>
            <Ionicons name="star" size={14} color={Palette.textMuted} />
            <Text style={s.xlmText}>{xlmBalance} XLM (network gas)</Text>
          </View>
          <View style={s.addressRow}>
            <Text style={s.address} numberOfLines={1}>{address}</Text>
            <TouchableOpacity onPress={() => Alert.alert('Copied!', 'Stellar address copied to clipboard.')}>
              <Text style={s.copyBtn}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <GradientButton title="Top Up Wallet" onPress={() => navigation.navigate('TopUp')} style={{ marginBottom: Spacing.lg }} />

        <View style={s.card}>
          <Text style={s.sectionTitle}>Top Up Methods</Text>
          <View style={s.methods}>
            {METHODS.map((m) => (
              <TouchableOpacity key={m.label} style={s.methodItem} onPress={() => navigation.navigate('TopUp')}>
                <Text style={{ fontSize: 22 }}>{m.icon}</Text>
                <Text style={s.methodLabel}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={s.sectionTitle}>Recent Transactions</Text>
        <View style={s.card}>
          {transactions.map((tx, idx) => (
            <View key={tx.id} style={[s.txRow, idx === transactions.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.txIcon}>
                <Ionicons
                  name={tx.type === 'in' ? 'arrow-down' : tx.type === 'topup' ? 'add' : 'arrow-up'}
                  size={18}
                  color={Palette.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.txDesc}>{tx.desc}</Text>
                <Text style={s.txTime}>{tx.time}</Text>
              </View>
              <Text style={[s.txAmt, { color: tx.amount < 0 ? Palette.negative : Palette.positive }]}>
                {peso(tx.amount, { sign: true })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Palette.textPrimary, textAlign: 'center' },

  balanceCard: { backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.xl, marginBottom: Spacing.lg, ...CardShadow },
  balanceLabel: { fontSize: 13, color: Palette.textSecondary, fontWeight: '600' },
  balanceValue: { fontSize: 32, fontWeight: '700', color: Palette.textPrimary, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  xlmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  xlmText: { fontSize: 12, color: Palette.textMuted },
  addressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.background, borderRadius: Radii.input, padding: Spacing.sm, gap: Spacing.sm },
  address: { flex: 1, color: Palette.textSecondary, fontSize: 12, fontFamily: 'monospace' },
  copyBtn: { color: Palette.accent, fontSize: 13, fontWeight: '700' },

  card: { backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.lg, ...CardShadow },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.md },
  methods: { flexDirection: 'row', justifyContent: 'space-between' },
  methodItem: { alignItems: 'center', gap: 4, minWidth: 44 },
  methodLabel: { color: Palette.textSecondary, fontSize: 11, fontWeight: '600' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Palette.border },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  txDesc: { color: Palette.textPrimary, fontSize: 14, fontWeight: '600' },
  txTime: { color: Palette.textMuted, fontSize: 12, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700' },
});
