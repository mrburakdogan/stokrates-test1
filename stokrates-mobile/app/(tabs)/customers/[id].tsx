import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, MapPin, ShoppingCart } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, IconWrapper } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useUIStore();
  const { customers, sales } = useDataStore();
  const insets = useSafeAreaInsets();

  const customer = customers.find(c => c.id === id);
  const customerSales = useMemo(
    () => sales.filter(s => s.customerId === id && s.status !== 'cancelled'),
    [sales, id]
  );

  const totalSpent = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);

  if (!customer) {
    return (
      <GradientBackground>
        <GlassHeader
          title="Musteri Bulunamadi"
          leftAction={
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft size={22} strokeWidth={1.75} color={colors.text} />
            </Pressable>
          }
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <GlassHeader
        title={customer.name}
        leftAction={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} strokeWidth={1.75} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer info */}
        <GlassCard>
          <View style={styles.infoRow}>
            <Phone size={16} strokeWidth={2} color={colors.textSecondary} />
            <Text style={[TYPOGRAPHY.body, { color: colors.text, marginLeft: SPACING.sm }]}>
              {customer.phone || '-'}
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: SPACING.sm }]}>
            <MapPin size={16} strokeWidth={2} color={colors.textSecondary} />
            <Text style={[TYPOGRAPHY.body, { color: colors.text, marginLeft: SPACING.sm }]}>
              {customer.address || '-'}
            </Text>
          </View>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Toplam Harcama</Text>
            <Text style={[TYPOGRAPHY.h3, { color: colors.primary }]}>
              {totalSpent.toLocaleString('tr-TR')} TL
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Siparis Sayisi</Text>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{customerSales.length}</Text>
          </GlassCard>
        </View>

        {/* Recent sales */}
        <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
          Son Siparisler
        </Text>
        {customerSales.length === 0 ? (
          <GlassCard>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Henuz siparis yok.
            </Text>
          </GlassCard>
        ) : (
          customerSales.slice(0, 10).map(sale => (
            <GlassCard key={sale.id} style={{ marginBottom: SPACING.md }}>
              <View style={styles.saleRow}>
                <ShoppingCart size={16} strokeWidth={2} color={colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>
                    {sale.totalAmount.toLocaleString('tr-TR')} TL
                  </Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                    {new Date(sale.date).toLocaleDateString('tr-TR')} - {sale.items.length} kalem
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  statCard: { flex: 1 },
  saleRow: { flexDirection: 'row', alignItems: 'center' },
});
