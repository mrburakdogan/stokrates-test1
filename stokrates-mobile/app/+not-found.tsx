import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Link } from 'expo-router';
import { GradientBackground, GlassCard } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function NotFoundScreen() {
  const { colors } = useUIStore();

  return (
    <GradientBackground>
      <View style={styles.center}>
        <GlassCard style={{ alignItems: 'center' }}>
          <Text style={[TYPOGRAPHY.h1, { color: colors.text }]}>404</Text>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
            Sayfa bulunamadi.
          </Text>
          <Link href="/(tabs)" style={{ marginTop: SPACING.lg }}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary }]}>Anasayfaya Don</Text>
          </Link>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: SPACING.xl },
});
