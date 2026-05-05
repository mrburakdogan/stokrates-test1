import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Edit3, Trash2, Receipt } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassModal, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { generateId } from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { Expense } from '@/types';

const defaultForm = { title: '', category: '', amount: '', vatRate: '0', description: '' };

export default function ExpensesScreen() {
  const { colors } = useUIStore();
  const { expenses, saveExpense, deleteExpense } = useDataStore();
  const insets = useSafeAreaInsets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const handleEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      title: e.title, category: e.category, amount: e.amount.toString(),
      vatRate: e.vatRate.toString(), description: e.description ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { Alert.alert('Hata', 'Baslik gerekli.'); return; }
    const amount = parseFloat(form.amount) || 0;
    const vatRate = parseFloat(form.vatRate) || 0;
    const expense: Expense = {
      id: editingId ?? generateId(),
      title: form.title.trim(),
      category: form.category.trim(),
      amount,
      vatRate,
      vatAmount: amount * (vatRate / 100),
      date: new Date().toISOString(),
      description: form.description.trim() || undefined,
    };
    await saveExpense(expense);
    closeModal();
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(defaultForm); };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu gideri silmek istiyor musunuz?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  };

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const renderExpense = useCallback(({ item }: { item: Expense }) => (
    <GlassCard>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: '#ef444420' }]}>
          <Receipt size={18} strokeWidth={2} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{item.title}</Text>
          <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
            {item.category} - {new Date(item.date).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.danger }]}>
          {item.amount.toLocaleString('tr-TR')} TL
        </Text>
        <Pressable onPress={() => handleEdit(item)} hitSlop={8} style={{ marginLeft: SPACING.sm }}>
          <Edit3 size={16} strokeWidth={2.5} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={{ marginLeft: SPACING.sm }}>
          <Trash2 size={16} strokeWidth={2.5} color={colors.danger} />
        </Pressable>
      </View>
    </GlassCard>
  ), [colors]);

  return (
    <GradientBackground>
      <GlassHeader
        title="Giderler"
        subtitle={`Toplam: ${total.toLocaleString('tr-TR')} TL`}
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
        rightAction={<Pressable onPress={() => setIsModalOpen(true)} hitSlop={12}><Plus size={24} strokeWidth={1.75} color={colors.primary} /></Pressable>}
      />
      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />
      <GlassModal visible={isModalOpen} onClose={closeModal} title={editingId ? 'Gider Duzenle' : 'Yeni Gider'}>
        <GlassInput label="Baslik *" value={form.title} onChangeText={v => setField('title', v)} />
        <GlassInput label="Kategori" value={form.category} onChangeText={v => setField('category', v)} />
        <View style={styles.formRow}>
          <GlassInput label="Tutar (TL)" value={form.amount} onChangeText={v => setField('amount', v)} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
          <GlassInput label="KDV %" value={form.vatRate} onChangeText={v => setField('vatRate', v)} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
        </View>
        <GlassInput label="Aciklama" value={form.description} onChangeText={v => setField('description', v)} multiline />
        <View style={styles.modalActions}>
          <GlassButton title="Iptal" onPress={closeModal} variant="secondary" />
          <GlassButton title={editingId ? 'Guncelle' : 'Kaydet'} onPress={handleSubmit} />
        </View>
      </GlassModal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formRow: { flexDirection: 'row', gap: SPACING.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md, marginTop: SPACING.md },
});
