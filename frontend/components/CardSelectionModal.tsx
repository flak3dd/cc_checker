import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Button, Divider, Searchbar } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useResultsQuery } from '@/hooks/useQueries';
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

interface CardSelectionModalProps {
  visible: boolean;
  plate: string;
  onSelect: (card: any) => void;
  onDismiss: () => void;
}

export const CardSelectionModal: React.FC<CardSelectionModalProps> = ({
  visible, plate, onSelect, onDismiss,
}) => {
  const { data: resultsData } = useResultsQuery();
  const [search, setSearch] = useState('');

  const ppsrCards = useMemo(
    () => resultsData?.runs.flat().filter((r) => r.status === 'SUCCESS' || r.status === 'PASS' || r.status === 'UNKNOWN') || [],
    [resultsData],
  );

  const filteredCards = useMemo(
    () => ppsrCards.filter((c) => c.card_number.includes(search)),
    [ppsrCards, search],
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Select Card</Text>
            <Pressable onPress={onDismiss} style={styles.closeBtn}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.plateRow}>
            <MaterialIcons name="directions-car" size={14} color={colors.accent} />
            <Text style={styles.plateText}>{plate}</Text>
          </View>
        </View>

        <Searchbar
          placeholder="Search card number..."
          onChangeText={setSearch}
          value={search}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={colors.textMuted}
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.badge}>
          <MaterialIcons name="verified" size={12} color={colors.success} />
          <Text style={styles.badgeText}>Validated Cards ({ppsrCards.length})</Text>
        </View>

        <Divider style={styles.divider} />

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredCards.length > 0 ? (
            filteredCards.map((card, idx) => (
              <Pressable
                key={`${card.card_number}-${idx}`}
                onPress={() => onSelect(card)}
                style={({ pressed }) => [styles.cardItem, pressed && styles.cardItemPressed]}
              >
                <View style={[styles.cardIcon, {
                  backgroundColor: card.status === 'PASS' ? colors.primaryMuted : colors.successMuted,
                }]}>
                  <MaterialIcons
                    name="credit-card"
                    size={16}
                    color={card.status === 'PASS' ? colors.primary : colors.success}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>{card.card_number}</Text>
                  <Text style={styles.cardMeta}>
                    {card.mm}/{card.yy} · CVV {card.cvv} · {card.status}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <MaterialIcons name="credit-card-off" size={28} color={colors.textMuted} />
              <Text style={styles.emptyText}>No validated cards</Text>
              <Text style={styles.emptyHint}>Run CC Checker first</Text>
            </View>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    margin: spacing.xl,
    borderRadius: radii.lg,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  header: { marginBottom: spacing.lg },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.textPrimary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.accentMuted,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  plateText: { fontWeight: '800', color: colors.accent, fontFamily: 'monospace', fontSize: fontSize.lg },
  search: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    elevation: 0,
    borderRadius: radii.md,
  },
  searchInput: { color: colors.textPrimary, fontSize: fontSize.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badgeText: { color: colors.success, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1 },
  divider: { backgroundColor: colors.border },
  list: { marginTop: spacing.md },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  cardItemPressed: { backgroundColor: colors.surfaceHighlight },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardNumber: { color: colors.textPrimary, fontFamily: 'monospace', fontSize: fontSize.lg, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: fontSize.base, marginTop: 2 },
  empty: { padding: spacing['3xl'], alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.lg },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.base },
});
