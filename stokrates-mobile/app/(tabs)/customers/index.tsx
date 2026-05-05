import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Search, ChevronRight, Trash2 } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassModal, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { generateId } from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { Customer } from '@/types';

const defaultForm = { name: '', phone: '', address: '' };

export default function CustomersScreen() {
  const { colors } = useUIStore();
  const { customers, saveCustomer, deleteCustomer } = useDataStore();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Hata', 'Musteri adi gerekli.'); return; }
    const customer: Customer = {
      id: editingId ?? generateId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    };
    await saveCustomer(customer);
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu musteriyi silmek istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteCustomer(id) },
    ]);
  };

  const renderCustomer = useCallback(({ item }: { item: Customer }) => (
    <Pressable onPress={() => router.push(`/(tabs)/customers/${item.id}`)}>
      <GlassCard style={styles.card} noAnimation>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{item.name}</Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{item.phone}</Text>
          </View>
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={{ marginRight: SPACING.sm }}>
            <Trash2 size={16} strokeWidth={2.5} color={colors.danger} />
          </Pressable>
          <ChevronRight size={16} strokeWidth={2} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  ), [colors]);

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <GradientBackground>
      <GlassHeader
        title="Musteriler"
        subtitle={`${customers.length} musteri`}
        rightAction={
          <Pressable onPress={() => setIsModalOpen(true)} hitSlop={12}>
            <Plus size={24} strokeWidth={1.75} color={colors.primary} />
          </Pressable>
        }
      />

      <View style={styles.searchContainer}>
        <GlassInput
          placeholder="Musteri ara..."
          value={search}
          onChangeText={setSearch}
          icon={<Search size={18} strokeWidth={2} color={colors.textMuted} />}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />

      <GlassModal visible={isModalOpen} onClose={closeModal} title={editingId ? 'Musteri Duzenle' : 'Yeni Musteri'}>
        <GlassInput label="Ad Soyad *" value={form.name} onChangeText={v => setField('name', v)} />
        <GlassInput label="Telefon" value={form.phone} onChangeText={v => setField('phone', v)} keyboardType="phone-pad" />
        <GlassInput label="Adres" value={form.address} onChangeText={v => setField('address', v)} multiline />
        <View style={styles.modalActions}>
          <GlassButton title="Iptal" onPress={closeModal} variant="secondary" />
          <GlassButton title={editingId ? 'Guncelle' : 'Kaydet'} onPress={handleSubmit} />
        </View>
      </GlassModal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  searchContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  list: { padding: SPACING.lg, gap: SPACING.md },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: SPACING.md, marginTop: SPACING.md,
  },
});
