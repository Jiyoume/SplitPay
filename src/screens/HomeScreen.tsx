import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const totalBalance = 1245.50;
  const changePercent = 12.5;

  const quickActions = [
    { id: 'add', label: 'Add Expense', icon: 'add' as const, route: 'AddExpense' },
    { id: 'split', label: 'Split Bill', icon: 'people' as const, route: 'CreateGroup' },
    { id: 'request', label: 'Request', icon: 'arrow-down' as const, route: 'SettleUp' },
    { id: 'scan', label: 'Scan', icon: 'scan' as const, route: 'AddExpense' },
  ];

  const recentActivity = [
    { id: '1', title: 'Dinner with friends', splitText: 'Split 4 ways', amount: -45.60, date: 'Today', icon: 'people', bgColor: '#E6F4EA', iconColor: '#10B981' },
    { id: '2', title: 'Netflix Subscription', splitText: 'Split 2 ways', amount: -8.99, date: 'May 20', icon: 'logo-youtube', bgColor: '#FCE8E8', iconColor: '#EF4444' },
    { id: '3', title: 'Weekend Trip', splitText: 'Split 5 ways', amount: -120.00, date: 'May 18', icon: 'airplane', bgColor: '#E8F0FE', iconColor: '#2F6BFF' },
    { id: '4', title: 'Groceries', splitText: 'Split 3 ways', amount: -67.35, date: 'May 17', icon: 'bag-handle', bgColor: '#FEF3C7', iconColor: '#F59E0B' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Header Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Alex 👋</Text>
        <Text style={styles.headline}>Share smarter. Live better.</Text>
        <Text style={styles.subHeadline}>Track, split and share expenses{'\n'}seamlessly.</Text>
      </View>

      {/* Liquid Glass Balance Card */}
      <View style={styles.cardContainer}>
        <View style={styles.cardGlow} />
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <View>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>₱{totalBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
              
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>-vs last month</Text>
                <View style={styles.pillContainer}>
                  <Ionicons name="caret-up" size={12} color={Colors.success} />
                  <Text style={styles.pillText}>{changePercent}%</Text>
                </View>
              </View>
            </View>
            
            {/* Chart Graphic Mockup */}
            <View style={styles.chartGraphic}>
               <LinearGradient colors={['rgba(47, 107, 255, 0.1)', 'rgba(0, 209, 255, 0.1)']} style={styles.chartBg} />
               <View style={styles.bars}>
                 <LinearGradient colors={['#2F6BFF', '#2F6BFF']} style={[styles.bar, {height: 24}]} />
                 <LinearGradient colors={['#2F6BFF', '#00D1FF']} style={[styles.bar, {height: 48}]} />
                 <LinearGradient colors={['#10B981', '#34D399']} style={[styles.bar, {height: 36}]} />
               </View>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Quick Actions Row */}
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity 
            key={action.id} 
            style={styles.actionItem}
            onPress={() => {
              if(action.route === 'CreateGroup') navigation.navigate('CreateGroup');
              else if(action.route === 'AddExpense') navigation.navigate('AddExpense', {});
              else navigation.navigate('MainTabs', { screen: 'Groups' } as any);
            }}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name={action.icon} size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Activity' } as any)}>
            <Text style={styles.viewAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentActivity.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <View style={[styles.activityIconWrapper, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySubtitle}>{item.splitText}</Text>
            </View>
            <View style={styles.activityAmounts}>
              <Text style={styles.activityAmountBold}>
                {item.amount < 0 ? '-' : '+'}₱{Math.abs(item.amount).toFixed(2)}
              </Text>
              <Text style={styles.activityDate}>{item.date}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Promo Banner */}
      <View style={styles.promoContainer}>
        <LinearGradient
          colors={['rgba(47,107,255,0.08)', 'rgba(0,209,255,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.promoBanner}
        >
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>Smart sharing, made simple</Text>
            <Text style={styles.promoDesc}>Invite friends and start sharing expenses effortlessly.</Text>
          </View>
          {/* Decorative shapes for promo */}
          <View style={styles.promoGraphic}>
             <Ionicons name="people-circle" size={54} color={Colors.primary} style={{opacity: 0.8}} />
             <Ionicons name="sparkles" size={24} color={Colors.secondary} style={{position: 'absolute', top: -10, right: -10}} />
          </View>
        </LinearGradient>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subHeadline: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cardContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderRadius: 36,
    transform: [{ scale: 0.95 }],
    ...Platform.select({
      ios: {
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  balanceCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    padding: 24,
    ...Platform.select({
      android: {
        elevation: 4,
        backgroundColor: '#FFFFFF',
      },
    }),
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  pillText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '700',
  },
  chartGraphic: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 8,
  },
  chartBg: {
    ...StyleSheet.absoluteFillObject,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    width: '22%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  activityIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activityAmounts: {
    alignItems: 'flex-end',
  },
  activityAmountBold: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  promoContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  promoBanner: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  promoTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
    color: Colors.text,
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  promoGraphic: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  }
});
