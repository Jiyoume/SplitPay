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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type SettleUpRouteProp = RouteProp<RootStackParamList, 'SettleUp'>;

export default function SettleUpScreen() {
  const navigation = useNavigation();
  const route = useRoute<SettleUpRouteProp>();
  const { amount } = route.params;
  const [payAmount, setPayAmount] = useState(amount.toFixed(2));
  const [note, setNote] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('Cash');

  const handleSettle = () => {
    Alert.alert('Payment Recorded', `You settled $${payAmount}`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Text style={[styles.avatarText, { color: Colors.negative }]}>M</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={16} color={Colors.textSecondary} />
          </View>
          <View style={[styles.avatar, { backgroundColor: 'rgba(5, 150, 105, 0.08)', borderColor: 'rgba(5, 150, 105, 0.15)' }]}>
            <Text style={[styles.avatarText, { color: Colors.primary }]}>Y</Text>
          </View>
        </View>
        <Text style={styles.settleLabel}>Mike pays You</Text>
      </View>

      {/* Amount Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Amount</Text>
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={payAmount}
            onChangeText={setPayAmount}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Note Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Method Section Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Payment Method</Text>
        <View style={styles.methods}>
          {['Cash', 'Bank Transfer', 'PayPal'].map((method) => {
            const isSelected = selectedMethod === method;
            return (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodChip, 
                  isSelected ? styles.methodChipSelected : styles.methodChipUnselected
                ]}
                onPress={() => setSelectedMethod(method)}
              >
                <Text 
                  style={[
                    styles.methodText, 
                    isSelected ? styles.methodTextSelected : styles.methodTextUnselected
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Settle Button */}
      <TouchableOpacity style={styles.settleButton} onPress={handleSettle}>
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.settleButtonGradient}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.settleButtonText}>Record Payment</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    minWidth: 100,
    padding: 0,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methods: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodChipSelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.15)',
  },
  methodChipUnselected: {
    backgroundColor: '#F8F9FC',
    borderColor: Colors.border,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  methodTextSelected: {
    color: Colors.primary,
  },
  methodTextUnselected: {
    color: Colors.textSecondary,
  },
  settleButton: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 52,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  settleButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

