export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  equipmentExamples: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'hair', name: 'Hair Services', icon: '✨', description: 'Hair styling and beauty services', equipmentExamples: ['Hair styling', 'Color treatments', 'Cuts and trims', 'Hair extensions'] },
  { id: 'nail', name: 'Nail Services', icon: '💅', description: 'Manicure and pedicure services', equipmentExamples: ['Manicure', 'Pedicure', 'Nail art', 'Gel nails'] },
  { id: 'tattoo', name: 'Tattoo Services', icon: '🖊️', description: 'Tattoo and body art services', equipmentExamples: ['Custom tattoos', 'Cover-ups', 'Flash designs', 'Body art'] },
];

export const CELL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

export const SIMPLE_BASE_PROMPTS: Record<string, string> = {
  'hair': 'Beautiful diverse group of 16 women at modern hair salon. Varied ethnicities including African, Asian, Caucasian, Latin American. Ages 20-60. Diverse skin tones from fair to deep dark. Various hair textures - straight, wavy, curly, coily. Different lengths and styles. Professional beauty photography, soft natural lighting, magazine editorial quality. High-end salon interior. No watermarks, no text, no logos, no blur, no distortion.',
  'nail': 'Elegant nail art design on manicured hands, close-up professional beauty shot, intricate details, vibrant colors, glossy finish, professional studio lighting, high-end beauty photography, no watermarks, no text, no logos.',
  'tattoo': 'Artistic tattoo design on skin, professional tattoo photography, clean aesthetic, detailed linework, high contrast, professional lighting, magazine quality, no watermarks, no text, no logos.',
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
