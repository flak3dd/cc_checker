import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Settings</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text variant="bodyLarge" style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#3B82F6',
  },
});
