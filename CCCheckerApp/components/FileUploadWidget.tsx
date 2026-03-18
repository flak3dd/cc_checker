import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text, ActivityIndicator, HelperText } from 'react-native-paper';
import { api } from '@/services/api';

interface FileUploadWidgetProps {
  onUploadSuccess?: (count: number) => void;
  onUploadError?: (error: string) => void;
}

export const FileUploadWidget: React.FC<FileUploadWidgetProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');

  const handleFileSelect = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setUploadError('Please upload a .txt or .csv file');
      onUploadError?.('Invalid file type');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadStatus('');

    try {
      const response = await api.uploadFile(file);
      if (response.success) {
        setUploadStatus(`✓ Successfully uploaded ${response.count} cards from ${file.name}`);
        onUploadSuccess?.(response.count);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMsg);
      onUploadError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          📁 Upload Card File
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Upload .txt or .csv with columns: cc, mm, yy, cvv
        </Text>
      </View>

      <View style={styles.uploadArea}>
        <Button
          icon="cloud-upload"
          mode="contained"
          onPress={handleUploadClick}
          disabled={isUploading}
          style={styles.uploadButton}
        >
          {isUploading ? 'Uploading...' : 'Select File to Upload'}
        </Button>

        {isUploading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} size="small" color="#3B82F6" />
            <Text variant="bodySmall" style={styles.loadingText}>
              Processing file...
            </Text>
          </View>
        )}

        {uploadStatus && (
          <Text variant="bodySmall" style={styles.successText}>
            {uploadStatus}
          </Text>
        )}

        {uploadError && (
          <HelperText type="error" visible={!!uploadError}>
            {uploadError}
          </HelperText>
        )}
      </View>

      <View style={styles.instructions}>
        <Text variant="labelSmall" style={styles.instructionLabel}>
          📝 File Format
        </Text>
        <Text variant="bodySmall" style={styles.instructionText}>
          Each line: 4532123456789012|12|25|123
        </Text>
      </View>

      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6B7280',
  },
  uploadArea: {
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
  },
  successText: {
    marginTop: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  instructions: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  instructionLabel: {
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionText: {
    color: '#6B21A8',
    fontFamily: 'monospace',
  },
});
