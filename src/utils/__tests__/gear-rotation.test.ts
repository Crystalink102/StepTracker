import { recommendShoe } from '../gear-rotation';

function makeShoe(overrides: Partial<any> = {}): any {
  return {
    id: 'shoe-1',
    user_id: 'user-1',
    name: 'Test Shoe',
    brand: null,
    type: 'shoes',
    distance_meters: 100000, // 100km
    max_distance_meters: 800000, // 800km
    is_retired: false,
    is_default: false,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('recommendShoe', () => {
  it('returns null for empty array', () => {
    expect(recommendShoe([])).toBeNull();
  });

  it('returns null for single active shoe', () => {
    const shoes = [makeShoe({ id: 'a' })];
    expect(recommendShoe(shoes)).toBeNull();
  });

  it('returns null when all shoes are retired', () => {
    const shoes = [
      makeShoe({ id: 'a', is_retired: true }),
      makeShoe({ id: 'b', is_retired: true }),
    ];
    expect(recommendShoe(shoes)).toBeNull();
  });

  it('recommends the least-used shoe', () => {
    const shoes = [
      makeShoe({ id: 'a', name: 'High Miles', distance_meters: 500000 }),
      makeShoe({ id: 'b', name: 'Low Miles', distance_meters: 50000 }),
    ];
    const result = recommendShoe(shoes);
    expect(result).not.toBeNull();
    expect(result!.recommended.name).toBe('Low Miles');
  });

  it('avoids shoes near max distance (>= 90%)', () => {
    const shoes = [
      makeShoe({ id: 'a', name: 'Nearly Done', distance_meters: 750000, max_distance_meters: 800000 }), // 93.75%
      makeShoe({ id: 'b', name: 'Fresh', distance_meters: 200000, max_distance_meters: 800000 }),
    ];
    const result = recommendShoe(shoes);
    expect(result).not.toBeNull();
    expect(result!.recommended.name).toBe('Fresh');
  });

  it('falls back to least-used when all shoes are near retirement', () => {
    const shoes = [
      makeShoe({ id: 'a', name: 'Old A', distance_meters: 750000, max_distance_meters: 800000 }),
      makeShoe({ id: 'b', name: 'Old B', distance_meters: 730000, max_distance_meters: 800000 }),
    ];
    const result = recommendShoe(shoes);
    expect(result).not.toBeNull();
    expect(result!.recommended.name).toBe('Old B'); // least distance
  });

  it('handles null max_distance_meters (not near retirement)', () => {
    const shoes = [
      makeShoe({ id: 'a', name: 'No Max', distance_meters: 500000, max_distance_meters: null }),
      makeShoe({ id: 'b', name: 'Has Max', distance_meters: 100000, max_distance_meters: 800000 }),
    ];
    const result = recommendShoe(shoes);
    expect(result).not.toBeNull();
    expect(result!.recommended.name).toBe('Has Max'); // least distance
  });

  it('filters out non-shoe gear', () => {
    const shoes = [
      makeShoe({ id: 'a', type: 'watch', distance_meters: 0 }),
      makeShoe({ id: 'b', type: 'shoes', distance_meters: 100000 }),
      makeShoe({ id: 'c', type: 'shoes', distance_meters: 50000 }),
    ];
    const result = recommendShoe(shoes);
    expect(result).not.toBeNull();
    expect(result!.recommended.id).toBe('c');
  });

  it('includes a reason string', () => {
    const shoes = [
      makeShoe({ id: 'a', distance_meters: 300000 }),
      makeShoe({ id: 'b', distance_meters: 100000 }),
    ];
    const result = recommendShoe(shoes);
    expect(result!.reason.length).toBeGreaterThan(0);
  });
});
