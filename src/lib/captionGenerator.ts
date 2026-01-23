// Quota exhaustion flag - once quota is hit, stop trying to call API
let quotaExhausted = false;
let quotaExhaustedTimestamp = 0;

export function isQuotaExhausted(): boolean {
  // Reset flag after 24 hours (quota resets daily)
  if (quotaExhausted && Date.now() - quotaExhaustedTimestamp > 24 * 60 * 60 * 1000) {
    quotaExhausted = false;
    console.log('[CaptionGenerator] Quota exhaustion flag reset');
  }
  return quotaExhausted;
}

export function getQuotaExhaustedMessage(): string {
  return 'Caption generation paused: API quota exceeded. Using default captions.';
}

export async function generateCaption(
  imageUrl: string,
  apiKey: string,
  serviceType: 'hair' | 'nail' | 'tattoo' | 'massage' | 'facial' | 'glow'
): Promise<{ caption: string; hashtags: string }> {
  console.log(`[CaptionGenerator] Starting caption generation for ${serviceType}`);

  const fallbacks: Record<string, { caption: string; hashtags: string }> = {
    hair: { caption: 'Stunning new look ✨ Loving this transformation', hashtags: '#HairGoals #SalonTransformation #ZaviraSalon' },
    nail: { caption: 'Nail goals achieved 💅 Custom luxury', hashtags: '#NailArt #LuxuryNails #ZaviraSalon' },
    tattoo: { caption: 'Custom ink 🖤 Artwork at its finest', hashtags: '#TattooArt #CustomInk #ZaviraSalon' },
    massage: { caption: 'Pure relaxation 🧘 Zen mode activated', hashtags: '#Wellness #MassageTherapy #ZaviraSalon' },
    facial: { caption: 'Glowing skin ✨ Treatment goals', hashtags: '#Skincare #FacialGlow #ZaviraSalon' },
    glow: { caption: 'That salon glow ✨ Beautiful you', hashtags: '#SalonGlow #Beauty #ZaviraSalon' }
  };

  // Return fallback if quota exhausted
  if (quotaExhausted) {
    console.log('[CaptionGenerator] Quota exhausted, using fallback');
    return fallbacks[serviceType] || { caption: 'Beautiful salon service ✨', hashtags: '#ZaviraSalon #Winnipeg' };
  }

  try {
    console.log('[CaptionGenerator] Calling serverless function /api/generate-caption');

    // Call our serverless function instead of direct API call
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
    console.log('[CaptionGenerator] Got response:', data);

    // Check if response has caption and hashtags
    if (data.caption && data.hashtags) {
      console.log('[CaptionGenerator] Returning API response');
      return {
        caption: data.caption.trim(),
        hashtags: data.hashtags.trim()
      };
    }

    // Fallback if response missing fields
    console.log('[CaptionGenerator] Response missing fields, using fallback');
    return fallbacks[serviceType] || { caption: 'Beautiful salon service ✨', hashtags: '#ZaviraSalon #Winnipeg' };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CaptionGenerator] Error:', errorMessage);

    // Detect quota exhaustion and set flag to prevent further API calls
    if (
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('Quota exceeded') ||
      errorMessage.includes('rate_limit')
    ) {
      quotaExhausted = true;
      quotaExhaustedTimestamp = Date.now();
      console.warn('⚠️ API quota exhausted. Switching to fallback captions for next 24 hours.');
    }

    // Return fallback
    return fallbacks[serviceType] || { caption: 'Beautiful salon service ✨', hashtags: '#ZaviraSalon #Winnipeg' };
  }
}
