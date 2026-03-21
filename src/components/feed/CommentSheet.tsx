import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import type { CommentWithAuthor } from '@/src/services/feed.service';

type CommentSheetProps = {
  visible: boolean;
  activityId: string | null;
  onClose: () => void;
  onAddComment: (activityId: string, content: string) => Promise<CommentWithAuthor | null>;
  onDeleteComment: (commentId: string, activityId: string) => Promise<void>;
  getComments: (activityId: string) => Promise<CommentWithAuthor[]>;
};

/**
 * Format a timestamp into a short relative time string.
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function CommentSheet({
  visible,
  activityId,
  onClose,
  onAddComment,
  onDeleteComment,
  getComments,
}: CommentSheetProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Load comments when sheet opens
  useEffect(() => {
    if (visible && activityId) {
      setIsLoading(true);
      getComments(activityId)
        .then(setComments)
        .finally(() => setIsLoading(false));
    } else {
      setComments([]);
      setText('');
    }
  }, [visible, activityId, getComments]);

  const handleSend = useCallback(async () => {
    if (!activityId || !text.trim() || isSending) return;

    setIsSending(true);
    try {
      const newComment = await onAddComment(activityId, text.trim());
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      }
      setText('');
    } catch (err) {
      console.warn('[CommentSheet] Failed to send comment:', err);
    } finally {
      setIsSending(false);
    }
  }, [activityId, text, isSending, onAddComment]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!activityId) return;
      try {
        await onDeleteComment(commentId, activityId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (err) {
        console.warn('[CommentSheet] Failed to delete comment:', err);
      }
    },
    [activityId, onDeleteComment]
  );

  const renderComment = ({ item }: { item: CommentWithAuthor }) => {
    const displayName = item.author?.display_name || item.author?.username || 'User';
    const isOwn = user?.id === item.user_id;

    return (
      <View style={styles.commentRow}>
        <Avatar
          uri={item.author?.avatar_url}
          name={displayName}
          size={32}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentAuthor, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.commentTime, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.content}</Text>
        </View>
        {isOwn && (
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Comments</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Comments list */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No comments yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Be the first to comment!</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || isSending}
            style={[
              styles.sendButton,
              (!text.trim() || isSending) && styles.sendButtonDisabled,
            ]}
          >
            {isSending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.md,
  },
  list: {
    paddingVertical: Spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  commentTime: {
    fontSize: FontSize.xs,
  },
  commentText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginTop: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
