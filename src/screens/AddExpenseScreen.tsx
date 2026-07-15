import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { EXPENSE_CATEGORIES, SPLIT_METHODS } from '../constants';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Group, User } from '../models/types';

type AddExpenseRouteProp = RouteProp<any, 'AddExpense'>;

export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddExpenseRouteProp>();
  const initialGroupId = route.params?.groupId;
  const { user: currentUser } = useAuth();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'exact' | 'percentage'>('equal');
  const [selectedGroup, setSelectedGroup] = useState(initialGroupId || '');
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // States for custom split inputs
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // 1. Load groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await apiService.getGroups();
        setGroups(data);
        if (!selectedGroup && data.length > 0) {
          setSelectedGroup(data[0].id);
        }
      } catch (err) {
        console.warn('Failed to fetch groups:', err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  // 2. Load group members whenever selected group changes
  useEffect(() => {
    if (!selectedGroup) return;
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const detail = await apiService.getGroupDetail(selectedGroup);
        setGroupMembers(detail.group.members || []);
        
        // Initialize inputs for members
        const initialInputs: Record<string, string> = {};
        detail.group.members.forEach((m) => {
          initialInputs[m.id] = '';
        });
        setExactAmounts(initialInputs);
        setPercentages(initialInputs);
      } catch (err) {
        console.warn('Failed to fetch group members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [selectedGroup]);

  // Helper to auto-calculate equal split preview
  const getEqualSplitPreview = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || groupMembers.length === 0) return '0.00';
    return (parsedAmount / groupMembers.length).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedGroup) {
      Alert.alert('Validation Error', 'Please select a group first.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }

    let splitsPayload: any[] | undefined = undefined;

    if (splitMethod === 'exact') {
      let sum = 0;
      splitsPayload = [];
      
      for (const member of groupMembers) {
        const memberVal = parseFloat(exactAmounts[member.id] || '0');
        if (isNaN(memberVal) || memberVal < 0) {
          Alert.alert('Validation Error', `Please enter a valid amount for ${member.name}.`);
          return;
        }
        sum += memberVal;
        splitsPayload.push({
          userId: member.id,
          amount: memberVal,
        });
      }

      if (Math.abs(sum - parsedAmount) > 0.01) {
        Alert.alert(
          'Split Sum Mismatch',
          `The sum of individual shares ($${sum.toFixed(2)}) must equal the total expense amount ($${parsedAmount.toFixed(2)}).`
        );
        return;
      }
    } else if (splitMethod === 'percentage') {
      let sum = 0;
      splitsPayload = [];

      for (const member of groupMembers) {
        const pctVal = parseFloat(percentages[member.id] || '0');
        if (isNaN(pctVal) || pctVal < 0) {
          Alert.alert('Validation Error', `Please enter a valid percentage for ${member.name}.`);
          return;
        }
        sum += pctVal;
        splitsPayload.push({
          userId: member.id,
          percentage: pctVal,
        });
      }

      if (Math.abs(sum - 100) > 0.01) {
        Alert.alert(
          'Percentage Sum Mismatch',
          `The sum of individual percentages (${sum.toFixed(2)}%) must equal exactly 100%.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiService.addExpense(selectedGroup, {
        description: description.trim(),
        amount: parsedAmount,
        category: selectedCategory,
        splitMethod,
        splits: splitsPayload,
        paidBy: currentUser?.id, // default to current user as payer
      });

      Alert.alert('Success', 'Expense added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingGroups) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Amount Section Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Amount</Text>
          <View style={styles.amountSection}>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
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
            <View style={styles.amountIconCircle}>
              <Text style={styles.amountIconText}>$</Text>
            </View>
          </View>
        </View>

        {/* Description Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Description</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="What's this expense for?"
              placeholderTextColor={Colors.textLight}
              editable={!submitting}
            />
            <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />
          </View>
        </View>

        {/* Group Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Group</Text>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>You need to create a group first.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {groups.map((group) => {
                const isSelected = selectedGroup === group.id;
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupPill,
                      isSelected ? styles.groupPillSelected : styles.groupPillUnselected
                    ]}
                    onPress={() => setSelectedGroup(group.id)}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.groupPillText,
                        isSelected ? styles.groupPillTextSelected : styles.groupPillTextUnselected
                      ]}
                    >
                      {group.name}
                    </Text>
                    {isSelected && <Ionicons name="chevron-forward" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Category Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    isSelected ? styles.categorySelected : styles.categoryUnselected
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  disabled={submitting}
                >
                  <View style={[
                    styles.categoryIconCircle,
                    isSelected ? styles.categoryIconCircleSelected : styles.categoryIconCircleUnselected
                  ]}>
                    <Ionicons
                      name={cat.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected ? styles.categoryLabelSelected : styles.categoryLabelUnselected
                    ]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Split Method Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Split Method</Text>
          <View style={styles.splitContainer}>
            {[
              { key: SPLIT_METHODS.EQUAL, label: 'Equal' },
              { key: SPLIT_METHODS.EXACT, label: 'Exact' },
              { key: SPLIT_METHODS.PERCENTAGE, label: 'Percentage (%)' },
            ].map((method) => {
              const isSelected = splitMethod === method.key;
              return (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.splitSegment,
                    isSelected ? styles.splitSegmentSelected : styles.splitSegmentUnselected
                  ]}
                  onPress={() => setSplitMethod(method.key as any)}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.splitText,
                      isSelected ? styles.splitTextSelected : styles.splitTextUnselected
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Dynamic Split Share Input Section */}
        {loadingMembers ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
        ) : (
          groupMembers.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Split Breakdown</Text>
              {splitMethod === 'equal' && (
                <View style={styles.equalPreview}>
                  <Text style={styles.equalPreviewText}>
                    Split equally among all {groupMembers.length} members:
                  </Text>
                  <Text style={styles.equalPreviewVal}>
                    ${getEqualSplitPreview()} <Text style={styles.equalPreviewText}>each</Text>
                  </Text>
                </View>
              )}

              {splitMethod === 'exact' && (
                <View style={styles.splitListCard}>
                  {groupMembers.map((member) => (
                    <View key={member.id} style={styles.splitInputRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.name} {member.id === currentUser?.id ? '(You)' : ''}
                      </Text>
                      <View style={styles.shareInputWrapper}>
                        <Text style={styles.shareInputSymbol}>$</Text>
                        <TextInput
                          style={styles.shareInput}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                          value={exactAmounts[member.id] || ''}
                          onChangeText={(text) =>
                            setExactAmounts({ ...exactAmounts, [member.id]: text })
                          }
                          editable={!submitting}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {splitMethod === 'percentage' && (
                <View style={styles.splitListCard}>
                  {groupMembers.map((member) => (
                    <View key={member.id} style={styles.splitInputRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.name} {member.id === currentUser?.id ? '(You)' : ''}
                      </Text>
                      <View style={styles.shareInputWrapper}>
                        <TextInput
                          style={[styles.shareInput, { textAlign: 'right', paddingRight: 6 }]}
                          placeholder="0"
                          keyboardType="numeric"
                          value={percentages[member.id] || ''}
                          onChangeText={(text) =>
                            setPercentages({ ...percentages, [member.id]: text })
                          }
                          editable={!submitting}
                        />
                        <Text style={styles.shareInputSymbol}>%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        )}

        {/* Bottom Button */}
        <TouchableOpacity 
          style={[styles.saveButton, submitting && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.saveButtonGradient}>
              <ActivityIndicator color={Colors.white} />
            </View>
          ) : (
            <LinearGradient
              colors={[Colors.accent, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>Add Expense</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    justifyContent: 'space-between',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  amountInput: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
    marginLeft: 4,
    padding: 0,
  },
  amountIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    padding: 0,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
  },
  groupPillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.border,
  },
  groupPillUnselected: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  groupPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  groupPillTextSelected: {
    color: Colors.primary,
  },
  groupPillTextUnselected: {
    color: Colors.textSecondary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    width: '23%',
    borderWidth: 1,
  },
  categorySelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.border,
  },
  categoryUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIconCircleSelected: {
    backgroundColor: Colors.primaryLight,
  },
  categoryIconCircleUnselected: {
    backgroundColor: Colors.background,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.primary,
  },
  categoryLabelUnselected: {
    color: Colors.textSecondary,
  },
  splitContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 4,
    gap: 4,
  },
  splitSegment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitSegmentSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 2,
  },
  splitSegmentUnselected: {
    backgroundColor: 'transparent',
  },
  splitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  splitTextSelected: {
    color: Colors.primary,
  },
  splitTextUnselected: {
    color: Colors.textSecondary,
  },
  saveButton: {
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    height: 52,
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    marginTop: 4,
  },
  equalPreview: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  equalPreviewText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  equalPreviewVal: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 6,
  },
  splitListCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  shareInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    width: 90,
    paddingHorizontal: 8,
    height: 38,
  },
  shareInputSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  shareInput: {
    fontFamily: 'Georgia',
    fontVariant: ['tabular-nums'],
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    padding: 0,
  },
});
