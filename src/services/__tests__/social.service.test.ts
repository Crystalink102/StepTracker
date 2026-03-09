import { searchUsers, getAllUsers, sendFriendRequest } from '../social.service';

// Mock supabase
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockNot = jest.fn();
const mockOr = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const mockUsers = [
  { id: 'user-1', username: 'alice', display_name: 'Alice Smith', avatar_url: null },
  { id: 'user-2', username: 'bob', display_name: 'Bob Jones', avatar_url: null },
  { id: 'user-3', username: 'charlie', display_name: null, avatar_url: null },
];

beforeEach(() => {
  jest.clearAllMocks();

  // Default: RPC succeeds
  mockRpc.mockResolvedValue({ data: mockUsers, error: null });

  // Chain for fallback queries
  mockLimit.mockResolvedValue({ data: mockUsers, error: null });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockOr.mockReturnValue({ order: mockOrder });
  mockNot.mockReturnValue({ or: mockOr, order: mockOrder });
  mockFrom.mockReturnValue({
    select: () => ({ not: mockNot }),
    insert: mockInsert,
  });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ single: mockSingle });
});

describe('searchUsers', () => {
  it('calls RPC with search query', async () => {
    const results = await searchUsers('alice');
    expect(mockRpc).toHaveBeenCalledWith('search_users', { search_query: 'alice' });
    expect(results).toEqual(mockUsers);
  });

  it('returns empty array when RPC returns null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const results = await searchUsers('test');
    expect(results).toEqual([]);
  });

  it('falls back to client-side search when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function not found' } });
    const results = await searchUsers('alice', 'current-user-id');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(results).toEqual(mockUsers);
  });

  it('filters out current user in fallback mode', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    mockLimit.mockResolvedValue({ data: mockUsers, error: null });
    const results = await searchUsers('alice', 'user-1');
    expect(results).toEqual(mockUsers.filter(u => u.id !== 'user-1'));
  });

  it('sanitizes special characters in fallback query', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    mockLimit.mockResolvedValue({ data: [], error: null });
    await searchUsers('test,injection.()', 'me');
    // Should have called or() with sanitized query
    expect(mockOr).toHaveBeenCalled();
    const orArg = mockOr.mock.calls[0][0];
    expect(orArg).not.toContain(',injection');
    expect(orArg).toContain('testinjection');
  });
});

describe('getAllUsers', () => {
  it('calls RPC with empty query', async () => {
    const results = await getAllUsers('current-user');
    expect(mockRpc).toHaveBeenCalledWith('search_users', { search_query: '' });
    expect(results).toEqual(mockUsers);
  });

  it('falls back when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    mockLimit.mockResolvedValue({ data: mockUsers, error: null });
    const results = await getAllUsers('user-1');
    expect(results).toEqual(mockUsers.filter(u => u.id !== 'user-1'));
  });
});

describe('sendFriendRequest', () => {
  it('inserts friendship with pending status', async () => {
    const mockFriendship = {
      id: 'friendship-1',
      requester_id: 'user-a',
      addressee_id: 'user-b',
      status: 'pending',
    };
    mockSingle.mockResolvedValue({ data: mockFriendship, error: null });

    const result = await sendFriendRequest('user-a', 'user-b');
    expect(mockInsert).toHaveBeenCalledWith({
      requester_id: 'user-a',
      addressee_id: 'user-b',
      status: 'pending',
    });
    expect(result).toEqual(mockFriendship);
  });

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'duplicate' } });
    await expect(sendFriendRequest('user-a', 'user-b')).rejects.toEqual({ message: 'duplicate' });
  });
});
