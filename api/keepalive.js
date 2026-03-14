// Vercel cron job — pings Supabase daily to prevent free-tier pausing.
// Scheduled via vercel.json crons config.
export default async function handler(req, res) {
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL || 'https://lojziqosoydwbxqkfuod.supabase.co'}/rest/v1/profiles?select=id&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
        },
      }
    );
    const status = response.ok ? 'ok' : 'error';
    return res.status(200).json({ status, timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(200).json({ status: 'error', message: err.message });
  }
}
