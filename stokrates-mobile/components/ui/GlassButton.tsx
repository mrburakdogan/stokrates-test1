import React, { useRef } from 'react';
import {
  StyleSheet, Pressable, Text, ActivityIndicator, Animated,
  type ViewStyle, type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUIStore } from '@/stores/uiStore';
import { GLASS, TYPOGRAPHY, SPACING } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  title, onPress, variant = 'primary', disabled, loading,
  icon, style, textStyle, fullWidth,
}: Props) {
  const colors = useUIStore(s => s.colors);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColors: Record<Variant, string> = {
    primary: colors.primary,
    secondary: 'rgba(255,255,255,0.15)',
    danger: colors.danger,
    ghost: 'transparent',
  };

  const textColors: Record<Variant, string> = {
    primary: '#ffffff',
    secondary: colors.text,
    danger: '#ffffff',
    ghost: colors.primary,
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            backgroundColor: bgColors[variant],
            opacity: disabled ? 0.5 : 1,
            borderColor: variant === 'secondary' ? colors.cardBorder : 'transparent',
            borderWidth: variant === 'secondary' ? 1 : 0,
          },
          fullWidth && styles.fullWidth,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColors[variant]} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.text,
                { color: textColors[variant] },
                icon ? { marginLeft: SPACING.sm } : undefined,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: GLASS.radiusSm,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...TYPOGRAPHY.bodyBold,
  },
});
