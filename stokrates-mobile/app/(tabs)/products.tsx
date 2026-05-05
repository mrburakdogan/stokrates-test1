import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Search, Edit3, Trash2, Package } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassModal, GlassInput, GlassButton, IconWrapper } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { generateId } from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { Product } from '@/types';

const defaultForm = {
  name: '', category: '', price: '', cost: '', stock: '', barcode: '', brand: '',
};

export default function ProductsScreen() {
  const { colors } = useUIStore();
  const { products, saveProduct, deleteProduct } = useDataStore();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode ?? '').includes(search) ||
    (p.code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, category: p.category, price: p.price.toString(),
      cost: p.cost.toString(), stock: p.stock.toString(),
      barcode: p.barcode ?? '', brand: p.brand ?? '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu urunu silmek istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteProduct(id) },
    ]);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Hata', 'Urun adi gerekli.'); return; }
    const product: Product = {
      id: editingId ?? generateId(),
      name: form.name.trim(),
      category: form.category.trim(),
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
      barcode: form.barcode.trim() || undefined,
      brand: form.brand.trim() || undefined,
    };
    await saveProduct(product);
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <GlassCard style={styles.productCard} noAnimation>
      <View style={styles.productRow}>
        <IconWrapper
          icon={<Package />}
          size="sm"
          color={colors.primary}
          container="gradient"
          gradient={[colors.primary + '30', colors.primary + '10']}
        />
        <View style={styles.productInfo}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
            {item.category} {item.brand ? `- ${item.brand}` : ''}
          </Text>
          <View style={styles.productMeta}>
            <Text style={[TYPOGRAPHY.small, { color: colors.primary }]}>
              {item.price.toLocaleString('tr-TR')} TL
            </Text>
            <Text style={[
              TYPOGRAPHY.small,
              { color: item.stock <= 5 ? colors.danger : colors.success },
            ]}>
              Stok: {item.stock}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => handleEdit(item)} hitSlop={8}>
            <Edit3 size={16} strokeWidth={2.5} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
            <Trash2 size={16} strokeWidth={2.5} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  ), [colors]);

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <GradientBackground>
      <GlassHeader
        title="Urunler"
        subtitle={`${products.length} urun`}
        rightAction={
          <Pressable onPress={() => setIsModalOpen(true)} hitSlop={12}>
            <Plus size={24} strokeWidth={1.75} color={colors.primary} />
          </Pressable>
        }
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <GlassInput
          placeholder="Urun ara..."
          value={search}
          onChangeText={setSearch}
          icon={<Search size={18} strokeWidth={2} color={colors.textMuted} />}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal */}
      <GlassModal
        visible={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Urun Duzenle' : 'Yeni Urun'}
      >
        <GlassInput label="Urun Adi *" value={form.name} onChangeText={v => setField('name', v)} />
        <GlassInput label="Kategori" value={form.category} onChangeText={v => setField('category', v)} />
        <GlassInput label="Marka" value={form.brand} onChangeText={v => setField('brand', v)} />
        <GlassInput label="Barkod" value={form.barcode} onChangeText={v => setField('barcode', v)} keyboardType="numeric" />
        <View style={styles.row}>
          <GlassInput label="Fiyat (TL)" value={form.price} onChangeText={v => setField('price', v)} keyboardType="decimal-pad" containerStyle={styles.halfInput} />
          <GlassInput label="Maliyet (TL)" value={form.cost} onChangeText={v => setField('cost', v)} keyboardType="decimal-pad" containerStyle={styles.halfInput} />
        </View>
        <GlassInput label="Stok" value={form.stock} onChangeText={v => setField('stock', v)} keyboardType="number-pad" />
        <View style={styles.modalActions}>
          <GlassButton title="Iptal" onPress={closeModal} variant="secondary" />
          <GlassButton title={editingId ? 'Guncelle' : 'Kaydet'} onPress={handleSubmit} />
        </View>
      </GlassModal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  list: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  productCard: {
    marginBottom: 0,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  productInfo: {
    flex: 1,
  },
  productMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
});
