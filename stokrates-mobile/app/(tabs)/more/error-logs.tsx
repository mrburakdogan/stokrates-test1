import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Trash2, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import * as db from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { SystemLog } from '@/types';

export default function ErrorLogsScreen() {
  const { colors } = useUIStore();
  const { systemLogs, refreshAll } = useDataStore();
  const insets = useSafeAreaInsets();

  const iconMap = {
    error: <AlertCircle size={16} strokeWidth={2} color={colors.danger} />,
    warning: <AlertTriangle size={16} strokeWidth={2} color={colors.warning} />,
    info: <Info size={16} strokeWidth={2} color={colors.info} />,
    success: <CheckCircle size={16} strokeWidth={2} color={colors.success} />,
  };

  const handleClear = () => {
    Alert.alert('Temizle', 'Tum loglari silmek istiyor musunuz?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: async () => { await db.clearSystemLogs(); refreshAll(); } },
    ]);
  };

  const renderLog = ({ item }: { item: SystemLog }) => (
    <GlassCard>
      <View style={styles.row}>
        {iconMap[item.type]}
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{item.title}</Text>
          <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
            {item.source} - {new Date(item.date).toLocaleString('tr-TR')}
          </Text>
          <Text style={[TYPOGRAPHY.small, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <GradientBackground>
      <GlassHeader
        title="Hata Loglari"
        subtitle={`${systemLogs.length} kayit`}
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
        rightAction={
          systemLogs.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={12}><Trash2 size={20} strokeWidth={2} color={colors.danger} /></Pressable>
          ) : undefined
        }
      />
      <FlatList
        data={systemLogs}
        keyExtractor={item => item.id}
        renderItem={renderLog}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <GlassCard>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: 'center' }]}>Log yok.</Text>
          </GlassCard>
        }
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
