import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassModal, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { generateId } from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { Todo } from '@/types';

export default function TodosScreen() {
  const { colors } = useUIStore();
  const { todos, saveTodo, deleteTodo } = useDataStore();
  const insets = useSafeAreaInsets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');

  const handleAdd = async () => {
    if (!content.trim()) return;
    await saveTodo({
      id: generateId(),
      content: content.trim(),
      priority: 'medium',
      estimatedDuration: '',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    });
    setContent('');
    setIsModalOpen(false);
  };

  const toggleComplete = async (todo: Todo) => {
    await saveTodo({ ...todo, isCompleted: !todo.isCompleted });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu gorevi silmek istiyor musunuz?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTodo(id) },
    ]);
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return colors.danger;
    if (p === 'low') return colors.success;
    return colors.warning;
  };

  const renderTodo = useCallback(({ item }: { item: Todo }) => (
    <GlassCard>
      <View style={styles.row}>
        <Pressable onPress={() => toggleComplete(item)} hitSlop={12}>
          {item.isCompleted
            ? <CheckCircle size={22} strokeWidth={2} color={colors.success} />
            : <Circle size={22} strokeWidth={2} color={colors.textMuted} />}
        </Pressable>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={[
            TYPOGRAPHY.body,
            { color: colors.text, textDecorationLine: item.isCompleted ? 'line-through' : 'none' },
          ]}>
            {item.content}
          </Text>
          <View style={styles.meta}>
            <View style={[styles.badge, { backgroundColor: priorityColor(item.priority) + '20' }]}>
              <Text style={[TYPOGRAPHY.small, { color: priorityColor(item.priority) }]}>
                {item.priority === 'high' ? 'Yuksek' : item.priority === 'low' ? 'Dusuk' : 'Orta'}
              </Text>
            </View>
          </View>
        </View>
        <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
          <Trash2 size={16} strokeWidth={2.5} color={colors.danger} />
        </Pressable>
      </View>
    </GlassCard>
  ), [colors, todos]);

  return (
    <GradientBackground>
      <GlassHeader
        title="Yapilacaklar"
        subtitle={`${todos.filter(t => !t.isCompleted).length} aktif`}
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
        rightAction={<Pressable onPress={() => setIsModalOpen(true)} hitSlop={12}><Plus size={24} strokeWidth={1.75} color={colors.primary} /></Pressable>}
      />
      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={renderTodo}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />
      <GlassModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Gorev">
        <GlassInput label="Gorev" placeholder="Ne yapilacak?" value={content} onChangeText={setContent} />
        <View style={styles.actions}>
          <GlassButton title="Iptal" onPress={() => setIsModalOpen(false)} variant="secondary" />
          <GlassButton title="Ekle" onPress={handleAdd} />
        </View>
      </GlassModal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  meta: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md, marginTop: SPACING.md },
});
