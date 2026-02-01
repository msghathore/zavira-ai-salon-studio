// Quota exhaustion flag - once quota is hit, stop trying to call API
let quotaExhausted = false;
let quotaExhaustedTimestamp = 0;

export type Platform = 'instagram' | 'facebook' | 'gmb' | 'twitter' | 'tiktok';
export type ServiceType = 'hair' | 'nail' | 'tattoo' | 'massage' | 'facial' | 'glow';

export interface PlatformCaptions {
  instagram: { caption: string; hashtags: string };
  facebook: { caption: string; hashtags: string };
  gmb: { caption: string; hashtags: string };
  twitter: { caption: string; hashtags: string };
  tiktok: { caption: string; hashtags: string };
}

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

// Platform-specific fallback captions
const platformFallbacks: Record<ServiceType, PlatformCaptions> = {
  hair: {
    instagram: {
      caption: 'New hair, who dis? Your dream look awaits at Zavira Salon',
      hashtags: '#HairGoals #HairTransformation #SalonLife #HairOfTheDay #BeautyVibes #ZaviraSalon #Winnipeg #HairColor #HairStyle #SalonVibes #BeautyGlow #HairInspo #StyleGoals #GlowUp #BeautyCommunity #HairMakeover #TrendyHair #HairArtist #SalonGlow #BeautyLovers'
    },
    facebook: {
      caption: 'Ready for a fresh new look? Our talented stylists at Zavira Salon specialize in creating the perfect hairstyle for you. Book your appointment today and let us transform your look!',
      hashtags: '#ZaviraSalon #Winnipeg #HairSalon #BookNow'
    },
    gmb: {
      caption: 'Professional hair styling services in Winnipeg. Visit Zavira Salon for expert cuts, colors, and treatments. Walk-ins welcome!',
      hashtags: '#WinnipegSalon #HairStylist #LocalBusiness'
    },
    twitter: {
      caption: 'Fresh cut vibes at Zavira Salon! Book now',
      hashtags: '#HairGoals #Winnipeg'
    },
    tiktok: {
      caption: 'POV: You finally got that dream hair transformation',
      hashtags: '#HairTok #HairTransformation #SalonLife #GlowUp #FYP #ForYouPage #HairGoals #BeautyTok'
    }
  },
  nail: {
    instagram: {
      caption: 'Nails done, confidence on point. Treat yourself at Zavira',
      hashtags: '#NailArt #NailsOfInstagram #ManicureGoals #NailDesign #NailInspo #ZaviraSalon #Winnipeg #NailTech #NailLove #GelNails #AcrylicNails #NailAddict #PrettyNails #NailsOnPoint #BeautyNails #NailArtist #LuxuryNails #NailStyle #ManiMonday #NailGame'
    },
    facebook: {
      caption: 'Looking for stunning nail art? Our nail technicians at Zavira Salon create beautiful, long-lasting designs. From classic French tips to trendy nail art - we do it all!',
      hashtags: '#ZaviraSalon #NailArt #Winnipeg #BookNow'
    },
    gmb: {
      caption: 'Expert nail services in Winnipeg - manicures, pedicures, gel, and acrylic nails at Zavira Salon. Professional nail technicians ready to serve you.',
      hashtags: '#WinnipegNails #NailSalon #LocalBusiness'
    },
    twitter: {
      caption: 'Fresh mani alert! Book at Zavira Salon',
      hashtags: '#NailArt #Winnipeg'
    },
    tiktok: {
      caption: 'When your nail tech is an actual artist',
      hashtags: '#NailTok #NailArt #Satisfying #GelNails #FYP #ForYouPage #NailDesign #BeautyTok'
    }
  },
  tattoo: {
    instagram: {
      caption: 'Ink that tells your story. Custom tattoo art at Zavira',
      hashtags: '#TattooArt #InkAddict #TattooDesign #CustomTattoo #TattooArtist #ZaviraSalon #Winnipeg #Inked #TattooLife #TattooInspiration #TattooStyle #BodyArt #TattooLove #InkMaster #TattooIdeas #BlackworkTattoo #TattooWork #ArtOnSkin #TattooCommunity #InkArt'
    },
    facebook: {
      caption: 'Express yourself with custom tattoo art at Zavira Salon. Our skilled artists bring your vision to life with precision and creativity. Book a consultation today!',
      hashtags: '#ZaviraSalon #TattooArt #Winnipeg #CustomTattoo'
    },
    gmb: {
      caption: 'Professional tattoo studio in Winnipeg. Custom designs, experienced artists, and a clean, welcoming environment at Zavira Salon.',
      hashtags: '#WinnipegTattoo #TattooStudio #LocalArtist'
    },
    twitter: {
      caption: 'Custom ink, lasting art. Zavira Salon',
      hashtags: '#TattooArt #Winnipeg'
    },
    tiktok: {
      caption: 'Watch this custom tattoo come to life',
      hashtags: '#TattooTok #TattooArt #InkTok #CustomTattoo #FYP #ForYouPage #TattooArtist #BodyArt'
    }
  },
  massage: {
    instagram: {
      caption: 'Relax, refresh, renew. Self-care Sunday starts at Zavira',
      hashtags: '#MassageTherapy #Relaxation #SelfCareSunday #WellnessJourney #SpaTreatment #ZaviraSalon #Winnipeg #StressRelief #BodyCare #HealingHands #Wellness #SpaDay #MindBodySoul #RelaxAndUnwind #TreatYourself #WellnessWednesday #SelfLove #MassageLife #PeaceOfMind #HealthyLiving'
    },
    facebook: {
      caption: 'Feeling stressed? Our professional massage therapists at Zavira Salon offer relaxing and therapeutic treatments to help you unwind. Book your escape today!',
      hashtags: '#ZaviraSalon #MassageTherapy #Winnipeg #Wellness'
    },
    gmb: {
      caption: 'Relaxing massage therapy in Winnipeg. Deep tissue, Swedish, and therapeutic massage services at Zavira Salon. Your wellness is our priority.',
      hashtags: '#WinnipegMassage #Wellness #LocalSpa'
    },
    twitter: {
      caption: 'Stress relief starts here. Book at Zavira',
      hashtags: '#Wellness #Winnipeg'
    },
    tiktok: {
      caption: 'This is your sign to book that massage',
      hashtags: '#SelfCareTok #Massage #Relaxation #Wellness #FYP #ForYouPage #SpaDay #TreatYourself'
    }
  },
  facial: {
    instagram: {
      caption: 'Glowing from the inside out. Facial treatment goals at Zavira',
      hashtags: '#FacialTreatment #SkinCareRoutine #GlowingSkin #BeautyTreatment #SkincareGoals #ZaviraSalon #Winnipeg #FacialGlow #SkinHealth #ClearSkin #FacialTime #BeautyRoutine #SkinCareLove #HealthySkin #FacialSpa #SkinCareAddict #BeautyGlow #FreshFace #SkinGoals #RadiantSkin'
    },
    facebook: {
      caption: 'Reveal your best skin with our professional facial treatments at Zavira Salon. From deep cleansing to anti-aging facials, we have the perfect treatment for you!',
      hashtags: '#ZaviraSalon #FacialTreatment #Winnipeg #Skincare'
    },
    gmb: {
      caption: 'Professional facial treatments in Winnipeg. Deep cleansing, hydrating, and rejuvenating facials at Zavira Salon. Book your skincare appointment today.',
      hashtags: '#WinnipegSkincare #FacialSpa #LocalBeauty'
    },
    twitter: {
      caption: 'Glow up season at Zavira Salon',
      hashtags: '#Skincare #Winnipeg'
    },
    tiktok: {
      caption: 'POV: Your skin after a professional facial',
      hashtags: '#SkinCareTok #Facial #GlowUp #Skincare #FYP #ForYouPage #GlassSkin #BeautyTok'
    }
  },
  glow: {
    instagram: {
      caption: 'That Zavira glow hits different. Book your transformation',
      hashtags: '#GlowUp #SalonGlow #BeautyGoals #Transformation #RadiantSkin #ZaviraSalon #Winnipeg #BeautyVibes #SelfCare #GlowingSkin #BeautyTreatment #SalonLife #ConfidenceBoost #BeautyTime #TreatYourself #GlowGoals #BeautyCommunity #SalonVibes #BeautyLovers #GlowingFromWithin'
    },
    facebook: {
      caption: 'Ready to glow? Zavira Salon offers a full range of beauty services to help you look and feel your best. From hair to nails to skincare - we have you covered!',
      hashtags: '#ZaviraSalon #Beauty #Winnipeg #SalonServices'
    },
    gmb: {
      caption: 'Full-service beauty salon in Winnipeg. Hair, nails, facials, and more at Zavira Salon. Your one-stop destination for all beauty needs.',
      hashtags: '#WinnipegBeauty #FullServiceSalon #LocalBusiness'
    },
    twitter: {
      caption: 'Glow season is here. Zavira Salon',
      hashtags: '#Beauty #Winnipeg'
    },
    tiktok: {
      caption: 'When Zavira Salon works their magic',
      hashtags: '#GlowUp #BeautyTok #Transformation #SalonLife #FYP #ForYouPage #BeforeAndAfter #GlowUpChallenge'
    }
  }
};

// Generate captions for a single platform (legacy support)
export async function generateCaption(
  imageUrl: string,
  apiKey: string,
  serviceType: ServiceType
): Promise<{ caption: string; hashtags: string }> {
  const captions = await generatePlatformCaptions(imageUrl, apiKey, serviceType);
  return captions.instagram;
}

// Generate captions for ALL platforms at once
export async function generatePlatformCaptions(
  imageUrl: string,
  apiKey: string,
  serviceType: ServiceType
): Promise<PlatformCaptions> {
  console.log(`[CaptionGenerator] Starting multi-platform caption generation for ${serviceType}`);

  // Return fallbacks if quota exhausted
  if (quotaExhausted) {
    console.log('[CaptionGenerator] Quota exhausted, using fallbacks');
    return platformFallbacks[serviceType] || platformFallbacks.glow;
  }

  try {
    console.log('[CaptionGenerator] Calling serverless function /api/generate-caption');

    // Call our serverless function
    const response = await fetch('/api/generate-caption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        serviceType,
        multiPlatform: true, // Request all platforms
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown'}`);
    }

    const data = await response.json();
    console.log('[CaptionGenerator] Got response:', data);

    // Check if response has platform captions
    if (data.platforms) {
      console.log('[CaptionGenerator] Returning API platform captions');
      return data.platforms as PlatformCaptions;
    }

    // Fallback to single caption response
    if (data.caption && data.hashtags) {
      console.log('[CaptionGenerator] Single response, using for all platforms');
      const fallback = platformFallbacks[serviceType] || platformFallbacks.glow;
      return {
        ...fallback,
        instagram: { caption: data.caption, hashtags: data.hashtags },
      };
    }

    // Full fallback
    console.log('[CaptionGenerator] Response missing fields, using fallbacks');
    return platformFallbacks[serviceType] || platformFallbacks.glow;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CaptionGenerator] Error:', errorMessage);

    // Detect quota exhaustion
    if (
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('Quota exceeded') ||
      errorMessage.includes('rate_limit')
    ) {
      quotaExhausted = true;
      quotaExhaustedTimestamp = Date.now();
      console.warn('API quota exhausted. Using fallback captions for 24 hours.');
    }

    // Return fallbacks
    return platformFallbacks[serviceType] || platformFallbacks.glow;
  }
}
