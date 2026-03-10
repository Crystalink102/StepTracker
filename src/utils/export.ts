import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Activity, ActivityWaypoint } from '@/src/types/database';

/**
 * Generate GPX 1.1 XML string from an activity and its waypoints.
 */
export function generateGPX(
  activity: Activity,
  waypoints: ActivityWaypoint[]
): string {
  const startDate = new Date(activity.started_at);
  const typeLabel = activity.type === 'run' ? 'Run' : 'Walk';
  const name = `${typeLabel} — ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const trackpoints = waypoints
    .map((wp) => {
      const ele = wp.altitude != null ? `\n        <ele>${wp.altitude.toFixed(1)}</ele>` : '';
      const time = `\n        <time>${new Date(wp.timestamp).toISOString()}</time>`;

      let extensions = '';
      if (wp.speed != null) {
        extensions = `\n        <extensions>\n          <speed>${wp.speed.toFixed(2)}</speed>\n        </extensions>`;
      }

      return `      <trkpt lat="${wp.latitude.toFixed(7)}" lon="${wp.longitude.toFixed(7)}">${ele}${time}${extensions}\n      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
     creator="5tepTracker"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${startDate.toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <type>${activity.type}</type>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate CSV string from an activity's waypoints.
 */
export function generateCSV(
  _activity: Activity,
  waypoints: ActivityWaypoint[]
): string {
  const headers = 'timestamp,latitude,longitude,altitude,speed,order_index';
  const rows = waypoints.map((wp) => {
    const alt = wp.altitude != null ? wp.altitude.toFixed(1) : '';
    const spd = wp.speed != null ? wp.speed.toFixed(2) : '';
    return `${wp.timestamp},${wp.latitude.toFixed(7)},${wp.longitude.toFixed(7)},${alt},${spd},${wp.order_index}`;
  });

  return [headers, ...rows].join('\n');
}

/**
 * Export an activity as GPX or CSV.
 *
 * Writes a temp file and opens the system share sheet so the user can
 * save / send it however they want.
 */
export async function exportActivity(
  activity: Activity,
  waypoints: ActivityWaypoint[],
  format: 'gpx' | 'csv'
): Promise<void> {
  const content =
    format === 'gpx'
      ? generateGPX(activity, waypoints)
      : generateCSV(activity, waypoints);

  const startDate = new Date(activity.started_at);
  const dateStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const fileName = `${activity.type}_${dateStr}.${format}`;

  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);

  const available = await isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }

  const mimeType = format === 'gpx' ? 'application/gpx+xml' : 'text/csv';
  await shareAsync(file.uri, {
    mimeType,
    dialogTitle: `Export ${activity.type} as ${format.toUpperCase()}`,
    UTI: format === 'gpx' ? 'com.topografix.gpx' : 'public.comma-separated-values-text',
  });
}
