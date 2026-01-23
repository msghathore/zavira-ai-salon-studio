export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'No API key found',
        envVars: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API'))
      });
    }

    const keyInfo = {
      found: true,
      length: apiKey.length,
      first10: apiKey.substring(0, 10),
      last10: apiKey.substring(apiKey.length - 10),
      hasNewline: apiKey.includes('\n'),
      hasSpaces: apiKey.includes(' '),
      trimmedLength: apiKey.trim().length
    };

    // Test Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say "API works!"'
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          max_output_tokens: 10,
        }
      }),
    });

    const result = await response.json();

    return res.status(200).json({
      keyInfo,
      geminiTest: {
        status: response.status,
        ok: response.ok,
        result: result.error ? { error: result.error } : { success: true, hasContent: !!result.candidates?.[0]?.content }
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
