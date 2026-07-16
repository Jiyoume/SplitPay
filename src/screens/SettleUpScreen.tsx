import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import MemberAvatar from '../components/MemberAvatar';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import { getGroup, savePayment } from '../services/localDatabase';

type SettleUpRouteProp = RouteProp<RootStackParamList, 'SettleUp'>;

const METHODS = ['Cash', 'Bank Transfer', 'GCash'];

export default function SettleUpScreen() {
  const navigation = useNavigation();
  const route = useRoute<SettleUpRouteProp>();
  const { groupId, fromUserId, toUserId, amount } = route.params;
  const [payAmount, setPayAmount] = useState(amount.toFixed(2));
  const [note, setNote] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [fromName, setFromName] = useState('Someone');
  const [toName, setToName] = useState('Someone');

  useEffect(() => {
    async function loadMembers() {
      try {
        const g = await getGroup(groupId);
        if (g) {
          const fromUser = g.members.find(m => m.id === fromUserId);
          const toUser = g.members.find(m => m.id === toUserId);
          setFromName(fromUserId === 'me' ? 'You' : (fromUser?.name || 'Someone'));
          setToName(toUserId === 'me' ? 'You' : (toUser?.name || 'Someone'));
        }
      } catch (err) {
        console.error('Failed to load group members in SettleUpScreen:', err);
      }
    }
    loadMembers();
  }, [groupId, fromUserId, toUserId]);

  const handleSettle = async () => {
    const numericAmount = parseFloat(payAmount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const newPayment = {
        id: Math.random().toString(36).substring(2, 9),
        groupId,
        fromUserId,
        toUserId,
        amount: numericAmount,
        date: new Date(),
        note: note || undefined,
        settled: true,
      };

      await savePayment(newPayment);

      Alert.alert('Payment Recorded', `${fromName} settled ${peso(numericAmount)} with ${toName}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to save payment:', err);
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settle Up</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <View style={s.avatarSection}>
          <View style={s.avatarRow}>
            <MemberAvatar name={fromName} size={56} backgroundColor={Palette.gradientEnd} />
            <Ionicons name="arrow-forward" size={20} color={Palette.textMuted} />
            <MemberAvatar name={toName} size={56} backgroundColor={Palette.accent} />
          </View>
          <Text style={s.settleLabel}>{fromName} pays {toName}</Text>
        </View>

        <View style={s.amountCard}>
          <Text style={s.currency}>₱</Text>
          <TextInput
            style={s.amountInput}
            value={payAmount}
            onChangeText={setPayAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Note (optional)</Text>
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor={Palette.textMuted}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Payment Method</Text>
          <View style={s.methods}>
            {METHODS.map((m) => (
              <TouchableOpacity key={m} style={[s.methodChip, method === m && s.methodChipActive]} onPress={() => setMethod(m)}>
                <Text style={[s.methodText, method === m && s.methodTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <GradientButton title="Record Payment" onPress={handleSettle} style={{ marginTop: Spacing.sm, marginBottom: Spacing.xl }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Palette.textPrimary, textAlign: 'center' },

  avatarSection: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  settleLabel: { fontSize: 15, color: Palette.textSecondary, marginTop: Spacing.md, fontWeight: '500' },

  amountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.card, borderRadius: Radii.card, paddingVertical: Spacing.xl, marginBottom: Spacing.lg, ...CardShadow },
  currency: { fontSize: 26, fontWeight: '700', color: Palette.accent, marginRight: Spacing.xs },
  amountInput: { fontSize: 40, fontWeight: '700', color: Palette.textPrimary, textAlign: 'center', minWidth: 100 },

  field: { marginBottom: Spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: Palette.textSecondary, marginBottom: Spacing.sm },
  input: { backgroundColor: Palette.card, borderRadius: Radii.input, minHeight: 48, paddingHorizontal: Spacing.md, fontSize: 15, color: Palette.textPrimary, borderWidth: 1, borderColor: Palette.border },
  methods: { flexDirection: 'row', gap: Spacing.sm },
  methodChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.border },
  methodChipActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  methodText: { fontSize: 13, color: Palette.textSecondary, fontWeight: '600' },
  methodTextActive: { color: Palette.white },
});
