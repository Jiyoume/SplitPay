import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Palette, Radii } from '../constants/theme';

export type PillStatus = 'positive' | 'negative' | 'pending';

const STATUS_STYLES: Record<PillStatus, { bg: string; fg: string }> = {
  positive: { bg: Palette.positiveBg, fg: Palette.positive },
  negative: { bg: Palette.negativeBg, fg: Palette.negative },
  pending: { bg: Palette.pendingBg, fg: Palette.pending },
};

interface StatusPillProps {
  label: string;
  status: PillStatus;
}

export default function StatusPill({ label, status }: StatusPillProps) {
  const { bg, fg } = STATUS_STYLES[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
