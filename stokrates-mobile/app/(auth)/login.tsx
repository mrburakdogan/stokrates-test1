import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { User, Lock } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import * as db from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function LoginScreen() {
  const colors = useUIStore(s => s.colors);
  const login = useAuthStore(s => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Hata', 'Kullanici adi ve sifre gereklidir.');
      return;
    }

    setLoading(true);
    try {
      const users = await db.getUsers();
      const user = users.find(
        u => (u.username === username.trim() || u.email === username.trim())
          && u.password === password
      );

      if (!user) {
        Alert.alert('Hata', 'Kullanici adi veya sifre hatali.');
        return;
      }

      await login(user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Giris yapilamadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <Text style={[styles.appName, { color: colors.text }]}>STOKrates</Text>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
            Isletme Yonetim Sistemi
          </Text>
        </View>

        {/* Login card */}
        <GlassCard style={styles.card}>
          <Text style={[TYPOGRAPHY.h2, { color: colors.text, marginBottom: SPACING.xl }]}>
            Giris Yap
          </Text>

          <GlassInput
            label="Kullanici Adi / E-posta"
            placeholder="admin"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            icon={<User size={18} strokeWidth={2} color={colors.textMuted} />}
            containerStyle={{ marginBottom: SPACING.lg }}
          />

          <GlassInput
            label="Sifre"
            placeholder="******"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Lock size={18} strokeWidth={2} color={colors.textMuted} />}
            containerStyle={{ marginBottom: SPACING.xl }}
          />

          <GlassButton
            title="Giris Yap"
            onPress={handleLogin}
            loading={loading}
            fullWidth
          />
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  card: {
    padding: SPACING.xl,
  },
});
