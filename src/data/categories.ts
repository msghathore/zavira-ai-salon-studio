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
