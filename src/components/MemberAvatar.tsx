import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Palette } from '../constants/theme';

interface MemberAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
}

const AVATAR_COLORS = [Palette.accent, Palette.gradientStart, Palette.gradientEnd, Palette.pending, Palette.positive];

/** Deterministic color pick so the same name always gets the same avatar color. */
function colorForName(name: string): string {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function MemberAvatar({ name, size = 40, backgroundColor }: MemberAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: backgroundColor ?? colorForName(name) },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Palette.white,
  },
  text: { fontWeight: '700', color: Palette.white },
});
