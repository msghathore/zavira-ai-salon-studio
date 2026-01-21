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
    subject: "Professional hydraulic salon styling chair",
    environment: "Modern hair salon interior with ambient lighting",
    lighting: {
      type: "soft studio lighting mixed with natural window light",
      quality: "diffused, warm color temperature",
      direction: "upper-left diagonal"
    },
    camera: {
      focal_length_mm: 50,
      aperture_f: 2.8,
      lens_type: "prime",
      focus_strategy: "sharp on chair details, slightly blurred background"
    },
    materials_and_texture: {
      primary_materials: ["premium leather", "polished chrome", "stainless steel"],
      surface_finish: "smooth, reflective",
      texture_notes: "visible stitching, chrome shine, elegant hardware"
    },
    style: "product photography, photorealistic, professional studio lighting",
    mood: ["professional", "elegant", "modern", "clean"],
    composition: {
      framing: "vertical",
      angle: "slightly low angle to show chair profile",
      background: "salon interior with mirrors, neutral tones"
    },
    color_palette: ["warm beige", "cream white", "chrome silver", "soft grey"],
    resolution: "4K",
    output_style: "commercial product photography, Amazon/Shopify listing quality"
  },
  'nail-station': {
    subject: "Professional manicure table with UV/LED lamp",
    environment: "Modern nail salon workspace",
    lighting: {
      type: "softbox lighting",
      direction: "frontal",
      quality: "diffused, even illumination",
      color_temperature: "neutral-white"
    },
    camera: {
      focal_length_mm: 35,
      aperture_f: 4.0,
      lens_type: "wide-angle prime",
      distance_descriptor: "product shot"
    },
    materials_and_texture: {
      primary_materials: ["acrylic surface", "powder-coated metal", "glass", "LED lights"],
      surface_finish: "matte acrylic, glossy accents",
      texture_notes: "clean surfaces, organized tools, subtle reflections"
    },
    style: "product photography, lifestyle aesthetic, clean workspace",
    mood: ["relaxing", "professional", "inviting", "spacious"],
    composition: {
      framing: "horizontal",
      arrangement_notes: "nail polish bottles, tools, lamp in frame",
      negative_space: "balanced for text overlay"
    },
    color_palette: ["soft pink", "rose gold", "white", "light grey"],
    resolution: "4K",
    output_style: "e-commerce product image, lifestyle photography"
  },
  'tattoo-bed': {
    subject: "Adjustable tattoo bed/chair with headrest and armrests",
    environment: "Professional tattoo studio workspace",
    lighting: {
      type: "studio lighting with spot accents",
      direction: "top-down and side fill",
      quality: "high contrast, dramatic shadows",
      color_temperature: "neutral-cool"
    },
    camera: {
      focal_length_mm: 85,
      aperture_f: 2.8,
      lens_type: "portrait prime",
      focus_strategy: "sharp on bed details"
    },
    materials_and_texture: {
      primary_materials: ["vinyl upholstery", "powder-coated steel", "chrome hardware"],
      surface_finish: "matte vinyl, chrome highlights",
      texture_notes: "upholstery grain, metal shine, sturdy construction"
    },
    style: "professional photography, studio equipment catalog",
    mood: ["professional", "artistic", "clean", "sterile"],
    composition: {
      framing: "vertical",
      angle: "3/4 view showing adjustability",
      background: "tattoo flash art on walls, organized station"
    },
    color_palette: ["black", "grey", "chrome silver", "accent colors"],
    resolution: "4K",
    output_style: "medical equipment photography, studio catalog"
  },
  'massage-bed': {
    subject: "Professional massage table with adjustable headrest",
    environment: "Spa treatment room with zen atmosphere",
    lighting: {
      type: "soft ambient lighting with warm glow",
      direction: "diffused overhead",
      quality: "low contrast, warm and inviting",
      color_temperature: "warm tungsten"
    },
    camera: {
      focal_length_mm: 50,
      aperture_f: 2.8,
      lens_type: "standard prime",
      focus_strategy: "edge-to-edge sharp"
    },
    materials_and_texture: {
      primary_materials: ["PU leather", "memory foam padding", "aluminum frame"],
      surface_finish: "smooth leather, brushed aluminum",
      texture_notes: "leather grain, pillow softness, clean lines"
    },
    style: "wellness product photography, spa lifestyle",
    mood: ["peaceful", "relaxing", "luxurious", "serene"],
    composition: {
      framing: "horizontal",
      angle: "slightly elevated perspective",
      background: "calming spa colors, plants, soft textures"
    },
    color_palette: ["earth tones", "warm beige", "soft white", "natural green accents"],
    resolution: "4K",
    output_style: "hospitality product photography, spa catalog"
  },
  'salon-room': {
    subject: "Complete modern salon interior with multiple stations",
    environment: "Professional beauty salon space",
    lighting: {
      type: "multiple light sources - ambient, task, accent",
      quality: "balanced, layered lighting design",
      color_temperature: "neutral white with warm accents"
    },
    camera: {
      focal_length_mm: 24,
      aperture_f: 5.6,
      lens_type: "wide-angle",
      distance_descriptor: "wide interior shot"
    },
    materials_and_texture: {
      primary_materials: ["hardwood flooring", "mirrored surfaces", "modern furniture", "glass fixtures"],
      surface_finish: "polished, clean, premium"
    },
    style: "interior design photography, architectural visualization",
    mood: ["welcoming", "modern", "professional", "spacious"],
    composition: {
      framing: "wide horizontal",
      arrangement_notes: "multiple stations visible, balanced layout",
      depth: "deep perspective showing full space"
    },
    color_palette: ["neutral base", "brand accent colors", "natural tones", "modern greys"],
    resolution: "4K",
    output_style: "commercial interior photography, portfolio showcase"
  }
};

export function formatPromptFromTemplate(template: PromptTemplate): string {
  const parts = [
    `Subject: ${template.subject}`,
    `Environment: ${template.environment}`,
    `Lighting: ${template.lighting.type}${template.lighting.quality ? `, ${template.lighting.quality}` : ''}${template.lighting.direction ? `, ${template.lighting.direction}` : ''}`,
    `Camera: ${template.camera.focal_length_mm}mm f/${template.camera.aperture_f} ${template.camera.lens_type}${template.camera.focus_strategy ? `, ${template.camera.focus_strategy}` : ''}`,
    `Materials: ${template.materials_and_texture.primary_materials.join(', ')}, ${template.materials_and_texture.surface_finish}`,
    `Texture: ${template.materials_and_texture.texture_notes}`,
    `Style: ${template.style}`,
    `Mood: ${template.mood.join(', ')}`,
    `Composition: ${template.composition.framing}${template.composition.angle ? `, ${template.composition.angle}` : ''}${template.composition.background ? `, ${template.composition.background}` : ''}`,
    `Colors: ${template.color_palette.join(', ')}`,
    `Quality: ${template.resolution} ${template.output_style}`
  ];
  
  return parts.join('. ');
}

export const DEFAULT_PROMPTS: Record<string, string> = {
  'hair-chair': formatPromptFromTemplate(PROMPT_TEMPLATES['hair-chair']),
  'nail-station': formatPromptFromTemplate(PROMPT_TEMPLATES['nail-station']),
  'tattoo-bed': formatPromptFromTemplate(PROMPT_TEMPLATES['tattoo-bed']),
  'massage-bed': formatPromptFromTemplate(PROMPT_TEMPLATES['massage-bed']),
  'salon-room': formatPromptFromTemplate(PROMPT_TEMPLATES['salon-room'])
};

export const DEFAULT_NEGATIVE_PROMPTS = 'no watermark, no text, no logo, no brand name, blur, low quality, ugly, deformed, extra limbs, distorted hands, cartoon, illustration, anime style, oversaturated, noise, grain, cropped, floating object, wrong proportions, blurry, pixelated, low resolution, poor lighting, harsh shadows, color cast';
