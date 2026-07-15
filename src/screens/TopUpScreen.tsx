import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';

const METHODS = [
  { id: 'gcash', icon: '💚', name: 'GCash', fee: '1.5%', time: 'Instant' },
  { id: 'maya', icon: '💜', name: 'Maya', fee: '1.5%', time: 'Instant' },
  { id: 'bank', icon: '🏦', name: 'Bank Transfer', fee: '₱15', time: '5-30 min' },
  { id: 'card', icon: '💳', name: 'Debit/Credit Card', fee: '2.5%', time: 'Instant' },
  { id: 'stellar', icon: '⭐', name: 'Stellar Anchor', fee: '~1%', time: '1-5 min' },
];

export default function TopUpScreen() {
  const [selected, setSelected] = useState('gcash');
  const [amount, setAmount] = useState('');

  const handleTopUp = () => {
    if (!amount || Number(amount) <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    const method = METHODS.find(m => m.id === selected);
    Alert.alert('Top-Up Initiated', `₱${Number(amount).toLocaleString()} via ${method?.name}\nFee: ${method?.fee}\n\nProcessing...`);
  };

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Select Method</Text>
      {METHODS.map(m => (
        <TouchableOpacity key={m.id} style={[s.methodCard, selected === m.id && s.methodActive]} onPress={() => setSelected(m.id)}>
          <Text style={{ fontSize: 28 }}>{m.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.methodName}>{m.name}</Text>
            <Text style={s.methodMeta}>Fee: {m.fee} • {m.time}</Text>
          </View>
          {selected === m.id && <View style={s.check}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text></View>}
        </TouchableOpacity>
      ))}

      <Text style={[s.title, { marginTop: 24 }]}>Enter Amount</Text>
      <View style={s.amountBox}>
        <Text style={s.currency}>₱</Text>
        <TextInput style={s.amountInput} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#636366" keyboardType="decimal-pad" />
      </View>

      <View style={s.quickAmounts}>
        {[500, 1000, 2000, 5000].map(a => (
          <TouchableOpacity key={a} style={s.quickBtn} onPress={() => setAmount(String(a))}>
            <Text style={s.quickText}>₱{a.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.submitBtn} onPress={handleTopUp}>
        <Text style={s.submitText}>Top Up Now</Text>
      </TouchableOpacity>

      <View style={s.securityNote}>
        <Text style={s.secNoteText}>🔒 Secured by Stellar blockchain. Only verified accounts can receive payments.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#1C1C1E', borderRadius: 16, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  methodActive: { borderColor: '#0A84FF', backgroundColor: '#0A84FF10' },
  methodName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  methodMeta: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center' },
  amountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E', borderRadius: 20, padding: 24, marginBottom: 16 },
  currency: { color: '#0A84FF', fontSize: 28, fontWeight: '800', marginRight: 4 },
  amountInput: { color: '#fff', fontSize: 42, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  quickBtn: { flex: 1, padding: 12, backgroundColor: '#2C2C2E', borderRadius: 10, alignItems: 'center' },
  quickText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  submitBtn: { padding: 18, backgroundColor: '#30D158', borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  submitText: { color: '#000', fontSize: 18, fontWeight: '800' },
  securityNote: { padding: 14, backgroundColor: '#1C1C1E', borderRadius: 12 },
  secNoteText: { color: '#8E8E93', fontSize: 12, textAlign: 'center' },
});
