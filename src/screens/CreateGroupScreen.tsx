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

const GROUP_TYPES = [
  { id: 'family', label: 'Family', icon: 'heart-outline' as const },
  { id: 'friends', label: 'Friends', icon: 'people-outline' as const },
  { id: 'roommates', label: 'Roommates', icon: 'home-outline' as const },
  { id: 'trip', label: 'Trip', icon: 'airplane-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Group Name Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g., Apartment 4B"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Description Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Description (optional)</Text>
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

      {/* Group Type Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Group Type</Text>
        <View style={styles.typeGrid}>
          {GROUP_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeItem,
                  isSelected ? styles.typeSelected : styles.typeUnselected
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={[
                  styles.typeIconCircle,
                  isSelected ? styles.typeIconCircleSelected : styles.typeIconCircleUnselected
                ]}>
                  <Ionicons
                    name={type.icon}
                    size={22}
                    color={isSelected ? Colors.primary : Colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.typeLabel,
                    isSelected ? styles.typeLabelSelected : styles.typeLabelUnselected
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Add Members Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Add Members</Text>
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
            <LinearGradient
              colors={['#34D399', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {members.length > 0 && <View style={styles.divider} />}
        
        {members.map((email) => (
          <View key={email} style={styles.memberChip}>
            <View style={styles.memberAvatarCircle}>
              <Ionicons name="person-outline" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.memberText} numberOfLines={1}>{email}</Text>
            <TouchableOpacity onPress={() => removeMember(email)} style={styles.removeMemberButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Create Button */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <LinearGradient
          colors={['#34D399', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.createButtonGradient}
        >
          <Text style={styles.createButtonText}>Create Group</Text>
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
  input: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    width: '31%',
    borderWidth: 1,
  },
  typeSelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.15)',
  },
  typeUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
  },
  typeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeIconCircleSelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  typeIconCircleUnselected: {
    backgroundColor: '#F8F9FC',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeLabelSelected: {
    color: Colors.primary,
  },
  typeLabelUnselected: {
    color: Colors.textSecondary,
  },
  memberInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  removeMemberButton: {
    padding: 2,
  },
  createButton: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 52,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  createButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

