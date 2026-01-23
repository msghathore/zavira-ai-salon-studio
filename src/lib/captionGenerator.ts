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
    // Call Vercel serverless function instead of direct API call
    // This avoids CORS issues with browser requests
    const response = await fetch('/api/generate-caption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        serviceType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown'}`);
    }

    const data = await response.json();
    const caption = (data.caption || '').trim();
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
