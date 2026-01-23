import React, { useState, useRef, MouseEvent, useCallback, useEffect, SetStateAction, Dispatch } from 'react';
import { generateImage, createLaoZhangClient, ImageGenerationOptions, buildEditPrompt } from './lib/laozhang';
import { CATEGORIES, DEFAULT_PROMPTS, DEFAULT_NEGATIVE_PROMPTS, CELL_LABELS, Category, generateCellPromptWithVariations } from './data/categories';
import BudgetTracker from './components/BudgetTracker';
import { 
  supabase, 
  getUserId, 
  uploadPhoto as supabaseUploadPhoto, 
  deletePhoto as supabaseDeletePhoto,
  fetchElements as supabaseFetchElements,
  saveElement as supabaseSaveElement,
  deleteElement as supabaseDeleteElement,
  saveGeneration as supabaseSaveGeneration,
  fetchGenerations as supabaseFetchGenerations,
  createPostedContent,
  fetchPostedContent as supabaseFetchPostedContent,
  updatePostedStatus,
  isSupabaseConfigured 
} from './lib/supabase';
import { getTrendingTracks, AudiusTrack } from './lib/audius';
import { trackImageGeneration } from './components/BudgetTracker';

interface Element {
  id: string;
  category: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  photoUrls: string[];
  createdAt: Date;
}

interface GridCell {
  letter: string;
  index: number;
  isSelected: boolean;
  prompt: string;
  resultUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface Generation {
  id: string;
  categoryId: string;
  categoryName: string;
  elementName: string;
  gridUrl: string;
  cells: GridCell[];
  createdAt: Date;
  totalCost: number;
}

interface PostedContent {
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

export default function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0].id);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [postedContent, setPostedContent] = useState<PostedContent[]>([]);
  const [gridUrl, setGridUrl] = useState<string | null>(null);
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
  const [isGeneratingCells, setIsGeneratingCells] = useState(false);
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditingElement, setIsEditingElement] = useState(false);
  const [editingElement, setEditingElement] = useState<Element | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [selectedPostImage, setSelectedPostImage] = useState<{url: string, letter: string, generationId: string} | null>(null);
  const [refPhotosToUse, setRefPhotosToUse] = useState<number>(0);
  const [gridPromptText, setGridPromptText] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<{url: string, name: string}[]>([]);
  const gridImageRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string>(getUserId());
  
  const LAOZHANG_API_KEY = (import.meta.env["VITE_LAOZHANG_API_KEY"] || "");
  
  const tabs = [
    { id: 'elements', label: 'Elements', icon: '📦' },
    { id: 'generate', label: 'Generate', icon: '✨' },
    { id: 'saved', label: 'Saved', icon: '💾', badge: generations.length },
    { id: 'usage', label: 'Usage', icon: '📊' },
    { id: 'post', label: 'Post', icon: '🚀' },
    { id: 'review', label: 'Review', icon: '✅' },
  ];
  
  const currentCategory = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

  // Load data from Supabase or localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const userId = userIdRef.current;
        
        // Try Supabase first
        if (isSupabaseConfigured()) {
          const [supabaseElements, supabaseGenerations, supabasePosted] = await Promise.all([
            supabaseFetchElements(userId),
            supabaseFetchGenerations(userId),
            supabaseFetchPostedContent(userId),
          ]);
          
          // Upgrade old prompts in Supabase elements (check if starts with old pattern)
          const oldPromptPatterns = [
            'Beautiful woman with stunning hairstyle in modern salon',
            'Elegant nail art design on manicured hands',
            'Artistic tattoo design on skin'
          ];
          
          const upgradedElements = supabaseElements.map((e: any) => {
            if (oldPromptPatterns.some(pattern => e.prompt.startsWith(pattern))) {
              return { ...e, prompt: DEFAULT_PROMPTS[e.category] || e.prompt };
            }
            return e;
          });
          
          if (upgradedElements.length > 0) setElements(upgradedElements);
          if (supabaseGenerations.length > 0) setGenerations(supabaseGenerations);
          if (supabasePosted.length > 0) setPostedContent(supabasePosted);
          setSupabaseReady(true);
        }
        
        // Also load from localStorage as fallback
        const savedElements = localStorage.getItem('zavira_elements');
        if (savedElements) {
          try {
            let parsed = JSON.parse(savedElements);
            const localElements = parsed.map((e: any) => ({ ...e, createdAt: new Date(e.createdAt) }));
            
            // Clean up old elements with numeric IDs or invalid categories
            const validCategories = ['hair', 'nail', 'tattoo'];
            const oldPromptPatterns = [
              'Beautiful woman with stunning hairstyle in modern salon',
              'Elegant nail art design on manicured hands',
              'Artistic tattoo design on skin'
            ];
            const cleanedElements = localElements.filter((e: any) =>
              e.id &&
              e.id.includes('-') &&
              validCategories.includes(e.category.split('-')[0]) &&
              e.name && e.prompt
            ).map((e: any) => {
              const baseCat = e.category.split('-')[0];
              
              let updatedPrompt = e.prompt;
              if (oldPromptPatterns.some(pattern => e.prompt.startsWith(pattern))) {
                updatedPrompt = DEFAULT_PROMPTS[baseCat] || e.prompt;
              }

              return {
                ...e,
                category: baseCat,
                prompt: updatedPrompt
              };
            });
            
            if (cleanedElements.length !== localElements.length) {
              console.log(`Cleaned ${localElements.length - cleanedElements.length} invalid elements`);
              localStorage.setItem('zavira_elements', JSON.stringify(cleanedElements));
            }
            
            if (!isSupabaseConfigured() || cleanedElements.length > elements.length) {
              setElements(cleanedElements);
            }
          } catch {}
        }
        
        const savedGenerations = localStorage.getItem('zavira_generations');
        if (savedGenerations) {
          try {
            const parsed = JSON.parse(savedGenerations);
            const localGenerations = parsed.map((g: any) => ({ ...g, createdAt: new Date(g.createdAt) }));
            if (!isSupabaseConfigured() || localGenerations.length > generations.length) {
              setGenerations(localGenerations);
            }
          } catch {}
        }
        
        const savedPosted = localStorage.getItem('zavira_posted');
        if (savedPosted) {
          try {
            const parsed = JSON.parse(savedPosted);
            const localPosted = parsed.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt), postedAt: new Date(p.postedAt) }));
            if (!isSupabaseConfigured() || localPosted.length > postedContent.length) {
              setPostedContent(localPosted);
            }
          } catch {}
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Auto-select first element after elements load and upgrade prompt
  useEffect(() => {
    if (elements.length > 0 && !selectedElement) {
      const firstElement = elements[0];
      const oldPromptPatterns = [
        'Beautiful woman with stunning hairstyle in modern salon',
        'Elegant nail art design on manicured hands',
        'Artistic tattoo design on skin'
      ];
      
      let upgradedElement = { ...firstElement };
      if (oldPromptPatterns.some(pattern => firstElement.prompt.startsWith(pattern))) {
        upgradedElement.prompt = DEFAULT_PROMPTS[firstElement.category] || firstElement.prompt;
      }
      
      setSelectedElement(upgradedElement);
      setSelectedCategory(upgradedElement.category);
      setRefPhotosToUse(getRefPhotoCount());
      setGridPromptText(upgradedElement.prompt);
    }
  }, [elements.length]);

  // Save elements to both Supabase and localStorage
  const syncElements = async (newElements: Element[]) => {
    setElements(newElements);
    localStorage.setItem('zavira_elements', JSON.stringify(newElements));
    console.log('Saved to localStorage, elements count:', newElements.length);
    console.log('First element photos:', newElements[0]?.photoUrls?.length);
    
    if (supabaseReady) {
      try {
        for (const element of newElements) {
          await supabaseSaveElement(userIdRef.current, element);
        }
        console.log('Synced to Supabase');
      } catch (err) {
        console.error('Error syncing elements to Supabase:', err);
      }
    }
  };

  // Save generations to both Supabase and localStorage
  const syncGenerations = async (newGenerations: Generation[]) => {
    setGenerations(newGenerations);
    localStorage.setItem('zavira_generations', JSON.stringify(newGenerations));
    
    if (supabaseReady) {
      try {
        for (const gen of newGenerations) {
          await supabaseSaveGeneration(userIdRef.current, gen);
        }
      } catch (err) {
        console.error('Error syncing generations to Supabase:', err);
      }
    }
  };

  // Handle posting (creates record, triggers backend processing)
  const handlePost = async (
    image: { url: string; letter: string; generationId: string },
    caption: string,
    hashtags: string[],
    musicUrl: string,
    platform: 'tiktok' | 'instagram'
  ) => {
    try {
      // Create posted content record
      const postedId = await createPostedContent(userIdRef.current, {
        generationId: image.generationId,
        cellLetter: image.letter,
        imageUrl: image.url,
        caption,
        hashtags,
        musicUrl,
        platform,
      });

      // Add to local state
      const newPosted: PostedContent = {
        id: postedId,
        generationId: image.generationId,
        cellLetter: image.letter,
        imageUrl: image.url,
        caption,
        hashtags,
        musicUrl,
        status: 'pending',
        platform,
        postedAt: new Date(),
        createdAt: new Date(),
      };
      const updatedPosted = [newPosted, ...postedContent];
      setPostedContent(updatedPosted);
      localStorage.setItem('zavira_posted', JSON.stringify(updatedPosted));

      // Trigger backend processing (Make.com webhook, etc.)
      // This would call a Supabase Edge Function
      if (supabaseReady) {
        const webhookUrl = localStorage.getItem('make_webhook_url');
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postedId,
              imageUrl: image.url,
              caption,
              hashtags,
              musicUrl,
              platform,
            }),
          }).catch(err => console.error('Webhook error:', err));
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to post');
    }
  };

  // Create new element
  const handleCreateElement = () => {
    setEditingElement({
      id: crypto.randomUUID(),
      category: selectedCategory,
      name: '',
      prompt: DEFAULT_PROMPTS[selectedCategory] || '',
      negativePrompt: DEFAULT_NEGATIVE_PROMPTS,
      photoUrls: [],
      createdAt: new Date(),
    });
    setIsEditingElement(true);
  };

  // Edit element
  const handleEditElement = (element: Element) => {
    setEditingElement({ ...element });
    setIsEditingElement(true);
  };

  // Save element
  const handleSaveElement = async () => {
    if (!editingElement || !editingElement.name?.trim()) {
      setError('Please enter a name');
      return;
    }

    setIsUploading(true);
    try {
      const newElement: Element = {
        id: editingElement.id || crypto.randomUUID(),
        category: editingElement.category,
        name: editingElement.name,
        prompt: editingElement.prompt || DEFAULT_PROMPTS[editingElement.category] || '',
        negativePrompt: editingElement.negativePrompt || DEFAULT_NEGATIVE_PROMPTS,
        photoUrls: editingElement.photoUrls || [],
        createdAt: editingElement.createdAt || new Date(),
      };

      console.log('Saving element with photos:', newElement.photoUrls.length);

      const existingIndex = elements.findIndex(e => e.id === newElement.id);
      if (existingIndex >= 0) {
        const updated = [...elements];
        updated[existingIndex] = newElement;
        syncElements(updated);
      } else {
        syncElements([newElement, ...elements]);
      }

      setIsEditingElement(false);
      setEditingElement(null);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete element
  const handleDeleteElement = async (id: string) => {
    if (confirm('Delete this element?')) {
      const filtered = elements.filter(e => e.id !== id);
      syncElements(filtered);
      if (supabaseReady) {
        await supabaseDeleteElement(userIdRef.current, id);
      }
      if (selectedElement?.id === id) setSelectedElement(null);
    }
  };

  // Add photo to element
  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingElement || !e.target.files?.length) return;
    
    setIsUploading(true);
    try {
      const files = Array.from(e.target.files);
      console.log(`Uploading ${files.length} photos...`);
      for (const file of files) {
        console.log('Uploading file:', file.name);
        const url = await supabaseUploadPhoto(userIdRef.current, file);
        console.log('Uploaded URL:', url);
        if (url) {
          setEditingElement(prev => prev ? {
            ...prev,
            photoUrls: [...(prev.photoUrls || []), url],
          } : null);
        } else {
          console.error('Failed to upload photo:', file.name);
        }
      }
      console.log('Total photos in editingElement:', editingElement?.photoUrls?.length);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove photo from element
  const handleRemovePhoto = (urlToRemove: string) => {
    setEditingElement(prev => {
      if (!prev) return null;
      const urls = prev.photoUrls?.filter(u => u !== urlToRemove) || [];
      return { ...prev, photoUrls: urls };
    });
  };

  // Helper to calculate how many reference photos will be used
  const getRefPhotoCount = () => {
    if (!selectedElement) return 0;
    const categoryPhotos = elements
      .filter(el => el.category === selectedElement.category)
      .flatMap(el => el.photoUrls);
    return Math.min(10, categoryPhotos.length);
  };

  // Helper to get detailed professional grid prompt
  const getDetailedGridPrompt = (elementName: string) => {
    return `
USE REFERENCE IMAGES AS PRIMARY GUIDE: Study the attached salon photos showing the exact room layout, equipment, furniture, walls, lighting, mirrors, and decor. Create a 4x4 grid where ALL 16 images show DIFFERENT clients in the EXACT SAME SALON ROOM receiving different ${elementName || 'salon services'}.

=== GRID STRUCTURE: 16 DIFFERENT CLIENTS, SAME SALON ===
Create exactly 16 unique images. Each shows ONE client actively receiving a salon service IN THE EXACT SALON ROOM FROM THE REFERENCE PHOTOS.

=== PER-IMAGE REQUIREMENTS (RANDOMIZE ACROSS ALL 16) ===

SUBJECT (CLIENT APPEARANCE):
- Skin tones: Include very light, light, medium, olive, tan, deep, very deep (represent ALL ethnicities)
- Ethnicities: Mix Asian, African, Black, Latin American, European, Middle Eastern, Indian, South Asian, Multiracial
- Ages: Range from 20s, 30s, 40s, 50s, 60s
- Hair types: Straight, wavy, curly, coily, kinky textures
- Hair colors: Black, dark brown, medium brown, light brown, blonde, auburn, red, gray, silver
- Facial hair: Some with beards, some clean-shaven, some with facial hair variations
- Expressions: Smiling, peaceful, focused, confident, relaxed, joyful, serene, content
- Eyes: Different eye colors, eye shapes, eye makeup variations
- Distinguishing features: Freckles, beauty marks, glasses, piercings (natural variations)

ACTION (SERVICE BEING PERFORMED):
- Vary services across the 16 images: haircut, hair styling, hair coloring, hair treatment, blow dry, braiding, weaving, cutting, perming, straightening, etc.
- Show active motion: hands moving, tools being used, client engaged in service
- Different angles of the service (side view of haircut, overhead of coloring, etc.)
- Vary which service station/chair is being used in the background

ENVIRONMENT (REFERENCE SALON ROOM):
- CRITICAL: Use the EXACT salon room from reference images as background
- Include ALL visible elements: exact same walls, exact same flooring, exact same mirrors, exact same chairs/stations
- Keep exact same color palette and lighting from reference images
- Professional salon equipment visible and used in service
- Plants, decor, shelving, products if visible in reference
- Same perspective/camera position relative to room layout
- Show depth: background sharp or softly blurred depending on camera distance

CLOTHING & STYLING:
- Diverse outfit colors: jewel tones, pastels, neutrals, bright colors, patterned clothing
- Variety of necklines and styles: shirts, tops, dresses, hoodies, blazers
- Professional and casual mix appropriate for salon
- Some wearing jewelry, some minimal accessories
- Different hairstyles being shown in the service (short, medium, long, styled, natural)

CINEMATOGRAPHY & TECHNICAL SPECIFICATIONS:

CAMERAS (VARY ACROSS 16):
- Mix of camera systems: Canon 5D Mark IV, Nikon Z9, Sony A1, Arri Alexa 35, Red Komodo, Fujifilm GFX100S
- Variations create subtle style differences in each cell

LENSES & FOCAL LENGTHS (VARY):
- Wide variety: 24mm, 35mm, 50mm (normal perspective), 85mm (flattering portraits), 100mm (compression), 135mm (full body), Macro lenses
- Anamorphic lenses suggested in some (subtle lens flare, stretched bokeh characteristics)

APERTURE & DEPTH OF FIELD (VARY):
- Wide open: f/1.2, f/1.4, f/1.8 (creamy background blur, sharp subject)
- Moderate: f/2.8, f/4.0 (balance of subject and background)
- Deeper: f/5.6, f/8.0 (more environmental context visible)
- Ultra-shallow in some cells (razor-thin focus on eyes, creamy bokeh background)

FILM STOCKS & COLOR GRADING (CONSISTENT AESTHETIC):
- Primary stock: Kodak Portra 400 (warm, saturated, professional color look with fine grain)
- Alternative cell variations:
  * Fujicolor Pro 400H (slightly cooler, more vibrant greens and blues)
  * Kodachrome 64 (ultra-saturated, warm, vintage professional look)
  * Kodak Portra 160 (finer grain, slightly more muted)
  * Ilford Pan 100 (if B&W reference) or color equivalent
- Color grading: Warm color cast (matching salon skin tones), slightly lifted shadows, punchy midtones
- Tonal range: Full dynamic range with visible shadow detail and highlights

LIGHTING & EXPOSURE:
- Natural window light mixed with professional salon lighting (key light + fill light setup)
- Golden hour quality or salon's professional overhead + task lighting
- Some with dramatic lighting (one key light side, subtle shadows)
- Some with flat professional lighting (evenly lit)
- Backlighting subtle in some (rim light on hair)
- No harsh shadows on face; professional beauty lighting
- Exposure: Slightly exposed to skin-tone friendly (not blown out highlights)

FOCUS & SHARPNESS:
- Tack-sharp focus on eyes and face
- Professional focus transitions
- Natural bokeh (circular aperture bokeh from real lenses)
- Background sharpness varies by aperture

COMPOSITION & FRAMING:
- Vary shot types: close-up (shoulders up), medium (waist up), wider (seated full body visible)
- Different angles: straight-on portrait, 3/4 view, side profile, slight high angle (flattering), slight low angle
- Headroom varies naturally with composition
- Rule of thirds applied naturally
- Some with client looking at camera, some looking away at service action

VISUAL AESTHETIC & MOOD:
- Style: Professional beauty/salon photography inspired by Vogue, Harper's Bazaar, high-end salon portfolios
- Tone: Inviting, professional, luxurious, calm, serene, beautiful
- Feeling: High-end salon day, clients enjoying trusted service, comfortable environment
- Quality level: Magazine editorial professional, not AI-perfect

SKIN TEXTURE & REALISM:
- NATURAL SKIN TEXTURE: Visible pores, fine lines, subtle imperfections
- Freckles and beauty marks (natural distribution)
- Minor blemishes, skin variations (realistic skin tone variations, undertones)
- Skin: NOT retouched, NOT AI-perfect, NOT plastic/smooth
- Natural complexion with visible depth and dimension
- Real human skin with natural characteristics
- Subtle makeup (some with more makeup, some minimal, varies)

CRITICAL CONSISTENCY REQUIREMENTS:
- ALL 16 cells: Same recognizable salon room (same walls, mirrors, equipment, lighting setup)
- ALL 16 cells: Same general color palette and mood
- ALL 16 cells: Kodak Portra 400 film stock aesthetic (warm, professional, fine grain)
- ALL 16 cells: Professional magazine quality, beauty industry standard
- ALL 16 cells: Natural skin with texture and imperfections
- ALL 16 cells: Different people, different services, different clothing, different ethnicities, different ages
- ALL 16 cells: One cohesive grid showing a day in THIS SPECIFIC SALON

FINAL OUTPUT:
One image containing a 4x4 grid. Each cell shows ONE different client actively receiving salon service IN THE EXACT SALON ROOM FROM THE REFERENCE IMAGES. All 16 should be instantly recognizable as the same salon location. High-end beauty photography aesthetic.

${DEFAULT_NEGATIVE_PROMPTS}`;
  };

  // Helper to get default prompt for category
  const getDefaultPromptForCategory = (category: string) => {
    const oldPrompts = [
      'Beautiful woman with stunning hairstyle in modern salon, professional beauty photography, glossy magazine look',
      'Elegant nail art design on manicured hands, close-up professional beauty shot, intricate details',
      'Artistic tattoo design on skin, professional tattoo photography, clean aesthetic'
    ];
    if (oldPrompts.includes(DEFAULT_PROMPTS[category] || '')) {
      return DEFAULT_PROMPTS[category] || '';
    }
    return DEFAULT_PROMPTS[category] || '';
  };

  // Select element for generation
  const handleSelectElement = (element: Element) => {
    // Auto-upgrade old prompts (check if starts with old pattern)
    const oldPromptPatterns = [
      'Beautiful woman with stunning hairstyle in modern salon',
      'Elegant nail art design on manicured hands',
      'Artistic tattoo design on skin'
    ];
    
    let upgradedElement = { ...element };
    if (oldPromptPatterns.some(pattern => element.prompt.startsWith(pattern))) {
      upgradedElement.prompt = DEFAULT_PROMPTS[element.category] || element.prompt;
      // Update in elements array
      const updatedElements = elements.map(e => 
        e.id === element.id ? upgradedElement : e
      );
      setElements(updatedElements);
      localStorage.setItem('zira_elements', JSON.stringify(updatedElements));
    }
    
    setSelectedElement(upgradedElement);
    setSelectedCategory(upgradedElement.category);
    setGridUrl(null);
    setGridCells([]);
    setRefPhotosToUse(getRefPhotoCount());
    // Set the detailed professional prompt for editing
    setGridPromptText(getDetailedGridPrompt(upgradedElement.name));
  };

  // Generate grid
  const handleGenerateGrid = async () => {
    if (!LAOZHANG_API_KEY) {
      setError('Lao Zhang API key not configured');
      return;
    }
    if (!selectedElement) {
      setError('Please select an element');
      return;
    }

    const prompt = gridPromptText || selectedElement.prompt;

    setIsGeneratingGrid(true);
    setError(null);
    
    try {
      const client = createLaoZhangClient(LAOZHANG_API_KEY);

      // Get all photos from the selected category (from all elements)
      const categoryPhotos = elements
        .filter(el => el.category === selectedElement.category)
        .flatMap(el => el.photoUrls);
      
      // Randomly select exactly 10 photos
      const shuffled = categoryPhotos.sort(() => 0.5 - Math.random());
      const selectedPhotos = shuffled.slice(0, 10);
      setRefPhotosToUse(selectedPhotos.length);

      // Use user's edited prompt if provided, otherwise use the default detailed prompt
      const finalPrompt = gridPromptText || getDetailedGridPrompt(selectedElement.name);

      const options: ImageGenerationOptions = {
        prompt: finalPrompt,
        model: 'nano-banana-pro',
        imageSize: '4K',
        aspectRatio: '16:9',
        referenceImages: selectedPhotos.length > 0 ? selectedPhotos : undefined,
      };

      const result = await generateImage(client, options);

      trackImageGeneration(1);

      const cells: GridCell[] = CELL_LABELS.map((letter, index) => ({
        letter,
        index,
        isSelected: false,
        prompt: generateCellPromptWithVariations(selectedElement.prompt, index),
        status: 'pending' as const,
      }));

      setGridUrl(result.url);
      setGridCells(cells);

      const newGeneration: Generation = {
        id: Date.now().toString(),
        categoryId: selectedElement.category,
        categoryName: CATEGORIES.find(c => c.id === selectedElement.category)?.name || '',
        elementName: selectedElement.name,
        gridUrl: result.url,
        cells,
        createdAt: new Date(),
        totalCost: 0.05,
      };
      setGenerations(prev => [newGeneration, ...prev]);

      // Save to Supabase
      if (supabaseReady && userIdRef.current) {
        try {
          await supabaseSaveGeneration(userIdRef.current, newGeneration);
          console.log('✅ Grid saved to Supabase');
        } catch (err) {
          console.error('❌ Failed to save grid to Supabase:', err);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to generate grid');
    } finally {
      setIsGeneratingGrid(false);
    }
  };

  // Grid cell selection
  const handleGridClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!gridUrl || !gridImageRef.current) return;

    const rect = gridImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x / rect.width) * 4);
    const row = Math.floor((y / rect.height) * 4);
    const cellIndex = row * 4 + col;

    if (cellIndex >= 0 && cellIndex < 16) {
      setGridCells(prev => prev.map((cell, i) => 
        i === cellIndex ? { ...cell, isSelected: !cell.isSelected } : cell
      ));
    }
  }, [gridUrl]);

  // Update cell prompt
  const updateCellPrompt = (letter: string, newPrompt: string) => {
    setGridCells(prev => prev.map(cell =>
      cell.letter === letter ? { ...cell, prompt: newPrompt } : cell
    ));
  };

  // Generate selected cells
  const handleGenerateSelectedCells = async () => {
    const selectedCells = gridCells.filter(c => c.isSelected);
    if (selectedCells.length === 0) {
      setError('Please select at least one cell');
      return;
    }
    if (!LAOZHANG_API_KEY) {
      setError('Lao Zhang API key not configured');
      return;
    }

    setIsGeneratingCells(true);
    setError(null);

    try {
      const client = createLaoZhangClient(LAOZHANG_API_KEY);

      for (const cell of selectedCells) {
        setGridCells(prev => prev.map(c =>
          c.letter === cell.letter ? { ...c, status: 'generating' as const } : c
        ));

        try {
          const previousImages = gridCells
            .filter(c => c.resultUrl)
            .map(c => ({ prompt: c.prompt, url: c.resultUrl! }));

          const enhancedPrompt = buildEditPrompt(
            cell.prompt,
            previousImages,
            gridUrl || undefined
          ) + '. Close-up portrait, various camera angles, 35mm 50mm 85mm lenses, Kodak Portra 400 film, soft natural lighting, professional beauty photography.';

          const options: ImageGenerationOptions = {
            prompt: enhancedPrompt,
            model: 'nano-banana-pro',
            imageSize: '4K',
            aspectRatio: '1:1',
          };

          // Use same 10 random photos for consistency
          if (selectedElement && selectedElement.photoUrls.length > 0) {
            const categoryPhotos = elements
              .filter(el => el.category === selectedElement.category)
              .flatMap(el => el.photoUrls);
            const shuffled = categoryPhotos.sort(() => 0.5 - Math.random());
            const selectedPhotos = shuffled.slice(0, 10);
            if (selectedPhotos.length > 0) {
              options.referenceImages = selectedPhotos;
            }
          }

          const result = await generateImage(client, options);

          trackImageGeneration(1);

          setGridCells(prev => prev.map(c =>
            c.letter === cell.letter ? { ...c, status: 'completed' as const, resultUrl: result.url } : c
          ));
        } catch (err) {
          setGridCells(prev => prev.map(c =>
            c.letter === cell.letter ? { ...c, status: 'failed' as const } : c
          ));
        }
      }

      const updatedGenerations = setGenerations(prev => prev.map((gen, i) =>
        i === 0 ? {
          ...gen,
          cells: gridCells,
          totalCost: gen.totalCost + (selectedCells.length * 0.05)
        } : gen
      ));

      // Save updated generation to Supabase
      if (supabaseReady && userIdRef.current) {
        try {
          const updatedGen = generations[0];
          if (updatedGen) {
            await supabaseSaveGeneration(userIdRef.current, {
              ...updatedGen,
              cells: gridCells,
              totalCost: updatedGen.totalCost + (selectedCells.length * 0.05)
            });
            console.log('✅ Full images saved to Supabase');
          }
        } catch (err) {
          console.error('❌ Failed to save full images to Supabase:', err);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to generate cells');
    } finally {
      setIsGeneratingCells(false);
    }
  };

  const selectedCellCount = gridCells.filter(c => c.isSelected).length;
  const totalCost = 0.05 + (selectedCellCount * 0.05);
  const categoryElements = elements.filter(e => e.category === selectedCategory);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Debug Info:');
    console.log('Total elements:', elements.length);
    console.log('Selected category:', selectedCategory);
    console.log('Category elements:', categoryElements.length);
    console.log('All elements:', elements.map(e => ({ id: e.id, name: e.name, category: e.category })));
  }, [elements.length, selectedCategory, categoryElements.length]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050505 0%, #0a0a0a 50%, #050505 100%)',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(5,5,5,0.9)',
        backdropFilter: 'blur(30px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}>
              Z
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '18px' }}>Zavira</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>AI SALON</div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16,185,129,0.1)',
            padding: '6px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#10b981',
              borderRadius: '50%',
            }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Navigation */}
        <nav style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(255,255,255,0.03)',
          padding: '6px',
          borderRadius: '16px',
          width: 'fit-content',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: activeTab === tab.id ? '#000' : 'rgba(255,255,255,0.6)',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  marginLeft: '8px',
                  display: 'inline-block',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : 'rgba(16,185,129,0.3)',
                  color: activeTab === tab.id ? '#fff' : '#10b981',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Error Display */}
        {error && (
          <div style={{
            color: '#ef4444',
            fontSize: '14px',
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.1)',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        {/* === ELEMENTS TAB === */}
        {activeTab === 'elements' && (
          <div>
            {/* Debug Info Bar */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.7)',
            }}>
              <div>
                Total: {elements.length} | {selectedCategory}: {categoryElements.length}
              </div>
              <button
                onClick={async () => {
                  setIsLoading(true);
                  const userId = userIdRef.current;
                  const supabaseElements = await supabaseFetchElements(userId);
                  if (supabaseElements.length > 0) {
                    setElements(supabaseElements);
                    localStorage.setItem('zavira_elements', JSON.stringify(supabaseElements));
                  }
                  setIsLoading(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 Refresh from Supabase
              </button>
            </div>

            {/* Category Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              overflowX: 'auto',
              paddingBottom: '8px',
            }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color: selectedCategory === cat.id ? '#000' : 'rgba(255,255,255,0.6)',
                    background: selectedCategory === cat.id
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ marginRight: '6px' }}>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Create Element Button */}
            <button
              onClick={handleCreateElement}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '2px dashed rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '24px',
              }}
            >
              + Create New Element
            </button>

            {/* Elements Grid */}
            {categoryElements.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '20px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📦</div>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  No elements yet for {currentCategory.name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                  Create your first element to start generating
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {categoryElements.map((element) => (
                  <div key={element.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: selectedElement?.id === element.id 
                      ? '2px solid #10b981' 
                      : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                  }} onClick={() => handleSelectElement(element)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '4px' }}>{element.name}</div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                          {element.photoUrls.length} photos
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditElement(element); }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteElement(element.id); }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(239,68,68,0.2)',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {/* Photo Preview */}
                    {element.photoUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 0' }}>
                        {element.photoUrls.slice(0, 6).map((url, i) => (
                          <div key={i} style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}>
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                        {element.photoUrls.length > 6 && (
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.5)',
                          }}>
                            +{element.photoUrls.length - 6}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                      {element.prompt.substring(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === GENERATE TAB === */}
        {activeTab === 'generate' && (
          <div>
            {/* Category Selection */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Select Category</h2>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {CATEGORIES.map((cat) => {
                  const hasElements = elements.some(e => e.category === cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        minWidth: '100px',
                        textAlign: 'center',
                        color: selectedCategory === cat.id ? '#000' : 'rgba(255,255,255,0.6)',
                        background: selectedCategory === cat.id
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{cat.icon}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{cat.name}</div>
                      {hasElements && (
                        <div style={{ fontSize: '11px', marginTop: '4px', color: 'rgba(255,255,255,0.5)' }}>
                          {elements.filter(e => e.category === cat.id).length} elements
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Elements List */}
            {categoryElements.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Select Element</h3>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {categoryElements.map((element) => (
                    <button
                      key={element.id}
                      onClick={() => handleSelectElement(element)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        minWidth: '120px',
                        textAlign: 'center',
                        background: selectedElement?.id === element.id
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(255,255,255,0.05)',
                        border: selectedElement?.id === element.id
                          ? '2px solid #10b981'
                          : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{element.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        {element.photoUrls.length} photos
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Button */}
            {selectedElement && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                      Generate for: {selectedElement.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      {getRefPhotoCount()} reference photos will be used (10 max)
                    </div>
                  </div>
                  
                  {/* Prompt Editor */}
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ✏️ Prompt Editor
                    </div>
                    <textarea
                      id="gridPrompt"
                      value={gridPromptText}
                      onChange={(e) => setGridPromptText(e.target.value)}
                      placeholder="Describe what you want to generate..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '14px',
                        resize: 'vertical',
                        minHeight: '80px',
                        fontFamily: 'inherit',
                        marginBottom: '8px',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      💡 This prompt will be used to generate the 4x4 grid
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGenerateGrid}
                    disabled={isGeneratingGrid}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '14px',
                      fontSize: '15px',
                      fontWeight: 700,
                      background: isGeneratingGrid
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      cursor: isGeneratingGrid ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
                    }}
                  >
                    {isGeneratingGrid ? '⏳ Generating...' : '✨ Generate 4x4 Grid ($0.05)'}
                  </button>
                </div>
              </div>
            )}

            {/* Debug Info */}
            {selectedElement && (
              <div style={{
                background: 'rgba(255,165,0,0.1)',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(255,165,0,0.3)',
                marginBottom: '16px',
                fontSize: '12px',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>🔍 Debug Info</div>
                <div>Elements in "{selectedElement.category}" category: {elements.filter(el => el.category === selectedElement.category).length}</div>
                <div>Total photos available: {elements.filter(el => el.category === selectedElement.category).flatMap(el => el.photoUrls).length}</div>
                <div>Photos to be used (max 10): {getRefPhotoCount()}</div>
                {getRefPhotoCount() > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,165,0,0.2)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Sample URLs:</div>
                    {elements.filter(el => el.category === selectedElement.category).flatMap(el => el.photoUrls).slice(0, 2).map((url, i) => (
                      <div key={i} style={{ fontSize: '10px', wordBreak: 'break-all', color: 'rgba(255,165,0,0.8)', marginBottom: '2px' }}>
                        {i+1}. {url.substring(0, 80)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grid Display */}
            {gridUrl && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
                  🎨 Generated Grid Image
                </h3>

                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: '24px',
                }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                    💡 View your grid image. You can download it, crop it, or use it as-is. When ready, go to the Post section to create final images.
                  </p>
                  <div style={{
                    background: '#0d0d0d',
                    borderRadius: '12px',
                    padding: '12px',
                    aspectRatio: '16/9',
                    overflow: 'auto',
                  }}>
                    <img
                      src={gridUrl}
                      alt="Generated Grid"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <a
                      href={gridUrl}
                      download={`grid-${Date.now()}.png`}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.5)',
                        borderRadius: '8px',
                        color: '#10b981',
                        textDecoration: 'none',
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ⬇️ Download Image
                    </a>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 280px',
                  gap: '20px'
                }}>
                  {/* Cell Generation Panel */}
                  <div>
                    {/* Selected Cell Prompts */}
                    {selectedCellCount > 0 && (
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                          Edit Prompts ({selectedCellCount})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                          {gridCells.filter(c => c.isSelected).map((cell) => (
                            <div key={cell.letter}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  background: cell.status === 'completed' ? '#10b981' : 'rgba(16,185,129,0.2)',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}>
                                  {cell.status === 'completed' ? '✓' : cell.letter}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>Cell {cell.letter}</span>
                              </div>
                              <textarea
                                value={cell.prompt}
                                onChange={(e) => updateCellPrompt(cell.letter, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  background: 'rgba(0,0,0,0.3)',
                                  color: '#fff',
                                  fontSize: '12px',
                                  resize: 'vertical',
                                  minHeight: '50px',
                                  fontFamily: 'inherit',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleGenerateSelectedCells}
                          disabled={isGeneratingCells}
                          style={{
                            width: '100%',
                            marginTop: '16px',
                            padding: '14px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 700,
                            background: isGeneratingCells
                              ? 'rgba(255,255,255,0.1)'
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            border: 'none',
                            cursor: isGeneratingCells ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isGeneratingCells ? '⏳ Generating...' : `🚀 Generate ($${(selectedCellCount * 0.05).toFixed(2)})`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === POST TAB === */}
        {activeTab === 'post' && (
          <PostSection
            generations={generations}
            onPost={handlePost}
            selectedPostImage={selectedPostImage}
            setSelectedPostImage={setSelectedPostImage}
            uploadedImages={uploadedImages}
            setUploadedImages={setUploadedImages}
          />
        )}

        {/* === USAGE TAB === */}
        {activeTab === 'usage' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
              📊 Usage & Billing Tracker
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Images Generated */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                  Total Images Generated
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
                  {generations.flatMap(g => g.cells.filter(c => c.resultUrl)).length + uploadedImages.length}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  Grid generations: {generations.length}
                </div>
              </div>

              {/* Cost Per Generation */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                  Cost Per Generation
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, marginRight: '8px' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue="0.05"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  Editable cost per grid or full image
                </div>
              </div>

              {/* Total Cost */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.1) 100%)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(16,185,129,0.3)',
              }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                  Total Cost (Today)
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                  ${((generations.length * 0.05) + (generations.flatMap(g => g.cells.filter(c => c.resultUrl)).length * 0.05)).toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(16,185,129,0.8)' }}>
                  {generations.length} grids + {generations.flatMap(g => g.cells.filter(c => c.resultUrl)).length} full images
                </div>
              </div>

              {/* Budget Status */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                gridColumn: 'span 1',
              }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                  Monthly Budget
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, marginRight: '8px' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue="50"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  Set your monthly limit
                </div>
              </div>
            </div>

            {/* Breakdown Table */}
            <div style={{
              marginTop: '32px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Generation History
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '12px 0' }}>Category</th>
                      <th style={{ textAlign: 'left', padding: '12px 0' }}>Created</th>
                      <th style={{ textAlign: 'right', padding: '12px 0' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generations.map(gen => (
                      <tr key={gen.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 0' }}>🖼️ Grid</td>
                        <td style={{ padding: '12px 0' }}>{gen.categoryName}</td>
                        <td style={{ padding: '12px 0' }}>{new Date(gen.createdAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0', color: '#10b981' }}>$0.05</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === SAVED IMAGES TAB === */}
        {activeTab === 'saved' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
              💾 Saved Grid Images ({generations.length})
            </h2>
            {generations.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
                  No saved grids yet. Generate one in the Generate tab!
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {generations.map((gen, idx) => (
                  <div key={gen.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      background: '#0d0d0d',
                      padding: '12px',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}>
                      <img
                        src={gen.gridUrl}
                        alt={`Grid ${idx + 1}`}
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                      />
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                        {gen.categoryName} - {gen.elementName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                        {new Date(gen.createdAt).toLocaleDateString()} at {new Date(gen.createdAt).toLocaleTimeString()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                        Generated cells: {gen.cells.filter(c => c.resultUrl).length}/16
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={gen.gridUrl}
                          download={`grid-${gen.id}.png`}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'rgba(16,185,129,0.2)',
                            border: '1px solid rgba(16,185,129,0.5)',
                            borderRadius: '6px',
                            color: '#10b981',
                            textDecoration: 'none',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ⬇️ Download
                        </a>
                        <button
                          onClick={() => {
                            setActiveTab('post');
                            setSelectedPostImage({
                              url: gen.gridUrl,
                              letter: 'grid',
                              generationId: gen.id
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'rgba(59,130,246,0.2)',
                            border: '1px solid rgba(59,130,246,0.5)',
                            borderRadius: '6px',
                            color: '#3b82f6',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          📤 Post
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === REVIEW TAB === */}
        {activeTab === 'review' && (
          <ReviewSection generations={generations} postedContent={postedContent} />
        )}
      </main>

      {/* === EDIT ELEMENT MODAL === */}
      {isEditingElement && editingElement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#0a0a0a',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
              {editingElement.id ? 'Edit Element' : 'Create Element'}
            </h2>

            {/* Category */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                Category
              </label>
              <select
                value={editingElement.category}
                onChange={(e) => setEditingElement({ ...editingElement, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                Name
              </label>
              <input
                type="text"
                placeholder="e.g., Long Wavy Hair"
                value={editingElement.name}
                onChange={(e) => setEditingElement({ ...editingElement, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Photos */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                Reference Photos ({editingElement.photoUrls?.length || 0})
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {editingElement.photoUrls?.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img
                      src={url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <button
                      onClick={() => handleRemovePhoto(url)}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddPhoto}
                  style={{ display: 'none' }}
                />
                📸 Add Photos
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsEditingElement(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveElement}
                disabled={isUploading}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {isUploading ? '⏳ Saving...' : 'Save Element'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          main { padding: 16px 12px !important; }
          nav { width: 100% !important; }
          nav button { flex: 1 !important; padding: 10px 12px !important; font-size: 13px !important; }
          [style*="grid-template-columns: 1fr 280px"] {
            grid-template-columns: 1fr !important;
          }
          button { -webkit-tap-highlight-color: transparent; }
        }
      `}</style>
    </div>
  );
}

// Post Section - SIMPLE
function PostSection({
  generations,
  onPost,
  selectedPostImage,
  setSelectedPostImage,
  uploadedImages,
  setUploadedImages
}: {
  generations: Generation[];
  onPost: (image: {url: string, letter: string, generationId: string}, caption: string, hashtags: string[], musicUrl: string, platform: 'tiktok' | 'instagram') => Promise<void>;
  selectedPostImage: {url: string, letter: string, generationId: string} | null;
  setSelectedPostImage: (img: {url: string, letter: string, generationId: string} | null) => void;
  uploadedImages: {url: string, name: string}[];
  setUploadedImages: Dispatch<SetStateAction<{url: string, name: string}[]>>;
 }) {
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#ZaviraSalon #Winnipeg #HairSalon');
  const [musicUrl, setMusicUrl] = useState('');
  const [trendingTrack, setTrendingTrack] = useState<AudiusTrack | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
  const [isPosting, setIsPosting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchTrendingTrack = async () => {
      setLoadingTrack(true);
      const tracks = await getTrendingTracks('week', 1);
      if (tracks.length > 0) {
        const track = tracks[0];
        setTrendingTrack(track);
        setMusicUrl(track.stream_url || '');
      }
      setLoadingTrack(false);
    };

    fetchTrendingTrack();
  }, []);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const handlePlayPause = () => {
    if (!trendingTrack) return;

    if (playingTrackId === trendingTrack.id) {
      if (audio) {
        audio.pause();
        setPlayingTrackId(null);
      }
    } else {
      if (audio) {
        audio.pause();
      }

      if (trendingTrack.stream_url) {
        const newAudio = new Audio(trendingTrack.stream_url);
        newAudio.play().catch(err => console.error('Playback error:', err));
        setAudio(newAudio);
        setPlayingTrackId(trendingTrack.id);

        newAudio.addEventListener('ended', () => {
          setPlayingTrackId(null);
        });
      }
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImages((prev: {url: string, name: string}[]) => [...prev, {
          url: dataUrl,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const completedImages = [
    ...uploadedImages.map(img => ({
      url: img.url,
      letter: img.name.split('.')[0].substring(0, 10),
      generationId: 'uploaded',
    })),
    ...generations.flatMap(gen =>
      gen.cells.filter(c => c.resultUrl).map(c => ({
        url: c.resultUrl!,
        letter: c.letter,
        generationId: gen.id,
      }))
    )
  ];

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleConfirmPost = async () => {
    if (!selectedPostImage) return;
    setShowPreview(false);
    setIsPosting(true);
    await onPost(selectedPostImage, caption, hashtags.split(' ').filter(h => h), musicUrl, platform);
    setIsPosting(false);
    setSelectedPostImage(null);
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
  };

  const quickTemplates = [
    { label: 'Hair ✨', caption: 'Transform your look! ✨ Book at Zavira Salon #HairTransformation' },
    { label: 'Nail 💅', caption: 'Fresh nails, fresh vibes 💅 Book your appointment! #NailArt' },
    { label: 'Tattoo 🖊️', caption: 'Art that lasts forever 🖊️ Custom designs available #TattooArt' },
    { label: 'Glow ✨', caption: 'Feeling fabulous! ✨ Come get your glow at Zavira #SalonGlow' },
    { label: 'Trendy 🔥', caption: '2026 hair trends are HERE! 🔥 What\'s your vibe? #HairTrends' },
  ];

  const trendingHashtags = [
    '#ZaviraSalon #Winnipeg #SalonLife #BeautyServices',
    '#TrendingHair #SalonVibes #BeautyTransformation #LocalBusiness',
    '#SalonGlow #BeautyGoals #HairOfTheDay #NailArt',
    '#FYP #ForYouPage #Trending #BeautyTok #SalonAesthetic',
  ];

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>🚀 Post Content</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
        Upload any photo or select a generated image to post with music, captions & hashtags
      </p>

      {/* Upload Button */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUploadImage}
            style={{ display: 'none' }}
          />
          📱 + Add Images from Phone
        </label>
        {uploadedImages.length > 0 && (
          <span style={{ marginLeft: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            {uploadedImages.length} photo(s) added
          </span>
        )}
      </div>

      {completedImages.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📸</div>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>No images selected</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginTop: '8px' }}>
            Upload photos from your phone or generate images first
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedPostImage ? '1fr 350px' : '1fr', gap: '24px' }}>
          {/* Image Grid */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Select Image</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {completedImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedPostImage(img)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: selectedPostImage?.url === img.url 
                      ? '3px solid #10b981' 
                      : '2px solid transparent',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {img.generationId === 'uploaded' ? '📱 ' : '✨ '}{img.letter}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Post Form */}
          {selectedPostImage && (
            <div>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <img 
                  src={selectedPostImage.url} 
                  alt="Selected" 
                  style={{ width: '100%', borderRadius: '12px', marginBottom: '16px' }} 
                />

                {/* Platform */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {(['tiktok', 'instagram'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        background: platform === p ? '#10b981' : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {p === 'tiktok' ? '🎵 TikTok' : '📷 Instagram'}
                    </button>
                  ))}
                </div>

                {/* Caption */}
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write caption..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '60px',
                    marginBottom: '12px',
                    fontFamily: 'inherit',
                  }}
                />

                {/* Quick Templates */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {quickTemplates.map(t => (
                    <button
                      key={t.label}
                      onClick={() => setCaption(t.caption)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Hashtags */}
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#hashtags"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '13px',
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Quick hashtags:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {trendingHashtags.map((tags, idx) => (
                      <button
                        key={idx}
                        onClick={() => setHashtags(tags)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 500,
                        }}
                      >
                        {tags.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending Music */}
                <div style={{ marginBottom: '12px' }}>
                  {loadingTrack ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '13px',
                    }}>
                      Loading trending music...
                    </div>
                  ) : trendingTrack ? (
                    <div style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '10px',
                      padding: '10px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                          <img
                            src={trendingTrack.artwork['480x480'] || trendingTrack.artwork['150x150']}
                            alt={trendingTrack.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                          />
                          <button
                            onClick={handlePlayPause}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: playingTrackId === trendingTrack.id ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
                              cursor: 'pointer',
                              border: 'none',
                              borderRadius: '6px',
                            }}
                          >
                            {playingTrackId === trendingTrack.id ? (
                              <span style={{ color: '#fff', fontSize: '16px' }}>⏸</span>
                            ) : (
                              <span style={{ color: '#fff', fontSize: '16px' }}>▶</span>
                            )}
                          </button>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {trendingTrack.title}
                          </p>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {trendingTrack.artist}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{formatDuration(trendingTrack.duration)}</span>
                            {trendingTrack.genre && (
                              <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.7)' }}>
                                {trendingTrack.genre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>✓ Auto-included</span>
                        <input
                          type="text"
                          value={musicUrl}
                          onChange={(e) => setMusicUrl(e.target.value)}
                          placeholder="Music URL (auto-filled)"
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '11px',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '13px',
                    }}>
                      No trending music available
                    </div>
                  )}
                </div>

                {/* Review & Post Button */}
                <button
                  onClick={handlePreview}
                  disabled={isPosting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    background: isPosting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    cursor: isPosting ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: 700,
                  }}
                >
                  {isPosting ? '⏳ Posting...' : '👁️ Review & Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedPostImage && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.95)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#0a0a0a',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              👁️ Preview Post
            </h2>

            {/* Preview Image */}
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              <img 
                src={selectedPostImage.url} 
                alt="Preview" 
                style={{ width: '100%', display: 'block' }} 
              />
            </div>

            {/* Platform Badge */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ 
                background: platform === 'tiktok' ? '#fe2c55' : '#E1306C',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}>
                {platform === 'tiktok' ? '🎵 TikTok' : '📷 Instagram'}
              </span>
            </div>

            {/* Caption Preview */}
            {caption && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Caption</div>
                <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{caption}</p>
              </div>
            )}

            {/* Hashtags Preview */}
            {hashtags && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Hashtags</div>
                <p style={{ fontSize: '13px', color: '#10b981' }}>{hashtags}</p>
              </div>
            )}

            {/* Music Preview */}
            {trendingTrack && (
              <div style={{ 
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>🎵 Music</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={trendingTrack.artwork['150x150']}
                    alt={trendingTrack.title}
                    style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{trendingTrack.title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{trendingTrack.artist}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelPreview}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={handleConfirmPost}
                disabled={isPosting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: isPosting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {isPosting ? '⏳ Posting...' : '🚀 Confirm Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Review Section - Shows Posted Content Preview
function ReviewSection({ 
  generations, 
  postedContent 
}: { 
  generations: Generation[];
  postedContent: PostedContent[];
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>✅ Review</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
        Your posted content with captions, hashtags, and music
      </p>

      {postedContent.length === 0 && generations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>✅</div>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>No content yet</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginTop: '8px' }}>
            Generate and post content to see it here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Posted Content */}
          {postedContent.map((post) => (
            <div key={post.id} style={{
              background: 'rgba(16,185,129,0.1)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ 
                      background: post.platform === 'tiktok' ? '#fe2c55' : '#E1306C',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>
                      {post.platform}
                    </span>
                    <span style={{ 
                      background: post.status === 'posted' ? '#10b981' : post.status === 'pending' ? '#f59e0b' : '#ef4444',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {post.status}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      Cell {post.cellLetter}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '14px', marginBottom: '8px', lineHeight: 1.5 }}>
                    {post.caption}
                  </p>
                  
                  <p style={{ fontSize: '13px', color: '#10b981', marginBottom: '8px' }}>
                    {post.hashtags.join(' ')}
                  </p>
                  
                  {post.musicUrl && (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      🎵 Music: {post.musicUrl}
                    </p>
                  )}
                  
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                    Posted: {post.postedAt.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Generations (not yet posted) */}
          {generations.filter(g => !postedContent.some(p => p.generationId === g.id)).map((gen) => (
            <div key={gen.id} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{gen.categoryName} - {gen.elementName}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  {gen.createdAt.toLocaleString()} • ${gen.totalCost.toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {gen.cells.filter(c => c.resultUrl).map((cell) => (
                  <div key={cell.letter} style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <img src={cell.resultUrl} alt={`Cell ${cell.letter}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}>
                      {cell.letter}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

