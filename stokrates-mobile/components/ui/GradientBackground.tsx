import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIStore } from '@/stores/uiStore';
import { GRADIENTS } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}

export function GradientBackground({ children }: Props) {
  const theme = useUIStore(s => s.theme);
  const gradient = theme === 'dark' ? GRADIENTS.bgDark : GRADIENTS.bgLight;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradient]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
