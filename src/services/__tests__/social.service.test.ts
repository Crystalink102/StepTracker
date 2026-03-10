import { searchUsers, getAllUsers, sendFriendRequest } from '../social.service';

// Mock supabase
const mockNeq = jest.fn();
const mockOr = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const mockUsers = [
  { id: 'user-1', username: 'alice', display_name: 'Alice Smith', avatar_url: null },
  { id: 'user-2', username: 'bob', display_name: 'Bob Jones', avatar_url: null },
  { id: 'user-3', username: 'charlie', display_name: null, avatar_url: null },
];

function setupQueryChain(data: any[] | null, error: any = null) {
  mockLimit.mockResolvedValue({ data, error });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockOr.mockReturnValue({ limit: mockLimit });
  mockNeq.mockReturnValue({ or: mockOr, order: mockOrder });
  mockFrom.mockReturnValue({
    select: () => ({ neq: mockNeq }),
    insert: mockInsert,
  });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ single: mockSingle });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupQueryChain(mockUsers);
});

describe('searchUsers', () => {
  it('queries profiles with ilike filter', async () => {
    const results = await searchUsers('alice', 'current-user');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockOr).toHaveBeenCalled();
    const orArg = mockOr.mock.calls[0][0];
    expect(orArg).toContain('alice');
    // Should filter out users without username or display_name
    expect(results.length).toBeGreaterThan(0);
  });

  it('falls back to getAllUsers for empty query', async () => {
    const results = await searchUsers('', 'current-user');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(results).toBeDefined();
  });

  it('returns empty array on error', async () => {
    setupQueryChain(null, { message: 'test error' });
    const results = await searchUsers('test', 'current-user');
    expect(results).toEqual([]);
  });

  it('sanitizes special characters including underscore', async () => {
    await searchUsers('test_injection.()', 'me');
    expect(mockOr).toHaveBeenCalled();
    const orArg: string = mockOr.mock.calls[0][0];
    // Extract the sanitized query values from the ilike patterns
    const matches = orArg.match(/%([^%]+)%/g) ?? [];
    const sanitizedValues = matches.map((m: string) => m.replace(/%/g, ''));
    // Each extracted value should be the sanitized input without special chars
    for (const val of sanitizedValues) {
      expect(val).toBe('testinjection');
      expect(val).not.toContain('_');
      expect(val).not.toContain('(');
    }
    expect(orArg).toContain('testinjection');
  });

  it('filters out users without username or display_name', async () => {
    setupQueryChain([
      { id: 'u1', username: null, display_name: null, avatar_url: null },
      { id: 'u2', username: 'valid', display_name: null, avatar_url: null },
    ]);
    const results = await searchUsers('v', 'me');
    expect(results.length).toBe(1);
    expect(results[0].username).toBe('valid');
  });
});

describe('getAllUsers', () => {
  it('queries profiles excluding current user', async () => {
    const results = await getAllUsers('current-user');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockNeq).toHaveBeenCalledWith('id', 'current-user');
    // Filters out charlie (no display_name but has username)
    expect(results.length).toBe(3);
  });

  it('returns empty array on error', async () => {
    setupQueryChain(null, { message: 'fail' });
    const results = await getAllUsers('user-1');
    expect(results).toEqual([]);
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
