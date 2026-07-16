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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radii, Spacing } from '../constants/theme';
import { EXPENSE_CATEGORIES, SPLIT_METHODS } from '../constants';
import { GradientButton, MemberAvatar } from '../components';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getUserGroupsWithBalances, saveExpense, saveGroup, getAllUsers } from '../services/localDatabase';
import { Expense } from '../models/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

const SPLIT_OPTIONS = [
  { key: SPLIT_METHODS.EQUAL, label: 'Equal', icon: 'git-compare-outline' as const },
  { key: SPLIT_METHODS.EXACT, label: 'Custom', icon: 'calculator-outline' as const },
  { key: SPLIT_METHODS.PERCENTAGE, label: 'Percentage', icon: 'pie-chart-outline' as const },
];

export default function AddExpenseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [splitMethod, setSplitMethod] = useState<string>(SPLIT_METHODS.EQUAL);
  const [groupIndex, setGroupIndex] = useState(0);
  const [date] = useState('Jul 16, 2026');
  const [note, setNote] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (route.params) {
      if (route.params.title) setTitle(route.params.title);
      if (route.params.amount) setAmount(route.params.amount);
      if (route.params.category) setSelectedCategory(route.params.category);
    }
  }, [route.params]);

  useEffect(() => {
    async function loadGroups() {
      try {
        const list = await getUserGroupsWithBalances('me');
        setGroups(list);
        if (list.length > 0) {
          setParticipants(list[0].members || []);
        }
      } catch (err) {
        console.error('Failed to load groups in AddExpenseScreen:', err);
      }
    }
    loadGroups();
  }, []);

  if (groups.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Palette.background }}>
        <Text style={{ color: Palette.textSecondary }}>Loading groups...</Text>
      </View>
    );
  }

  const selectedGroup = groups[groupIndex];

  const cycleGroup = () => {
    const nextIndex = (groupIndex + 1) % groups.length;
    setGroupIndex(nextIndex);
    setParticipants(groups[nextIndex].members || []);
  };

  const addParticipant = async () => {
    try {
      const allUsers = await getAllUsers();
      const participantIds = participants.map((p) => p.id);
      const nextUser = allUsers.find((u) => !participantIds.includes(u.id));
      if (nextUser) {
        setParticipants([...participants, nextUser]);
      }
    } catch (err) {
      console.error('Failed to add participant:', err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an expense title');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (participants.length === 0) {
      Alert.alert('Error', 'An expense must have at least one participant');
      return;
    }

    try {
      const totalAmount = parseFloat(amount);
      const equalSplitAmount = totalAmount / participants.length;
      const splits = participants.map((p) => ({
        userId: p.id,
        amount: equalSplitAmount,
        isPaid: p.id === 'me', // Paid if paidBy is 'me'
      }));

      const newExpense: Expense = {
        id: Math.random().toString(36).substring(2, 9),
        groupId: selectedGroup.id,
        description: title,
        amount: totalAmount,
        currency: 'PHP',
        category: selectedCategory,
        paidBy: 'me',
        splits,
        splitMethod: 'equal',
        date: new Date(),
        createdAt: new Date(),
        notes: note || undefined,
      };

      await saveExpense(newExpense);

      // Update group total
      selectedGroup.totalExpenses = (selectedGroup.totalExpenses || 0) + totalAmount;
      await saveGroup(selectedGroup);

      Alert.alert('Success', 'Expense added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to save expense:', err);
      Alert.alert('Error', 'Failed to save expense');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <Text style={styles.logo}>
          <Text style={styles.logoNavy}>My</Text>
          <Text style={styles.logoTeal}>Share</Text>
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expense Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What's this expense for?"
            placeholderTextColor={Palette.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.pesoPrefix}>₱</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Palette.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.phpChip}>
              <Text style={styles.phpChipText}>PHP</Text>
            </View>
          </View>
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
                  color={selectedCategory === cat.id ? Palette.accent : Palette.textSecondary}
                />
                <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sideBySideRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.fieldBox}>
              <Ionicons name="calendar-outline" size={16} color={Palette.textMuted} />
              <Text style={styles.fieldBoxText}>{date}</Text>
            </View>
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Group</Text>
            <TouchableOpacity style={styles.fieldBox} onPress={cycleGroup}>
              <Ionicons name="people-outline" size={16} color={Palette.textMuted} />
              <Text style={styles.fieldBoxText} numberOfLines={1}>{selectedGroup.name}</Text>
              <Ionicons name="chevron-down" size={14} color={Palette.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Participants</Text>
          <View style={styles.participantsRow}>
            {participants.map((user, i) => (
              <View key={user.id} style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}>
                <MemberAvatar name={user.name} size={36} />
              </View>
            ))}
            <TouchableOpacity style={[styles.addParticipant, participants.length > 0 && styles.avatarOverlap]} onPress={addParticipant}>
              <Ionicons name="add" size={18} color={Palette.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Split Method</Text>
          <View style={styles.splitOptions}>
            {SPLIT_OPTIONS.map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[styles.splitCard, splitMethod === method.key && styles.splitCardSelected]}
                onPress={() => setSplitMethod(method.key)}
              >
                <Ionicons
                  name={method.icon}
                  size={20}
                  color={splitMethod === method.key ? Palette.accent : Palette.textSecondary}
                />
                <Text style={[styles.splitText, splitMethod === method.key && styles.splitTextSelected]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note"
            placeholderTextColor={Palette.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={styles.receiptUpload}
          onPress={() => navigation.navigate('ScanReceipt', { groupId: selectedGroup.id })}
        >
          <Ionicons name="camera-outline" size={24} color={Palette.textMuted} />
          <Text style={styles.receiptText}>Upload Receipt</Text>
        </TouchableOpacity>

        <GradientButton title="Save Expense" onPress={handleSave} style={styles.saveButton} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Palette.textPrimary },
  logo: { fontSize: 14, fontWeight: '700' },
  logoNavy: { color: Palette.navy },
  logoTeal: { color: Palette.gradientEnd },
  body: { paddingHorizontal: Spacing.lg },
  inputGroup: { marginBottom: Spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: Palette.textSecondary, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Palette.card,
    borderRadius: Radii.input,
    padding: Spacing.md,
    fontSize: 16,
    color: Palette.textPrimary,
    borderWidth: 1,
    borderColor: Palette.border,
    minHeight: 48,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  pesoPrefix: { fontSize: 20, fontWeight: '700', color: Palette.accent, marginRight: Spacing.sm },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: Palette.textPrimary, paddingVertical: Spacing.sm },
  phpChip: { backgroundColor: Palette.background, borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  phpChipText: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    width: '23%',
    minHeight: 44,
  },
  categorySelected: { backgroundColor: '#EAF0FF', borderColor: Palette.accent },
  categoryLabel: { fontSize: 10, color: Palette.textSecondary, marginTop: 4, textAlign: 'center' },
  categoryLabelSelected: { color: Palette.accent, fontWeight: '600' },
  sideBySideRow: { flexDirection: 'row', gap: Spacing.md },
  halfWidth: { flex: 1 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    gap: Spacing.sm,
  },
  fieldBoxText: { flex: 1, fontSize: 14, color: Palette.textPrimary },
  participantsRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderRadius: 18 },
  avatarOverlap: { marginLeft: -10 },
  addParticipant: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.card,
    borderWidth: 1.5,
    borderColor: Palette.accent,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitOptions: { flexDirection: 'row', gap: Spacing.sm },
  splitCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 6,
    minHeight: 64,
  },
  splitCardSelected: { backgroundColor: '#EAF0FF', borderColor: Palette.accent },
  splitText: { fontSize: 12, color: Palette.textSecondary, fontWeight: '500' },
  splitTextSelected: { color: Palette.accent, fontWeight: '600' },
  receiptUpload: {
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderStyle: 'dashed',
    borderRadius: Radii.card,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  receiptText: { fontSize: 14, color: Palette.textMuted, fontWeight: '500' },
  saveButton: { marginBottom: Spacing.lg },
});
