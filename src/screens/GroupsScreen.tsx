import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        return { icon: 'heart' as const, color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.1)' };
      case 'roommates':
        return { icon: 'home' as const, color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.1)' };
      case 'trip':
        return { icon: 'airplane' as const, color: '#00C6FF', bgColor: 'rgba(0, 198, 255, 0.1)' };
      case 'friends':
      default:
        return { icon: 'people' as const, color: '#0A84FF', bgColor: 'rgba(10, 132, 255, 0.1)' };
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
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      >
        <View style={[styles.groupIcon, { backgroundColor: groupStyle.bgColor }]}>
          <Ionicons name={groupStyle.icon} size={22} color={groupStyle.color} />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <View style={styles.avatarStack}>
            {[1, 2, 3].map((_, i) => (
              <View key={i} style={[styles.miniAvatar, { marginLeft: i > 0 ? -8 : 0 }]}>
                <Ionicons name="person" size={10} color={Colors.textSecondary} />
              </View>
            ))}
            {item.memberCount > 3 && (
              <View style={[styles.miniAvatar, styles.miniAvatarMore, { marginLeft: -8 }]}>
                <Text style={styles.miniAvatarMoreText}>+{item.memberCount - 3}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.groupBalance}>
          {item.balance !== 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceLabel}>
                {item.balance > 0 ? "Owes you" : "You owe"}
              </Text>
              <Text style={[styles.balanceText, { color: item.balance > 0 ? Colors.positive : Colors.negative }]}>
                {item.balance > 0 ? '+' : '-'}₱{Math.abs(item.balance).toFixed(2)}
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
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={Colors.textLight}
          />
        </View>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#0A84FF', '#00C6FF']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
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
    marginBottom: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarMore: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#FFFFFF',
  },
  miniAvatarMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
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
    color: Colors.textLight,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

