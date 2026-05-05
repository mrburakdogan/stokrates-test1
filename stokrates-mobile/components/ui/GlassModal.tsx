import React from 'react';
import {
  StyleSheet, View, Modal, Pressable, Text,
  KeyboardAvoidingView, Platform, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { useUIStore } from '@/stores/uiStore';
import { GLASS, TYPOGRAPHY, SPACING } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function GlassModal({ visible, onClose, title, children }: Props) {
  const { theme, colors } = useUIStore();
  const { height: screenHeight } = useWindowDimensions();

  const bodyMaxHeight = screenHeight * 0.65 - 60;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidBackdrop]} />
          )}
        </Pressable>

        {/* Modal content */}
        <View
          style={[
            styles.content,
            {
              maxHeight: screenHeight * 0.85,
              backgroundColor: theme === 'dark'
                ? 'rgba(30, 41, 59, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              borderColor: theme === 'dark' ? GLASS.borderDark : GLASS.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.inputBorder }]}>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text, flex: 1 }]}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: pressed
                    ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                    : 'transparent',
                },
              ]}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Scrollable body */}
          <ScrollView
            style={{ maxHeight: bodyMaxHeight }}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  androidBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    width: '100%',
    borderRadius: GLASS.radiusLg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
});
