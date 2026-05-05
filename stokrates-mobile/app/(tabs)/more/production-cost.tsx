import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import {
  ArrowLeft, Save, Trash2, Droplets, FlaskConical,
  Package, Percent, CheckCircle, Info,
} from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassInput, GlassButton } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

export default function ProductionCostScreen() {
  const { colors } = useUIStore();
  const { products, saveProduct } = useDataStore();
  const insets = useSafeAreaInsets();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [profitMargin, setProfitMargin] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const [essence, setEssence] = useState({ unitPrice: '', unitAmount: '1', usedAmount: '' });
  const [alcohol, setAlcohol] = useState({ literPrice: '', usedAmount: '' });
  const [water, setWater] = useState({ literPrice: '', usedAmount: '' });
  const [packaging, setPackaging] = useState({ bottleCap: '', boxLabel: '', cargoOther: '' });

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const filteredProducts = useMemo(() => {
    if (!searchText.trim()) return products.slice(0, 20);
    const q = searchText.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [searchText, products]);

  const essenceTotal = ((parseFloat(essence.unitPrice) || 0) / (parseFloat(essence.unitAmount) || 1)) * (parseFloat(essence.usedAmount) || 0);
  const alcoholTotal = ((parseFloat(alcohol.literPrice) || 0) / 1000) * (parseFloat(alcohol.usedAmount) || 0);
  const waterTotal = ((parseFloat(water.literPrice) || 0) / 1000) * (parseFloat(water.usedAmount) || 0);

  const unitCost = essenceTotal + alcoholTotal + waterTotal +
    (parseFloat(packaging.bottleCap) || 0) +
    (parseFloat(packaging.boxLabel) || 0) +
    (parseFloat(packaging.cargoOther) || 0);

  const netProfit = unitCost * (profitMargin / 100);
  const salePrice = unitCost + netProfit;

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSave = () => {
    if (!selectedProduct) {
      Alert.alert('Hata', 'Lutfen bir urun seciniz.');
      return;
    }
    if (unitCost <= 0) {
      Alert.alert('Hata', 'Hesaplanan maliyet 0 olamaz.');
      return;
    }
    Alert.alert(
      'Maliyeti Guncelle',
      `${selectedProduct.name} urunun maliyetini ₺${fmt(unitCost)} olarak guncellemek istiyor musunuz?`,
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async () => {
            await saveProduct({ ...selectedProduct, cost: parseFloat(unitCost.toFixed(2)) });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
          },
        },
      ]
    );
  };

  const handleClear = () => {
    setSelectedProductId('');
    setSearchText('');
    setEssence({ unitPrice: '', unitAmount: '1', usedAmount: '' });
    setAlcohol({ literPrice: '', usedAmount: '' });
    setWater({ literPrice: '', usedAmount: '' });
    setPackaging({ bottleCap: '', boxLabel: '', cargoOther: '' });
    setProfitMargin(0);
  };

  const selectProduct = (id: string) => {
    setSelectedProductId(id);
    const p = products.find(pr => pr.id === id);
    if (p) setSearchText(p.name);
    setShowDropdown(false);
  };

  return (
    <GradientBackground>
      <GlassHeader
        title="Uretim Maliyet"
        subtitle="Parfum & uretim maliyet analizi"
        leftAction={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} strokeWidth={1.75} color={colors.text} />
          </Pressable>
        }
        rightAction={
          showSuccess ? (
            <View style={styles.successBadge}>
              <CheckCircle size={16} strokeWidth={2} color="#22c55e" />
              <Text style={styles.successText}>Kaydedildi</Text>
            </View>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Selector */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            <PackageIcon colors={colors} /> Urun Secimi
          </Text>
          <GlassInput
            label="Urun Adi / Kodu"
            placeholder="Urun ara..."
            value={searchText}
            onChangeText={v => {
              setSearchText(v);
              setShowDropdown(true);
              if (!v.trim()) setSelectedProductId('');
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && filteredProducts.length > 0 && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}>
              {filteredProducts.map(p => (
                <Pressable
                  key={p.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.inputBorder },
                    p.id === selectedProductId && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => selectProduct(p.id)}
                >
                  <Text style={[TYPOGRAPHY.body, { color: colors.text }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                    Maliyet: ₺{p.cost || 0}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {selectedProduct && (
            <View style={[styles.selectedInfo, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>
                Secili: {selectedProduct.name} — Mevcut Maliyet: ₺{selectedProduct.cost || 0}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Essence */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: '#eab308' }]}>
            Esans Maliyeti
          </Text>
          <View style={styles.row}>
            <GlassInput
              label="Birim Fiyat (TL)"
              placeholder="0.00"
              value={essence.unitPrice}
              onChangeText={v => setEssence({ ...essence, unitPrice: v })}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
            <GlassInput
              label="Birim Miktar (gr/ml)"
              placeholder="1"
              value={essence.unitAmount}
              onChangeText={v => setEssence({ ...essence, unitAmount: v })}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <GlassInput
            label="Kullanilan (gr)"
            placeholder="0"
            value={essence.usedAmount}
            onChangeText={v => setEssence({ ...essence, usedAmount: v })}
            keyboardType="decimal-pad"
            containerStyle={{ marginTop: SPACING.md }}
          />
          <View style={styles.subtotalRow}>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Esans Tutari:</Text>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>₺{fmt(essenceTotal)}</Text>
          </View>
        </GlassCard>

        {/* Alcohol & Water */}
        <View style={styles.row}>
          <GlassCard style={{ flex: 1 }}>
            <Text style={[styles.sectionTitleSm, { color: '#3b82f6' }]}>Alkol</Text>
            <GlassInput
              label="Litre Fiyati (TL)"
              placeholder="0.00"
              value={alcohol.literPrice}
              onChangeText={v => setAlcohol({ ...alcohol, literPrice: v })}
              keyboardType="decimal-pad"
            />
            <GlassInput
              label="Kullanilan (ml)"
              placeholder="0"
              value={alcohol.usedAmount}
              onChangeText={v => setAlcohol({ ...alcohol, usedAmount: v })}
              keyboardType="decimal-pad"
              containerStyle={{ marginTop: SPACING.sm }}
            />
            <View style={styles.subtotalRow}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Tutar:</Text>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>₺{fmt(alcoholTotal)}</Text>
            </View>
          </GlassCard>

          <GlassCard style={{ flex: 1 }}>
            <Text style={[styles.sectionTitleSm, { color: '#06b6d4' }]}>Saf Su</Text>
            <GlassInput
              label="Litre Fiyati (TL)"
              placeholder="0.00"
              value={water.literPrice}
              onChangeText={v => setWater({ ...water, literPrice: v })}
              keyboardType="decimal-pad"
            />
            <GlassInput
              label="Kullanilan (ml)"
              placeholder="0"
              value={water.usedAmount}
              onChangeText={v => setWater({ ...water, usedAmount: v })}
              keyboardType="decimal-pad"
              containerStyle={{ marginTop: SPACING.sm }}
            />
            <View style={styles.subtotalRow}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Tutar:</Text>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>₺{fmt(waterTotal)}</Text>
            </View>
          </GlassCard>
        </View>

        {/* Packaging */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: '#f97316' }]}>
            Sise & Ambalaj & Diger
          </Text>
          <View style={styles.row}>
            <GlassInput
              label="Sise + Kapak (TL)"
              placeholder="0.00"
              value={packaging.bottleCap}
              onChangeText={v => setPackaging({ ...packaging, bottleCap: v })}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
            <GlassInput
              label="Kutu / Etiket (TL)"
              placeholder="0.00"
              value={packaging.boxLabel}
              onChangeText={v => setPackaging({ ...packaging, boxLabel: v })}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <GlassInput
            label="Kargo / Diger (TL)"
            placeholder="0.00"
            value={packaging.cargoOther}
            onChangeText={v => setPackaging({ ...packaging, cargoOther: v })}
            keyboardType="decimal-pad"
            containerStyle={{ marginTop: SPACING.md }}
          />
        </GlassCard>

        {/* Summary */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Birim Ozeti</Text>

          {/* Unit Cost */}
          <View style={styles.summaryRow}>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>1 Sise Maliyeti</Text>
            <Text style={[styles.costValue, { color: colors.danger }]}>₺{fmt(unitCost)}</Text>
          </View>

          {/* Profit Margin Slider */}
          <View style={[styles.sliderBox, { backgroundColor: colors.card }]}>
            <View style={styles.sliderHeader}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Kar Marji</Text>
              <View style={[styles.marginBadge, { backgroundColor: '#f9731620' }]}>
                <Text style={[TYPOGRAPHY.caption, { color: '#f97316', fontWeight: '700' }]}>
                  %{profitMargin}
                </Text>
              </View>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={500}
              step={5}
              value={profitMargin}
              onValueChange={setProfitMargin}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.inputBorder}
              thumbTintColor={colors.primary}
            />
          </View>

          {/* Net Profit */}
          <View style={[styles.summaryRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inputBorder, borderStyle: 'dashed', paddingTop: SPACING.md }]}>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>1 Sise Net Kar</Text>
            <Text style={[styles.profitValue, { color: '#eab308' }]}>+₺{fmt(netProfit)}</Text>
          </View>

          {/* Sale Price */}
          <View style={[styles.salePriceBox, { backgroundColor: '#22c55e12', borderColor: '#22c55e30' }]}>
            <Text style={styles.salePriceLabel}>BIRIM SATIS FIYATI</Text>
            <Text style={styles.salePriceValue}>₺{fmt(salePrice)}</Text>
          </View>

          {/* Actions */}
          <View style={[styles.actions, { marginTop: SPACING.lg }]}>
            <GlassButton
              title="Hesabi Kaydet"
              onPress={handleSave}
              fullWidth
              icon={<Save size={18} strokeWidth={2} color="#fff" />}
            />
            <Pressable onPress={handleClear} style={styles.clearBtn}>
              <Trash2 size={16} strokeWidth={1.75} color={colors.textMuted} />
              <Text style={[TYPOGRAPHY.body, { color: colors.textMuted }]}>Temizle</Text>
            </Pressable>
          </View>

          {/* Info */}
          <View style={styles.infoRow}>
            <Info size={14} strokeWidth={1.75} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Kar marji eklenmis fiyat, onerilen satis fiyatidir. Kaydet butonuna bastiginizda sadece maliyet verisi guncellenir.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

function PackageIcon({ colors }: { colors: any }) {
  return <Package size={14} strokeWidth={2} color={colors.textSecondary} />;
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.lg,
  },
  sectionTitleSm: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: SPACING.sm,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedInfo: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  costValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  profitValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  sliderBox: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  salePriceBox: {
    padding: SPACING.xl,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  salePriceLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22c55e',
    letterSpacing: 2,
    marginBottom: 4,
  },
  salePriceValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#22c55e',
    letterSpacing: -1,
  },
  actions: {
    gap: SPACING.sm,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  successText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
  },
});
