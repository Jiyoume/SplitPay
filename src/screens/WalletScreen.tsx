import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WalletScreen() {
  const navigation = useNavigation<Nav>();
  const xlmBalance = '124.50';
  const srtBalance = '2,500.00';
  const address = 'GBKX...Q4F7...STELLAR';

  const transactions = [
    { id: '1', type: 'in', desc: 'Received from Maria', time: 'Today, 2:30 PM', amount: '+350 SRT' },
    { id: '2', type: 'out', desc: 'Sent to Carlos', time: 'Yesterday, 8:15 PM', amount: '-180 SRT' },
    { id: '3', type: 'topup', desc: 'Top-up via GCash', time: 'Jul 13, 10:00 AM', amount: '+1,000 SRT' },
    { id: '4', type: 'in', desc: 'Received from Jake', time: 'Jul 12, 5:00 PM', amount: '+600 SRT' },
  ];

  return (
    <ScrollView style={s.container}>
      {/* Balance Card */}
      <View style={s.balanceCard}>
        <Text style={s.cardTitle}>Stellar Wallet</Text>
        <View style={s.balRow}>
          <View style={s.balItem}><Text style={s.balLabel}>XLM</Text><Text style={s.balValue}>{xlmBalance}</Text></View>
          <View style={s.balItem}><Text style={s.balLabel}>SRT</Text><Text style={s.balValue}>{srtBalance}</Text></View>
        </View>
        <View style={s.addressRow}>
          <Text style={s.address}>{address}</Text>
          <TouchableOpacity onPress={() => Alert.alert('Copied!', 'Stellar address copied to clipboard.')}><Text style={s.copyBtn}>Copy</Text></TouchableOpacity>
        </View>
      </View>

      {/* Top Up Button */}
      <TouchableOpacity style={s.topUpBtn} onPress={() => navigation.navigate('TopUp')}>
        <Ionicons name="add-circle" size={20} color="#000" />
        <Text style={s.topUpText}>Top Up Wallet</Text>
      </TouchableOpacity>

      {/* Top Up Methods */}
      <View style={s.methods}>
        {[{ icon: '💚', label: 'GCash' }, { icon: '💜', label: 'Maya' }, { icon: '🏦', label: 'Bank' }, { icon: '💳', label: 'Card' }, { icon: '⭐', label: 'Stellar' }].map(m => (
          <TouchableOpacity key={m.label} style={s.methodItem} onPress={() => navigation.navigate('TopUp')}>
            <Text style={{ fontSize: 22 }}>{m.icon}</Text>
            <Text style={s.methodLabel}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions */}
      <Text style={s.sectionTitle}>Recent Transactions</Text>
      <View style={s.txList}>
        {transactions.map(tx => (
          <View key={tx.id} style={s.txRow}>
            <View style={s.txIcon}><Text>{tx.type === 'in' ? '↓' : tx.type === 'topup' ? '💳' : '↑'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.txDesc}>{tx.desc}</Text>
              <Text style={s.txTime}>{tx.time}</Text>
            </View>
            <Text style={[s.txAmt, { color: tx.type === 'out' ? '#FF453A' : '#30D158' }]}>{tx.amount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  balanceCard: { margin: 16, padding: 24, backgroundColor: '#1C1C1E', borderRadius: 20 },
  cardTitle: { color: '#8E8E93', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  balRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  balItem: { flex: 1, backgroundColor: '#2C2C2E', borderRadius: 14, padding: 14 },
  balLabel: { color: '#8E8E93', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  balValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 10, padding: 10, gap: 8 },
  address: { flex: 1, color: '#8E8E93', fontSize: 12, fontFamily: 'monospace' },
  copyBtn: { color: '#0A84FF', fontSize: 13, fontWeight: '700' },
  topUpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, marginTop: 0, padding: 16, backgroundColor: '#FFB800', borderRadius: 14 },
  topUpText: { fontSize: 16, fontWeight: '700', color: '#000' },
  methods: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 24 },
  methodItem: { alignItems: 'center', gap: 4 },
  methodLabel: { color: '#8E8E93', fontSize: 11, fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginHorizontal: 16, marginBottom: 12 },
  txList: { marginHorizontal: 16, backgroundColor: '#1C1C1E', borderRadius: 16, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: '#2C2C2E' },
  txIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txDesc: { color: '#fff', fontSize: 14, fontWeight: '600' },
  txTime: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700' },
});
