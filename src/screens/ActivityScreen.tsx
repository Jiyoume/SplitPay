import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ActivityItem {
  id: string;
  type: 'expense_added' | 'payment_made' | 'group_created' | 'member_added';
  description: string;
  userName: string;
  groupName: string;
  amount?: number;
  date: string;
}

export default function ActivityScreen() {
  const activities: ActivityItem[] = [
    { id: '1', type: 'expense_added', description: 'added "Dinner at restaurant"', userName: 'You', groupName: 'Apartment 4B', amount: 85.0, date: 'Today, 7:30 PM' },
    { id: '2', type: 'payment_made', description: 'paid Sarah', userName: 'Mike', groupName: 'Apartment 4B', amount: 25.0, date: 'Today, 3:15 PM' },
    { id: '3', type: 'expense_added', description: 'added "Groceries"', userName: 'Sarah', groupName: 'Family Expenses', amount: 42.5, date: 'Yesterday' },
    { id: '4', type: 'group_created', description: 'created "Weekend Trip"', userName: 'You', groupName: 'Weekend Trip', date: '3 days ago' },
    { id: '5', type: 'member_added', description: 'added Alex to the group', userName: 'You', groupName: 'Weekend Trip', date: '3 days ago' },
    { id: '6', type: 'expense_added', description: 'added "Movie tickets"', userName: 'Alex', groupName: 'Weekend Trip', amount: 30.0, date: '3 days ago' },
  ];

  const getActivityIcon = (type: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (type) {
      case 'expense_added': return { name: 'receipt', color: Colors.primary };
      case 'payment_made': return { name: 'card', color: Colors.accent };
      case 'group_created': return { name: 'people', color: Colors.secondary };
      case 'member_added': return { name: 'person-add', color: Colors.secondary };
      default: return { name: 'ellipse', color: Colors.textSecondary };
    }
  };

  const renderActivity = ({ item }: { item: ActivityItem }) => {
    const icon = getActivityIcon(item.type);

    return (
      <View style={styles.activityItem}>
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            <Text style={styles.userName}>{item.userName}</Text> {item.description}
          </Text>
          <Text style={styles.activityMeta}>
            {item.groupName} • {item.date}
          </Text>
        </View>
        {item.amount && (
          <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Your expense history will appear here
            </Text>
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
  list: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: Colors.text,
  },
  userName: {
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
