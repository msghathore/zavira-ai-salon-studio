export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postedId, status } = req.body;

    if (!postedId || !status) {
      return res.status(400).json({ error: 'Missing postedId or status' });
    }

    console.log('[UpdatePostStatus] Updating post:', postedId, 'to status:', status);

    // In a real app, you'd update the database here
    // For now, just log and return success
    // The actual status update is handled by the app's localStorage/Supabase

    return res.status(200).json({
      success: true,
      message: `Post ${postedId} marked as ${status}`,
      postedId,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[UpdatePostStatus] Error:', error.message);
    return res.status(500).json({
      error: 'Failed to update post status',
      message: error.message
    });
  }
}
