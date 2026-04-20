import React from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStatusQuery, useWaCheckoutStatusQuery, usePlateCheckStatusQuery } from '@/hooks/useQueries';
import { Text, Snackbar } from 'react-native-paper';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, pageMargins } from '@/constants/theme';

export default function LogsScreen() {
  const { isLoading: statusLoading, refetch: refetchStatus } = useStatusQuery();
  const { isLoading: checkoutLoading, refetch: refetchCheckout } = useWaCheckoutStatusQuery();
  const { isLoading: plateLoading, refetch: refetchPlate } = usePlateCheckStatusQuery();
  const { snackMessage, showSnack, dismissSnack } = useActionHandler();

  const isLoading = statusLoading || checkoutLoading || plateLoading;

  const handleRefresh = () => {
    refetchStatus();
    refetchCheckout();
    refetchPlate();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageMargins.horizontal }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh}
            tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.mainColumn}>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>SYSTEM LOGS HISTORY</Text>
            
            <CollapsibleSection title="CC / PPSR Checker" icon="credit-card" accentColor={colors.info} defaultOpen>
              <LiveLogPanel file="cc" title="CC CHECKER LOG" height={400} />
            </CollapsibleSection>

            <CollapsibleSection title="WA Checkout" icon="shopping-cart-checkout" accentColor={colors.accent}>
              <LiveLogPanel file="wa-checkout" title="WA CHECKOUT LOG" height={400} />
            </CollapsibleSection>

            <CollapsibleSection title="System Results" icon="analytics" accentColor={colors.primary}>
              <LiveLogPanel file="results" title="SYSTEM RESULTS LOG" height={400} />
            </CollapsibleSection>
          </View>
        </View>
      </ScrollView>

      <Snackbar visible={showSnack} onDismiss={dismissSnack} duration={3000} style={styles.snackbar}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: spacing['5xl'] },
  mainColumn: {
    flex: 1,
    gap: spacing.md,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  blockTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
});
