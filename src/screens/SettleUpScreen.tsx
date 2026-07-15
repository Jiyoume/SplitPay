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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';

type SettleUpRouteProp = RouteProp<RootStackParamList, 'SettleUp'>;

export default function SettleUpScreen() {
  const navigation = useNavigation();
  const route = useRoute<SettleUpRouteProp>();
  const { groupId, fromUserId, toUserId, amount } = route.params;
  const { user: currentUser } = useAuth();

  const [payAmount, setPayAmount] = useState(amount.toFixed(2));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvingNames, setResolvingNames] = useState(true);
  
  const [debtorName, setDebtorName] = useState('Debtor');
  const [creditorName, setCreditorName] = useState('Creditor');

  useEffect(() => {
    const resolveNames = async () => {
      try {
        const detail = await apiService.getGroupDetail(groupId);
        const fromUser = detail.group.members.find(m => m.id === fromUserId);
        const toUser = detail.group.members.find(m => m.id === toUserId);
        
        if (fromUser) setDebtorName(fromUserId === currentUser?.id ? 'You' : fromUser.name);
        if (toUser) setCreditorName(toUserId === currentUser?.id ? 'You' : toUser.name);
      } catch (err) {
        console.warn('Failed to resolve member names:', err);
      } finally {
        setResolvingNames(false);
      }
    };
    resolveNames();
  }, [groupId, fromUserId, toUserId]);

  const handleSettle = async () => {
    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }

    if (fromUserId !== currentUser?.id) {
      Alert.alert(
        'Action Prohibited', 
        'Only the debtor who owes the money can initiate a Stellar payment settlement (since it uses their custodial signing key).'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.createSettlement(groupId, {
        fromUserId,
        toUserId,
        amount: parsedAmount,
        note: note.trim() || undefined,
      });

      const settlement = res.settlement;
      
      if (settlement.status === 'settled') {
        Alert.alert(
          'Stellar Payment Settled! 🎉',
          `Successfully settled $${parsedAmount.toFixed(2)} (${settlement.xlmAmount} XLM) on-chain!\n\nTx Hash:\n${settlement.txHash?.substring(0, 16)}...`,
          [{ text: 'Great!', onPress: () => navigation.goBack() }]
        );
      } else if (settlement.status === 'submitting') {
        Alert.alert(
          'Transaction Submitted ⚡',
          `The on-chain transaction has been submitted to the Stellar network and is now resolving.\n\nStatus: Submitting\nTx Hash: ${settlement.txHash?.substring(0, 12)}...`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Settlement Logged',
          `Recorded a settlement request. Status: ${settlement.status}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        if (error.code === 'INSUFFICIENT_XLM') {
          const bal = error.details?.balance || '0';
          const req = error.details?.required || '0';
          Alert.alert(
            'Insufficient XLM Balance',
            `Your custodial Stellar wallet does not have enough testnet XLM.\n\nYour Balance: ${bal} XLM\nRequired: ${req} XLM\n\nPlease go to your Profile and fund your wallet first.`
          );
        } else if (error.code === 'SETTLEMENT_IN_PROGRESS') {
          Alert.alert(
            'Settlement Pending',
            'A settlement payment between these two users is already in progress. Please wait for it to complete.'
          );
        } else {
          Alert.alert('Stellar Transaction Failed', error.message || 'Horizon network rejected the transaction.');
        }
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDebtor = fromUserId === currentUser?.id;

  if (resolvingNames) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(185, 28, 28, 0.08)', borderColor: 'rgba(185, 28, 28, 0.15)' }]}>
              <Text style={[styles.avatarText, { color: Colors.negative }]}>{debtorName[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={16} color={Colors.textSecondary} />
            </View>
            <View style={[styles.avatar, { backgroundColor: Colors.primaryLight, borderColor: 'rgba(11, 47, 36, 0.15)' }]}>
              <Text style={[styles.avatarText, { color: Colors.primary }]}>{creditorName[0]?.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.settleLabel}>
            <Text style={styles.boldText}>{debtorName}</Text> pays <Text style={styles.boldText}>{creditorName}</Text>
          </Text>
        </View>

        {!isDebtor && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color={Colors.warning} />
            <Text style={styles.warningText}>
              You cannot initiate this settlement. Only <Text style={styles.boldText}>{debtorName}</Text> can click to pay since it signs from their Stellar wallet.
            </Text>
          </View>
        )}

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
              editable={!loading && isDebtor}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="logo-bitcoin" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Demo peg: 1 USD = 1 XLM. This transaction will build, sign, and submit a real payment on the Stellar Testnet.
          </Text>
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
            editable={!loading && isDebtor}
          />
        </View>

        {/* Method Section Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Payment Rail</Text>
          <View style={styles.methodCard}>
            <View style={styles.methodIconContainer}>
              <Ionicons name="globe-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Stellar Testnet Layer</Text>
              <Text style={styles.methodSub}>Instant on-chain settlement (Native XLM)</Text>
            </View>
            <View style={styles.checkedBadge}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.settleButton, 
            (loading || !isDebtor) && { opacity: 0.7 }
          ]} 
          onPress={handleSettle}
          disabled={loading || !isDebtor}
        >
          <LinearGradient
            colors={(loading || !isDebtor) ? ['#9CA3AF', '#6B7280'] : [Colors.secondary, '#B39268']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.settleButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.settleButtonText}>Submit Stellar Payment</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    borderRadius: 29, // Circular avatar
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
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  boldText: { fontWeight: '700' },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFDE7',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF59D',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#F57F17',
    lineHeight: 18,
  },
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 2,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  methodSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  checkedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleButton: {
    borderRadius: 6,
    overflow: 'hidden',
    height: 54,
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
