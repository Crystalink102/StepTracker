import { supabase } from './supabase';

type GeoLocation = {
  ip: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
};

/**
 * Fetch approximate location from IP using free geolocation API.
 * Falls back gracefully if the API is unavailable.
 */
async function getIPLocation(): Promise<GeoLocation | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    return {
      ip: data.ip ?? 'unknown',
      city: data.city ?? 'Unknown',
      region: data.region ?? 'Unknown',
      country: data.country_name ?? data.country ?? 'Unknown',
      lat: data.latitude ?? 0,
      lon: data.longitude ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Record a login location and check if it's from a new/different location.
 * If the location is new, flags it so a database trigger can send an alert email.
 */
export async function trackLoginLocation(userId: string, email: string | null): Promise<void> {
  try {
    const geo = await getIPLocation();
    if (!geo) return; // Can't determine location — skip silently

    // Check previous logins for this user
    const { data: prevLogins } = await supabase
      .from('login_locations')
      .select('city, region, country')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Determine if this is a new location (city + country combo never seen before)
    const isNewLocation = !prevLogins?.some(
      (prev) => prev.city === geo.city && prev.country === geo.country
    );

    // First login ever is not "suspicious" — only flag when there's history
    const hasHistory = (prevLogins?.length ?? 0) > 0;
    const flagAsNew = isNewLocation && hasHistory;

    // Insert the login record
    await supabase.from('login_locations').insert({
      user_id: userId,
      ip_address: geo.ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      latitude: geo.lat,
      longitude: geo.lon,
      is_new_location: flagAsNew,
      email,
    });

    // If flagged, the database trigger handles sending the email alert
  } catch (err) {
    // Login location tracking is best-effort — never block auth flow
    console.warn('[LoginLocation] Failed to track:', err);
  }
}
