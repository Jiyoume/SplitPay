import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radii, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { GroupCard } from '../components';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupItem {
  id: string;
  name: string;
  emoji: string;
  members: string[];
  balance: number;
  unpaidCount: number;
}

const GROUPS: GroupItem[] = [
  { id: '1', name: 'Apartment 4B', emoji: '🏠', members: ['You', 'Sarah Cruz', 'Mike Tan'], balance: 2250.0, unpaidCount: 1 },
  { id: '2', name: 'Family Expenses', emoji: '👨‍👩‍👧', members: ['You', 'Mom', 'Dad', 'Ana Reyes', 'Ben Reyes'], balance: -1500.0, unpaidCount: 2 },
  { id: '3', name: 'Weekend Trip', emoji: '✈️', members: ['You', 'Alex Reyes', 'Sarah Cruz', 'Mike Tan'], balance: 4025.0, unpaidCount: 3 },
  { id: '4', name: 'Office Lunch', emoji: '🍜', members: ['You', 'Alex Reyes', 'Sarah Cruz', 'Mike Tan', 'Ben Reyes', 'Ana Reyes'], balance: 0, unpaidCount: 0 },
];

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filteredGroups = GROUPS.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <GroupCard
            name={item.name}
            emoji={item.emoji}
            members={item.members}
            balance={item.balance}
            unpaidCount={item.unpaidCount}
            onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
          />
        )}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
            <Text style={styles.title}>Groups</Text>
            <Text style={styles.subCopy}>Track shared expenses with friends and family</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Palette.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search groups"
                placeholderTextColor={Palette.textMuted}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Palette.textMuted} />
            <Text style={styles.emptyText}>No groups match "{search}"</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Palette.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  list: { padding: Spacing.lg, paddingBottom: 96 },
  header: { marginBottom: Spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: Palette.textPrimary },
  subCopy: { fontSize: 14, color: Palette.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: Palette.textPrimary, height: '100%' },
  emptyState: { alignItems: 'center', paddingTop: 64, gap: Spacing.sm },
  emptyText: { fontSize: 14, color: Palette.textSecondary },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
