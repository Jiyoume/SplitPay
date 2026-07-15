import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { apiService } from '../services/apiService';
import { ApiError } from '../services/apiClient';

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
  const [selectedType, setSelectedType] = useState<'family' | 'friends' | 'roommates' | 'trip' | 'other'>('friends');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    const trimmed = memberEmail.trim().toLowerCase();
    if (trimmed) {
      if (!trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        Alert.alert('Validation Error', 'Please enter a valid email address.');
        return;
      }
      if (!members.includes(trimmed)) {
        setMembers([...members, trimmed]);
        setMemberEmail('');
      } else {
        Alert.alert('Duplicate Member', 'This email is already added.');
      }
    }
  };

  const removeMember = (email: string) => {
    setMembers(members.filter((m) => m !== email));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name.');
      return;
    }

    setLoading(true);
    try {
      await apiService.createGroup(
        groupName.trim(),
        description.trim(),
        selectedType,
        members
      );
      
      Alert.alert('Success', `Group "${groupName}" created!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      if (error instanceof ApiError && error.code === 'MEMBERS_NOT_FOUND') {
        const unknownEmails = error.details?.unknownEmails || [];
        Alert.alert(
          'Members Not Found',
          `The following users are not registered: \n\n${unknownEmails.join('\n')}\n\nPlease ask them to register first.`
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to create group.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Group Name Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g., Apartment 4B"
          placeholderTextColor={Colors.textLight}
          editable={!loading}
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
          editable={!loading}
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
                onPress={() => setSelectedType(type.id as any)}
                disabled={loading}
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
            editable={!loading}
            onSubmitEditing={addMember}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember} disabled={loading}>
            <LinearGradient
              colors={[Colors.accent, Colors.primary]}
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
            <TouchableOpacity onPress={() => removeMember(email)} style={styles.removeMemberButton} disabled={loading}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Create Button */}
      <TouchableOpacity 
        style={[styles.createButton, loading && styles.buttonDisabled]} 
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.createButtonGradient}>
            <ActivityIndicator color={Colors.white} />
          </View>
        ) : (
          <LinearGradient
            colors={[Colors.accent, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>Create Group</Text>
          </LinearGradient>
        )}
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
    borderRadius: 6,
    width: '31%',
    borderWidth: 1,
  },
  typeSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.border,
  },
  typeUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
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
    backgroundColor: Colors.primaryLight,
  },
  typeIconCircleUnselected: {
    backgroundColor: Colors.background,
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
    borderRadius: 6,
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
    backgroundColor: Colors.background,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
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
    borderRadius: 6,
    overflow: 'hidden',
    height: 52,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
