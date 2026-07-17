import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, Radii } from '../constants/theme';

interface TourTooltipContentProps {
  icon: string;
  title: string;
  body: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  isLast?: boolean;
}

export default function TourTooltipContent({
  icon,
  title,
  body,
  step,
  totalSteps,
  onNext,
  onSkip,
  isLast = false,
}: TourTooltipContentProps) {
  return (
    <View style={s.container}>
      {/* Icon + Step count row */}
      <View style={s.topRow}>
        <View style={s.iconBubble}>
          {/* @ts-ignore */}
          <Ionicons name={icon} size={18} color="#6366f1" />
        </View>
        <Text style={s.stepText}>{step} of {totalSteps}</Text>
      </View>

      {/* Content */}
      <Text style={s.title}>{title}</Text>
      <Text style={s.body}>{body}</Text>

      {/* Step dots */}
      <View style={s.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[s.dot, i === step - 1 && s.dotActive]} />
        ))}
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity onPress={onSkip} style={s.skipBtn}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={s.nextBtn}>
          <Text style={s.nextBtnText}>{isLast ? 'Done ✓' : 'Next →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    minWidth: 220,
    maxWidth: 280,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    backgroundColor: '#6366f1',
    width: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
