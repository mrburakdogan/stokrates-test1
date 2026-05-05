import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XCircle, Trash2 } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { Sale } from '@/types';

export default function SalesHistoryScreen() {
  const { colors } = useUIStore();
  const { sales, cancelSale, deleteSale } = useDataStore();
  const insets = useSafeAreaInsets();

  const sorted = useMemo(
    () => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sales]
  );

  const handleCancel = (id: string) => {
    Alert.alert('Iptal Et', 'Bu satisi iptal etmek istiyor musunuz?', [
      { text: 'Hayir', style: 'cancel' },
      { text: 'Iptal Et', style: 'destructive', onPress: () => cancelSale(id) },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu satisi kalici olarak silmek istiyor musunuz?', [
      { text: 'Hayir', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteSale(id) },
    ]);
  };

  const renderSale = ({ item }: { item: Sale }) => {
    const isCancelled = item.status === 'cancelled';
    return (
      <GlassCard style={{ opacity: isCancelled ? 0.6 : 1 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>
              {item.customerName}
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
              {new Date(item.date).toLocaleDateString('tr-TR')} - {item.items.length} kalem
            </Text>
            {isCancelled && (
              <Text style={[TYPOGRAPHY.small, { color: colors.danger }]}>IPTAL EDILDI</Text>
            )}
          </View>
          <Text style={[TYPOGRAPHY.h3, { color: isCancelled ? colors.danger : colors.primary }]}>
            {item.totalAmount.toLocaleString('tr-TR')} TL
          </Text>
        </View>
        {!isCancelled && (
          <View style={styles.actions}>
            <Pressable onPress={() => handleCancel(item.id)} style={styles.actionBtn} hitSlop={8}>
              <XCircle size={16} strokeWidth={2} color={colors.warning} />
              <Text style={[TYPOGRAPHY.small, { color: colors.warning, marginLeft: 4 }]}>Iptal</Text>
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id)} style={styles.actionBtn} hitSlop={8}>
              <Trash2 size={16} strokeWidth={2.5} color={colors.danger} />
              <Text style={[TYPOGRAPHY.small, { color: colors.danger, marginLeft: 4 }]}>Sil</Text>
            </Pressable>
          </View>
        )}
      </GlassCard>
    );
  };

  return (
    <GradientBackground>
      <GlassHeader title="Satis Gecmisi" subtitle={`${sales.length} kayit`} />
      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={renderSale}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  actions: {
    flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm,
    borderTopWidth: 0.5, borderTopColor: 'rgba(148,163,184,0.2)', paddingTop: SPACING.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
});
