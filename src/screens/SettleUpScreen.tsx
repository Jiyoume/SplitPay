import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type SettleUpRouteProp = RouteProp<RootStackParamList, 'SettleUp'>;

export default function SettleUpScreen() {
  const navigation = useNavigation();
  const route = useRoute<SettleUpRouteProp>();
  const { amount } = route.params;
  const [payAmount, setPayAmount] = useState(amount.toFixed(2));
  const [note, setNote] = useState('');

  const handleSettle = () => {
    Alert.alert('Payment Recorded', `You settled $${payAmount}`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={Colors.textSecondary} />
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.avatarText}>Y</Text>
          </View>
        </View>
        <Text style={styles.settleLabel}>Mike pays You</Text>
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={payAmount}
          onChangeText={setPayAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.methodSection}>
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.methods}>
          {['Cash', 'Bank Transfer', 'PayPal'].map((method) => (
            <TouchableOpacity key={method} style={styles.methodChip}>
              <Text style={styles.methodText}>{method}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.settleButton} onPress={handleSettle}>
        <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
        <Text style={styles.settleButtonText}>Record Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: Colors.white },
  settleLabel: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 20 },
  currencySymbol: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  amountInput: { fontSize: 42, fontWeight: '700', color: Colors.text, textAlign: 'center', minWidth: 80 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  methodSection: { marginBottom: 24 },
  methods: { flexDirection: 'row', gap: 8 },
  methodChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  methodText: { fontSize: 14, color: Colors.text },
  settleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, padding: 18, borderRadius: 14, gap: 8 },
  settleButtonText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
});
