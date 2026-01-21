export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  equipmentExamples: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'hair-chair', name: 'Hair Chairs', icon: '💺', description: 'Hair styling chairs and stations', equipmentExamples: ['Hydraulic styling chair', 'Barber chair', 'Wash station', 'Mirror station'] },
  { id: 'nail-station', name: 'Nail Stations', icon: '💅', description: 'Manicure tables and pedicure chairs', equipmentExamples: ['Manicure table', 'Pedicure chair', 'UV/LED lamp', 'Nail art station'] },
  { id: 'tattoo-bed', name: 'Tattoo Beds', icon: '🖊️', description: 'Tattoo chairs and beds', equipmentExamples: ['Tattoo bed', 'Adjustable chair', 'Artist station', 'Privacy screen'] },
  { id: 'massage-bed', name: 'Massage Beds', icon: '🧘', description: 'Massage tables and facial beds', equipmentExamples: ['Massage table', 'Facial bed', 'Heated table', 'Zero gravity bed'] },
  { id: 'salon-room', name: 'Salon Rooms', icon: '🚪', description: 'Complete salon spaces and rooms', equipmentExamples: ['Private treatment room', 'Color bar', 'Waiting area', 'Reception desk'] },
];

export const CELL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

export interface PromptTemplate {
  subject: string;
  environment: string;
  lighting: {
    type: string;
    quality?: string;
    direction?: string;
    color_temperature?: string;
  };
  camera: {
    focal_length_mm: number;
    aperture_f: number;
    lens_type: string;
    focus_strategy?: string;
    distance_descriptor?: string;
  };
  materials_and_texture: {
    primary_materials: string[];
    surface_finish: string;
    texture_notes: string;
  };
  style: string;
  mood: string[];
  composition: {
    framing: string;
    angle?: string;
    arrangement_notes?: string;
    negative_space?: string;
    background?: string;
    depth?: string;
  };
  color_palette: string[];
  resolution: string;
  output_style: string;
}

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  'hair-chair': {
    subject: "Woman getting hair service at salon station, face visible, confident expression, commercial beauty shot",
    shot_type: "medium close-up",
    camera: {
      film_stock: "Kodak Portra 400",
      camera: "Canon R5 with 85mm prime lens",
      lens: "85mm f/1.4",
      aperture: "f/2.0",
      focus: "eyes sharp"
    },
    lighting: {
      type: "soft key light from 45 degrees",
      modifier: "large softbox with diffusion"
    },
    style: "editorial beauty photography, clean magazine style, commercial advertising",
    mood: "polished, professional, aspirational",
    composition: {
      shot_type: "medium close-up",
      framing: "head and shoulders",
      angle: "slightly above eye level"
    },
    color_tone: "warm skin tones, natural yet enhanced",
    negative_prompt: "cartoon, illustration, distorted, ugly, bad anatomy"
  },
  'nail-station': {
    subject: "Hands receiving manicure treatment, close-up of nails being painted, professional salon setting",
    shot_type: "extreme close-up",
    camera: {
      film_stock: "Kodak Portra 400",
      camera: "Sony A7IV with 100mm macro lens",
      lens: "100mm f/2.8 macro",
      aperture: "f/4.0",
      focus: "fingernails"
    },
    lighting: {
      type: "ring light directly overhead",
      modifier: "even illumination"
    },
    style: "product beauty photography, clean commercial, Instagram ad quality",
    mood: "clean, luxurious, attention-grabbing",
    composition: {
      shot_type: "extreme close-up",
      framing: "hands only",
      angle: "top down"
    },
    color_tone: "vibrant nail colors, warm skin tones",
    negative_prompt: "cartoon, illustration, blurry, deformed hands"
  },
  'tattoo-bed': {
    subject: "Person getting tattoo work done, focused artist in background, tattoo machine visible",
    shot_type: "medium shot",
    camera: {
      film_stock: "Kodak Portra 400",
      camera: "Leica Q2 with 28mm fixed lens",
      lens: "28mm f/1.7",
      aperture: "f/2.8",
      focus: "tattoo area"
    },
    lighting: {
      type: "overhood lamp directly on work area",
      modifier: "bright task lighting with ambient fill"
    },
    style: "documentary street photography aesthetic, raw authentic, indie magazine",
    mood: "intense, focused, artistic, underground",
    composition: {
      shot_type: "medium shot",
      framing: "torso to show work in progress",
      angle: "eye level"
    },
    color_tone: "high contrast, desaturated slightly, film grain",
    negative_prompt: "studio lighting, polished, commercial, happy"
  },
  'massage-bed': {
    subject: "Person receiving spa massage, face down on massage table, serene relaxed state",
    shot_type: "medium shot",
    camera: {
      film_stock: "Kodak Portra 400",
      camera: "Hasselblad X2D with 45mm lens",
      lens: "45mm f/3.5",
      aperture: "f/4.0",
      focus: "shoulders and back"
    },
    lighting: {
      type: "soft diffused window light from side",
      modifier: "sheer curtains, natural falloff"
    },
    style: "wellness lifestyle photography, calm peaceful, high-end spa editorial",
    mood: "tranquil, restorative, serene, peaceful",
    composition: {
      shot_type: "medium shot",
      framing: "upper body",
      angle: "slightly elevated, looking down"
    },
    color_tone: "soft, warm, ethereal, skin glow",
    negative_prompt: "cartoon, illustration, harsh lighting, stressed"
  },
  'salon-room': {
    subject: "Salon interior with stylist working on client, activity in progress, busy professional environment",
    shot_type: "wide shot",
    camera: {
      film_stock: "Kodak Portra 400",
      camera: "Nikon Z8 with 24-70mm zoom",
      lens: "35mm f/2.8",
      aperture: "f/5.6",
      focus: "center of activity"
    },
    lighting: {
      type: "salon practical lights and ambient",
      modifier: "mix of sources, natural window fill"
    },
    style: "lifestyle documentary photography, authentic busy salon, commercial advertising",
    mood: "vibrant, professional, welcoming, dynamic",
    composition: {
      shot_type: "wide shot",
      framing: "full room showing multiple stations",
      angle: "corner perspective"
    },
    color_tone: "rich, warm, inviting colors",
    negative_prompt: "empty salon, no people, staged, still"
  }
};

export function formatPromptFromTemplate(template: PromptTemplate): string {
  return `${template.subject}. Shot: ${template.composition.shot_type} (${template.composition.framing}, ${template.composition.angle}). Camera: ${template.camera.film_stock} film look, ${template.camera.camera}, ${template.camera.lens}, aperture ${template.camera.aperture}, focus on ${template.camera.focus}. Lighting: ${template.lighting.type}${template.lighting.modifier ? `, ${template.lighting.modifier}` : ''}. Style: ${template.style}. Mood: ${template.mood}. Color: ${template.color_tone}. ${template.negative_prompt}`;
}

export const SIMPLE_BASE_PROMPTS: Record<string, string> = {
  'hair': 'Beautiful woman with stunning hairstyle in modern salon, professional beauty photography, glossy magazine look',
  'nail': 'Elegant nail art design on manicured hands, close-up professional beauty shot, intricate details',
  'tattoo': 'Artistic tattoo design on skin, professional tattoo photography, clean aesthetic',
};

export const DEFAULT_PROMPTS: Record<string, string> = {
  'hair': SIMPLE_BASE_PROMPTS['hair'],
  'nail': SIMPLE_BASE_PROMPTS['nail'],
  'tattoo': SIMPLE_BASE_PROMPTS['tattoo']
};

export const DEFAULT_NEGATIVE_PROMPTS = 'no watermark, no text, no logo, blur, low quality, ugly, deformed, extra limbs, distorted hands, cartoon, illustration, anime style, oversaturated, noise, grain, cropped, floating object, wrong proportions, blurry, pixelated, low resolution, poor lighting, harsh shadows, color cast';

export const SKIN_TONES = [
  "with fair/light skin tone",
  "with light medium skin tone",
  "with medium skin tone",
  "with medium-dark skin tone"
];

export const EXPRESSIONS = [
  "smiling warmly",
  "confident focused",
  "laughing naturally",
  "thoughtful serene",
  "relaxed content",
  "determined professional",
  "playful engaged",
  "calm peaceful",
  "excited joyful",
  "curious interested",
  "satisfied elegant",
  "neutral composed",
  "friendly welcoming",
  "gentle kind",
  "strong assured",
  "happily glowing"
];

export const HAIR_STYLES = [
  "with straight black hair",
  "with wavy brown hair",
  "with curly hair",
  "with blonde ponytail",
  "with red bob cut",
  "with long dark hair",
  "with medium layered cut",
  "with updo style",
  "with braids",
  "with short pixie",
  "with side-part style",
  "with messy texture",
  "with sleek polished style",
  "with natural waves",
  "with auburn hair",
  "with silver-grey hair"
];

export const OUTFITS = [
  "in white professional outfit",
  "in black casual wear",
  "in blue stylish clothing",
  "in green ensemble",
  "in pink attire",
  "in neutral beige"
];

export function generateCellPromptWithVariations(
  basePrompt: string,
  cellIndex: number
): string {
  const skinIndex = cellIndex % 4;
  const expressionIndex = cellIndex % 16;
  const hairIndex = cellIndex % 16;
  const outfitIndex = cellIndex % 6;

  const skin = SKIN_TONES[skinIndex];
  const expression = EXPRESSIONS[expressionIndex];
  const hair = HAIR_STYLES[hairIndex];
  const outfit = OUTFITS[outfitIndex];

  return `${basePrompt}, ${skin}, ${expression}, ${hair}, ${outfit}`;
}
