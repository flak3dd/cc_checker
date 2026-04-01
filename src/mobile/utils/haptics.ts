/**
 * Haptic feedback utilities.
 * Maps semantic haptic language to expo-haptics.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Standard taps, toggles */
export const impactLight = () => {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** Confirmations, long-press triggers */
export const impactMedium = () => {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/** Destructive actions, major state changes */
export const impactHeavy = () => {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/** Scrolling through picker-like elements */
export const selectionFeedback = () => {
  if (isNative) Haptics.selectionAsync();
};

/** Success notification */
export const notifySuccess = () => {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/** Warning notification */
export const notifyWarning = () => {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/** Error notification */
export const notifyError = () => {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};
