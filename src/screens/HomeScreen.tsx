import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Mock data for demonstration
  const totalBalance = 125.5;
  const youOwe = 45.0;
  const youAreOwed = 170.5;

  const recentActivity = [
    { id: '1', description: 'Dinner at restaurant', amount: 85.0, group: 'Apartment 4B', date: 'Today, 7:30 PM' },
    { id: '2', description: 'Groceries', amount: 42.5, group: 'Family Expenses', date: 'Yesterday' },
    { id: '3', description: 'Movie tickets', amount: 30.0, group: 'Weekend Trip', date: '2 days ago' },
  ];

  const getActivityStyle = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes('dinner') || d.includes('restaurant')) {
      return { icon: 'restaurant-outline' as const, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
    }
    if (d.includes('groceries')) {
      return { icon: 'basket-outline' as const, color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' };
    }
    return { icon: 'ticket-outline' as const, color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)' };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Balance Summary Card */}
      <LinearGradient
        colors={['#34D399', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceCardHeader}>
          <Text style={styles.balanceTitle}>Total Balance</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.balanceAmount}>
          {totalBalance >= 0 ? '+' : ''}${Math.abs(totalBalance).toFixed(2)}
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
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddExpense', {})}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="add" size={26} color="#10B981" />
          </View>
          <Text style={styles.actionLabel}>Add Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Ionicons name="people" size={22} color="#8B5CF6" />
          </View>
          <Text style={styles.actionLabel}>New Group</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // Settle up from Home
            navigation.navigate('MainTabs', { screen: 'Groups' } as any);
          }}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="card-outline" size={22} color="#3B82F6" />
          </View>
          <Text style={styles.actionLabel}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Activity' } as any)}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>
        {recentActivity.map((item) => {
          const actStyle = getActivityStyle(item.description);
          return (
            <View key={item.id} style={styles.activityCard}>
              <View style={[styles.activityIcon, { backgroundColor: actStyle.bgColor }]}>
                <Ionicons name={actStyle.icon} size={20} color={actStyle.color} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityDescription}>{item.description}</Text>
                <Text style={styles.activityMeta}>{item.group} • {item.date}</Text>
              </View>
              <Text style={styles.activityAmount}>${item.amount.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
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
  balanceCard: {
    margin: 16,
    padding: 24,
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
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
    borderRadius: 18,
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
    fontSize: 18,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
});

