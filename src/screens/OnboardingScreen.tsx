import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Logo from '../components/Logo';
import GradientButton from '../components/GradientButton';
import { Palette, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Logo size={22} />

      <View style={styles.hero}>
        <Image 
          source={require('../../assets/get_started_hero_enhanced.png')} 
          style={styles.heroImage} 
          resizeMode="contain" 
        />
      </View>

      <Text style={styles.headline}>
        Split expenses the{' '}
        <Text style={styles.headlineAccent}>smart way</Text>
      </Text>
      <Text style={styles.subCopy}>
        Track shared costs, settle up instantly, and stay stress-free with friends and family.
      </Text>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      <GradientButton title="Get Started" onPress={() => navigation.navigate('SignIn')} style={styles.cta} />
      <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.signInLink}>
        <Text style={styles.signInLinkText}>Sign In</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  heroImage: {
    width: width * 1.1,
    height: width * 1.1,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },
  headlineAccent: {
    color: Palette.gradientEnd,
  },
  subCopy: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: Palette.accent,
  },
  cta: {
    width: '100%',
  },
  signInLink: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  signInLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.accent,
    textAlign: 'center',
  },
});
