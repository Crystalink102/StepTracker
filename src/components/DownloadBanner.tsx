import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const DISMISSED_KEY = 'download_banner_dismissed';
// Update this URL after each EAS build
const DOWNLOAD_URL = 'https://expo.dev/artifacts/eas/hXoHuodYHmCGRBEzQthy6N.apk';

export default function DownloadBanner() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((val) => {
        if (!val) setVisible(true);
      })
      .catch(() => setVisible(true));
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(DISMISSED_KEY, Date.now().toString()).catch(() => {});
  };

  const handleDownload = () => {
    Linking.openURL(DOWNLOAD_URL);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={styles.content}>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Get the App</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Download 5tepTracker on Android for step tracking, GPS runs, and more.</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleDownload}>
          <Text style={[styles.buttonText, { color: colors.white }]}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.close} onPress={dismiss}>
          <Text style={[styles.closeText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  close: {
    padding: Spacing.xs,
  },
  closeText: {
    fontSize: FontSize.lg,
  },
});
