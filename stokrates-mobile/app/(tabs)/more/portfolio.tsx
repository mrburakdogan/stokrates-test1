import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Briefcase, TrendingUp, TrendingDown } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function PortfolioScreen() {
  const { colors } = useUIStore();
  const { assets, getInvestmentCash } = useDataStore();
  const insets = useSafeAreaInsets();

  const cash = getInvestmentCash();
  const totalValue = assets.reduce((s, a) => s + (a.currentPrice * a.quantity), 0) + cash;
  const totalCost = assets.reduce((s, a) => s + (a.purchasePrice * a.quantity), 0);
  const totalPL = totalValue - totalCost - cash;

  return (
    <GradientBackground>
      <GlassHeader
        title="Portfolyo"
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.grid}>
          <GlassCard style={styles.statCard}>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Toplam Deger</Text>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{totalValue.toLocaleString('tr-TR')} TL</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Kar / Zarar</Text>
            <Text style={[TYPOGRAPHY.h3, { color: totalPL >= 0 ? colors.success : colors.danger }]}>
              {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString('tr-TR')} TL
            </Text>
          </GlassCard>
        </View>

        <GlassCard style={{ marginTop: SPACING.md }}>
          <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Nakit</Text>
          <Text style={[TYPOGRAPHY.h3, { color: colors.primary }]}>{cash.toLocaleString('tr-TR')} TL</Text>
        </GlassCard>

        {/* Asset list */}
        <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
          Varliklar
        </Text>
        {assets.length === 0 ? (
          <GlassCard>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Henuz varlik eklenmemis.
            </Text>
          </GlassCard>
        ) : (
          assets.map(asset => {
            const pl = (asset.currentPrice - asset.purchasePrice) * asset.quantity;
            const plPercent = asset.purchasePrice > 0 ? ((asset.currentPrice - asset.purchasePrice) / asset.purchasePrice * 100) : 0;
            return (
              <GlassCard key={asset.id} style={{ marginBottom: SPACING.md }}>
                <View style={styles.assetRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{asset.symbol}</Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{asset.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>
                      {(asset.currentPrice * asset.quantity).toLocaleString('tr-TR')} TL
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {pl >= 0 ? <TrendingUp size={12} strokeWidth={2.5} color={colors.success} /> : <TrendingDown size={12} strokeWidth={2.5} color={colors.danger} />}
                      <Text style={[TYPOGRAPHY.small, { color: pl >= 0 ? colors.success : colors.danger, marginLeft: 2 }]}>
                        {pl >= 0 ? '+' : ''}{plPercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  grid: { flexDirection: 'row', gap: SPACING.md },
  statCard: { flex: 1 },
  assetRow: { flexDirection: 'row', alignItems: 'center' },
});
