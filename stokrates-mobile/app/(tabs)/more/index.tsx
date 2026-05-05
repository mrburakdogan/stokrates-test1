import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Receipt, CreditCard, BarChart3, CheckSquare, Briefcase,
  Settings, MessageSquare, Calculator, Factory, TrendingUp,
  UsersRound, AlertTriangle,
} from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, IconWrapper } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

interface MenuItem {
  title: string;
  subtitle: string;
  icon: React.ReactElement<any>;
  route: string;
  color: string;
  gradient: readonly [string, string];
  adminOnly?: boolean;
}

export default function MoreScreen() {
  const { colors } = useUIStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const insets = useSafeAreaInsets();

  const menuItems: MenuItem[] = [
    { title: 'Giderler', subtitle: 'Gider takibi ve KDV', icon: <Receipt />, route: '/(tabs)/more/expenses', color: '#ef4444', gradient: ['#ef444435', '#ef444410'] },
    { title: 'Borc / Alacak', subtitle: 'Borc ve alacak yonetimi', icon: <CreditCard />, route: '/(tabs)/more/debt-credits', color: '#f59e0b', gradient: ['#f59e0b35', '#f59e0b10'] },
    { title: 'Raporlar', subtitle: 'Grafik ve analizler', icon: <BarChart3 />, route: '/(tabs)/more/reports', color: '#3b82f6', gradient: ['#3b82f635', '#3b82f610'] },
    { title: 'Yapilacaklar', subtitle: 'Gorev yonetimi', icon: <CheckSquare />, route: '/(tabs)/more/todos', color: '#10b981', gradient: ['#10b98135', '#10b98110'] },
    { title: 'Portfolyo', subtitle: 'Varlik ve yatirim takibi', icon: <Briefcase />, route: '/(tabs)/more/portfolio', color: '#8b5cf6', gradient: ['#8b5cf635', '#8b5cf610'] },
    { title: 'Satis Gecmisi', subtitle: 'Gecmis satislar', icon: <TrendingUp />, route: '/(tabs)/sales/history', color: '#6366f1', gradient: ['#6366f135', '#6366f110'] },
    { title: 'Mesajlar', subtitle: 'SMS sablonlari', icon: <MessageSquare />, route: '/(tabs)/more/messages', color: '#ec4899', gradient: ['#ec489935', '#ec489910'] },
    { title: 'Maliyet Hesap', subtitle: 'Trendyol fiyat hesabi', icon: <Calculator />, route: '/(tabs)/more/cost-calculator', color: '#14b8a6', gradient: ['#14b8a635', '#14b8a610'] },
    { title: 'Uretim Maliyet', subtitle: 'Uretim analizi', icon: <Factory />, route: '/(tabs)/more/production-cost', color: '#78716c', gradient: ['#78716c35', '#78716c10'] },
    { title: 'Trendyol Analiz', subtitle: 'Komisyon tarife analizi', icon: <TrendingUp />, route: '/(tabs)/more/trendyol-analysis', color: '#f97316', gradient: ['#f9731635', '#f9731610'] },
    { title: 'Ayarlar', subtitle: 'Yedekleme ve yapilandirma', icon: <Settings />, route: '/(tabs)/more/settings', color: '#64748b', gradient: ['#64748b35', '#64748b10'] },
    { title: 'Kullanicilar', subtitle: 'Sadece admin', icon: <UsersRound />, route: '/(tabs)/more/users', color: '#0ea5e9', gradient: ['#0ea5e935', '#0ea5e910'], adminOnly: true },
    { title: 'Hata Loglari', subtitle: 'Sistem kayitlari', icon: <AlertTriangle />, route: '/(tabs)/more/error-logs', color: '#dc2626', gradient: ['#dc262635', '#dc262610'] },
  ];

  const visibleItems = menuItems.filter(item =>
    !item.adminOnly || currentUser?.role === 'admin'
  );

  return (
    <GradientBackground>
      <GlassHeader title="Daha Fazla" />
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.map((item, i) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={styles.gridItem}
          >
            <GlassCard style={styles.menuCard} delay={i * 40}>
              <IconWrapper
                icon={item.icon}
                size="lg"
                color={item.color}
                container="gradientCircle"
                gradient={item.gradient}
              />
              <Text
                style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginTop: SPACING.md }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2 }]}
                numberOfLines={1}
              >
                {item.subtitle}
              </Text>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  gridItem: {
    width: '47%',
    flexGrow: 1,
  },
  menuCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
});
