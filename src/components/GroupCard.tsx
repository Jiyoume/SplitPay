import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';
import MemberAvatar from './MemberAvatar';

const MAX_VISIBLE_AVATARS = 3;

interface GroupCardProps {
  name: string;
  emoji?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  members: string[];
  balance: number;
  unpaidCount: number;
  onPress?: () => void;
}

export default function GroupCard({ name, emoji, icon = 'people', members, balance, unpaidCount, onPress }: GroupCardProps) {
  const visibleMembers = members.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = members.length - visibleMembers.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.coverBlock}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Ionicons name={icon} size={24} color={Palette.accent} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.avatarRow}>
          {visibleMembers.map((member, i) => (
            <View key={member} style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}>
              <MemberAvatar name={member} size={24} />
            </View>
          ))}
          {overflow > 0 && (
            <View style={[styles.avatarWrap, styles.avatarOverlap, styles.overflowBadge]}>
              <Text style={styles.overflowText}>+{overflow}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.balanceContainer}>
        <Text
          style={[
            styles.balance,
            { color: balance > 0 ? Palette.positive : balance < 0 ? Palette.negative : Palette.textSecondary },
          ]}
        >
          {peso(balance, { sign: true })}
        </Text>
        <Text style={styles.caption}>{unpaidCount > 0 ? `${unpaidCount} unpaid` : 'All settled'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    padding: Spacing.lg,
    borderRadius: Radii.card,
    marginBottom: Spacing.md,
    ...CardShadow,
  },
  coverBlock: {
    width: 48,
    height: 48,
    borderRadius: Radii.input,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  emoji: { fontSize: 22 },
  info: { flex: 1, marginRight: Spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: Palette.textPrimary },
  avatarRow: { flexDirection: 'row', marginTop: Spacing.sm },
  avatarWrap: { borderRadius: 12 },
  avatarOverlap: { marginLeft: -8 },
  overflowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.textMuted,
    borderWidth: 2,
    borderColor: Palette.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: { fontSize: 10, fontWeight: '700', color: Palette.white },
  balanceContainer: { alignItems: 'flex-end' },
  balance: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 11, color: Palette.textMuted, marginTop: 4 },
});
