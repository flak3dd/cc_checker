import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Button, Divider, Searchbar } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useResultsQuery } from '@/hooks/useQueries';
import { colors, spacing, radii } from '@/constants/theme';

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
    () => resultsData?.runs.flat().filter((r) => r.status === 'SUCCESS' || r.status === 'PASS') || [],
    [resultsData],
  );

  const filteredCards = useMemo(
    () => ppsrCards.filter((c) => c.card_number.includes(search)),
    [ppsrCards, search],
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Card</Text>
          <Text style={styles.subtitle}>
            Payment for plate: <Text style={styles.plateText}>{plate}</Text>
          </Text>
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
                <MaterialIcons
                  name="credit-card"
                  size={18}
                  color={card.status === 'PASS' ? colors.primary : colors.success}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>•••• {card.card_number.slice(-4)}</Text>
                  <Text style={styles.cardMeta}>
                    {card.mm}/{card.yy} · {card.status === 'PASS' ? 'PASS' : 'PPSR ✓'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <MaterialIcons name="credit-card-off" size={28} color={colors.textMuted} />
              <Text style={styles.emptyText}>No validated cards</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button onPress={onDismiss} mode="text" textColor={colors.danger} labelStyle={{ fontSize: 13 }}>
            Cancel
          </Button>
        </View>
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
  },
  header: { marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, fontSize: 13 },
  plateText: { fontWeight: '800', color: colors.accent, fontFamily: 'monospace' },
  search: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    elevation: 0,
    borderRadius: radii.md,
  },
  searchInput: { color: colors.textPrimary, fontSize: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badgeText: { color: colors.success, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
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
  cardInfo: { flex: 1 },
  cardNumber: { color: colors.textPrimary, fontFamily: 'monospace', fontSize: 14, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  empty: { padding: 32, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
});
