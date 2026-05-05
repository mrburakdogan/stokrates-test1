import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, View, Text, Pressable, FlatList, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, Calculator, Star, TrendingUp, Search,
  ChevronDown, ChevronUp, DollarSign, Check, Database,
} from 'lucide-react-native';
import {
  GradientBackground, GlassCard, GlassHeader, GlassInput, GlassButton,
} from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';
import type { TrendyolAnalysisRecord, Product } from '@/types';

// ─── Profit Calculation (matches web) ────────────────────────────
const VAT_RATE = 0.20;
const STOPAJ_RATE = 0.044;
const SERVICE_FEE = 13.90;

function calcProfit(sellingPrice: number, cost: number, shipping: number, commRate: number) {
  if (sellingPrice <= 0) return { profit: 0, margin: 0 };
  const commAmt = sellingPrice * (commRate / 100);
  const stopajAmt = commAmt * STOPAJ_RATE;
  const kFactor = 1 - (1 / (1 + VAT_RATE));
  const outVat = sellingPrice * kFactor;
  const inVat = (cost + shipping + SERVICE_FEE + commAmt) * kFactor;
  const netVatPayable = Math.max(0, outVat - inVat);
  const totalExpenses = cost + shipping + SERVICE_FEE + commAmt + stopajAmt + netVatPayable;
  const netProfit = sellingPrice - totalExpenses;
  const margin = (netProfit / sellingPrice) * 100;
  return { profit: netProfit, margin };
}

function getShippingCost(desi: number, prices: Record<number, number>, defaultPrice: number) {
  const ceiledDesi = Math.ceil(desi || 1);
  return prices[ceiledDesi] || defaultPrice || 35;
}

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Enriched product for display ────────────────────────────────
interface EnrichedProduct {
  barcode: string;
  dbProduct: Product | null;
  cost: number;
  shipping: number;
  desi: number;
  tiers?: { minPrice: number; maxPrice: number; commissionRate: number }[];
  stars?: { level: number; minPrice: number; maxPrice: number; targetPrice: number; commissionUsed: number }[];
  baseCommission?: number;
}

export default function TrendyolAnalysisScreen() {
  const { colors } = useUIStore();
  const { products, trendyolAnalyses, shippingSettings } = useDataStore();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'commission_tariff' | 'advantage_tag'>('commission_tariff');
  const [searchText, setSearchText] = useState('');
  const [expandedBarcode, setExpandedBarcode] = useState<string | null>(null);
  const [manualPrices, setManualPrices] = useState<Record<string, string>>({});

  // Get latest analysis record for each type
  const latestAnalysis = useMemo(() => {
    const sorted = [...trendyolAnalyses].sort(
      (a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
    );
    return {
      commission_tariff: sorted.find(a => a.type === 'commission_tariff'),
      advantage_tag: sorted.find(a => a.type === 'advantage_tag'),
    };
  }, [trendyolAnalyses]);

  const currentAnalysis = latestAnalysis[activeTab];

  // Enrich analysis products with local DB data
  const enrichedProducts = useMemo((): EnrichedProduct[] => {
    if (!currentAnalysis) return [];
    return currentAnalysis.products.map(ap => {
      const dbProduct = products.find(p => p.barcode === ap.barcode) ?? null;
      const cost = dbProduct?.cost ?? 0;
      const desi = dbProduct?.desi ?? 1;
      const shipping = getShippingCost(desi, shippingSettings.prices, shippingSettings.defaultPrice);
      return {
        barcode: ap.barcode,
        dbProduct,
        cost,
        shipping,
        desi,
        tiers: ap.tiers,
        stars: ap.stars,
        baseCommission: ap.baseCommission,
      };
    });
  }, [currentAnalysis, products, shippingSettings]);

  // Filter
  const filteredProducts = useMemo(() => {
    if (!searchText.trim()) return enrichedProducts;
    const q = searchText.toLowerCase();
    return enrichedProducts.filter(ep => {
      const name = ep.dbProduct?.name?.toLowerCase() ?? '';
      return name.includes(q) || ep.barcode.includes(q);
    });
  }, [enrichedProducts, searchText]);

  const getManualResult = (barcode: string, ep: EnrichedProduct) => {
    const val = manualPrices[barcode];
    if (!val) return null;
    const price = parseFloat(val);
    if (isNaN(price) || price <= 0) return null;

    let commRate = 19;
    if (activeTab === 'commission_tariff' && ep.tiers) {
      const matched = ep.tiers.find(t => price >= t.minPrice && (t.maxPrice === Infinity || price <= t.maxPrice));
      if (matched) commRate = matched.commissionRate;
      else if (ep.tiers.length > 0) commRate = ep.tiers[0].commissionRate;
    } else if (activeTab === 'advantage_tag') {
      commRate = ep.baseCommission ?? 19;
    }

    const { profit, margin } = calcProfit(price, ep.cost, ep.shipping, commRate);
    return { profit, margin, commRate };
  };

  const toggleExpand = (barcode: string) => {
    setExpandedBarcode(prev => (prev === barcode ? null : barcode));
  };

  const renderProduct = useCallback(({ item: ep }: { item: EnrichedProduct }) => {
    const isExpanded = expandedBarcode === ep.barcode;
    const name = ep.dbProduct?.name ?? 'Bilinmeyen Urun';
    const stock = ep.dbProduct?.stock ?? 0;
    const manualResult = getManualResult(ep.barcode, ep);

    return (
      <GlassCard noAnimation>
        {/* Header row */}
        <Pressable style={styles.productHeader} onPress={() => toggleExpand(ep.barcode)}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]} numberOfLines={2}>
              {name}
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
              {ep.barcode} — Stok: {stock}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {ep.dbProduct ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>Maliyet</Text>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>₺{fmt(ep.cost)}</Text>
              </View>
            ) : (
              <View style={[styles.noMatchBadge, { backgroundColor: colors.danger + '15' }]}>
                <Text style={[TYPOGRAPHY.caption, { color: colors.danger }]}>Eslesme Yok</Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronUp size={18} strokeWidth={1.75} color={colors.textMuted} />
            ) : (
              <ChevronDown size={18} strokeWidth={1.75} color={colors.textMuted} />
            )}
          </View>
        </Pressable>

        {/* Expanded Detail */}
        {isExpanded && (
          <View style={[styles.expandedArea, { borderTopColor: colors.inputBorder }]}>
            {/* Shipping/Desi info */}
            <View style={styles.infoRow}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                Kargo: ₺{fmt(ep.shipping)} ({ep.desi} desi)
              </Text>
            </View>

            {/* Tiers or Stars */}
            {activeTab === 'commission_tariff' && ep.tiers && ep.tiers.length > 0 && (
              <View style={styles.tiersContainer}>
                <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>Komisyon Tarifeleri</Text>
                {ep.tiers.map((tier, idx) => {
                  const refPrice = tier.maxPrice !== Infinity && tier.maxPrice > 0 ? tier.maxPrice : tier.minPrice;
                  const { profit, margin } = calcProfit(refPrice, ep.cost, ep.shipping, tier.commissionRate);
                  const isProfitable = profit > 0;
                  return (
                    <View
                      key={idx}
                      style={[styles.tierCard, { borderColor: isProfitable ? '#22c55e40' : '#ef444440' }]}
                    >
                      <View style={styles.tierTop}>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.text, fontWeight: '700' }]}>
                          {idx + 1}. Tarife
                        </Text>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>
                          %{tier.commissionRate} komisyon
                        </Text>
                      </View>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                        ₺{tier.minPrice.toLocaleString('tr-TR')} — ₺{tier.maxPrice === Infinity ? '∞' : tier.maxPrice.toLocaleString('tr-TR')}
                      </Text>
                      {ep.dbProduct && (
                        <View style={[styles.profitPill, { backgroundColor: isProfitable ? '#22c55e15' : '#ef444415' }]}>
                          <Text style={[TYPOGRAPHY.caption, { color: isProfitable ? '#22c55e' : '#ef4444', fontWeight: '700' }]}>
                            ₺{fmt(profit)} kar (%{margin.toFixed(0)})
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {activeTab === 'advantage_tag' && ep.stars && ep.stars.length > 0 && (
              <View style={styles.tiersContainer}>
                <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>Yildiz Seviyeleri</Text>
                {ep.stars.map((star, idx) => {
                  const { profit, margin } = calcProfit(star.targetPrice, ep.cost, ep.shipping, star.commissionUsed);
                  const isProfitable = profit > 0;
                  const starIcons = '★'.repeat(star.level);
                  return (
                    <View
                      key={idx}
                      style={[styles.tierCard, { borderColor: isProfitable ? '#22c55e40' : '#ef444440' }]}
                    >
                      <View style={styles.tierTop}>
                        <Text style={{ color: '#f59e0b', fontSize: 14 }}>{starIcons}</Text>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>
                          %{star.commissionUsed} komisyon
                        </Text>
                      </View>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                        ₺{star.minPrice.toLocaleString('tr-TR')} — ₺{star.maxPrice.toLocaleString('tr-TR')}
                      </Text>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.text }]}>
                        Hedef: ₺{fmt(star.targetPrice)}
                      </Text>
                      {ep.dbProduct && (
                        <View style={[styles.profitPill, { backgroundColor: isProfitable ? '#22c55e15' : '#ef444415' }]}>
                          <Text style={[TYPOGRAPHY.caption, { color: isProfitable ? '#22c55e' : '#ef4444', fontWeight: '700' }]}>
                            ₺{fmt(profit)} kar (%{margin.toFixed(0)})
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Manual Price Simulation */}
            <View style={[styles.manualSection, { backgroundColor: colors.card }]}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: 6 }]}>
                Manuel Fiyat Simulasyonu
              </Text>
              <View style={styles.manualRow}>
                <TextInput
                  style={[styles.manualInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.card }]}
                  placeholder="Fiyat girin"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={manualPrices[ep.barcode] ?? ''}
                  onChangeText={v => setManualPrices(prev => ({ ...prev, [ep.barcode]: v }))}
                />
                <View style={[styles.calcIcon, { backgroundColor: colors.primary }]}>
                  <Calculator size={14} strokeWidth={2} color="#fff" />
                </View>
              </View>
              {manualResult && (
                <View style={[styles.manualResult, { backgroundColor: manualResult.profit > 0 ? '#22c55e15' : '#ef444415' }]}>
                  <Text style={[TYPOGRAPHY.caption, { color: manualResult.profit > 0 ? '#22c55e' : '#ef4444', fontWeight: '700' }]}>
                    ₺{fmt(manualResult.profit)} kar (%{manualResult.margin.toFixed(0)}) — Komisyon: %{manualResult.commRate}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </GlassCard>
    );
  }, [expandedBarcode, manualPrices, activeTab, colors, products]);

  return (
    <GradientBackground>
      <GlassHeader
        title="Trendyol Analiz"
        leftAction={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} strokeWidth={1.75} color={colors.text} />
          </Pressable>
        }
      />

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'commission_tariff' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('commission_tariff')}
        >
          <Calculator size={16} strokeWidth={1.75} color={activeTab === 'commission_tariff' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'commission_tariff' ? colors.primary : colors.textMuted }]}>
            Komisyon
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'advantage_tag' && { borderBottomColor: '#f59e0b', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('advantage_tag')}
        >
          <Star size={16} strokeWidth={1.75} color={activeTab === 'advantage_tag' ? '#f59e0b' : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'advantage_tag' ? '#f59e0b' : colors.textMuted }]}>
            Avantaj
          </Text>
        </Pressable>
      </View>

      {/* Analysis Info */}
      {currentAnalysis && (
        <View style={[styles.analysisInfo, { backgroundColor: colors.card, borderBottomColor: colors.inputBorder }]}>
          <Database size={14} strokeWidth={1.75} color={colors.textSecondary} />
          <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]}>
            {currentAnalysis.products.length} urun — {new Date(currentAnalysis.analysisDate).toLocaleDateString('tr-TR')}
            {' '}({currentAnalysis.startDate} / {currentAnalysis.endDate})
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <GlassInput
          placeholder="Urun adi veya barkod ara..."
          value={searchText}
          onChangeText={setSearchText}
          icon={<Search size={16} strokeWidth={2} color={colors.textMuted} />}
        />
      </View>

      {/* Product List */}
      {filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.barcode}
          renderItem={renderProduct}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Search size={48} strokeWidth={1.25} color={colors.textMuted} />
          <Text style={[TYPOGRAPHY.h3, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            {!currentAnalysis ? 'Analiz Verisi Yok' : 'Sonuc Bulunamadi'}
          </Text>
          <Text style={[TYPOGRAPHY.body, { color: colors.textMuted, textAlign: 'center', marginTop: SPACING.sm }]}>
            {!currentAnalysis
              ? 'Web uygulamasindan bir Trendyol analizi yukleyip kaydedin. Veriler otomatik senkronize edilecektir.'
              : 'Arama kriterlerinizi degistirerek tekrar deneyin.'}
          </Text>
        </View>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  analysisInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  list: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  noMatchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expandedArea: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoRow: {
    marginBottom: SPACING.sm,
  },
  tiersContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  tierCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.sm,
    gap: 3,
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitPill: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  manualSection: {
    padding: SPACING.md,
    borderRadius: 12,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  calcIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualResult: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
  },
});
