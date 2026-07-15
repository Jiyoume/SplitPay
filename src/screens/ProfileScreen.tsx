import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { getKycStatus, KycStatusResponse } from '../services/kycService';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, wallet, logout, refreshUser } = useAuth();
  const [funding, setFunding] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);

  useEffect(() => {
    getKycStatus().then(setKycStatus).catch(() => {});
  }, []);

  // Animated scale values for action buttons
  const scaleFund = useRef(new Animated.Value(1)).current;
  const scaleLogout = useRef(new Animated.Value(1)).current;

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

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: logout },
    ]);
  };

  const copyPublicKey = () => {
    if (wallet?.publicKey) {
      Clipboard.setString(wallet.publicKey);
      Alert.alert('Copied Address', 'Stellar Public Key copied to clipboard.');
    }
  };

  const handleFundWallet = async () => {
    setFunding(true);
    try {
      await apiService.fundWallet();
      await refreshUser(); // Fetch fresh balance
      Alert.alert('Funding Succeeded 🎉', 'Your custodial Stellar wallet was successfully funded with 10,000 testnet XLM via Friendbot.');
    } catch (error: any) {
      Alert.alert('Funding Failed', error.message || 'Friendbot is currently busy. Please try again in a few moments.');
    } finally {
      setFunding(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Curved Header */}
      <LinearGradient
        colors={[Colors.accent, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.profileHeader}
      >
        <Text style={styles.headerTitleText}>Profile</Text>
        
        {/* Placeholder for overlapping avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* User Information */}
      <View style={styles.userInfoSection}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.phone ? <Text style={styles.userEmail}>{user.phone}</Text> : null}
        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>Member</Text>
        </View>
      </View>

      {/* Wallet Info Card styled like stats/cards */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
            <Text style={styles.walletTitle}>Custodial Stellar Wallet</Text>
          </View>
          <View style={[styles.statusBadge, wallet?.fundingStatus === 'funded' ? styles.statusFunded : styles.statusUnfunded]}>
            <Text style={styles.statusText}>{wallet?.fundingStatus?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.addressSection}>
          <Text style={styles.cardLabel}>Public Address (G...)</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {wallet?.publicKey || 'Creating Address...'}
            </Text>
            <TouchableOpacity onPress={copyPublicKey} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <View style={styles.balanceInfo}>
            <Text style={styles.cardLabel}>XLM Balance (Horizon Live)</Text>
            <Text style={styles.balanceValue}>
              {wallet?.xlmBalance ? parseFloat(wallet.xlmBalance).toFixed(4) : '0.0000'} <Text style={styles.xlmDenom}>XLM</Text>
            </Text>
          </View>
          
          <TouchableOpacity 
            activeOpacity={0.9}
            onPressIn={createSpringIn(scaleFund)}
            onPressOut={createSpringOut(scaleFund)}
            style={styles.fundBtnContainer}
            onPress={handleFundWallet}
            disabled={funding}
          >
            <Animated.View style={[styles.fundBtn, { transform: [{ scale: scaleFund }] }, funding && styles.fundBtnDisabled]}>
              {funding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.fundBtnText}>Fund (Friendbot)</Text>
                </>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Cards */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TopUp')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Top Up</Text>
          <View style={styles.menuRight}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('KYC')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Verify Identity</Text>
          <View style={styles.menuRight}>
            <View style={[styles.kycPill, kycStatus?.status === 'ACCEPTED' ? styles.kycPillVerified : styles.kycPillPending]}>
              <Text style={styles.kycPillText}>{kycStatus ? kycStatus.status.replace('_', ' ') : '...'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Reports')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="bar-chart-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Reports</Text>
          <View style={styles.menuRight}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => refreshUser()}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Refresh Wallet & Balance</Text>
          <View style={styles.menuRight}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={createSpringIn(scaleLogout)}
        onPressOut={createSpringOut(scaleLogout)}
        style={styles.logoutBtnContainer}
        onPress={handleLogout}
      >
        <Animated.View style={[styles.logoutButton, { transform: [{ scale: scaleLogout }] }]}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Animated.View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    height: 160,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: -20,
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -44,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  userInfoSection: {
    alignItems: 'center',
    marginTop: 56,
    marginBottom: 16,
  },
  userName: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  memberBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  walletCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusFunded: {
    backgroundColor: Colors.primaryLight,
  },
  statusUnfunded: {
    backgroundColor: 'rgba(185, 28, 28, 0.08)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressSection: {
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  copyBtn: {
    padding: 2,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceValue: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 4,
  },
  xlmDenom: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  fundBtnContainer: {
    // Wrapped to handle spring scale
  },
  fundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 6,
  },
  fundBtnDisabled: {
    opacity: 0.7,
  },
  fundBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginLeft: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 12,
    fontWeight: '700',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kycPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kycPillVerified: {
    backgroundColor: Colors.primaryLight,
  },
  kycPillPending: {
    backgroundColor: 'rgba(197, 168, 128, 0.15)',
  },
  kycPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  logoutBtnContainer: {
    margin: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.25)',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '800',
  },
});
