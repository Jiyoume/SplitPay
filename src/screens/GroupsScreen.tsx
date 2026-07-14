import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

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

  const groups: GroupItem[] = [
    { id: '1', name: 'Apartment 4B', type: 'roommates', memberCount: 3, balance: 45.0, lastActivity: '2 hours ago' },
    { id: '2', name: 'Family Expenses', type: 'family', memberCount: 5, balance: -30.0, lastActivity: 'Yesterday' },
    { id: '3', name: 'Weekend Trip', type: 'trip', memberCount: 4, balance: 80.5, lastActivity: '3 days ago' },
    { id: '4', name: 'Office Lunch', type: 'friends', memberCount: 6, balance: 0, lastActivity: '1 week ago' },
  ];

  const getGroupStyle = (type: string) => {
    switch (type) {
      case 'family':
        return { icon: 'heart-outline' as const, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' };
      case 'roommates':
        return { icon: 'home-outline' as const, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.08)' };
      case 'trip':
        return { icon: 'airplane-outline' as const, color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.08)' };
      case 'friends':
      default:
        return { icon: 'people-outline' as const, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.08)' };
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
            {item.memberCount} members • {item.lastActivity}
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
          ) : (
            <Text style={styles.settledText}>Settled</Text>
          )}
          <Ionicons name="chevron-forward" size={14} color={Colors.textLight} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <View style={styles.createIconCircle}>
              <Ionicons name="add" size={18} color={Colors.primary} />
            </View>
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
    paddingBottom: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    borderStyle: 'dashed',
    gap: 8,
  },
  createIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '800',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 15,
    fontWeight: '800',
  },
  settledText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

