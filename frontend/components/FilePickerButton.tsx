import React, { useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radii } from '@/constants/theme';

interface FilePickerButtonProps {
  label: string;
  icon?: string;
  disabled?: boolean;
  onFilePicked: (uri: string, name: string, mimeType?: string) => void;
}

/**
 * Cross-platform file picker button.
 * Uses expo-document-picker on native, falls back to HTML input on web.
 */
export const FilePickerButton: React.FC<FilePickerButtonProps> = ({
  label,
  icon = 'upload',
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
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file');
    }
  }, [onFilePicked]);

  return (
    <Button
      mode="outlined"
      icon={icon}
      compact
      onPress={handlePick}
      disabled={disabled}
      style={styles.btn}
      textColor={colors.textSecondary}
      labelStyle={styles.label}
    >
      {label}
    </Button>
  );
};

const styles = {
  btn: {
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
};
