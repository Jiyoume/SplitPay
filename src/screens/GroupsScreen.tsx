import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radii, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { GroupCard, Skeleton } from '../components';
import { getUserGroupsWithBalances } from '../services/localDatabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    try {
      const list = await getUserGroupsWithBalances('me');
      setGroups(list);
    } catch (err) {
      console.error('Failed to load groups in GroupsScreen:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setInitialLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const getGroupEmoji = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'roommates': return '🏠';
      case 'family': return '👨‍👩‍👧';
      case 'trip': return '✈️';
      case 'friends': return '👥';
      default: return '📦';
    }
  };

  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  // Render skeleton loaders for GroupCards
  const renderSkeletons = () => (
    <View style={{ paddingTop: Spacing.md }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ backgroundColor: Palette.card, padding: Spacing.md, borderRadius: Radii.card, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <Skeleton width={120} height={18} style={{ marginBottom: Spacing.xs }} />
            <Skeleton width={80} height={14} />
          </View>
          <Skeleton width={60} height={24} borderRadius={Radii.pill} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={initialLoading ? [] : filteredGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.accent} />}
        renderItem={({ item }) => {
          const memberNames = item.members.map((m: any) => m.id === 'me' ? 'You' : m.name);
          return (
            <GroupCard
              name={item.name}
              emoji={getGroupEmoji(item.type)}
              members={memberNames}
              balance={item.userBalance}
              unpaidCount={item.unpaidCount}
              onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
            />
          );
        }}
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
          initialLoading ? renderSkeletons() : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Palette.textMuted} />
              <Text style={styles.emptyText}>No groups match "{search}"</Text>
            </View>
          )
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
