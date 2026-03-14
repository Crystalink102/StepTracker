import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import * as HealthService from '@/src/services/health.service';

const COLOR_SUCCESS = '#22C55E';
const COLOR_INFO = '#3B82F6';

type SetupStep = { icon: string; text: string };

const SAMSUNG_STEPS: SetupStep[] = [
  { icon: 'watch-outline', text: 'Make sure your Samsung Galaxy Watch is paired with your phone via the Galaxy Wearable app' },
  { icon: 'fitness-outline', text: 'Open Samsung Health on your phone and sign in' },
  { icon: 'sync-outline', text: 'In Samsung Health, go to Settings > Data permissions > Health Connect' },
  { icon: 'checkmark-circle-outline', text: 'Enable "Steps" and "Distance" sharing with Health Connect' },
  { icon: 'refresh-outline', text: 'Wait a few minutes for data to sync, then open 5tepTracker' },
];

const PIXEL_WATCH_STEPS: SetupStep[] = [
  { icon: 'watch-outline', text: 'Ensure your Pixel Watch is connected via the Google Pixel Watch app' },
  { icon: 'fitness-outline', text: 'Steps sync automatically to Health Connect via Google Health Services' },
  { icon: 'checkmark-circle-outline', text: 'Open 5tepTracker — your watch steps should appear automatically' },
];

const FITBIT_STEPS: SetupStep[] = [
  { icon: 'watch-outline', text: 'Ensure your Fitbit is paired via the Fitbit app' },
  { icon: 'fitness-outline', text: 'Open the Fitbit app and go to Account > App settings > Health Connect' },
  { icon: 'sync-outline', text: 'Enable syncing Steps and Distance to Health Connect' },
  { icon: 'checkmark-circle-outline', text: 'Open 5tepTracker — your Fitbit steps should appear' },
];

const GARMIN_STEPS: SetupStep[] = [
  { icon: 'watch-outline', text: 'Ensure your Garmin watch is paired via Garmin Connect' },
  { icon: 'fitness-outline', text: 'In Garmin Connect, go to Settings > Health Connect' },
  { icon: 'sync-outline', text: 'Enable sharing Steps and Distance with Health Connect' },
  { icon: 'checkmark-circle-outline', text: 'Open 5tepTracker — your Garmin steps should appear' },
];

type WatchBrand = {
  id: string;
  name: string;
  icon: string;
  steps: SetupStep[];
};

const WATCH_BRANDS: WatchBrand[] = [
  { id: 'samsung', name: 'Samsung Galaxy Watch', icon: 'watch-outline', steps: SAMSUNG_STEPS },
  { id: 'pixel', name: 'Google Pixel Watch', icon: 'watch-outline', steps: PIXEL_WATCH_STEPS },
  { id: 'fitbit', name: 'Fitbit', icon: 'watch-outline', steps: FITBIT_STEPS },
  { id: 'garmin', name: 'Garmin', icon: 'watch-outline', steps: GARMIN_STEPS },
];

export default function WearablesScreen() {
  const { colors } = useTheme();
  const [sources, setSources] = useState<HealthService.HealthDataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const s = await HealthService.getStepDataSources();
      setSources(s);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await loadSources();
  }, [loadSources]);

  const openHealthConnect = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const HC = await import('react-native-health-connect');
        HC.openHealthConnectSettings();
      } catch {
        Linking.openURL('market://details?id=com.google.android.apps.healthdata');
      }
    }
  }, []);

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="watch-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.unsupportedTitle, { color: colors.textPrimary }]}>
          Smartwatch Support
        </Text>
        <Text style={[styles.unsupportedText, { color: colors.textSecondary }]}>
          On iOS, smartwatch data syncs automatically through Apple Health / HealthKit. Just make sure your watch's health app is enabled in the Health app.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Connected Sources */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONNECTED SOURCES</Text>
      {sources.length > 0 ? (
        <View style={styles.sourceList}>
          {sources.map((s) => (
            <View key={s.packageName} style={[styles.sourceItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.sourceIcon, { backgroundColor: s.isWatch ? Colors.primary + '20' : colors.border + '40' }]}>
                <Ionicons
                  name={s.isWatch ? 'watch' : 'phone-portrait'}
                  size={20}
                  color={s.isWatch ? Colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={[styles.sourceName, { color: colors.textPrimary }]}>{s.appName}</Text>
                {s.deviceModel && (
                  <Text style={[styles.sourceDevice, { color: colors.textMuted }]}>
                    {s.deviceManufacturer ? `${s.deviceManufacturer} ${s.deviceModel}` : s.deviceModel}
                  </Text>
                )}
              </View>
              <Ionicons name="checkmark-circle" size={20} color={COLOR_SUCCESS} />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="fitness-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No external sources detected today. Steps are being tracked by your phone. Connect a smartwatch below for wearable tracking.
          </Text>
        </View>
      )}

      {/* Health Connect Settings */}
      <TouchableOpacity
        style={[styles.hcButton, { backgroundColor: colors.surface }]}
        onPress={openHealthConnect}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={20} color={Colors.primary} />
        <Text style={[styles.hcButtonText, { color: Colors.primary }]}>Open Health Connect Settings</Text>
        <Ionicons name="open-outline" size={16} color={Colors.primary} />
      </TouchableOpacity>

      {/* How It Works */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: Spacing.xxl }]}>HOW IT WORKS</Text>
      <View style={[styles.howItWorks, { backgroundColor: colors.surface }]}>
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="watch" size={18} color={Colors.primary} />
          </View>
          <Text style={[styles.flowText, { color: colors.textPrimary }]}>Your smartwatch tracks steps</Text>
        </View>
        <Ionicons name="arrow-down" size={16} color={colors.textMuted} style={styles.flowArrow} />
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: COLOR_INFO + '20' }]}>
            <Ionicons name="sync" size={18} color={COLOR_INFO} />
          </View>
          <Text style={[styles.flowText, { color: colors.textPrimary }]}>Syncs to Health Connect via manufacturer app</Text>
        </View>
        <Ionicons name="arrow-down" size={16} color={colors.textMuted} style={styles.flowArrow} />
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: COLOR_SUCCESS + '20' }]}>
            <Ionicons name="fitness" size={18} color={COLOR_SUCCESS} />
          </View>
          <Text style={[styles.flowText, { color: colors.textPrimary }]}>5tepTracker reads from Health Connect</Text>
        </View>
      </View>

      {/* Setup Guides */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: Spacing.xxl }]}>SETUP GUIDE</Text>
      {WATCH_BRANDS.map((brand) => {
        const isExpanded = expandedBrand === brand.id;
        return (
          <View key={brand.id}>
            <TouchableOpacity
              style={[styles.brandHeader, { backgroundColor: colors.surface }]}
              onPress={() => setExpandedBrand(isExpanded ? null : brand.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={brand.icon as any} size={22} color={colors.textPrimary} />
              <Text style={[styles.brandName, { color: colors.textPrimary }]}>{brand.name}</Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {isExpanded && (
              <View style={[styles.stepsContainer, { backgroundColor: colors.surface }]}>
                {brand.steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { backgroundColor: Colors.primary + '20' }]}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Troubleshooting */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: Spacing.xxl }]}>TROUBLESHOOTING</Text>
      <View style={[styles.troubleCard, { backgroundColor: colors.surface }]}>
        {[
          { q: 'Steps not showing from watch?', a: 'Open your watch\'s companion app (Samsung Health, Fitbit, etc.) and make sure it\'s synced. Then check Health Connect permissions.' },
          { q: 'Duplicate steps?', a: 'Health Connect automatically de-duplicates steps from multiple sources. If you see too many, check that only one app is writing step data.' },
          { q: 'Health Connect not installed?', a: 'Health Connect comes pre-installed on Android 14+. For older versions, install it from the Play Store.' },
        ].map((item, i) => (
          <View key={i} style={[styles.troubleItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text style={[styles.troubleQ, { color: colors.textPrimary }]}>{item.q}</Text>
            <Text style={[styles.troubleA, { color: colors.textSecondary }]}>{item.a}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sourceList: {
    gap: Spacing.sm,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  sourceDevice: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  hcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  hcButtonText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  howItWorks: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowText: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  flowArrow: {
    alignSelf: 'center',
    marginVertical: Spacing.xs,
    marginLeft: 10,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: 2,
  },
  brandName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  stepsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  stepText: {
    fontSize: FontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  troubleCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  troubleItem: {
    padding: Spacing.lg,
  },
  troubleQ: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  troubleA: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  unsupportedTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  unsupportedText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
