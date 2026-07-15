import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface GroupCardProps {
  name: string;
  type: string;
  memberCount: number;
  balance: number;
  lastActivity: string;
  onPress?: () => void;
}

export default function GroupCard({ name, type, memberCount, balance, lastActivity, onPress }: GroupCardProps) {
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'family': return 'heart';
      case 'roommates': return 'home';
      case 'trip': return 'airplane';
      default: return 'people';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon()} size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{memberCount} members • {lastActivity}</Text>
      </View>
      <View style={styles.balanceContainer}>
        {balance !== 0 ? (
          <Text style={[styles.balance, { color: balance > 0 ? Colors.positive : Colors.negative }]}>
            {balance > 0 ? '+' : ''}{balance > 0 ? '$' : '-$'}{Math.abs(balance).toFixed(2)}
          </Text>
        ) : (
          <Text style={styles.settled}>Settled</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Circular avatar/icon container
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  balanceContainer: { alignItems: 'flex-end' },
  balance: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  settled: { fontSize: 14, color: Colors.textSecondary },
});
