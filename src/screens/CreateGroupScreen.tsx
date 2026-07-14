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
import { Colors } from '../constants/colors';

const GROUP_TYPES = [
  { id: 'family', label: 'Family', icon: 'heart' as const },
  { id: 'friends', label: 'Friends', icon: 'people' as const },
  { id: 'roommates', label: 'Roommates', icon: 'home' as const },
  { id: 'trip', label: 'Trip', icon: 'airplane' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' as const },
];

export default function CreateGroupScreen() {
  const navigation = useNavigation();
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
    <ScrollView style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g., Apartment 4B"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this group for?"
          placeholderTextColor={Colors.textLight}
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
                color={selectedType === type.id ? Colors.white : Colors.textSecondary}
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
            placeholderTextColor={Colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
        {members.map((email) => (
          <View key={email} style={styles.memberChip}>
            <Ionicons name="person" size={16} color={Colors.primary} />
            <Text style={styles.memberText}>{email}</Text>
            <TouchableOpacity onPress={() => removeMember(email)}>
              <Ionicons name="close-circle" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>Create Group</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeItem: { alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, width: '30%' },
  typeSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  typeLabelSelected: { color: Colors.white },
  memberInputRow: { flexDirection: 'row', gap: 8 },
  addBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  memberChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 10, paddingHorizontal: 14, borderRadius: 20, marginTop: 8, gap: 8 },
  memberText: { flex: 1, fontSize: 14, color: Colors.text },
  createButton: { backgroundColor: Colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 32 },
  createButtonText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
});
