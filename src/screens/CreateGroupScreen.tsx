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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radii, Spacing } from '../constants/theme';
import { GradientButton } from '../components';

const GROUP_TYPES = [
  { id: 'family', label: 'Family', icon: 'heart' as const },
  { id: 'friends', label: 'Friends', icon: 'people' as const },
  { id: 'roommates', label: 'Roommates', icon: 'home' as const },
  { id: 'trip', label: 'Trip', icon: 'airplane' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' as const },
];

export default function CreateGroupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState('friends');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  const addMember = () => {
    if (memberEmail.trim() && !members.includes(memberEmail.trim())) {
      setMembers([...members, memberEmail.trim()]);
      setMemberEmail('');
    }
  };

  const removeMember = (email: string) => {
    setMembers(members.filter((m) => m !== email));
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    Alert.alert('Success', `Group "${groupName}" created!`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <Text style={styles.logo}>
          <Text style={styles.logoNavy}>My</Text>
          <Text style={styles.logoTeal}>Share</Text>
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g., Apartment 4B"
            placeholderTextColor={Palette.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            placeholderTextColor={Palette.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Type</Text>
          <View style={styles.typeGrid}>
            {GROUP_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeItem, selectedType === type.id && styles.typeSelected]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons
                  name={type.icon}
                  size={24}
                  color={selectedType === type.id ? Palette.accent : Palette.textSecondary}
                />
                <Text style={[styles.typeLabel, selectedType === type.id && styles.typeLabelSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Add Members</Text>
          <View style={styles.memberInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="Enter email address"
              placeholderTextColor={Palette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addMember}>
              <Ionicons name="add" size={24} color={Palette.white} />
            </TouchableOpacity>
          </View>
          {members.map((email) => (
            <View key={email} style={styles.memberChip}>
              <Ionicons name="person" size={16} color={Palette.accent} />
              <Text style={styles.memberText}>{email}</Text>
              <TouchableOpacity onPress={() => removeMember(email)}>
                <Ionicons name="close-circle" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <GradientButton title="Create Group" onPress={handleCreate} style={styles.createButton} />
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  typeItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    width: '30%',
    minHeight: 44,
    justifyContent: 'center',
  },
  typeSelected: { backgroundColor: '#EAF0FF', borderColor: Palette.accent },
  typeLabel: { fontSize: 12, color: Palette.textSecondary, marginTop: Spacing.xs },
  typeLabelSelected: { color: Palette.accent, fontWeight: '600' },
  memberInputRow: { flexDirection: 'row', gap: Spacing.sm },
  addBtn: { width: 48, height: 48, borderRadius: Radii.input, backgroundColor: Palette.accent, justifyContent: 'center', alignItems: 'center' },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  memberText: { flex: 1, fontSize: 14, color: Palette.textPrimary },
  createButton: { marginBottom: Spacing.lg },
});
