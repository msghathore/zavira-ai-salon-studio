import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Element interface (matches App.tsx)
export interface Element {
  id: string;
  category: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  photoUrls: string[];
  createdAt: Date;
}

// Generation interface
export interface Generation {
  id: string;
  categoryId: string;
  categoryName: string;
  elementName: string;
  gridUrl: string;
  cells: any[];
  totalCost: number;
  createdAt: Date;
}

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };

// Get user ID (anonymous or authenticated)
export function getUserId(): string {
  const anonId = localStorage.getItem('zavira_anonymous_id');
  if (anonId) return anonId;
  
  const newId = 'anon-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  localStorage.setItem('zavira_anonymous_id', newId);
  return newId;
}

// Auth helpers
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Elements CRUD
export async function fetchElements(userId: string): Promise<Element[]> {
  const { data, error } = await supabase
    .from('elements')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching elements:', error);
    return [];
  }

  return data.map((el: any) => ({
    id: el.id,
    category: el.category,
    name: el.name,
    prompt: el.prompt,
    negativePrompt: el.negative_prompt,
    photoUrls: el.photo_urls || [],
    createdAt: new Date(el.created_at),
  }));
}

export async function saveElement(userId: string, element: Element): Promise<string> {
  const { data, error } = await supabase
    .from('elements')
    .upsert({
      id: element.id,
      user_id: userId,
      category: element.category,
      name: element.name,
      prompt: element.prompt,
      negative_prompt: element.negativePrompt,
      photo_urls: element.photoUrls,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function deleteElement(userId: string, elementId: string): Promise<void> {
  const { error } = await supabase
    .from('elements')
    .update({ is_active: false })
    .eq('id', elementId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

// Generations
export interface Generation {
  id: string;
  categoryId: string;
  categoryName: string;
  elementName: string;
  gridUrl: string;
  cells: any[];
  totalCost: number;
  createdAt: Date;
}

export async function saveGeneration(userId: string, generation: Generation): Promise<string> {
  const { data, error } = await supabase
    .from('generations')
    .insert({
      user_id: userId,
      category_id: generation.categoryId,
      category_name: generation.categoryName,
      element_name: generation.elementName,
      grid_url: generation.gridUrl,
      cells: generation.cells,
      total_cost: generation.totalCost,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function fetchGenerations(userId: string): Promise<Generation[]> {
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching generations:', error);
    return [];
  }

  return data.map((g: any) => ({
    id: g.id,
    categoryId: g.category_id,
    categoryName: g.category_name,
    elementName: g.element_name,
    gridUrl: g.grid_url,
    cells: g.cells,
    totalCost: g.total_cost,
    createdAt: new Date(g.created_at),
  }));
}

// Photo upload to Supabase Storage
export async function uploadPhoto(userId: string, file: File): Promise<string | null> {
  const filePath = `${userId}/${Date.now()}-${file.name}`;
  
  const { error } = await supabase.storage
    .from('element-photos')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading photo:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('element-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deletePhoto(url: string): Promise<void> {
  try {
    const path = url.split('/element-photos/')[1];
    if (!path) return;
    
    await supabase.storage
      .from('element-photos')
      .remove([path]);
  } catch (err) {
    console.error('Error deleting photo:', err);
  }
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
}

// Posted Content
export interface PostedContent {
  id: string;
  generationId: string;
  cellLetter: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
  musicUrl: string;
  status: 'pending' | 'posted' | 'failed';
  platform: string;
  postedAt: Date;
  createdAt: Date;
}

export async function createPostedContent(userId: string, content: {
  generationId: string;
  cellLetter: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
  musicUrl: string;
  platform: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('posted_content')
    .insert({
      user_id: userId,
      generation_id: content.generationId,
      cell_letter: content.cellLetter,
      image_url: content.imageUrl,
      caption: content.caption,
      hashtags: content.hashtags,
      music_url: content.musicUrl,
      platform: content.platform,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function fetchPostedContent(userId: string): Promise<PostedContent[]> {
  const { data, error } = await supabase
    .from('posted_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posted content:', error);
    return [];
  }

  return data.map((p: any) => ({
    id: p.id,
    generationId: p.generation_id,
    cellLetter: p.cell_letter,
    imageUrl: p.image_url,
    caption: p.caption,
    hashtags: p.hashtags || [],
    musicUrl: p.music_url,
    status: p.status,
    platform: p.platform,
    postedAt: p.posted_at ? new Date(p.posted_at) : new Date(),
    createdAt: new Date(p.created_at),
  }));
}

export async function updatePostedStatus(id: string, status: 'posted' | 'failed', postedAt?: Date): Promise<void> {
  const { error } = await supabase
    .from('posted_content')
    .update({ 
      status,
      posted_at: postedAt?.toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}
