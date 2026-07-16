import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Palette } from '../constants/theme';

interface LogoProps {
  size?: number;
}

/** MyShare logo: Image + wordmark: "My" navy + "Share" teal, per docs/REDESIGN_SPEC.md. */
export default function Logo({ size = 20 }: LogoProps) {
  const imageSize = size * 1.6;
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 4 }}
      />
      <Text style={[styles.text, { fontSize: size }]}>
        <Text style={styles.my}>My</Text>
        <Text style={styles.share}>Share</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
