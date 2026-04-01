import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScreenshotViewerProps {
  visible: boolean;
  imageUrl: string;
  title?: string;
  onDismiss: () => void;
}

export const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({
  visible,
  imageUrl,
  title,
  onDismiss,
}) => {
  const [hasError, setHasError] = useState(false);
  const imageWidth = SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{title || 'Screenshot'}</Text>
          <Pressable onPress={onDismiss} style={styles.closeBtn}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.imageContainer}>
          {hasError ? (
            <View style={[styles.image, styles.errorContainer]}>
              <MaterialIcons name="broken-image" size={40} color={colors.textMuted} />
              <Text style={styles.errorText}>Failed to load image</Text>
              <Text style={styles.errorHint}>Backend may be unreachable</Text>
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.image, { width: imageWidth }]}
              contentFit="contain"
              transition={200}
              onError={() => setHasError(true)}
            />
          )}
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  imageContainer: {
    padding: spacing.sm,
  },
  image: {
    height: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2) * 0.75,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  errorHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
  },
});
