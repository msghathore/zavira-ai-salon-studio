export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serviceType } = req.body;

    const serviceDescriptions = {
      hair: 'hair styling, haircut, color, highlights, or treatment',
      nail: 'nail art, manicure, pedicure, or nail design',
      tattoo: 'tattoo design or custom artwork',
      massage: 'massage therapy or spa treatment',
      facial: 'facial treatment or skincare service',
      glow: 'beauty glow or cosmetic service'
    };

    const prompt = `You are a luxury salon social media expert. Generate a SHORT, CREATIVE caption (1-2 sentences max) for Instagram/TikTok for a ${serviceDescriptions[serviceType] || 'salon service'} that:
1. Describes the specific service (be specific about colors, techniques, styles)
2. Includes 2-3 relevant salon emojis
3. Sounds trendy and luxurious (like Vogue or Harper's Bazaar)
4. Does NOT include hashtags
5. Does NOT include calls to action

Examples for hair:
- "Dimensional blonde balayage with soft waves ✨💛 Total transformation"
- "Gorgeous bronde with textured layers 🔥 That salon glow"

Examples for nails:
- "Matte black with rose gold accents 💅✨ Custom luxury"
- "Chrome gradient nails 🌟 Elegance redefined"

Examples for tattoo:
- "Geometric linework design 🖤 Custom artwork at its finest"

Generate ONE unique caption text ONLY, nothing else.`;

    const groqApiKey = process.env.VITE_GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        fallback: true
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return res.status(response.status).json({
        error: `Groq API error: ${response.status}`,
        fallback: true
      });
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ caption: caption.trim() });

  } catch (error) {
    console.error('Caption generation error:', error);
    return res.status(500).json({
      error: error.message,
      fallback: true
    });
  }
}
