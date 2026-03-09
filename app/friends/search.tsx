import { useState, useCallback, useRef } from 'react';
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setSearchError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await SocialService.searchUsers(text, user?.id);
        setResults(data);
      } catch (err) {
        console.warn('[Search] Failed:', err);
        setResults([]);
        setSearchError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, [user?.id]);

  const handleAdd = useCallback(
    async (targetUserId: string) => {
      try {
        await sendRequest(targetUserId);
        setSentIds((prev) => new Set(prev).add(targetUserId));
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('duplicate') || msg.includes('unique')) {
          // Already sent — mark as sent anyway
          setSentIds((prev) => new Set(prev).add(targetUserId));
        } else {
          setSearchError('Failed to send request. Please try again.');
        }
      }
    },
    [sendRequest]
  );

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

      {isSearching && (
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
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserSearchResultComp
            username={item.username}
            displayName={item.display_name}
            avatarUrl={item.avatar_url}
            onAdd={() => handleAdd(item.id)}
            added={sentIds.has(item.id)}
          />
        )}
        ListEmptyComponent={
          query.length >= 2 && !isSearching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found</Text>
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
