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

    // Get API key from environment variable
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[API] No Gemini API key configured');
      throw new Error('Gemini API key not configured in environment variables');
    }

    console.log('[API] Starting caption generation for service:', serviceType);
    console.log('[API] Image URL type:', imageUrl.startsWith('data:') ? 'data-url' : 'http-url');

    // Fetch and convert image to base64 if it's a URL
    let imageBase64 = '';
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:')) {
      // Data URL - extract base64 directly
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageBase64 = match[2];
        console.log('[API] Extracted base64 from data URL, mime type:', mimeType);
      } else {
        throw new Error('Invalid data URL format - could not extract base64');
      }
    } else {
      // HTTP URL - fetch and convert
      try {
        console.log('[API] Fetching image from:', imageUrl);
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error('Failed to fetch image: ' + imgRes.status);
        const blob = await imgRes.blob();
        mimeType = blob.type || 'image/jpeg';
        console.log('[API] Image fetched, mime type:', mimeType);

        const arrayBuffer = await blob.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString('base64');
        console.log('[API] Converted to base64, length:', imageBase64.length);
      } catch (e) {
        console.error('[API] Image fetch failed:', e.message);
        throw new Error('Could not fetch image: ' + e.message);
      }
    }

    // Validate base64 data exists
    if (!imageBase64) {
      throw new Error('Failed to extract image data');
    }

    // Call Google Gemini API with vision capability
    const prompt = `You are a luxury salon social media expert. Analyze this ${serviceType} service image carefully.

Create:
1. A SHORT, captivating Instagram caption (1-2 sentences max) that describes what you see
2. A list of 5-8 trending salon hashtags

Be specific about:
- Colors, techniques, and styles visible in the image
- The transformation and glow effect
- Service quality and luxury feel

Return ONLY a JSON object with exactly this format:
{
  "caption": "Your caption here (1-2 sentences describing the image)",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    console.log('[API] Calling Gemini API...');
    console.log('[API] Gemini URL:', geminiUrl.substring(0, 80) + '...');
    console.log('[API] Image base64 length:', imageBase64.length);
    console.log('[API] Mime type:', mimeType);

    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
            }
          },
          {
            text: prompt
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        max_output_tokens: 256,
      }
    };

    console.log('[API] Request body size:', JSON.stringify(requestBody).length, 'bytes');

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[API] Gemini response status:', response.status);
    console.log('[API] Gemini response headers:', JSON.stringify(Object.fromEntries(response.headers)));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Gemini API error status:', response.status);
      console.error('[API] Gemini API error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[API] Parsed error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('[API] Error text (raw):', errorText);
      }
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[API] Gemini result (full):', JSON.stringify(result, null, 2));
    console.log('[API] Gemini result summary:', JSON.stringify(result).substring(0, 200));

    const candidates = result.candidates;
    console.log('[API] Candidates count:', candidates?.length || 0);
    if (candidates?.length > 0) {
      console.log('[API] First candidate:', JSON.stringify(candidates[0], null, 2));
    }

    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[API] Extracted content:', content?.substring(0, 200));

    if (!content) {
      console.warn('[API] Empty response from Gemini - missing text content');
      console.warn('[API] Full result structure:', JSON.stringify(result, null, 2));
      throw new Error('Empty response from AI');
    }

    // Parse JSON response - handle markdown code blocks
    let jsonContent = content;

    // Try to extract JSON from markdown code blocks (```json ... ```)
    const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      console.log('[API] Extracted JSON from markdown code blocks');
      jsonContent = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(jsonContent);
      console.log('[API] Successfully parsed JSON:', parsed);
      return res.status(200).json({
        caption: parsed.caption?.trim() || 'Beautiful salon service ✨',
        hashtags: parsed.hashtags?.trim() || '#ZaviraSalon #SalonGlow'
      });
    } catch (parseError) {
      console.warn('[API] Failed to parse JSON:', parseError.message);
      console.warn('[API] Attempted to parse:', jsonContent.substring(0, 200));

      // Try to extract caption and hashtags from raw content
      const captionMatch = content.match(/"caption":\s*"([^"]+)"/);
      const hashtagsMatch = content.match(/"hashtags":\s*"([^"]+)"/);

      if (captionMatch && hashtagsMatch) {
        console.log('[API] Extracted caption and hashtags from raw content');
        return res.status(200).json({
          caption: captionMatch[1],
          hashtags: hashtagsMatch[1]
        });
      }

      // Last resort: use content as caption
      console.warn('[API] Could not parse JSON, using content as caption');
      return res.status(200).json({
        caption: content.substring(0, 150),
        hashtags: '#ZaviraSalon #SalonGlow #BeautyGoals'
      });
    }

  } catch (error) {
    console.error('[API] Caption generation error:', error.message);
    console.error('[API] Error type:', error.constructor.name);
    console.error('[API] Full error:', JSON.stringify({
      message: error.message,
      stack: error.stack,
      name: error.name
    }, null, 2));

    // Return fallback captions if API fails
    const fallbacks = {
      hair: {
        caption: 'Stunning transformation ✨ Your new look is gorgeous',
        hashtags: '#HairGoals #SalonTransformation #ZaviraSalon'
      },
      nail: {
        caption: 'Nail perfection 💅✨ Custom artistry at its best',
        hashtags: '#NailArt #NailDesign #ZaviraSalon'
      },
      tattoo: {
        caption: 'Timeless ink design 🖤 Art that speaks volumes',
        hashtags: '#TattooArt #CustomInk #ZaviraSalon'
      },
      massage: {
        caption: 'Pure relaxation 🧘✨ Wellness therapy unlocked',
        hashtags: '#MassageTherapy #Wellness #ZaviraSalon'
      },
      facial: {
        caption: 'Glowing skin ✨ Treatment goals achieved',
        hashtags: '#Skincare #FacialTreatment #ZaviraSalon'
      },
      glow: {
        caption: 'That salon glow ✨ Radiant confidence',
        hashtags: '#SalonGlow #Beauty #ZaviraSalon'
      }
    };

    const fallback = fallbacks[req.body.serviceType] || {
      caption: 'Beautiful salon service ✨',
      hashtags: '#ZaviraSalon #SalonLife'
    };

    return res.status(200).json(fallback);
  }
}
