import { GoogleGenerativeAI } from '@google/generative-ai';

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
  return 'Caption generation paused: Daily API quota exceeded. Using default captions.';
}

export async function generateCaption(
  imageUrl: string,
  googleApiKey: string,
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
  if (!googleApiKey || googleApiKey.trim() === '') {
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

    const client = new GoogleGenerativeAI(googleApiKey);

    // Use cheapest vision model: gemini-2.0-flash (or fallback to gemini-1.5-flash)
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Handle both data URLs (uploaded images) and HTTP URLs (generated images)
    let base64: string;
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:')) {
      // Data URL - extract base64 part directly
      const parts = imageUrl.split(',');
      if (parts[0].includes('image/')) {
        mimeType = parts[0].match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      }
      base64 = parts[1];
    } else {
      // HTTP URL - fetch and convert to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      // Convert ArrayBuffer to base64 using browser API
      const uint8Array = new Uint8Array(buffer);
      const binaryString = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
      base64 = btoa(binaryString);
      mimeType = blob.type || 'image/jpeg';
    }

    // Service type descriptions for better captions
    const serviceDescriptions: Record<string, string> = {
      hair: 'hair styling, haircut, color, highlights, or treatment',
      nail: 'nail art, manicure, pedicure, or nail design',
      tattoo: 'tattoo design or custom artwork',
      massage: 'massage therapy or spa treatment',
      facial: 'facial treatment or skincare service',
      glow: 'beauty glow or cosmetic service'
    };

    const prompt = `You are a luxury salon social media expert. Analyze this image of a client receiving ${serviceDescriptions[serviceType] || 'salon service'}.

Write a SHORT, CREATIVE caption (1-2 sentences max) for Instagram/TikTok that:
1. Describes the specific service/style shown (be specific about colors, techniques, styles)
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

Write ONLY the caption text, nothing else. Be specific to what you see.`;

    const generatedContent = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64,
        },
      },
      {
        text: prompt,
      },
    ]);

    const caption = generatedContent.response.text().trim();
    return caption || `Beautiful ${serviceType} service at Zavira Salon ✨`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Detect quota exhaustion and set flag to prevent further API calls
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
      quotaExhausted = true;
      quotaExhaustedTimestamp = Date.now();
      console.warn('⚠️ Google API quota exhausted. Switching to fallback captions for next 24 hours.');
    } else {
      console.error('Error generating caption:', error);
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
