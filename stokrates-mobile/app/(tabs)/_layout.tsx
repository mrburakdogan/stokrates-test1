import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard, Package, Users, ShoppingCart, MoreHorizontal,
} from 'lucide-react-native';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { GLASS, COLORS } from '@/constants/theme';

// Tab bar icon: thinner stroke (1.75), fixed 24px, with active indicator dot
function TabIcon({ icon: Icon, color, focused }: {
  icon: typeof LayoutDashboard; color: string; focused: boolean;
}) {
  const { colors } = useUIStore();
  return (
    <View style={tabStyles.iconWrap}>
      <Icon size={24} strokeWidth={1.75} color={color} />
      {focused && (
        <View style={tabStyles.indicatorWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={tabStyles.indicator}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      )}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  indicatorWrap: {
    position: 'absolute',
    bottom: -4,
  },
  indicator: {
    width: 18,
    height: 3,
    borderRadius: 1.5,
  },
});

export default function TabLayout() {
  const { theme, colors } = useUIStore();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          backgroundColor: Platform.OS === 'android' ? colors.tabBar : 'transparent',
          elevation: 0,
          height: 60,
          paddingTop: 4,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={theme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Anasayfa',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={LayoutDashboard} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Urunler',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Package} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Musteriler',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Users} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Satislar',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={ShoppingCart} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Daha Fazla',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={MoreHorizontal} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
