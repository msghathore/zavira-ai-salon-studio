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

    const apiKey = process.env.VITE_LAOZHANG_API_KEY;

    if (!apiKey) {
      console.warn('LAOZHANG_API_KEY not configured, using fallback captions');
      return res.status(200).json({
        caption: 'Beautiful salon service ✨',
        hashtags: '#ZaviraSalon #SalonGlow'
      });
    }

    // Fetch image and convert to base64
    let imageBase64 = '';
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageBase64 = match[2];
      }
    } else {
      try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error('Failed to fetch image');
        const blob = await imgRes.blob();
        mimeType = blob.type || 'image/jpeg';
        const arrayBuffer = await blob.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      } catch (e) {
        console.warn('Image fetch failed, using fallback');
        return res.status(200).json({
          caption: 'Beautiful salon service ✨',
          hashtags: '#ZaviraSalon #SalonGlow'
        });
      }
    }

    // Call Gemini 1.5 Flash via Lao Zhang API
    const prompt = `You are a luxury salon social media expert.
Analyze this ${serviceType} service image and create:
1. A SHORT, captivating Instagram caption (1-2 sentences).
2. A list of 5-8 trending salon hashtags.

Style: High-end, trendy, professional.
Focus on the technique, colors, finishes, and the transformation/glow effect.

Return ONLY a JSON object with exactly these fields:
{
  "caption": "Your caption here (1-2 sentences max)",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5"
}`;

    const response = await fetch('https://api.laozhang.ai/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.7,
          max_output_tokens: 200,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', response.status, errText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.warn('Empty response from AI, using fallback');
      return res.status(200).json({
        caption: 'Beautiful salon service ✨',
        hashtags: '#ZaviraSalon #SalonLife'
      });
    }

    try {
      const parsed = JSON.parse(content);
      console.log('Successfully generated caption:', parsed);
      return res.status(200).json({
        caption: parsed.caption || 'Beautiful salon service ✨',
        hashtags: parsed.hashtags || '#ZaviraSalon #SalonGlow'
      });
    } catch (e) {
      console.warn('JSON parse failed, using content as fallback');
      return res.status(200).json({
        caption: content.substring(0, 200),
        hashtags: '#ZaviraSalon #SalonLife'
      });
    }

  } catch (error) {
    console.error('Caption generation error:', error.message);
    return res.status(500).json({
      error: error.message,
      caption: 'Beautiful salon service ✨',
      hashtags: '#ZaviraSalon #SalonLife'
    });
  }
}
