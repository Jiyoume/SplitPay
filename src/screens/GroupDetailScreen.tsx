import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Group, Expense, Balance } from '../models/types';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Suggestion {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  xlmAmount: string;
  currency: string;
  conversionNote: string;
}

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animated values for spring feedback
  const scaleAdd = useRef(new Animated.Value(1)).current;
  const scaleSettle = useRef(new Animated.Value(1)).current;

  const createSpringIn = (scaleVar: Animated.Value) => () => {
    Animated.spring(scaleVar, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const createSpringOut = (scaleVar: Animated.Value) => () => {
    Animated.spring(scaleVar, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const fetchData = async (showLoadingIndicator = true, forceRefresh = false) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const detailRes = await apiService.getGroupDetail(groupId, forceRefresh);
      setGroup({
        ...detailRes.group,
        description: detailRes.group.description || undefined,
        createdAt: new Date(detailRes.group.createdAt),
      });
      setBalances(detailRes.balances);

      const expensesRes = await apiService.getExpenses(groupId, forceRefresh);
      setExpenses(expensesRes);

      const balancesRes = await apiService.getBalances(groupId, forceRefresh);
      setSuggestions(balancesRes.suggestions || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch group details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(group === null, false);
    }, [groupId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false, true);
  };

  const getMemberName = (userId: string) => {
    if (userId === currentUser?.id) return 'You';
    const member = group?.members.find((m) => m.id === userId);
    return member ? member.name : 'Unknown User';
  };

  const getMemberBalance = (userId: string) => {
    const bal = balances.find((b) => b.userId === userId);
    return bal ? bal.netBalance : 0;
  };

  if (loading && !group) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  const userOwesSuggestion = suggestions.find(s => s.fromUserId === currentUser?.id);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* Summary Card */}
      <LinearGradient
        colors={[Colors.accent, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.groupNameText}>{group.name}</Text>
        {group.description ? <Text style={styles.groupDescText}>{group.description}</Text> : null}
        <Text style={styles.totalExpenses}>
          Total expenses: ${group.totalExpenses.toFixed(2)}
        </Text>
      </LinearGradient>

      {/* Settle Actions Panel */}
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={createSpringIn(scaleAdd)}
          onPressOut={createSpringOut(scaleAdd)}
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddExpense', { groupId })}
        >
          <Animated.View style={[styles.actionBtnGradientWrapper, { transform: [{ scale: scaleAdd }] }]}>
            <LinearGradient
              colors={[Colors.accent, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtnGradient}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Add Expense</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {userOwesSuggestion ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={createSpringIn(scaleSettle)}
            onPressOut={createSpringOut(scaleSettle)}
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SettleUp', { 
              groupId, 
              fromUserId: userOwesSuggestion.fromUserId, 
              toUserId: userOwesSuggestion.toUserId, 
              amount: userOwesSuggestion.amount 
            })}
          >
            <Animated.View style={[styles.actionBtnGradientWrapper, { transform: [{ scale: scaleSettle }] }]}>
              <LinearGradient
                colors={[Colors.secondary, '#B39268']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Settle Up (${userOwesSuggestion.amount.toFixed(2)})</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { opacity: 0.5 }]}
            disabled={true}
          >
            <View style={styles.actionBtnGradientWrapper}>
              <LinearGradient
                colors={['#9CA3AF', '#6B7280']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>All Settled</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Settle Up Suggestions Section */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settle Up Suggestions</Text>
          {suggestions.map((suggestion, index) => {
            const isCallerDebtor = suggestion.fromUserId === currentUser?.id;
            return (
              <View key={index} style={styles.suggestionRow}>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.boldText}>{getMemberName(suggestion.fromUserId)}</Text>
                    {' owes '}
                    <Text style={styles.boldText}>{getMemberName(suggestion.toUserId)}</Text>
                  </Text>
                  <Text style={styles.conversionText}>
                    ${suggestion.amount.toFixed(2)} • {suggestion.xlmAmount} XLM
                  </Text>
                </View>
                {isCallerDebtor ? (
                  <TouchableOpacity
                    style={styles.suggestionSettleBtn}
                    onPress={() =>
                      navigation.navigate('SettleUp', {
                        groupId,
                        fromUserId: suggestion.fromUserId,
                        toUserId: suggestion.toUserId,
                        amount: suggestion.amount,
                      })
                    }
                  >
                    <Text style={styles.suggestionSettleText}>Settle</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.waitingBadge}>
                    <Text style={styles.waitingText}>Waiting</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Balances Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balances</Text>
        {group.members.map((member) => {
          const balance = getMemberBalance(member.id);
          const isMe = member.id === currentUser?.id;
          return (
            <View key={member.id} style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: balance >= 0 ? 'rgba(21, 128, 61, 0.08)' : 'rgba(185, 28, 28, 0.08)' }]}>
                <Text style={[styles.avatarText, { color: balance >= 0 ? Colors.positive : Colors.negative }]}>
                  {member.name[0]}
                </Text>
              </View>
              <Text style={styles.memberName}>{member.name} {isMe ? '(You)' : ''}</Text>
              <Text style={[styles.memberBalance, { color: balance >= 0 ? Colors.positive : Colors.negative }]}>
                {balance > 0 
                  ? `gets back $${balance.toFixed(2)}` 
                  : balance < 0 
                    ? `owes $${Math.abs(balance).toFixed(2)}` 
                    : 'settled'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Expenses Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses recorded yet.</Text>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseIcon}>
                <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseDesc}>{expense.description}</Text>
                <Text style={styles.expenseMeta}>
                  Paid by {getMemberName(expense.paidBy)} • {new Date(expense.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
  },
  summaryCard: {
    padding: 24,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 4,
  },
  groupNameText: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  groupDescText: { 
    fontSize: 13, 
    color: 'rgba(255, 255, 255, 0.85)', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  totalExpenses: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    height: 48,
  },
  actionBtnGradientWrapper: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    height: 48,
  },
  actionBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
  },
  boldText: {
    fontWeight: '700',
  },
  conversionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  suggestionSettleBtn: {
    backgroundColor: Colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  suggestionSettleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  waitingBadge: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  waitingText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19, // Circular avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  memberBalance: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  expenseMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  expenseAmount: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
