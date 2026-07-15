import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { apiService } from '../services/apiService';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity } from '../models/types';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async (showLoadingIndicator = true, forceRefresh = false) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const data = await apiService.getActivities(50, forceRefresh);
      setActivities(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load activity feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivities(activities.length === 0, false);
    }, [activities.length])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities(false, true);
  };

  const getActivityIcon = (type: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (type) {
      case 'expense_added': return { name: 'receipt-outline', color: Colors.success };
      case 'payment_made': return { name: 'card-outline', color: Colors.secondary };
      case 'group_created': return { name: 'people-outline', color: Colors.accent };
      case 'member_added': return { name: 'person-add-outline', color: Colors.textSecondary };
      default: return { name: 'ellipse-outline', color: Colors.textLight };
    }
  };

  const formatActivityDate = (date: Date) => {
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderActivity = ({ item, index }: { item: Activity; index: number }) => {
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
              {item.description}
            </Text>
            <Text style={styles.activityMeta}>
              {formatActivityDate(item.date)}
            </Text>
          </View>
          {item.amount !== undefined && item.amount !== null && (
            <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && activities.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
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
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 2,
  },
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
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
  activityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  amount: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
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
