import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Palette } from '../constants/theme';

interface LogoProps {
  size?: number;
}

/** MyShare wordmark: "My" navy + "Share" teal, per docs/REDESIGN_SPEC.md. */
export default function Logo({ size = 20 }: LogoProps) {
  return (
    <Text style={[styles.text, { fontSize: size }]}>
      <Text style={styles.my}>My</Text>
      <Text style={styles.share}>Share</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '800',
  },
  my: {
    color: Palette.navy,
  },
  share: {
    color: Palette.gradientEnd,
  },
});
