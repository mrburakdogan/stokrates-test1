import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Trash2, CreditCard, ArrowUpCircle, ArrowDownCircle } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassModal, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { generateId } from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { DebtCredit } from '@/types';

const defaultForm = { title: '', amount: '', dueDate: '', type: 'debt' as 'debt' | 'credit', description: '' };

export default function DebtCreditScreen() {
  const { colors } = useUIStore();
  const { debtCredits, saveDebtCredit, deleteDebtCredit } = useDataStore();
  const insets = useSafeAreaInsets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const handleSubmit = async () => {
    if (!form.title.trim()) { Alert.alert('Hata', 'Baslik gerekli.'); return; }
    const item: DebtCredit = {
      id: editingId ?? generateId(),
      title: form.title.trim(),
      amount: parseFloat(form.amount) || 0,
      dueDate: form.dueDate || new Date().toISOString(),
      type: form.type,
      isCompleted: false,
      description: form.description.trim() || undefined,
    };
    await saveDebtCredit(item);
    closeModal();
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(defaultForm); };

  const toggleComplete = async (item: DebtCredit) => {
    await saveDebtCredit({ ...item, isCompleted: !item.isCompleted });
  };

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const totalDebt = debtCredits.filter(d => d.type === 'debt' && !d.isCompleted).reduce((s, d) => s + d.amount, 0);
  const totalCredit = debtCredits.filter(d => d.type === 'credit' && !d.isCompleted).reduce((s, d) => s + d.amount, 0);

  const renderItem = useCallback(({ item }: { item: DebtCredit }) => (
    <Pressable onPress={() => toggleComplete(item)}>
      <GlassCard style={{ opacity: item.isCompleted ? 0.5 : 1 }}>
        <View style={styles.row}>
          {item.type === 'debt'
            ? <ArrowDownCircle size={20} strokeWidth={1.85} color={colors.danger} />
            : <ArrowUpCircle size={20} strokeWidth={1.85} color={colors.success} />}
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{item.title}</Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
              {item.type === 'debt' ? 'Borc' : 'Alacak'} - {new Date(item.dueDate).toLocaleDateString('tr-TR')}
            </Text>
          </View>
          <Text style={[TYPOGRAPHY.bodyBold, { color: item.type === 'debt' ? colors.danger : colors.success }]}>
            {item.amount.toLocaleString('tr-TR')} TL
          </Text>
          <Pressable onPress={() => deleteDebtCredit(item.id)} hitSlop={8} style={{ marginLeft: SPACING.sm }}>
            <Trash2 size={16} strokeWidth={2.5} color={colors.danger} />
          </Pressable>
        </View>
      </GlassCard>
    </Pressable>
  ), [colors, debtCredits]);

  return (
    <GradientBackground>
      <GlassHeader
        title="Borc / Alacak"
        leftAction={<Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} strokeWidth={1.75} color={colors.text} /></Pressable>}
        rightAction={<Pressable onPress={() => setIsModalOpen(true)} hitSlop={12}><Plus size={24} strokeWidth={1.75} color={colors.primary} /></Pressable>}
      />

      <View style={styles.summary}>
        <GlassCard style={styles.summaryCard}>
          <Text style={[TYPOGRAPHY.small, { color: colors.danger }]}>Toplam Borc</Text>
          <Text style={[TYPOGRAPHY.h3, { color: colors.danger }]}>{totalDebt.toLocaleString('tr-TR')} TL</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard}>
          <Text style={[TYPOGRAPHY.small, { color: colors.success }]}>Toplam Alacak</Text>
          <Text style={[TYPOGRAPHY.h3, { color: colors.success }]}>{totalCredit.toLocaleString('tr-TR')} TL</Text>
        </GlassCard>
      </View>

      <FlatList
        data={debtCredits}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />

      <GlassModal visible={isModalOpen} onClose={closeModal} title={editingId ? 'Duzenle' : 'Yeni Kayit'}>
        <GlassInput label="Baslik *" value={form.title} onChangeText={v => setField('title', v)} />
        <GlassInput label="Tutar (TL)" value={form.amount} onChangeText={v => setField('amount', v)} keyboardType="decimal-pad" />
        <View style={styles.typeRow}>
          <GlassButton
            title="Borc"
            onPress={() => setField('type', 'debt')}
            variant={form.type === 'debt' ? 'primary' : 'secondary'}
            style={{ flex: 1 }}
          />
          <GlassButton
            title="Alacak"
            onPress={() => setField('type', 'credit')}
            variant={form.type === 'credit' ? 'primary' : 'secondary'}
            style={{ flex: 1 }}
          />
        </View>
        <GlassInput label="Aciklama" value={form.description} onChangeText={v => setField('description', v)} multiline />
        <View style={styles.modalActions}>
          <GlassButton title="Iptal" onPress={closeModal} variant="secondary" />
          <GlassButton title="Kaydet" onPress={handleSubmit} />
        </View>
      </GlassModal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  summaryCard: { flex: 1, alignItems: 'center' },
  list: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  typeRow: { flexDirection: 'row', gap: SPACING.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md, marginTop: SPACING.md },
});
