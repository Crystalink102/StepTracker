function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  // CORS headers for React Native and web
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category, username, email, platform, message } = req.body || {};

  if (!category || !message) {
    return res.status(400).json({ error: 'Category and message are required' });
  }

  // Limit field lengths to prevent abuse
  const maxLen = (str, n) => (typeof str === 'string' ? str.slice(0, n) : '');
  const safeCategory = esc(maxLen(category, 100));
  const safeUsername = esc(maxLen(username || 'N/A', 100));
  const safeEmail = esc(maxLen(email || 'N/A', 200));
  const safePlatform = esc(maxLen(platform || 'N/A', 50));
  const safeMessage = esc(maxLen(message, 5000));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'support@5teptracker.com',
        to: 'support@5teptracker.com',
        subject: `[5tepTracker] ${maxLen(category, 100)}`,
        html: `
          <table style="border-collapse:collapse;width:100%;max-width:600px">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Category</td><td style="padding:8px;border:1px solid #ddd">${safeCategory}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Username</td><td style="padding:8px;border:1px solid #ddd">${safeUsername}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${safeEmail}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Platform</td><td style="padding:8px;border:1px solid #ddd">${safePlatform}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd;white-space:pre-wrap">${safeMessage}</td></tr>
          </table>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Support email error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
