import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import * as localDB from '../services/localDatabase';
import { calculateGroupBalances } from '../utils/balance';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupItem {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  balance: number;
  lastActivity: string;
}

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadData() {
        try {
          const userGroups = await localDB.getUserGroups('1');
          const groupItems: GroupItem[] = [];

          for (const g of userGroups) {
            const fullGroup = await localDB.getGroup(g.id);
            if (!fullGroup) continue;

            const expenses = await localDB.getGroupExpenses(g.id);
            const payments = await localDB.getGroupPayments(g.id);

            const balances = calculateGroupBalances(
              fullGroup.members || [],
              expenses,
              payments
            );

            const myBalance = balances.find((b) => b.userId === '1')?.balance || 0;

            groupItems.push({
              id: g.id,
              name: g.name,
              type: g.type,
              memberCount: fullGroup.members?.length || 0,
              balance: myBalance,
              lastActivity: expenses.length > 0 ? 'Active' : 'No expenses',
            });
          }

          if (active) {
            setGroups(groupItems);
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to load groups:', err);
        }
      }
      loadData();
      return () => {
        active = false;
      };
    }, [])
  );

  const getGroupIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'family': return 'heart';
      case 'roommates': return 'home';
      case 'trip': return 'airplane';
      case 'friends': return 'people';
      default: return 'people';
    }
  };

  const renderGroup = ({ item }: { item: GroupItem }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
    >
      <View style={styles.groupIcon}>
        <Ionicons name={getGroupIcon(item.type)} size={24} color={Colors.primary} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMeta}>
          {item.memberCount} members • {item.lastActivity}
        </Text>
      </View>
      <View style={styles.groupBalance}>
        {item.balance !== 0 ? (
          <Text style={[styles.balanceText, { color: item.balance > 0 ? Colors.positive : Colors.negative }]}>
            {item.balance > 0 ? '+' : ''}{item.balance > 0 ? '$' : '-$'}{Math.abs(item.balance).toFixed(2)}
          </Text>
        ) : (
          <Text style={styles.settledText}>Settled</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.createButtonText}>Create New Group</Text>
          </TouchableOpacity>
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
  list: {
    padding: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  groupMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  groupBalance: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settledText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
