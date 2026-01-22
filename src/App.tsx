import React, { useState, useRef, MouseEvent, useCallback, useEffect } from 'react';
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
  const gridImageRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string>(getUserId());
  
  const LAOZHANG_API_KEY = (import.meta.env["VITE_LAOZHANG_API_KEY"] || "");
  
  const tabs = [
    { id: 'elements', label: 'Elements', icon: '📦' },
    { id: 'generate', label: 'Generate', icon: '✨' },
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
    setGridPromptText(upgradedElement.prompt);
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

      const gridPrompt = `
Create a 4x4 grid with exactly 16 DIFFERENT clients actively getting ${selectedElement.name || 'salon services'}
IN a professional salon. The salon room is set up with professional ${selectedElement.category === 'hair' ? 'styling chairs, mirrors, and salon equipment' : selectedElement.category === 'nail' ? 'nail stations with lamps and tools' : selectedElement.category === 'tattoo' ? 'tattoo studio bed/chair with professional setup' : selectedElement.category === 'massage' ? 'massage therapy beds and spa setup' : 'facial treatment room with professional setup'}.
Clients are sitting or lying down comfortably ACTIVELY RECEIVING the service.

RANDOMIZE EACH OF THE 16 CLIENTS - ALL DIFFERENT:
- Skin tones: vary from very light to deep/dark (represent all ethnicities)
- Ethnicities: diverse - include Asian, African, Latin American, European, Middle Eastern, Indian, and mixed heritage
- Ages: range from 20s to 50s, show different age groups
- Hair types: straight, wavy, curly, coily, different colors (black, brown, blonde, red, gray), different lengths
- Expressions: some smiling, some relaxed, some focused, natural expressions
- Camera perspective: vary between different angles (some head-on, some 3/4 view, some from side)
- Camera equipment variation: shot with different brands (Canon, Nikon, Sony implied by slight variations)
- Lens effects: vary shallow depth of field (f/1.8, f/2.8) to deeper focus (f/5.6, f/8)
- Body positioning: different arm positions, hand placements, body angles
- Clothing: different colors and styles appropriate for salon

CONSISTENT ACROSS ALL 16:
- Film stock: Kodak Portra 400 (consistent professional salon color film look)
- Lighting: Professional salon lighting mixed with soft natural window light
- Quality: Professional magazine editorial quality, beauty industry standard
- Skin texture: NATURAL skin with visible texture, freckles, minor imperfections, realistic skin - NOT AI-perfect or overly smoothed
- Background: The actual salon room visible with professional equipment, mirrors, plants, professional decor
- Service: All 16 clients actively receiving the ${selectedElement.category} service - can see the action happening

MOOD: Professional, happy, beautiful salon environment, clients enjoying and trusting the service, high-end salon feel.

${DEFAULT_NEGATIVE_PROMPTS}`;

      const options: ImageGenerationOptions = {
        prompt: gridPrompt,
        model: 'nano-banana-pro',
        imageSize: '4K',
        aspectRatio: '21:9',
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
            aspectRatio: '16:9',
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

      setGenerations(prev => prev.map((gen, i) => 
        i === 0 ? { 
          ...gen, 
          cells: gridCells,
          totalCost: gen.totalCost + (selectedCells.length * 0.05)
        } : gen
      ));

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
            </button>
          ))}
        </nav>

        <div style={{ marginBottom: '24px', maxWidth: '320px' }}>
          <BudgetTracker />
        </div>

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

            {/* Grid Display */}
            {gridUrl && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
                  Select Cells ({selectedCellCount} selected)
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
                  {/* Grid */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div
                      ref={gridImageRef}
                      onClick={handleGridClick}
                      style={{
                        aspectRatio: '1',
                        background: '#0d0d0d',
                        borderRadius: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'crosshair',
                      }}
                    >
                      <img
                        src={gridUrl}
                        alt="Grid"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      {/* Grid lines */}
                      {[1, 2, 3].map(i => (
                        <React.Fragment key={i}>
                          <div style={{
                            position: 'absolute',
                            left: `${i * 25}%`,
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            background: 'rgba(255,255,255,0.4)',
                            zIndex: 5,
                          }} />
                          <div style={{
                            position: 'absolute',
                            top: `${i * 25}%`,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'rgba(255,255,255,0.4)',
                            zIndex: 5,
                          }} />
                        </React.Fragment>
                      ))}
                      {/* Cell labels */}
                      {gridCells.map((cell, i) => {
                        const col = i % 4;
                        const row = Math.floor(i / 4);
                        return (
                          <div key={cell.letter} style={{
                            position: 'absolute',
                            left: `${col * 25 + 2}%`,
                            top: `${row * 25 + 2}%`,
                            width: '21%',
                            height: '21%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 800,
                            color: cell.isSelected ? '#000' : 'rgba(255,255,255,0.9)',
                            background: cell.isSelected ? '#10b981' : 'rgba(0,0,0,0.6)',
                            borderRadius: '4px',
                            zIndex: 10,
                            cursor: 'pointer',
                            border: cell.isSelected ? '2px solid #fff' : 'none',
                          }}>
                            {cell.letter}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Cells Only */}
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
          />
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

            {/* Prompt */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                Prompt
              </label>
              <textarea
                value={editingElement.prompt}
                onChange={(e) => setEditingElement({ ...editingElement, prompt: e.target.value })}
                placeholder="Describe what you want to generate..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Negative Prompt */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                Negative Prompt
              </label>
              <textarea
                value={editingElement.negativePrompt}
                onChange={(e) => setEditingElement({ ...editingElement, negativePrompt: e.target.value })}
                placeholder="What to avoid..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '60px',
                  fontFamily: 'inherit',
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
  setSelectedPostImage
}: { 
  generations: Generation[];
  onPost: (image: {url: string, letter: string, generationId: string}, caption: string, hashtags: string[], musicUrl: string, platform: 'tiktok' | 'instagram') => Promise<void>;
  selectedPostImage: {url: string, letter: string, generationId: string} | null;
  setSelectedPostImage: (img: {url: string, letter: string, generationId: string} | null) => void;
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

  const completedImages = generations.flatMap(gen => 
    gen.cells.filter(c => c.resultUrl).map(c => ({
      url: c.resultUrl!,
      letter: c.letter,
      generationId: gen.id,
    }))
  );

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
    { label: 'Hair ✨', caption: 'Transform your look! ✨ Book at Zavira Salon' },
    { label: 'Nail 💅', caption: 'Fresh nails who dis 💅 Book your appointment!' },
    { label: 'Tattoo 🖊️', caption: 'Art that lasts forever 🖊️ Custom designs available' },
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
        Select an image and click Review & Post to preview before publishing
      </p>

      {completedImages.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>🚀</div>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>No images to post</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginTop: '8px' }}>
            Generate images first
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
                    background: 'rgba(0,0,0,0.7)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}>
                    {img.letter}
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
                    marginBottom: '12px',
                  }}
                />

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

