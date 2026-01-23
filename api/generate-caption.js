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
    const { imageUrl, serviceType } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL required' });
    }

    // Use Together AI free tier (no auth required, generous free limits)
    const prompt = `You are a luxury salon social media expert creating Instagram captions.
For a ${serviceType} salon service image, write a SHORT caption (1-2 sentences) that:
- Describes the specific service/style
- Includes 2-3 salon emojis
- Sounds trendy and luxurious
- NO hashtags, NO calls to action

Examples:
Hair: "Dimensional blonde balayage with soft waves ✨💛 Total transformation"
Nails: "Matte black with rose gold accents 💅✨ Custom luxury"
Tattoo: "Geometric linework design 🖤 Artwork at its finest"

Generate ONE caption text ONLY:`;

    // Use free inference model via Together API (no key needed for basic use)
    const caption = await generateCaptionWithAI(prompt, serviceType);

    return res.status(200).json({ caption: caption || `Beautiful ${serviceType} service at Zavira Salon ✨` });

  } catch (error) {
    console.error('Caption generation error:', error);
    return res.status(500).json({
      error: error.message,
      caption: 'Beautiful salon service ✨'
    });
  }
}

async function generateCaptionWithAI(prompt, serviceType) {
  // Try different free API endpoints

  // Option 1: Hugging Face inference (if available)
  try {
    const response = await fetch('https://router.huggingface.co/models/NousResearch/Nous-Hermes-2-Mistral-7B-DPO', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7
        }
      }),
      timeout: 15000
    });

    if (response.ok) {
      const data = await response.json();
      const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
      if (text) {
        return text.replace(prompt, '').trim().substring(0, 200);
      }
    }
  } catch (err) {
    console.warn('HF API failed, trying fallback');
  }

  // Fallback: Generate quality default captions based on service
  const captions = {
    hair: 'Stunning new look ✨ Your hair deserves this glow',
    nail: 'Nail artistry at its finest 💅✨ Custom luxury vibes',
    tattoo: 'Timeless ink design 🖤 Art that tells your story',
    massage: 'Pure relaxation mode activated 🧘✨ Wellness goals',
    facial: 'Glowing from within ✨ Your skin deserves this treat',
    glow: 'That salon glow ✨ Radiating confidence'
  };

  return captions[serviceType] || captions.glow;
}
