import type { Gear } from '@/src/types/database';

export function recommendShoe(shoes: Gear[]): { recommended: Gear; reason: string } | null {
  const active = shoes.filter(s => !s.is_retired && s.type === 'shoes');
  if (active.length < 2) return null; // No rotation needed with 0-1 shoes

  // Sort by distance (least used first)
  const sorted = [...active].sort((a, b) => a.distance_meters - b.distance_meters);

  // Check if any shoe is near retirement
  const nearRetirement = sorted.filter(s =>
    s.max_distance_meters && s.distance_meters >= s.max_distance_meters * 0.9
  );

  // Recommend the least-used shoe that isn't near retirement
  const candidates = sorted.filter(s => !nearRetirement.includes(s));
  const pick = candidates[0] ?? sorted[0];

  const leastUsed = sorted[0];
  const mostUsed = sorted[sorted.length - 1];
  const diffKm = Math.round((mostUsed.distance_meters - leastUsed.distance_meters) / 1000);

  let reason = '';
  if (pick === leastUsed && diffKm > 50) {
    reason = `${diffKm}km less wear than your most used pair`;
  } else if (pick === leastUsed) {
    reason = 'Least mileage - balance your rotation';
  } else {
    reason = 'Best choice for today';
  }

  return { recommended: pick, reason };
}
