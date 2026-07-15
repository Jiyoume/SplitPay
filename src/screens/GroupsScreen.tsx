import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { apiService } from '../services/apiService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupItem {
  id: string;
  name: string;
  type: 'family' | 'friends' | 'roommates' | 'trip' | 'other';
  memberCount: number;
  balance: number;
  totalExpenses: number;
  lastActivity?: Date;
}

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = async (showLoadingIndicator = true, forceRefresh = false) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const data = await apiService.getGroups(forceRefresh);
      setGroups(data as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups(groups.length === 0, false);
    }, [groups.length])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups(false, true);
  };

  const formatActivityDate = (date?: Date) => {
    if (!date) return 'No activity yet';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getGroupStyle = (type: string) => {
    switch (type) {
      case 'family':
        return { icon: 'heart-outline' as const, color: Colors.negative, bgColor: 'rgba(185, 28, 28, 0.08)' };
      case 'roommates':
        return { icon: 'home-outline' as const, color: Colors.success, bgColor: 'rgba(21, 128, 61, 0.08)' };
      case 'trip':
        return { icon: 'airplane-outline' as const, color: Colors.secondary, bgColor: 'rgba(197, 168, 128, 0.08)' };
      case 'friends':
      default:
        return { icon: 'people-outline' as const, color: Colors.accent, bgColor: 'rgba(42, 75, 64, 0.08)' };
    }
  };

  const getLeftBorderColor = (balance: number) => {
    if (balance > 0) return Colors.positive;
    if (balance < 0) return Colors.negative;
    return 'transparent';
  };

  const renderGroup = ({ item }: { item: GroupItem }) => {
    const groupStyle = getGroupStyle(item.type);
    return (
      <TouchableOpacity
        style={[
          styles.groupCard, 
          { borderLeftColor: getLeftBorderColor(item.balance) },
          item.balance !== 0 && { borderLeftWidth: 4 }
        ]}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      >
        <View style={[styles.groupIcon, { backgroundColor: groupStyle.bgColor }]}>
          <Ionicons name={groupStyle.icon} size={22} color={groupStyle.color} />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupMeta}>
            {item.memberCount} members • {formatActivityDate(item.lastActivity)}
          </Text>
        </View>
        <View style={styles.groupBalance}>
          {item.balance !== 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceLabel}>
                {item.balance > 0 ? "You're owed" : "You owe"}
              </Text>
              <Text style={[styles.balanceText, { color: item.balance > 0 ? Colors.positive : Colors.negative }]}>
                {item.balance > 0 ? '+' : '-'}${Math.abs(item.balance).toFixed(2)}
              </Text>
            </View>
          ) : item.totalExpenses > 0 ? (
            <Text style={styles.settledText}>Settled</Text>
          ) : (
            <Text style={styles.settledText}>No expenses</Text>
          )}
          <Ionicons name="chevron-forward" size={14} color={Colors.textLight} style={{ marginLeft: 8, alignSelf: 'center' }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && groups.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name="add" size={26} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>You are not in any groups yet.</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <Text style={styles.emptyButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  groupMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  groupBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  balanceText: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  settledText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
