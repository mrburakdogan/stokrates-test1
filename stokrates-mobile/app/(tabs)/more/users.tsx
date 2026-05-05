import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Shield, User } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function UsersScreen() {
  const { colors } = useUIStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const { users } = useDataStore();
  const insets = useSafeAreaInsets();

  if (currentUser?.role !== 'admin') {
    return (
      <GradientBackground>
        <GlassHeader
          title="Erisim Engellendi"
          leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
        />
        <View style={styles.center}>
          <GlassCard>
            <Text style={[TYPOGRAPHY.body, { color: colors.danger, textAlign: 'center' }]}>
              Bu sayfaya erisim icin yonetici yetkisi gereklidir.
            </Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <GlassHeader
        title="Kullanici Yonetimi"
        subtitle={`${users.length} kullanici`}
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
      />
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <GlassCard>
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                {item.role === 'admin'
                  ? <Shield size={18} strokeWidth={2} color={colors.primary} />
                  : <User size={18} strokeWidth={2} color={colors.textSecondary} />}
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{item.username}</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                  {item.email} - {item.role === 'admin' ? 'Yonetici' : 'Kullanici'}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: SPACING.lg },
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
