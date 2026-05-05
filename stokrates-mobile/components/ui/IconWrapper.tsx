import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GLASS } from '@/constants/theme';

// ============================================================
// Premium Icon Wrapper
//
// Provides consistent sizing, stroke width control, and
// gradient/soft container backgrounds across all icon contexts.
//
// Context guide:
//   tabBar:    24px, stroke 1.75, no container
//   stat:      22px, stroke 2.0,  gradient rounded-square
//   grid:      26px, stroke 1.75, gradient circle
//   listLead:  18px, stroke 2.0,  soft rounded-square
//   action:    16px, stroke 2.5,  no container
//   header:    22px, stroke 1.75, no container
// ============================================================

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ContainerType = 'none' | 'soft' | 'gradient' | 'gradientCircle';

interface Props {
  /** Lucide icon element — will be cloned with correct size/stroke/color */
  icon: React.ReactElement<any>;
  /** Semantic size preset */
  size?: IconSize;
  /** Override icon pixel size directly */
  iconSize?: number;
  /** Override stroke width directly */
  strokeWidth?: number;
  /** Icon color */
  color: string;
  /** Container type */
  container?: ContainerType;
  /** Gradient colors for gradient/gradientCircle containers */
  gradient?: readonly [string, string];
  /** Override container style */
  containerStyle?: ViewStyle;
}

const SIZE_MAP: Record<IconSize, { icon: number; stroke: number; container: number }> = {
  xs: { icon: 14, stroke: 2.5, container: 28 },
  sm: { icon: 18, stroke: 2.0, container: 34 },
  md: { icon: 22, stroke: 1.85, container: 42 },
  lg: { icon: 26, stroke: 1.75, container: 50 },
  xl: { icon: 32, stroke: 1.5, container: 60 },
};

export function IconWrapper({
  icon, size = 'md', iconSize, strokeWidth, color,
  container = 'none', gradient, containerStyle,
}: Props) {
  const preset = SIZE_MAP[size];
  const finalIconSize = iconSize ?? preset.icon;
  const finalStroke = strokeWidth ?? preset.stroke;
  const containerSize = preset.container;

  const clonedIcon = React.cloneElement(icon, {
    size: finalIconSize,
    strokeWidth: finalStroke,
    color,
  });

  if (container === 'none') {
    return clonedIcon;
  }

  const isCircle = container === 'gradientCircle';
  const borderRadius = isCircle ? containerSize / 2 : containerSize * 0.26;

  const wrapperStyle: ViewStyle = {
    width: containerSize,
    height: containerSize,
    borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...containerStyle,
  };

  if (container === 'soft') {
    return (
      <View style={[wrapperStyle, { backgroundColor: color + '15' }]}>
        {clonedIcon}
      </View>
    );
  }

  // gradient or gradientCircle
  const gradientColors = gradient ?? [color + '25', color + '08'];

  return (
    <View style={wrapperStyle}>
      <LinearGradient
        colors={[...gradientColors]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Subtle inner border for depth */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius,
            borderWidth: 1,
            borderColor: color + '12',
          },
        ]}
        pointerEvents="none"
      />
      {clonedIcon}
    </View>
  );
}
