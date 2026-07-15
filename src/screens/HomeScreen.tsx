import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { APP_NAME } from '../constants';
import { RootStackParamList } from '../navigation/RootNavigator';
import { apiService, SummaryResponse } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animated scale values for action buttons
  const scaleAdd = useRef(new Animated.Value(1)).current;
  const scaleNew = useRef(new Animated.Value(1)).current;
  const scaleSettle = useRef(new Animated.Value(1)).current;

  const createSpringIn = (scaleVar: Animated.Value) => () => {
    Animated.spring(scaleVar, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const createSpringOut = (scaleVar: Animated.Value) => () => {
    Animated.spring(scaleVar, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const fetchSummary = async (showLoadingIndicator = true, forceRefresh = false) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const data = await apiService.getUserSummary(forceRefresh);
      setSummary(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load dashboard summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary(summary === null, false);
    }, [summary])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary(false, true);
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
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

  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'expense_added':
        return { icon: 'receipt-outline' as const, color: Colors.success, bgColor: Colors.primaryLight };
      case 'payment_made':
        return { icon: 'card-outline' as const, color: Colors.secondary, bgColor: 'rgba(197, 168, 128, 0.1)' };
      case 'group_created':
        return { icon: 'people-outline' as const, color: Colors.accent, bgColor: 'rgba(42, 75, 64, 0.1)' };
      case 'member_added':
        return { icon: 'person-add-outline' as const, color: Colors.textSecondary, bgColor: 'rgba(92, 107, 100, 0.1)' };
      default:
        return { icon: 'ellipse-outline' as const, color: Colors.textLight, bgColor: 'rgba(143, 158, 150, 0.1)' };
    }
  };

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const netBalance = summary?.netBalance || 0;
  const youOwe = summary?.youOwe || 0;
  const youAreOwed = summary?.youAreOwed || 0;
  const activities = summary?.recentActivity || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeftContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="wallet" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.logoText}>{APP_NAME}</Text>
        </View>
      </View>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Hello, {currentUser?.name} 👋</Text>
          <Text style={styles.welcomeSubtitle}>Track splits and settle instantly on Stellar testnet.</Text>
        </View>

      {/* Balance Summary Card */}
      <LinearGradient
        colors={['#2A4B40', '#0B2F24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceCardHeader}>
          <Text style={styles.balanceTitle}>Total Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>
          {netBalance >= 0 ? '+' : ''}${Math.abs(netBalance).toFixed(2)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>You owe</Text>
            <Text style={[styles.balanceValue, { color: '#FF8A8A' }]}>
              ${youOwe.toFixed(2)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>You are owed</Text>
            <Text style={[styles.balanceValue, { color: '#A7F3D0' }]}>
              ${youAreOwed.toFixed(2)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={createSpringIn(scaleAdd)}
          onPressOut={createSpringOut(scaleAdd)}
          style={styles.actionButtonContainer}
          onPress={() => navigation.navigate('AddExpense', {})}
        >
          <Animated.View style={[styles.actionButton, { transform: [{ scale: scaleAdd }] }]}>
            <View style={[styles.actionIconCircle, { backgroundColor: Colors.primaryLight, borderColor: 'rgba(11, 47, 36, 0.15)' }]}>
              <Ionicons name="add" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Add Expense</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={createSpringIn(scaleNew)}
          onPressOut={createSpringOut(scaleNew)}
          style={styles.actionButtonContainer}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Animated.View style={[styles.actionButton, { transform: [{ scale: scaleNew }] }]}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(42, 75, 64, 0.1)', borderColor: 'rgba(42, 75, 64, 0.15)' }]}>
              <Ionicons name="people" size={22} color={Colors.accent} />
            </View>
            <Text style={styles.actionLabel}>New Group</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.9}
          onPressIn={createSpringIn(scaleSettle)}
          onPressOut={createSpringOut(scaleSettle)}
          style={styles.actionButtonContainer}
          onPress={() => navigation.navigate('Groups')}
        >
          <Animated.View style={[styles.actionButton, { transform: [{ scale: scaleSettle }] }]}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(197, 168, 128, 0.1)', borderColor: 'rgba(197, 168, 128, 0.15)' }]}>
              <Ionicons name="card-outline" size={22} color={Colors.secondary} />
            </View>
            <Text style={styles.actionLabel}>Settle Up</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        {activities.length === 0 ? (
          <View style={styles.emptyActivityCard}>
            <Text style={styles.emptyActivityText}>No recent activity.</Text>
          </View>
        ) : (
          activities.map((item) => {
            const actStyle = getActivityStyle(item.type);
            return (
              <View key={item.id} style={styles.activityCard}>
                <View style={[styles.activityIcon, { backgroundColor: actStyle.bgColor }]}>
                  <Ionicons name={actStyle.icon} size={20} color={actStyle.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDescription}>{item.description}</Text>
                  <Text style={styles.activityMeta}>{item.group || 'General'} • {getRelativeTime(item.date)}</Text>
                </View>
                {item.amount !== undefined && item.amount !== null && (
                  <Text style={styles.activityAmount}>${item.amount.toFixed(2)}</Text>
                )}
              </View>
            );
          })
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  welcomeTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  balanceCard: {
    margin: 16,
    padding: 24,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  balanceAmount: {
    fontFamily: 'Georgia',
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 14,
    borderRadius: 6,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
    fontWeight: '600',
  },
  balanceValue: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  actionButtonContainer: {
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  activityCard: {
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
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  activityAmount: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: Colors.text,
  },
  emptyActivityCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  emptyActivityText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
