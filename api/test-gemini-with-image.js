export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const apiKey = (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY).trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 1x1 red pixel
    const sampleImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const prompt = `You are a luxury salon social media expert. Analyze this hair service image carefully.

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

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/png', data: sampleImage } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          max_output_tokens: 256,
        }
      }),
    });

    const result = await response.json();

    if (result.error) {
      return res.status(500).json({
        error: result.error,
        status: response.status
      });
    }

    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      status: response.status,
      rawContent: content,
      contentLength: content?.length,
      hasMarkdown: content?.includes('```'),
      firstChars: content?.substring(0, 100),
      lastChars: content?.substring(content.length - 50)
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
