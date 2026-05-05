import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Calculator, Globe, Truck } from 'lucide-react-native';
import { GradientBackground, GlassCard, GlassHeader, GlassInput } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { TYPOGRAPHY, SPACING } from '@/constants/theme';

const VAT_OPTIONS = [
  { label: '%20', value: '20' },
  { label: '%10', value: '10' },
  { label: '%1', value: '1' },
];

export default function CostCalculatorScreen() {
  const { colors } = useUIStore();
  const insets = useSafeAreaInsets();

  const [isExport, setIsExport] = useState(false);
  const [inputs, setInputs] = useState({
    cost: '',
    shipping: '',
    commissionRate: '',
    profitMargin: '',
    serviceFee: '13.90',
    vatRate: '20',
    intlFee: '',
  });

  const setField = (key: string, val: string) =>
    setInputs(prev => ({ ...prev, [key]: val }));

  const results = useMemo(() => {
    const cost = parseFloat(inputs.cost) || 0;
    const shipping = parseFloat(inputs.shipping) || 0;
    const service = isExport ? 0 : (parseFloat(inputs.serviceFee) || 0);
    const intl = isExport ? (parseFloat(inputs.intlFee) || 0) : 0;
    const commRate = (parseFloat(inputs.commissionRate) || 0) / 100;
    const margin = (parseFloat(inputs.profitMargin) || 0) / 100;
    const vatRate = isExport ? 0 : (parseFloat(inputs.vatRate) || 20) / 100;

    const kFactor = vatRate / (1 + vatRate);
    const stopajRate = 0.044;
    const fixedCost = cost + shipping + service + intl;
    let finalPrice = 0;

    if (!isExport) {
      const den = 1 - kFactor - (commRate * (1 + stopajRate)) - margin;
      finalPrice = den > 0 ? fixedCost / den : 0;
    } else {
      const den = 1 - (commRate + commRate * stopajRate + margin);
      finalPrice = den > 0 ? fixedCost / den : 0;
    }

    const commAmt = finalPrice * commRate;
    const stopajAmt = commAmt * stopajRate;
    const profit = finalPrice * margin;

    let netVat = 0;
    let vatRefund = 0;

    if (!isExport) {
      netVat = finalPrice * kFactor;
    } else {
      const costVatRate = 0.20;
      vatRefund = cost * (costVatRate / (1 + costVatRate));
    }

    return {
      finalPrice: Math.max(0, finalPrice),
      netProfit: profit,
      commAmt,
      service,
      stopajAmt,
      shipping,
      netVat,
      vatRefund,
    };
  }, [inputs, isExport]);

  const fmt = (n: number) =>
    '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <GradientBackground>
      <GlassHeader
        title="Maliyet Hesaplama"
        subtitle="Trendyol maliyet ve fiyatlandirma"
        leftAction={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} strokeWidth={1.75} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Domestic / Export Toggle */}
        <GlassCard>
          <Pressable
            style={[styles.toggle, { backgroundColor: colors.card }]}
            onPress={() => setIsExport(!isExport)}
          >
            <View
              style={[
                styles.toggleSlider,
                {
                  backgroundColor: colors.primary,
                  transform: [{ translateX: isExport ? 1 : 0 }],
                  left: isExport ? '50%' : 0,
                  width: '50%',
                },
              ]}
            />
            <View style={styles.toggleOption}>
              <Truck size={16} strokeWidth={1.75} color={!isExport ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.toggleText,
                  { color: !isExport ? '#fff' : colors.textSecondary },
                ]}
              >
                Yurt Ici
              </Text>
            </View>
            <View style={styles.toggleOption}>
              <Globe size={16} strokeWidth={1.75} color={isExport ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.toggleText,
                  { color: isExport ? '#fff' : colors.textSecondary },
                ]}
              >
                Ihracat
              </Text>
            </View>
          </Pressable>
        </GlassCard>

        {/* Result Card */}
        <GlassCard style={{ ...styles.resultCard, backgroundColor: isExport ? '#6366f1' : colors.primary }}>
          <Text style={styles.resultLabel}>Tavsiye Edilen Satis Fiyati</Text>
          <Text style={styles.resultPrice}>{fmt(results.finalPrice)}</Text>
          <View style={styles.resultDivider} />
          <View style={styles.resultRow}>
            <Text style={styles.resultSubLabel}>Net Kar:</Text>
            <Text style={styles.resultSubValue}>{fmt(results.netProfit)}</Text>
          </View>
        </GlassCard>

        {/* Product Costs */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Urun Giderleri</Text>
          <GlassInput
            label="Urun Maliyeti (KDV Dahil)"
            placeholder="0.00"
            value={inputs.cost}
            onChangeText={v => setField('cost', v)}
            keyboardType="decimal-pad"
            containerStyle={{ marginBottom: SPACING.md }}
          />
          <GlassInput
            label="Kargo Ucreti"
            placeholder="0.00"
            value={inputs.shipping}
            onChangeText={v => setField('shipping', v)}
            keyboardType="decimal-pad"
          />
        </GlassCard>

        {/* Platform Rates */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isExport ? 'Ihracat Parametreleri' : 'Trendyol Oranlari'}
          </Text>
          <View style={styles.row}>
            <GlassInput
              label="Komisyon Orani (%)"
              placeholder="%"
              value={inputs.commissionRate}
              onChangeText={v => setField('commissionRate', v)}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
            <GlassInput
              label="Kar Marji (%)"
              placeholder="%"
              value={inputs.profitMargin}
              onChangeText={v => setField('profitMargin', v)}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
          </View>

          {isExport ? (
            <GlassInput
              label="Uluslararasi Hizmet Bedeli"
              placeholder="0.00"
              value={inputs.intlFee}
              onChangeText={v => setField('intlFee', v)}
              keyboardType="decimal-pad"
              containerStyle={{ marginTop: SPACING.md }}
            />
          ) : (
            <View style={[styles.row, { marginTop: SPACING.md }]}>
              <GlassInput
                label="Hizmet Bedeli"
                placeholder="13.90"
                value={inputs.serviceFee}
                onChangeText={v => setField('serviceFee', v)}
                keyboardType="decimal-pad"
                containerStyle={{ flex: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.vatLabel, { color: colors.textSecondary }]}>KDV Orani</Text>
                <View style={[styles.vatRow, { borderColor: colors.inputBorder }]}>
                  {VAT_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.vatOption,
                        inputs.vatRate === opt.value && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => setField('vatRate', opt.value)}
                    >
                      <Text
                        style={[
                          styles.vatOptionText,
                          {
                            color:
                              inputs.vatRate === opt.value ? '#fff' : colors.textSecondary,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Breakdown */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Kesinti Detaylari</Text>
          <BreakdownRow label="Komisyon Tutari" value={fmt(results.commAmt)} colors={colors} />
          <BreakdownRow
            label={isExport ? 'Uluslararasi Hizmet' : 'Hizmet Bedeli'}
            value={fmt(results.service)}
            colors={colors}
          />
          <BreakdownRow label="Stopaj Kesintisi" value={fmt(results.stopajAmt)} colors={colors} />
          <BreakdownRow label="Kargo Maliyeti" value={fmt(results.shipping)} colors={colors} />
          <View style={[styles.breakdownRow, { borderBottomWidth: 0, paddingTop: SPACING.sm }]}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>
              {isExport ? 'KDV (Muaf)' : 'Net Odenecek KDV'}
            </Text>
            <Text
              style={[
                TYPOGRAPHY.bodyBold,
                { color: results.netVat < 0 ? '#22c55e' : colors.text },
              ]}
            >
              {fmt(results.netVat)}
            </Text>
          </View>

          {isExport && results.vatRefund > 0 && (
            <View style={[styles.refundBox, { backgroundColor: '#22c55e15', borderColor: '#22c55e40' }]}>
              <Text style={[TYPOGRAPHY.body, { color: '#22c55e' }]}>KDV Iadesi (Tahmini)</Text>
              <Text style={[TYPOGRAPHY.h3, { color: '#22c55e' }]}>{fmt(results.vatRefund)}</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

function BreakdownRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={[styles.breakdownRow, { borderBottomColor: colors.inputBorder }]}>
      <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    height: 44,
    position: 'relative',
    overflow: 'hidden',
  },
  toggleSlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultCard: {
    padding: SPACING.xl,
    borderRadius: 16,
  },
  resultLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultPrice: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: SPACING.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultSubLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  resultSubValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  vatLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  vatRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  vatOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vatOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  refundBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
});
