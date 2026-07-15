import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { EXPENSE_CATEGORIES, SPLIT_METHODS } from '../constants';
import { RootStackParamList } from '../navigation/RootNavigator';
import * as localDB from '../services/localDatabase';
import uuid from 'react-native-uuid';

type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddExpenseRouteProp>();
  const { groupId } = route.params || {};

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [splitMethod, setSplitMethod] = useState<string>(SPLIT_METHODS.EQUAL);
  const [selectedGroup, setSelectedGroup] = useState(groupId || '');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    async function loadGroups() {
      try {
        const userGroups = await localDB.getUserGroups('1');
        setGroups(userGroups);
        if (userGroups.length > 0 && !selectedGroup) {
          setSelectedGroup(userGroups[0].id);
        }
      } catch (err) {
        console.error('Failed to load groups for expense:', err);
      }
    }
    loadGroups();
  }, []);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!selectedGroup) {
      Alert.alert('Error', 'Please select a group');
      return;
    }

    try {
      // 1. Fetch group members to calculate splits
      const fullGroup = await localDB.getGroup(selectedGroup);
      if (!fullGroup || !fullGroup.members || fullGroup.members.length === 0) {
        Alert.alert('Error', 'Selected group has no members');
        return;
      }

      // 2. Generate splits (split method: equal)
      const memberCount = fullGroup.members.length;
      const splitAmount = parseFloat((parsedAmount / memberCount).toFixed(2));
      
      const splits = fullGroup.members.map((m: any, index: number) => {
        let amt = splitAmount;
        if (index === memberCount - 1) {
          const sumOfOthers = splitAmount * (memberCount - 1);
          amt = parseFloat((parsedAmount - sumOfOthers).toFixed(2));
        }
        return {
          userId: m.id,
          amount: amt,
          isPaid: m.id === '1', // '1' is the payer
        };
      });

      // 3. Create expense object
      const newExpense = {
        id: uuid.v4().toString(),
        groupId: selectedGroup,
        description,
        amount: parsedAmount,
        currency: 'PHP',
        category: selectedCategory,
        paidBy: '1',
        splits,
        splitMethod: splitMethod as any,
        date: new Date(),
        createdAt: new Date(),
      };

      // 4. Save to database
      await localDB.saveExpense(newExpense);

      Alert.alert('Success', 'Expense added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to save expense:', err);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.amountSection}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={Colors.textLight}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this expense for?"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[styles.chip, selectedGroup === group.id && styles.chipSelected]}
              onPress={() => setSelectedGroup(group.id)}
            >
              <Text style={[styles.chipText, selectedGroup === group.id && styles.chipTextSelected]}>
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryItem, selectedCategory === cat.id && styles.categorySelected]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={selectedCategory === cat.id ? Colors.white : Colors.textSecondary}
              />
              <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Split Method</Text>
        <View style={styles.splitOptions}>
          {[
            { key: SPLIT_METHODS.EQUAL, label: 'Equal', icon: 'git-compare-outline' as const },
            { key: SPLIT_METHODS.EXACT, label: 'Exact', icon: 'calculator-outline' as const },
            { key: SPLIT_METHODS.PERCENTAGE, label: '%', icon: 'pie-chart-outline' as const },
          ].map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[styles.splitOption, splitMethod === method.key && styles.splitOptionSelected]}
              onPress={() => setSplitMethod(method.key)}
            >
              <Ionicons
                name={method.icon}
                size={20}
                color={splitMethod === method.key ? Colors.white : Colors.textSecondary}
              />
              <Text style={[styles.splitText, splitMethod === method.key && styles.splitTextSelected]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Add Expense</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 20 },
  currencySymbol: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  amountInput: { fontSize: 48, fontWeight: '700', color: Colors.text, minWidth: 100, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.text },
  chipTextSelected: { color: Colors.white, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryItem: { alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, width: '23%' },
  categorySelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  categoryLabelSelected: { color: Colors.white },
  splitOptions: { flexDirection: 'row', gap: 8 },
  splitOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  splitOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  splitText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  splitTextSelected: { color: Colors.white },
  saveButton: { backgroundColor: Colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 12, marginBottom: 32 },
  saveButtonText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
});
