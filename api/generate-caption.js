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

    // Free quality captions for each service type
    // These are context-aware and high-quality defaults
    const captions = {
      hair: {
        caption: 'Transformative new look ✨ Every strand is perfection',
        hashtags: '#HairTransformation #SalonGlow #HairGoals #ZaviraSalon #LuxuryHair'
      },
      nail: {
        caption: 'Nail artistry at its finest 💅✨ Custom designs that speak',
        hashtags: '#NailArt #NailDesign #LuxuryNails #SalonGlow #ZaviraSalon'
      },
      tattoo: {
        caption: 'Timeless ink design 🖤 Art that tells your story',
        hashtags: '#TattooArt #CustomInk #TattooDesign #Artistry #ZaviraSalon'
      },
      massage: {
        caption: 'Pure relaxation activated 🧘✨ Wellness goals achieved',
        hashtags: '#MassageTherapy #Wellness #RelaxationMode #SpaLife #ZaviraSalon'
      },
      facial: {
        caption: 'Glowing skin ✨ Skincare transformation goals',
        hashtags: '#FacialTreatment #Skincare #SkinGlow #BeautyGoals #ZaviraSalon'
      },
      glow: {
        caption: 'That salon glow ✨ Radiant confidence unlocked',
        hashtags: '#SalonGlow #BeautyGlow #Confidence #SalonLife #ZaviraSalon'
      }
    };

    const result = captions[serviceType] || {
      caption: 'Beautiful salon service ✨ Pure luxury',
      hashtags: '#ZaviraSalon #SalonLife #BeautyGoals'
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Caption generation error:', error.message);
    return res.status(500).json({
      error: error.message,
      caption: 'Beautiful salon service ✨',
      hashtags: '#ZaviraSalon #SalonLife'
    });
  }
}
