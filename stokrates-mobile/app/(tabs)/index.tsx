import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, Package, Users,
  ShoppingCart, DollarSign, Moon, Sun, AlertTriangle,
} from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, IconWrapper } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

function StatCard({ title, value, icon, color, delay }: {
  title: string; value: string; icon: React.ReactElement<any>; color: string; delay: number;
}) {
  const colors = useUIStore(s => s.colors);
  return (
    <GlassCard style={styles.statCard} delay={delay}>
      <IconWrapper
        icon={icon}
        size="md"
        color={color}
        container="gradient"
        gradient={[color + '30', color + '10']}
      />
      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
        {title}
      </Text>
      <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginTop: 2 }]}>
        {value}
      </Text>
    </GlassCard>
  );
}

export default function DashboardScreen() {
  const { colors, theme, toggleTheme } = useUIStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const { products, customers, sales, expenses } = useDataStore();
  const insets = useSafeAreaInsets();

  const stats = useMemo(() => {
    const completedSales = sales.filter(s => s.status !== 'cancelled');
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter(p => p.stock <= 5).length;

    return { totalRevenue, totalExpenses, totalStock, lowStock, salesCount: completedSales.length };
  }, [products, sales, expenses]);

  const formatCurrency = (val: number) =>
    val.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  return (
    <GradientBackground>
      <GlassHeader
        title={`Merhaba, ${currentUser?.username ?? ''}`}
        subtitle="Isletme ozeti"
        rightAction={
          <Pressable onPress={toggleTheme} hitSlop={12}>
            {theme === 'dark'
              ? <Sun size={22} strokeWidth={1.75} color={colors.text} />
              : <Moon size={22} strokeWidth={1.75} color={colors.text} />}
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Toplam Gelir"
            value={formatCurrency(stats.totalRevenue)}
            icon={<TrendingUp />}
            color="#10b981"
            delay={0}
          />
          <StatCard
            title="Toplam Gider"
            value={formatCurrency(stats.totalExpenses)}
            icon={<TrendingDown />}
            color="#ef4444"
            delay={50}
          />
          <StatCard
            title="Toplam Stok"
            value={stats.totalStock.toString()}
            icon={<Package />}
            color="#6366f1"
            delay={100}
          />
          <StatCard
            title="Musteriler"
            value={customers.length.toString()}
            icon={<Users />}
            color="#f59e0b"
            delay={150}
          />
          <StatCard
            title="Satislar"
            value={stats.salesCount.toString()}
            icon={<ShoppingCart />}
            color="#3b82f6"
            delay={200}
          />
          <StatCard
            title="Net Kar"
            value={formatCurrency(stats.totalRevenue - stats.totalExpenses)}
            icon={<DollarSign />}
            color="#8b5cf6"
            delay={250}
          />
        </View>

        {/* Low stock warning */}
        {stats.lowStock > 0 && (
          <GlassCard style={{ marginTop: SPACING.lg }} delay={300}>
            <View style={styles.warningRow}>
              <IconWrapper
                icon={<AlertTriangle />}
                size="sm"
                color={colors.warning}
                container="soft"
              />
              <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.warning }]}>
                  Dusuk Stok Uyarisi
                </Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {stats.lowStock} urunde stok 5 veya altinda.
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
