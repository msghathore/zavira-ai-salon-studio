import React, { useState, useRef, MouseEvent, useCallback, useEffect } from 'react';
import { generateImage, createLaoZhangClient, ImageGenerationOptions } from './lib/laozhang';
import { CATEGORIES, DEFAULT_PROMPTS, DEFAULT_NEGATIVE_PROMPTS, CELL_LABELS, Category } from './data/categories';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('hair');
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [postedContent, setPostedContent] = useState<PostedContent[]>([]);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('laozhang_api_key') || '');
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
  const gridImageRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string>(getUserId());

  const tabs = [
    { id: 'elements', label: 'Elements', icon: '📦' },
    { id: 'generate', label: 'Generate', icon: '✨' },
    { id: 'post', label: 'Post', icon: '🚀' },
    { id: 'review', label: 'Review', icon: '✅' },
  ];

  const currentCategory = CATEGORIES.find(c => c.id === selectedCategory)!;

  // Save API key
  useEffect(() => {
    if (apiKey) localStorage.setItem('laozhang_api_key', apiKey);
  }, [apiKey]);

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
          
          if (supabaseElements.length > 0) setElements(supabaseElements);
          if (supabaseGenerations.length > 0) setGenerations(supabaseGenerations);
          if (supabasePosted.length > 0) setPostedContent(supabasePosted);
          setSupabaseReady(true);
        }
        
        // Also load from localStorage as fallback
        const savedElements = localStorage.getItem('zavira_elements');
        if (savedElements) {
          try {
            const parsed = JSON.parse(savedElements);
            const localElements = parsed.map((e: any) => ({ ...e, createdAt: new Date(e.createdAt) }));
            if (!isSupabaseConfigured() || localElements.length > elements.length) {
              setElements(localElements);
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

  // Save elements to both Supabase and localStorage
  const syncElements = async (newElements: Element[]) => {
    setElements(newElements);
    localStorage.setItem('zavira_elements', JSON.stringify(newElements));
    
    if (supabaseReady) {
      try {
        for (const element of newElements) {
          await supabaseSaveElement(userIdRef.current, element);
        }
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
      id: Date.now().toString(),
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
        id: editingElement.id || Date.now().toString(),
        category: editingElement.category,
        name: editingElement.name,
        prompt: editingElement.prompt || DEFAULT_PROMPTS[editingElement.category] || '',
        negativePrompt: editingElement.negativePrompt || DEFAULT_NEGATIVE_PROMPTS,
        photoUrls: editingElement.photoUrls || [],
        createdAt: editingElement.createdAt || new Date(),
      };

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
      for (const file of files) {
        const url = await supabaseUploadPhoto(userIdRef.current, file);
        if (url) {
          setEditingElement(prev => prev ? {
            ...prev,
            photoUrls: [...(prev.photoUrls || []), url],
          } : null);
        }
      }
    } catch (err: any) {
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

  // Select element for generation
  const handleSelectElement = (element: Element) => {
    setSelectedElement(element);
    setSelectedCategory(element.category);
    setGridUrl(null);
    setGridCells([]);
  };

  // Generate grid
  const handleGenerateGrid = async () => {
    if (!apiKey) {
      setError('Please enter your Lao Zhang API key');
      return;
    }
    if (!selectedElement) {
      setError('Please select an element');
      return;
    }

    setIsGeneratingGrid(true);
    setError(null);

    try {
      const client = createLaoZhangClient(apiKey);
      
      // Build prompt with reference images if available
      let fullPrompt = selectedElement.prompt;
      if (selectedElement.photoUrls.length > 0) {
        fullPrompt += `. Reference style from provided photos.`;
      }

      const options: ImageGenerationOptions = {
        prompt: fullPrompt,
        model: 'nano-banana-pro',
        imageSize: '1K',
        aspectRatio: '1:1',
      };

      const result = await generateImage(client, options);

      const cells: GridCell[] = CELL_LABELS.map((letter, index) => ({
        letter,
        index,
        isSelected: false,
        prompt: `Cell ${letter}: ${fullPrompt}`,
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
    if (!apiKey) {
      setError('Please enter your Lao Zhang API key');
      return;
    }

    setIsGeneratingCells(true);
    setError(null);

    try {
      const client = createLaoZhangClient(apiKey);

      for (const cell of selectedCells) {
        setGridCells(prev => prev.map(c =>
          c.letter === cell.letter ? { ...c, status: 'generating' as const } : c
        ));

        try {
          const options: ImageGenerationOptions = {
            prompt: cell.prompt,
            model: 'nano-banana-pro',
            imageSize: '4K',
            aspectRatio: '1:1',
          };

          const result = await generateImage(client, options);

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
            {/* API Key Input */}
            {!apiKey && (
              <div style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#10b981' }}>
                  🔑 Lao Zhang API Key
                </h3>
                <input
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>
            )}

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
                      {selectedElement.photoUrls.length} reference photos will be used
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

                  {/* Budget & Selected Cells */}
                  <div>
                    {/* Budget */}
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Budget</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Grid</span>
                        <span>$0.05</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Selected ({selectedCellCount})</span>
                        <span style={{ color: '#10b981' }}>+ ${(selectedCellCount * 0.05).toFixed(2)}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(139,92,246,0.1)',
                        borderRadius: '10px',
                        marginTop: '12px',
                      }}>
                        <span style={{ fontWeight: 600 }}>Total</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa' }}>${totalCost.toFixed(2)}</span>
                      </div>
                    </div>

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
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
  const [isPosting, setIsPosting] = useState(false);

  const completedImages = generations.flatMap(gen => 
    gen.cells.filter(c => c.resultUrl).map(c => ({
      url: c.resultUrl!,
      letter: c.letter,
      generationId: gen.id,
    }))
  );

  const handlePost = async () => {
    if (!selectedPostImage) return;
    setIsPosting(true);
    await onPost(selectedPostImage, caption, hashtags.split(' ').filter(h => h), musicUrl, platform);
    setIsPosting(false);
    setSelectedPostImage(null);
  };

  const quickTemplates = [
    { label: 'Hair ✨', caption: 'Transform your look! ✨ Book at Zavira Salon' },
    { label: 'Nail 💅', caption: 'Fresh nails who dis 💅 Book your appointment!' },
    { label: 'Tattoo 🖊️', caption: 'Art that lasts forever 🖊️ Custom designs available' },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>🚀 Post Content</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
        Select an image and click Post - everything else happens in backend
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

                {/* Music */}
                <input
                  type="text"
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  placeholder="TikTok sound URL (optional)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                />

                {/* Post Button */}
                <button
                  onClick={handlePost}
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
                  {isPosting ? '⏳ Posting...' : '🚀 Post Now'}
                </button>
              </div>
            </div>
          )}
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

