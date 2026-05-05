import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function MessagesScreen() {
  const { colors } = useUIStore();
  const { templates, messageLogs } = useDataStore();
  const insets = useSafeAreaInsets();

  return (
    <GradientBackground>
      <GlassHeader
        title="Mesajlar"
        subtitle={`${templates.length} sablon, ${messageLogs.length} log`}
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SPACING.md }]}>Sablonlar</Text>
        {templates.length === 0 ? (
          <GlassCard>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: 'center' }]}>Sablon yok.</Text>
          </GlassCard>
        ) : (
          templates.map(t => (
            <GlassCard key={t.id} style={{ marginBottom: SPACING.md }}>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{t.title}</Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={2}>{t.content}</Text>
            </GlassCard>
          ))
        )}

        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
          Son Gonderimler
        </Text>
        {messageLogs.slice(0, 10).map(log => (
          <GlassCard key={log.id} style={{ marginBottom: SPACING.md }}>
            <View style={styles.logRow}>
              <MessageSquare size={16} strokeWidth={2} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={[TYPOGRAPHY.body, { color: colors.text }]}>{log.customerName}</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                  {new Date(log.sentAt).toLocaleDateString('tr-TR')} - {log.templateTitle}
                </Text>
              </View>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  logRow: { flexDirection: 'row', alignItems: 'center' },
});
