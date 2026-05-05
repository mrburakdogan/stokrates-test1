import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Moon, Sun, LogOut, Database, Shield } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useUIStore();
  const { currentUser, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Cikis Yap', 'Cikis yapmak istiyor musunuz?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Cikis Yap', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  return (
    <GradientBackground>
      <GlassHeader
        title="Ayarlar"
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <GlassCard>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[TYPOGRAPHY.h2, { color: colors.primary }]}>
                {(currentUser?.username ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ marginLeft: SPACING.md }}>
              <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{currentUser?.username}</Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                {currentUser?.email} - {currentUser?.role === 'admin' ? 'Yonetici' : 'Kullanici'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Theme */}
        <GlassCard style={{ marginTop: SPACING.lg }}>
          <Pressable onPress={toggleTheme} style={styles.settingRow}>
            {theme === 'dark' ? <Moon size={20} strokeWidth={1.85} color={colors.text} /> : <Sun size={20} strokeWidth={1.85} color={colors.text} />}
            <Text style={[TYPOGRAPHY.body, { color: colors.text, flex: 1, marginLeft: SPACING.md }]}>
              {theme === 'dark' ? 'Karanlik Mod' : 'Aydinlik Mod'}
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>Degistir</Text>
          </Pressable>
        </GlassCard>

        {/* Data info */}
        <GlassCard style={{ marginTop: SPACING.lg }}>
          <View style={styles.settingRow}>
            <Database size={20} strokeWidth={1.85} color={colors.text} />
            <Text style={[TYPOGRAPHY.body, { color: colors.text, flex: 1, marginLeft: SPACING.md }]}>
              Veri Senkronizasyonu
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.success }]}>Aktif</Text>
          </View>
        </GlassCard>

        {/* Version */}
        <GlassCard style={{ marginTop: SPACING.lg }}>
          <View style={styles.settingRow}>
            <Shield size={20} strokeWidth={1.85} color={colors.text} />
            <Text style={[TYPOGRAPHY.body, { color: colors.text, flex: 1, marginLeft: SPACING.md }]}>
              Versiyon
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
        </GlassCard>

        {/* Logout */}
        <GlassButton
          title="Cikis Yap"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          icon={<LogOut size={18} strokeWidth={2} color="#fff" />}
          style={{ marginTop: SPACING.xxl }}
        />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
});
