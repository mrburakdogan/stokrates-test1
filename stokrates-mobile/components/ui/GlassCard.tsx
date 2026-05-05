import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, Animated, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useUIStore } from '@/stores/uiStore';
import { GLASS } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  noPadding?: boolean;
  /** Disable entrance animation */
  noAnimation?: boolean;
  /** Stagger delay in ms */
  delay?: number;
}

export function GlassCard({ children, style, intensity, noPadding, noAnimation, delay }: Props) {
  const theme = useUIStore(s => s.theme);
  const blurIntensity = intensity ?? GLASS.blur;
  const tint = theme === 'dark' ? 'dark' : 'light';

  const opacity = useRef(new Animated.Value(noAnimation ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(noAnimation ? 0 : 16)).current;

  useEffect(() => {
    if (noAnimation) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: delay ?? 0,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: delay ?? 0,
        damping: 18,
        stiffness: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cardStyle: ViewStyle = {
    borderRadius: GLASS.radiusMd,
    borderWidth: 1,
    overflow: 'hidden',
    ...(!noPadding && { padding: 16 }),
  };

  const animStyle = noAnimation ? {} : { opacity, transform: [{ translateY }] };

  if (Platform.OS === 'android') {
    return (
      <Animated.View
        style={[
          cardStyle,
          {
            borderColor: theme === 'dark'
              ? 'rgba(148, 163, 184, 0.12)'
              : 'rgba(255, 255, 255, 0.6)',
          },
          styles.androidCard,
          theme === 'dark' ? styles.androidDark : styles.androidLight,
          style,
          animStyle,
        ]}
      >
        <View
          style={[
            styles.innerGlow,
            {
              borderColor: theme === 'dark'
                ? 'rgba(148, 163, 184, 0.06)'
                : 'rgba(255, 255, 255, 0.5)',
            },
          ]}
          pointerEvents="none"
        />
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        cardStyle,
        { borderColor: theme === 'dark' ? GLASS.borderDark : GLASS.border },
        styles.iosShadow,
        style,
        animStyle,
      ]}
    >
      <BlurView intensity={blurIntensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          theme === 'dark' ? styles.overlayDark : styles.overlayLight,
        ]}
        pointerEvents="none"
      />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  androidCard: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  androidLight: { backgroundColor: 'rgba(255, 255, 255, 0.72)' },
  androidDark: { backgroundColor: 'rgba(30, 41, 59, 0.75)' },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: GLASS.radiusMd - 1,
    borderWidth: 1,
  },
  iosShadow: {
    shadowColor: GLASS.shadowColor,
    shadowOffset: GLASS.shadowOffset,
    shadowOpacity: 0.15,
    shadowRadius: GLASS.shadowRadius,
  },
  overlayLight: { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  overlayDark: { backgroundColor: 'rgba(15, 23, 42, 0.3)' },
});
