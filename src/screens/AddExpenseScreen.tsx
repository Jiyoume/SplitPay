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
      <Text style={styles.headerTitle}>Add Expense</Text>

      {/* Expense Title Input */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Expense Title</Text>
        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Dinner at McDonald's"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Amount Input */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₱</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Category Dropdown (Mock) */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Category</Text>
        <TouchableOpacity style={styles.dropdownInput}>
          <Text style={styles.dropdownText}>Food and Dining</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Date Picker (Mock) */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Date</Text>
        <TouchableOpacity style={styles.dropdownInput}>
          <Text style={styles.dropdownText}>12 Jun 2026</Text>
          <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Group Dropdown (Mock) */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Group</Text>
        <TouchableOpacity style={styles.dropdownInput}>
          <Text style={styles.dropdownText}>Baguio Trip</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Participants */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Participants</Text>
        <View style={styles.participantsContainer}>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.avatarStackItem, { marginLeft: i > 0 ? -12 : 0 }]}>
              <Ionicons name="person" size={16} color={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={[styles.avatarStackItem, styles.addParticipantBtn, { marginLeft: -12 }]}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>


      {/* Split Method Card */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Split Method</Text>
        <View style={styles.splitCardsContainer}>
          {[
            { key: SPLIT_METHODS.EQUAL, label: 'Equal Split', icon: 'pie-chart' },
            { key: SPLIT_METHODS.EXACT, label: 'Custom', icon: 'options' },
            { key: SPLIT_METHODS.PERCENTAGE, label: 'Percentage', icon: 'analytics' },
          ].map((method) => {
            const isSelected = splitMethod === method.key;
            return (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.splitCard,
                  isSelected ? styles.splitCardSelected : styles.splitCardUnselected
                ]}
                onPress={() => setSplitMethod(method.key)}
              >
                <Ionicons name={method.icon as any} size={20} color={isSelected ? Colors.primary : Colors.textSecondary} />
                <Text
                  style={[
                    styles.splitCardText,
                    isSelected ? styles.splitCardTextSelected : styles.splitCardTextUnselected
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Note Input */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Note</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Add a note"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Receipt Upload */}
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Receipt</Text>
        <TouchableOpacity style={styles.receiptUploadBox}>
          <Ionicons name="cloud-upload-outline" size={28} color={Colors.primary} />
          <Text style={styles.receiptUploadText}>Upload receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <LinearGradient
          colors={['#0A84FF', '#00C6FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveButtonGradient}
        >
          <Text style={styles.saveButtonText}>Save Expense</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 24,
    marginTop: 8,
  },
  inputBlock: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    padding: 0,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipantBtn: {
    backgroundColor: Colors.primary,
  },
  splitCardsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  splitCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splitCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
  },
  splitCardUnselected: {
    borderColor: Colors.border,
  },
  splitCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  splitCardTextSelected: {
    color: Colors.primary,
  },
  splitCardTextUnselected: {
    color: Colors.textSecondary,
  },
  receiptUploadBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  receiptUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 16,
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

