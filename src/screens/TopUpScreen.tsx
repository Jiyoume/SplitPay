import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';

const METHODS = [
  { id: 'gcash', icon: '💚', name: 'GCash', fee: '1.5%', time: 'Instant' },
  { id: 'maya', icon: '💜', name: 'Maya', fee: '1.5%', time: 'Instant' },
  { id: 'bank', icon: '🏦', name: 'Bank Transfer', fee: '₱15', time: '5-30 min' },
  { id: 'card', icon: '💳', name: 'Debit/Credit Card', fee: '2.5%', time: 'Instant' },
  { id: 'stellar', icon: '⭐', name: 'Stellar Anchor', fee: '~1%', time: '1-5 min' },
];

export default function TopUpScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState('gcash');
  const [amount, setAmount] = useState('');

  const handleTopUp = () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount.');
      return;
    }
    const method = METHODS.find((m) => m.id === selected);
    Alert.alert('Top-Up Initiated', `${peso(Number(amount))} via ${method?.name}\nFee: ${method?.fee}\n\nProcessing...`);
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Top Up Wallet</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <View style={s.amountCard}>
          <Text style={s.currency}>₱</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Palette.textMuted}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={s.quickAmounts}>
          {[500, 1000, 2000, 5000].map((a) => (
            <TouchableOpacity key={a} style={s.quickBtn} onPress={() => setAmount(String(a))}>
              <Text style={s.quickText}>{peso(a)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionTitle}>Select Method</Text>
        <View style={s.card}>
          {METHODS.map((m, idx) => (
            <TouchableOpacity
              key={m.id}
              style={[s.methodRow, idx === METHODS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setSelected(m.id)}
            >
              <Text style={{ fontSize: 26 }}>{m.icon}</Text>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={s.methodName}>{m.name}</Text>
                <Text style={s.methodMeta}>Fee: {m.fee} • {m.time}</Text>
              </View>
              <View style={[s.radio, selected === m.id && s.radioActive]}>
                {selected === m.id && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <GradientButton title="Top Up Now" onPress={handleTopUp} style={{ marginBottom: Spacing.lg }} />

        <View style={s.securityNote}>
          <Ionicons name="lock-closed" size={14} color={Palette.textMuted} />
          <Text style={s.secNoteText}>Secured by Stellar blockchain. Only verified accounts can receive payments.</Text>
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

  amountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.card, borderRadius: Radii.card, paddingVertical: Spacing.xl, marginBottom: Spacing.md, ...CardShadow },
  currency: { fontSize: 28, fontWeight: '700', color: Palette.accent, marginRight: Spacing.xs },
  amountInput: { fontSize: 42, fontWeight: '700', color: Palette.textPrimary, minWidth: 120, textAlign: 'center' },
  quickAmounts: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  quickBtn: { flex: 1, paddingVertical: Spacing.md, backgroundColor: Palette.card, borderRadius: Radii.input, borderWidth: 1, borderColor: Palette.border, alignItems: 'center' },
  quickText: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.md },
  card: { backgroundColor: Palette.card, borderRadius: Radii.card, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, ...CardShadow },
  methodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Palette.border },
  methodName: { color: Palette.textPrimary, fontSize: 15, fontWeight: '600' },
  methodMeta: { color: Palette.textSecondary, fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Palette.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Palette.accent },

  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingBottom: Spacing.xl },
  secNoteText: { flex: 1, color: Palette.textMuted, fontSize: 12, lineHeight: 16 },
});
