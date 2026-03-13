import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: 'bug-outline' as const },
  { value: 'account', label: 'Account Issue', icon: 'person-outline' as const },
  { value: 'steps', label: 'Step Tracking', icon: 'footsteps-outline' as const },
  { value: 'gps', label: 'GPS / Activity', icon: 'navigate-outline' as const },
  { value: 'social', label: 'Friends & Social', icon: 'people-outline' as const },
  { value: 'feature', label: 'Feature Request', icon: 'bulb-outline' as const },
  { value: 'privacy', label: 'Privacy & Data', icon: 'shield-outline' as const },
  { value: 'other', label: 'Other', icon: 'chatbubble-outline' as const },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const selectedLabel = CATEGORIES.find((c) => c.value === selected)?.label ?? '';

  async function handleSubmit() {
    if (!selected) {
      Alert.alert('Select a Category', 'Please choose a category for your support request.');
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert('Add More Detail', 'Please describe your issue in at least a few words so we can help.');
      return;
    }

    setSending(true);

    try {
      const email = user?.email ?? 'unknown';
      const username = profile?.username ?? profile?.display_name ?? 'unknown';

      const subject = `[5tepTracker] ${selectedLabel}`;
      const body = [
        `Category: ${selectedLabel}`,
        `User: ${username}`,
        `Email: ${email}`,
        `Platform: ${Platform.OS}`,
        '',
        message.trim(),
      ].join('\n');

      // Try FormSubmit API first (stays in-app)
      const res = await fetch('https://formsubmit.co/ajax/support@5teptracker.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: subject,
          _template: 'table',
          Category: selectedLabel,
          Username: username,
          Email: email,
          Platform: Platform.OS,
          Message: message.trim(),
        }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        // Fallback to mailto
        const mailto = `mailto:support@5teptracker.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(mailto);
        setSent(true);
      }
    } catch {
      // Fallback to mailto on any error
      const subject = `[5tepTracker] ${selectedLabel}`;
      const body = message.trim();
      const mailto = `mailto:support@5teptracker.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(mailto);
        setSent(true);
      } catch {
        Alert.alert('Error', 'Could not send your message. Please email us directly at support@5teptracker.com');
      }
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setSelected(null);
    setMessage('');
    setSent(false);
  }

  if (sent) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Message Sent</Text>
          <Text style={[styles.successSub, { color: colors.textSecondary }]}>
            Thanks for reaching out. We'll get back to you within 24-48 hours.
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Send Another Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Category Selection */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WHAT DO YOU NEED HELP WITH?</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = selected === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryItem,
                { backgroundColor: colors.surface, borderColor: isSelected ? Colors.primary : colors.border },
                isSelected && styles.categorySelected,
              ]}
              onPress={() => setSelected(cat.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.icon}
                size={22}
                color={isSelected ? Colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isSelected ? Colors.primary : colors.textPrimary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Message Input */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DESCRIBE YOUR ISSUE</Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            borderColor: colors.border,
          },
        ]}
        placeholder="Tell us what's going on..."
        placeholderTextColor={colors.textMuted}
        value={message}
        onChangeText={setMessage}
        multiline
        textAlignVertical="top"
        maxLength={2000}
      />
      <Text style={[styles.charCount, { color: colors.textMuted }]}>{message.length}/2000</Text>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, (!selected || message.trim().length < 10 || sending) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={sending}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitText}>Send Message</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.note, { color: colors.textMuted }]}>
        We typically respond within 24-48 hours.
      </Text>

      {/* Direct email fallback */}
      <TouchableOpacity
        style={[styles.emailFallback, { backgroundColor: colors.surface }]}
        onPress={() => Linking.openURL('mailto:support@5teptracker.com')}
      >
        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
        <View style={styles.emailFallbackText}>
          <Text style={[styles.emailLabel, { color: colors.textPrimary }]}>Email us directly</Text>
          <Text style={[styles.emailAddress, { color: colors.textMuted }]}>support@5teptracker.com</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>
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
  },
  content: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl * 2,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  categorySelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  categoryLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xxl,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  note: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  emailFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xxl,
  },
  emailFallbackText: {
    flex: 1,
  },
  emailLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  emailAddress: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  successCard: {
    margin: Spacing.xxl,
    padding: Spacing.xxxl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  successSub: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  resetBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  resetBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
