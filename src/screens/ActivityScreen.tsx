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
      case 'expense_added': return { name: 'receipt-outline', color: Colors.primary };
      case 'payment_made': return { name: 'card-outline', color: Colors.accent };
      case 'group_created': return { name: 'people-outline', color: Colors.secondary };
      case 'member_added': return { name: 'person-add-outline', color: Colors.secondary };
      default: return { name: 'ellipse-outline', color: Colors.textSecondary };
    }
  };

  const renderActivity = ({ item, index }: { item: ActivityItem; index: number }) => {
    const icon = getActivityIcon(item.type);

    return (
      <View style={styles.timelineRow}>
        {/* Left Timeline Column */}
        <View style={styles.timelineColumn}>
          {/* Vertical line connecting nodes */}
          <View 
            style={[
              styles.timelineLine,
              index === 0 && { top: 20 },
              index === activities.length - 1 && { height: 20 }
            ]} 
          />
          {/* Timeline node icon */}
          <View style={[
            styles.iconNode, 
            { backgroundColor: `${icon.color}15`, borderColor: '#FFFFFF' }
          ]}>
            <Ionicons name={icon.name} size={16} color={icon.color} />
          </View>
        </View>

        {/* Right Content Card */}
        <View style={styles.activityCard}>
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={({ item, index }) => renderActivity({ item, index })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={56} color={Colors.textSecondary} />
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
    paddingBottom: 40,
  },
  timelineRow: {
    flexDirection: 'row',
    position: 'relative',
    minHeight: 80,
  },
  timelineColumn: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 22,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.border,
  },
  iconNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
    marginLeft: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  userName: {
    fontWeight: '800',
    color: Colors.text,
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
});

