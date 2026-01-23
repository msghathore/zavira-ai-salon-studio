// Quota exhaustion flag - once quota is hit, stop trying to call API
let quotaExhausted = false;
let quotaExhaustedTimestamp = 0;

export function isQuotaExhausted(): boolean {
  // Reset flag after 24 hours (quota resets daily)
  if (quotaExhausted && Date.now() - quotaExhaustedTimestamp > 24 * 60 * 60 * 1000) {
    quotaExhausted = false;
    console.log('Quota exhaustion flag reset');
  }
  return quotaExhausted;
}

export function getQuotaExhaustedMessage(): string {
  return 'Caption generation paused: API quota exceeded. Using default captions.';
}

export async function generateCaption(
  imageUrl: string,
  groqApiKey: string,
  serviceType: 'hair' | 'nail' | 'tattoo' | 'massage' | 'facial' | 'glow'
): Promise<string> {
  // Return fallback immediately if quota exhausted (avoids wasted API calls)
  if (quotaExhausted) {
    const fallbacks: Record<string, string> = {
      hair: 'Stunning new look ✨ Loving this transformation',
      nail: 'Nail goals achieved 💅 Custom luxury',
      tattoo: 'Custom ink 🖤 Artwork at its finest',
      massage: 'Pure relaxation 🧘 Zen mode activated',
      facial: 'Glowing skin ✨ Treatment goals',
      glow: 'That salon glow ✨ Beautiful you'
    };
    return fallbacks[serviceType] || 'Beautiful salon service ✨';
  }

  // Return fallback immediately if no API key (avoids wasting API calls on config errors)
  if (!groqApiKey || groqApiKey.trim() === '') {
    const fallbacks: Record<string, string> = {
      hair: 'Stunning new look ✨ Loving this transformation',
      nail: 'Nail goals achieved 💅 Custom luxury',
      tattoo: 'Custom ink 🖤 Artwork at its finest',
      massage: 'Pure relaxation 🧘 Zen mode activated',
      facial: 'Glowing skin ✨ Treatment goals',
      glow: 'That salon glow ✨ Beautiful you'
    };
    return fallbacks[serviceType] || 'Beautiful salon service ✨';
  }

  try {
    // Service type descriptions for better captions
    const serviceDescriptions: Record<string, string> = {
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

    // Validate API key format
    const cleanApiKey = groqApiKey.trim();
    if (cleanApiKey.length < 10) {
      throw new Error('Invalid API key format');
    }

    // Use direct fetch to Groq API to avoid SDK issues in browser
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const requestBody = {
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError) {
      console.error('Fetch failed:', fetchError);
      throw new Error(`Network request failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const caption = (data.choices?.[0]?.message?.content || '').trim();
    return caption || `Beautiful ${serviceType} service at Zavira Salon ✨`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Detect quota exhaustion and set flag to prevent further API calls
    if (
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('Quota exceeded') ||
      errorMessage.includes('rate_limit') ||
      errorMessage.includes('overloaded')
    ) {
      quotaExhausted = true;
      quotaExhaustedTimestamp = Date.now();
      console.warn('⚠️ Groq API quota exhausted. Switching to fallback captions for next 24 hours.');
    } else {
      console.error('Error generating caption:', errorMessage);
    }

    // Return generic fallback if generation fails
    const fallbacks: Record<string, string> = {
      hair: 'Stunning new look ✨ Loving this transformation',
      nail: 'Nail goals achieved 💅 Custom luxury',
      tattoo: 'Custom ink 🖤 Artwork at its finest',
      massage: 'Pure relaxation 🧘 Zen mode activated',
      facial: 'Glowing skin ✨ Treatment goals',
      glow: 'That salon glow ✨ Beautiful you'
    };
    return fallbacks[serviceType] || 'Beautiful salon service ✨';
  }
}
