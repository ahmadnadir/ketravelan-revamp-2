import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify the request is from Vercel (optional but recommended)
  if (req.query.token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      'https://sspvqhleqlycsiniywkg.functions.supabase.co/functions/v1/send-scheduled-reminders',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    return res.status(500).json({ error: 'Failed to trigger reminders' });
  }
}

// Add to vercel.json:
// "crons": [
//   {
//     "path": "/api/cron/send-reminders",
//     "schedule": "0 9 * * *"
//   }
// ]
