import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function OfflineBanner() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.warning }]}>
      <Text style={[styles.text, { color: colors.black }]}>
        You're offline. Changes will sync when you reconnect.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
});
