import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Input } from '@/src/components/ui';
import UserSearchResultComp from '@/src/components/social/UserSearchResult';
import { useFriends } from '@/src/hooks/useFriends';
import { useAuth } from '@/src/context/AuthContext';
import * as SocialService from '@/src/services/social.service';
import { UserSearchResult } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function SearchFriendsScreen() {
  const { user } = useAuth();
  const { sendRequest } = useFriends();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load all users on mount
  useEffect(() => {
    if (!user) return;
    setIsLoadingAll(true);
    SocialService.getAllUsers(user.id)
      .then((data) => {
        setAllUsers(data);
        setResults(data);
      })
      .catch((err) => {
        console.warn('[Search] Failed to load users:', err);
        setSearchError('Failed to load users.');
      })
      .finally(() => setIsLoadingAll(false));
  }, [user]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setSearchError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length === 0) {
      // Show all users when search is cleared
      setResults(allUsers);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await SocialService.searchUsers(text.trim(), user?.id);
        setResults(data);
      } catch (err) {
        console.warn('[Search] Failed:', err);
        // On search failure, filter allUsers locally as last resort
        const lower = text.trim().toLowerCase();
        setResults(
          allUsers.filter(
            (u) =>
              u.username?.toLowerCase().includes(lower) ||
              u.display_name?.toLowerCase().includes(lower)
          )
        );
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [user?.id, allUsers]);

  const handleAdd = useCallback(
    async (targetUserId: string) => {
      if (addingIds.has(targetUserId) || sentIds.has(targetUserId)) return;
      setAddingIds((prev) => new Set(prev).add(targetUserId));
      try {
        await sendRequest(targetUserId);
        setSentIds((prev) => new Set(prev).add(targetUserId));
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('duplicate') || msg.includes('unique')) {
          setSentIds((prev) => new Set(prev).add(targetUserId));
        } else {
          setSearchError('Failed to send request. Please try again.');
        }
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
    },
    [sendRequest, addingIds, sentIds]
  );

  const displayData = results;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Input
          label=""
          value={query}
          onChangeText={handleSearch}
          placeholder="Search by username..."
          autoCapitalize="none"
          autoFocus
        />
      </View>

      {(isSearching || isLoadingAll) && (
        <ActivityIndicator
          size="small"
          color={Colors.primary}
          style={styles.loader}
        />
      )}

      {searchError ? (
        <Text style={styles.errorText}>{searchError}</Text>
      ) : null}

      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserSearchResultComp
            username={item.username}
            displayName={item.display_name}
            avatarUrl={item.avatar_url}
            onAdd={() => handleAdd(item.id)}
            added={sentIds.has(item.id)}
            isAdding={addingIds.has(item.id)}
          />
        )}
        ListEmptyComponent={
          !isLoadingAll && !isSearching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {query.length > 0 ? 'No users found' : 'No other users yet'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBox: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  loader: {
    marginVertical: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
