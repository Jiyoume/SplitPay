import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { EXPENSE_CATEGORIES, SPLIT_METHODS } from '../constants';

export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [splitMethod, setSplitMethod] = useState<string>(SPLIT_METHODS.EQUAL);
  const [selectedGroup, setSelectedGroup] = useState('1');

  const groups = [
    { id: '1', name: 'Apartment 4B' },
    { id: '2', name: 'Family Expenses' },
    { id: '3', name: 'Weekend Trip' },
  ];

  const handleSave = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    Alert.alert('Success', 'Expense added successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          />
          <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />
        </View>
      </View>

      {/* Group Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Group</Text>
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
                onPress={() => setSplitMethod(method.key)}
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

      {/* Bottom Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <LinearGradient
          colors={['#34D399', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveButtonGradient}
        >
          <Text style={styles.saveButtonText}>Add Expense</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
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
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  groupPillSelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: 'rgba(5, 150, 105, 0.15)',
  },
  groupPillUnselected: {
    backgroundColor: '#F8F9FC',
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
    borderRadius: 16,
    width: '23%',
    borderWidth: 1,
  },
  categorySelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.15)',
  },
  categoryUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
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
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  categoryIconCircleUnselected: {
    backgroundColor: '#F8F9FC',
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
    backgroundColor: '#F8F9FC',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  splitSegment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitSegmentSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
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
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    height: 52,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

