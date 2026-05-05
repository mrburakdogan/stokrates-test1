import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Plus, Minus } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { generateId } from '@/services/db';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { Sale, SaleItem, Product } from '@/types';

export default function NewSaleScreen() {
  const { colors } = useUIStore();
  const { products, customers, saveSale } = useDataStore();
  const insets = useSafeAreaInsets();

  const [cart, setCart] = useState<(SaleItem & { _product: Product })[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [discount, setDiscount] = useState('0');

  const filteredCustomers = customerSearch.length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5)
    : [];

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        Alert.alert('Uyari', 'Yeterli stok yok.');
        return;
      }
      setCart(cart.map(c =>
        c.productId === product.id
          ? { ...c, quantity: c.quantity + 1, totalPrice: (c.quantity + 1) * c.unitPrice, vatAmount: ((c.quantity + 1) * c.unitPrice * (c.vatRate / 100)) }
          : c
      ));
    } else {
      if (product.stock <= 0) {
        Alert.alert('Uyari', 'Bu urunde stok yok.');
        return;
      }
      const vatRate = product.vatRate ?? 0;
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        vatRate,
        vatAmount: product.price * (vatRate / 100),
        _product: product,
      }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(c => c.productId === productId);
    if (!item) return;
    if (item.quantity <= 1) {
      setCart(cart.filter(c => c.productId !== productId));
    } else {
      setCart(cart.map(c =>
        c.productId === productId
          ? { ...c, quantity: c.quantity - 1, totalPrice: (c.quantity - 1) * c.unitPrice, vatAmount: ((c.quantity - 1) * c.unitPrice * (c.vatRate / 100)) }
          : c
      ));
    }
  };

  const subTotal = cart.reduce((s, c) => s + c.totalPrice, 0);
  const totalVat = cart.reduce((s, c) => s + c.vatAmount, 0);
  const discountAmount = parseFloat(discount) || 0;
  const totalAmount = subTotal - discountAmount;

  const handleCompleteSale = async () => {
    if (cart.length === 0) { Alert.alert('Hata', 'Sepet bos.'); return; }
    if (!selectedCustomerId) { Alert.alert('Hata', 'Musteri secin.'); return; }

    const sale: Sale = {
      id: generateId(),
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name ?? '',
      items: cart.map(({ _product, ...item }) => item),
      subTotal,
      discount: discountAmount,
      totalAmount,
      totalVat,
      date: new Date().toISOString(),
      status: 'completed',
    };

    await saveSale(sale);
    setCart([]);
    setSelectedCustomerId(null);
    setCustomerSearch('');
    setDiscount('0');
    Alert.alert('Basarili', 'Satis kaydedildi.');
  };

  return (
    <GradientBackground>
      <GlassHeader title="Yeni Satis" subtitle={`${cart.length} kalem`} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer selection */}
        <GlassCard>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SPACING.sm }]}>
            Musteri
          </Text>
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <Text style={[TYPOGRAPHY.body, { color: colors.text, flex: 1 }]}>
                {selectedCustomer.name}
              </Text>
              <GlassButton title="Degistir" onPress={() => { setSelectedCustomerId(null); setCustomerSearch(''); }} variant="ghost" />
            </View>
          ) : (
            <>
              <GlassInput placeholder="Musteri ara..." value={customerSearch} onChangeText={setCustomerSearch} />
              {filteredCustomers.map(c => (
                <GlassButton
                  key={c.id}
                  title={c.name}
                  onPress={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                  variant="ghost"
                  style={{ justifyContent: 'flex-start' }}
                />
              ))}
            </>
          )}
        </GlassCard>

        {/* Product quick-add */}
        <GlassCard style={{ marginTop: SPACING.md }}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SPACING.sm }]}>
            Urun Ekle
          </Text>
          {products.filter(p => p.stock > 0).slice(0, 20).map(p => (
            <View key={p.id} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={[TYPOGRAPHY.body, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                  {p.price.toLocaleString('tr-TR')} TL | Stok: {p.stock}
                </Text>
              </View>
              <GlassButton
                title="+"
                onPress={() => addToCart(p)}
                style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs }}
              />
            </View>
          ))}
        </GlassCard>

        {/* Cart */}
        {cart.length > 0 && (
          <GlassCard style={{ marginTop: SPACING.md }}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SPACING.sm }]}>
              Sepet
            </Text>
            {cart.map(item => (
              <View key={item.productId} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={[TYPOGRAPHY.body, { color: colors.text }]}>{item.productName}</Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                    {item.quantity} x {item.unitPrice.toLocaleString('tr-TR')} TL = {item.totalPrice.toLocaleString('tr-TR')} TL
                  </Text>
                </View>
                <View style={styles.cartActions}>
                  <GlassButton title="-" onPress={() => removeFromCart(item.productId)} variant="secondary" style={styles.cartBtn} />
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, width: 30, textAlign: 'center' }]}>
                    {item.quantity}
                  </Text>
                  <GlassButton title="+" onPress={() => addToCart(item._product)} style={styles.cartBtn} />
                </View>
              </View>
            ))}

            <View style={styles.divider} />

            <GlassInput label="Indirim (TL)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />

            <View style={[styles.totalRow, { marginTop: SPACING.md }]}>
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>Ara Toplam:</Text>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{subTotal.toLocaleString('tr-TR')} TL</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>KDV:</Text>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{totalVat.toLocaleString('tr-TR')} TL</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[TYPOGRAPHY.h3, { color: colors.primary }]}>Toplam:</Text>
              <Text style={[TYPOGRAPHY.h3, { color: colors.primary }]}>{totalAmount.toLocaleString('tr-TR')} TL</Text>
            </View>

            <GlassButton
              title="Satisi Tamamla"
              onPress={handleCompleteSale}
              fullWidth
              style={{ marginTop: SPACING.lg }}
              icon={<ShoppingCart size={18} strokeWidth={2} color="#fff" />}
            />
          </GlassCard>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  selectedCustomer: { flexDirection: 'row', alignItems: 'center' },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 0.5, borderBottomColor: 'rgba(148,163,184,0.2)',
  },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  cartActions: { flexDirection: 'row', alignItems: 'center' },
  cartBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  divider: { height: 1, backgroundColor: 'rgba(148,163,184,0.2)', marginVertical: SPACING.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});
