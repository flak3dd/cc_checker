import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Settings</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text variant="bodyLarge" style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  title: { color: colors.textPrimary, fontWeight: '700' },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { color: colors.primary },
});
