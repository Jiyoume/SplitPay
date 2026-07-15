import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  getTopUpMethods,
  initiateTopUp,
  confirmTopUp,
  getTopUpHistory,
  TopUpMethodInfo,
  TopUpMethod,
  TopUpRecord,
} from '../services/topUpService';

const formatKey = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export default function TopUpScreen() {
  const { wallet, refreshUser } = useAuth();

  const [methods, setMethods] = useState<TopUpMethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<TopUpMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTopUp, setActiveTopUp] = useState<TopUpRecord | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<TopUpRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadMethods();
    loadHistory();
  }, []);

  const loadMethods = async () => {
    setLoadingMethods(true);
    try {
      const data = await getTopUpMethods();
      setMethods(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load top-up methods.');
    } finally {
      setLoadingMethods(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getTopUpHistory();
      setHistory(data);
    } catch (error) {
      console.warn('Failed to load top-up history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectMethod = (m: TopUpMethodInfo) => {
    if (submitting) return;
    if (!m.available) {
      Alert.alert(
        'Verification Required',
        `This method requires ${m.requiresKYC} KYC verification. Go to Profile > Verify Identity to unlock it.`
      );
      return;
    }
    setSelectedMethod(m.method);
    setActiveTopUp(null);
  };

  const handleTopUp = async () => {
    if (!selectedMethod) {
      Alert.alert('Select a Method', 'Please choose a top-up method first.');
      return;
    }
    const method = methods.find((m) => m.method === selectedMethod);
    const parsedAmount = parseFloat(amount);

    if (selectedMethod !== 'friendbot') {
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid amount.');
        return;
      }
      if (method && (parsedAmount < method.minAmount || parsedAmount > method.maxAmount)) {
        Alert.alert(
          'Amount Out of Range',
          `This method accepts ₱${method.minAmount.toLocaleString()} - ₱${method.maxAmount.toLocaleString()}.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const topup = await initiateTopUp(selectedMethod, isNaN(parsedAmount) ? 0 : parsedAmount);
      if (topup.status === 'completed') {
        await refreshUser();
        await loadHistory();
        Alert.alert('Top Up Complete', 'Your wallet has been credited.');
        setSelectedMethod(null);
        setAmount('');
      } else {
        setActiveTopUp(topup);
      }
    } catch (error: any) {
      if (error instanceof ApiError && error.code === 'KYC_REQUIRED') {
        Alert.alert('Verification Required', error.message || 'Please complete identity verification first.');
      } else {
        Alert.alert('Top Up Failed', error.message || 'Could not start this top-up. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeTopUp) return;
    setConfirming(true);
    try {
      await confirmTopUp(activeTopUp.id);
      await refreshUser();
      await loadHistory();
      Alert.alert('Payment Confirmed', 'Your wallet has been credited.');
      setSelectedMethod(null);
      setAmount('');
      setActiveTopUp(null);
    } catch (error: any) {
      Alert.alert('Confirmation Failed', error.message || 'Could not confirm this payment.');
    } finally {
      setConfirming(false);
    }
  };

  const openInteractiveUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot Open Link', 'Unable to open this URL on your device.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>
            {wallet?.xlmBalance ? parseFloat(wallet.xlmBalance).toFixed(4) : '0.0000'}{' '}
            <Text style={styles.xlmDenom}>XLM</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Top-Up Method</Text>
          {loadingMethods ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            methods.map((m) => {
              const isSelected = selectedMethod === m.method;
              return (
                <TouchableOpacity
                  key={m.method}
                  style={[
                    styles.methodRow,
                    isSelected && styles.methodRowSelected,
                    !m.available && styles.methodRowDisabled,
                  ]}
                  onPress={() => selectMethod(m)}
                  disabled={submitting}
                >
                  <Text style={styles.methodIcon}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodName}>{m.name}</Text>
                    <Text style={styles.methodDesc} numberOfLines={1}>{m.description}</Text>
                    <Text style={styles.methodMeta}>
                      Fee: {m.fee} · {m.processingTime} · ₱{m.minAmount.toLocaleString()}-₱{m.maxAmount.toLocaleString()}
                    </Text>
                  </View>
                  {!m.available ? (
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} />
                  ) : isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {selectedMethod && selectedMethod !== 'friendbot' && !activeTopUp && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Amount (PHP)</Text>
            <View style={styles.amountSection}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
                editable={!submitting}
              />
            </View>
          </View>
        )}

        {selectedMethod && !activeTopUp && (
          <TouchableOpacity
            style={[styles.actionButton, submitting && { opacity: 0.7 }]}
            onPress={handleTopUp}
            disabled={submitting}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {selectedMethod === 'friendbot' ? 'Get Free Test XLM' : 'Top Up'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {activeTopUp && activeTopUp.status === 'pending_payment' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Complete Your Payment</Text>

            {activeTopUp.interactiveUrl && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => openInteractiveUrl(activeTopUp.interactiveUrl!)}
              >
                <Ionicons name="open-outline" size={18} color={Colors.primary} />
                <Text style={styles.linkButtonText}>Open Payment Page</Text>
              </TouchableOpacity>
            )}

            {activeTopUp.paymentInstructions && (
              <View style={styles.instructionsBox}>
                {Object.entries(activeTopUp.paymentInstructions).map(([key, value]) => (
                  <View key={key} style={styles.instructionRow}>
                    <Text style={styles.instructionKey}>{formatKey(key)}</Text>
                    <Text style={styles.instructionValue} numberOfLines={1}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTopUp.depositInfo && (
              <View style={styles.instructionsBox}>
                <View style={styles.instructionRow}>
                  <Text style={styles.instructionKey}>Address</Text>
                  <Text style={styles.instructionValue} numberOfLines={1} ellipsizeMode="middle">
                    {activeTopUp.depositInfo.address}
                  </Text>
                </View>
                <View style={styles.instructionRow}>
                  <Text style={styles.instructionKey}>Memo</Text>
                  <Text style={styles.instructionValue}>{activeTopUp.depositInfo.memo}</Text>
                </View>
                <View style={styles.instructionRow}>
                  <Text style={styles.instructionKey}>Network</Text>
                  <Text style={styles.instructionValue}>{activeTopUp.depositInfo.network}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, confirming && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={confirming}
            >
              <LinearGradient
                colors={[Colors.secondary, '#B39268']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                {confirming ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>I've Paid</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Top-Ups</Text>
          {loadingHistory ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No top-ups yet.</Text>
            </View>
          ) : (
            history.map((t) => (
              <View key={t.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyMethod}>
                    {methods.find((m) => m.method === t.method)?.name || t.method}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(t.createdAt).toLocaleDateString()} · {t.status.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.historyAmount}>₱{t.amount.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { padding: 16, flexGrow: 1, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
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
  balanceValue: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  xlmDenom: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    minHeight: 48,
  },
  methodRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  methodRowDisabled: {
    opacity: 0.5,
  },
  methodIcon: {
    fontSize: 24,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  methodDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  methodMeta: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    fontWeight: '600',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  amountInput: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    minWidth: 100,
    padding: 0,
    marginLeft: 4,
  },
  actionButton: {
    borderRadius: 6,
    overflow: 'hidden',
    height: 52,
    marginBottom: 16,
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
    minHeight: 48,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  instructionsBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  instructionKey: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  instructionValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  section: { marginTop: 4 },
  sectionTitle: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyMethod: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  historyAmount: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
