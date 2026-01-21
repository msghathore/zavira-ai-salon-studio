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

export const DEFAULT_PROMPTS: Record<string, string> = {
  'hair-chair': 'Client getting hair service in salon chair, professional beauty salon, modern interior, natural lighting',
  'nail-station': 'Client receiving manicure at nail station, beautiful nail salon, clean workspace, elegant interior',
  'tattoo-client': 'Client getting tattoo done on tattoo bed, professional tattoo studio, clean environment, artistic atmosphere',
  'massage-bed': 'Client relaxing on massage bed, spa atmosphere, peaceful ambiance, professional treatment room',
  'salon-room': 'Complete salon interior, professional beauty space, modern design, welcoming atmosphere',
};

export const DEFAULT_NEGATIVE_PROMPTS = 'no watermark, no text, no logo, blur, low quality, ugly, deformed, extra limbs, distorted hands';
