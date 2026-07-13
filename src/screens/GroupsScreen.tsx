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
