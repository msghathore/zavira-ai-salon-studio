export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: 'hair', name: 'Hair', icon: '💇', description: 'Hair styling and services' },
  { id: 'nail', name: 'Nail', icon: '💅', description: 'Manicure and pedicure' },
  { id: 'tattoo', name: 'Tattoo', icon: '🖊️', description: 'Tattoo designs and art' },
];

export const CELL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

// Default prompts
export const DEFAULT_PROMPTS: Record<string, string> = {
  hair: 'Beautiful hair styling, professional finish, healthy shiny hair, modern look',
  nail: 'Professional nail art, elegant manicure, clean workspace, stunning hand treatment',
  tattoo: 'Creative tattoo design, professional ink work, clean studio, artistic body art',
};

export const DEFAULT_NEGATIVE_PROMPTS = 'no watermark, no text, no logo, blur, low quality, ugly, deformed';
