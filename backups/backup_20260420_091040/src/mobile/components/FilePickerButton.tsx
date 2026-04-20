import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { colors, radii, spacing, fontSize } from '@/constants/theme';

interface FilePickerButtonProps {
  label: string;
  icon?: string;
  disabled?: boolean;
  onFilePicked: (uri: string, name: string, mimeType?: string) => void;
}

export const FilePickerButton: React.FC<FilePickerButtonProps> = ({
  label,
  icon = 'upload-file',
  disabled,
  onFilePicked,
}) => {
  const handlePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onFilePicked(asset.uri, asset.name, asset.mimeType ?? undefined);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file');
    }
  }, [onFilePicked]);

  return (
    <AnimatedPressable
      onPress={handlePick}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled]}
    >
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon as any} size={22} color={disabled ? colors.textMuted : colors.primary} />
      </View>
      <View>
        <Text style={[styles.label, disabled && { color: colors.textMuted }]}>{label}</Text>
        <Text style={styles.hint}>Tap to browse files</Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
});
