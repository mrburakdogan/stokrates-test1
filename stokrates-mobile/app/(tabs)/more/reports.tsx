import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function ReportsScreen() {
  const { colors } = useUIStore();
  const { products, sales, expenses, customers } = useDataStore();
  const insets = useSafeAreaInsets();

  const stats = useMemo(() => {
    const completedSales = sales.filter(s => s.status !== 'cancelled');
    const revenue = completedSales.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - totalExpense;
    const avgOrderValue = completedSales.length > 0 ? revenue / completedSales.length : 0;
    const totalStock = products.reduce((s, p) => s + p.stock, 0);
    const totalStockValue = products.reduce((s, p) => s + (p.cost * p.stock), 0);

    // Top products by sold count
    const topProducts = [...products]
      .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
      .slice(0, 5);

    // Monthly revenue (last 6 months)
    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      const monthSales = completedSales.filter(s => {
        const sd = new Date(s.date);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      });
      return { month, revenue: monthSales.reduce((s, sale) => s + sale.totalAmount, 0) };
    }).reverse();

    return { revenue, totalExpense, profit, avgOrderValue, totalStock, totalStockValue, topProducts, monthly };
  }, [products, sales, expenses]);

  return (
    <GradientBackground>
      <GlassHeader
        title="Raporlar"
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.grid}>
          <GlassCard style={styles.statCard}>
            <TrendingUp size={20} strokeWidth={2} color={colors.success} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 4 }]}>Gelir</Text>
            <Text style={[TYPOGRAPHY.h3, { color: colors.success }]}>{stats.revenue.toLocaleString('tr-TR')} TL</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <TrendingDown size={20} strokeWidth={2} color={colors.danger} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 4 }]}>Gider</Text>
            <Text style={[TYPOGRAPHY.h3, { color: colors.danger }]}>{stats.totalExpense.toLocaleString('tr-TR')} TL</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <DollarSign size={20} strokeWidth={2} color={colors.primary} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 4 }]}>Net Kar</Text>
            <Text style={[TYPOGRAPHY.h3, { color: stats.profit >= 0 ? colors.success : colors.danger }]}>
              {stats.profit.toLocaleString('tr-TR')} TL
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Package size={20} strokeWidth={2} color={colors.info} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 4 }]}>Stok Degeri</Text>
            <Text style={[TYPOGRAPHY.h3, { color: colors.info }]}>{stats.totalStockValue.toLocaleString('tr-TR')} TL</Text>
          </GlassCard>
        </View>

        {/* Monthly chart placeholder */}
        <GlassCard style={{ marginTop: SPACING.lg }}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SPACING.md }]}>Aylik Gelir</Text>
          {stats.monthly.map(m => (
            <View key={m.month} style={styles.barRow}>
              <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, width: 60 }]}>{m.month}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${stats.revenue > 0 ? Math.max((m.revenue / stats.revenue) * 100, 2) : 0}%`,
                  },
                ]} />
              </View>
              <Text style={[TYPOGRAPHY.small, { color: colors.text, width: 80, textAlign: 'right' }]}>
                {m.revenue.toLocaleString('tr-TR')}
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Top products */}
        <GlassCard style={{ marginTop: SPACING.lg }}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SPACING.md }]}>En Cok Satan Urunler</Text>
          {stats.topProducts.map((p, i) => (
            <View key={p.id} style={styles.topRow}>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary, width: 24 }]}>{i + 1}</Text>
              <Text style={[TYPOGRAPHY.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{p.soldCount ?? 0} adet</Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  statCard: { width: '47%', flexGrow: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  barTrack: { flex: 1, height: 8, backgroundColor: 'rgba(148,163,184,0.15)', borderRadius: 4, marginHorizontal: SPACING.sm },
  barFill: { height: 8, borderRadius: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
});
