# Zavira AI Salon Studio - Final System Design

## User's Requirements (Clarified)

### 1. Categories (One-time Setup)
- 🪑 Chairs
- 💇 Hair section
- 💅 Manicure station
- 🦶 Pedicure station
- 🧖 Spa equipment
- 🏢 Salon interior

### 2. Photo Upload per Category
- Upload photos for each category
- Limit: 14 photos per category
- Photos used as reference/limit for generation

### 3. Grid Generation Flow
```
Click "Hair" → Generate 4x4 grid using uploaded hair photos
              ↓
         ┌─────────────────────────┐
         │ [A] [B] [C] [D]  (1K)   │
         │ [E] [F] [G] [H]         │  ← Grid uses
         │ [I] [J] [K] [L]         │    uploaded
         │ [M] [N] [O] [P]         │    photos
         └─────────────────────────┘
              ↓
User selects ANY number of cells (e.g., A, C, H, P)
              ↓
Edit prompt for each selected cell
              ↓
Generate full 4K images (+$0.05 per cell)
              ↓
Download or post results
```

### 4. Cost Breakdown
| Action | Cost |
|--------|------|
| Generate 4x4 grid | $0.05 |
| Each selected cell (4K) | +$0.05 |
| **Select 4 cells total** | $0.05 + 4×$0.05 = **$0.25** |

---

## Data Structure

```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface UploadedPhoto {
  id: string;
  url: string;           // Base64 or data URL
  fileName: string;
  uploadedAt: Date;
}

interface GridCell {
  letter: string;        // A, B, C, ... P
  index: number;         // 0-15
  isSelected: boolean;
  prompt: string;        // Editable before generation
}

interface GenerationResult {
  id: string;
  cellLetter: string;
  gridId: string;
  originalPrompt: string;
  editedPrompt: string;
  imageUrl: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  cost: number;
}

interface CategoryData {
  photos: UploadedPhoto[];
  grids: GridResult[];
}
```

---

## Categories Definition

```typescript
const CATEGORIES: Category[] = [
  { id: 'chairs', name: 'Chairs', icon: '🪑', description: 'Salon chairs and styling stations' },
  { id: 'hair', name: 'Hair Section', icon: '💇', description: 'Hair styling and services' },
  { id: 'manicure', name: 'Manicure', icon: '💅', description: 'Nail care and art' },
  { id: 'pedicure', name: 'Pedicure', icon: '🦶', description: 'Foot care services' },
  { id: 'spa', name: 'Spa', icon: '🧖', description: 'Spa treatments and rooms' },
  { id: 'interior', name: 'Interior', icon: '🏢', description: 'Salon interior and decor' },
  { id: 'products', name: 'Products', icon: '🧴', description: 'Retail products' },
  { id: 'team', name: 'Team', icon: '👥', description: 'Staff photos' },
];
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Zavira AI Salon Studio                            [LIVE]       │
├─────────────────────────────────────────────────────────────────┤
│  📸 Photos  │  ✨ Generate  │  ✅ Review  │  🎵 Trending       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: Select Category                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🪑 Chairs    💇 Hair    💅 Manicure    🦶 Pedicure        │ │
│  │ 🧖 Spa       🏢 Interior 🧴 Products   👥 Team            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  STEP 2: Upload Photos (Max 14)                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ 📸            │  │ 📸            │  │ 📸            │    │
│  │ Hair photo 1  │  │ Hair photo 2  │  │ Hair photo 3  │    │
│  │ [×]           │  │ [×]           │  │ [×]           │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│        [+ Upload More]                                          │
│        3/14 photos used                                         │
│                                                                 │
│  STEP 3: Generate Grid                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [✨ Generate 4x4 Grid - $0.05]                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  STEP 4: Grid Results                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ┌────┬────┬────┬────┐                                     │ │
│  │ │ A  │ B  │ C  │ D  │  ← Click multiple cells             │ │
│  │ ├────┼────┼────┼────┤  (selected = green border)          │ │
│  │ │ E  │ F  │ G  │ H  │                                     │ │
│  │ ├────┼────┼────┼────┤  Selected: A, C, H (3 cells)        │ │
│  │ │ I  │ J  │ K  │ L  │  Cost: $0.05 + 3×$0.05 = $0.20      │ │
│  │ ├────┼────┼────┼────┤                                     │ │
│  │ │ M  │ N  │ O  │ P  │                                     │ │
│  │ └────┴────┴────┴────┘                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  STEP 5: Edit Prompts (for selected cells)                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Cell A:                                                     │ │
│  │ [Edit prompt before generating...]                         │ │
│  │ "Professional hair styling at Zavira Salon, glossy black   │ │
│  │  chair, warm lighting, modern interior"                    │ │
│  │                                                              │
│  │ Cell C:                                                     │ │
│  │ [Edit prompt...]                                            │ │
│  │ "Close-up of client's beautiful wavy hair, soft lighting,  │ │
│  │  professional finish"                                       │ │
│  │                                                              │
│  │ Cell H:                                                     │ │
│  │ [Edit prompt...]                                            │ │
│  │ "Salon workspace with tools arranged, clean and organized"  │ │
│  │                                                              │
│  │ [🚀 Generate Selected ($0.20)]                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Files

```
src/
├── data/
│   └── categories.ts        # Category definitions
├── lib/
│   └── laozhang.ts          # API integration (from old project)
├── components/
│   ├── CategorySelector.tsx    # Category grid
│   ├── PhotoUploader.tsx       # Upload with 14 limit
│   ├── PhotoGrid.tsx           # Display uploaded photos
│   ├── GenerationGrid.tsx      # 4x4 grid with selection
│   ├── CellEditor.tsx          # Edit prompt per cell
│   └── BudgetPanel.tsx         # Cost tracking
├── App.tsx                      # Main app (updated)
└── main.tsx                     # Entry point
```

---

## API Key

```
File: zavira-image-gen\.env.local
LAOZHANG_API_KEY=your_key_here
```

**To use in app:**
```typescript
import.meta.env.VITE_LAOZHANG_API_KEY
// or
localStorage.getItem('laozhang_api_key')
```

---

## Ready to Implement?

This system gives you:
1. ✅ Category selection (Chairs, Hair, Manicure, etc.)
2. ✅ Photo upload per category (max 14)
3. ✅ 4x4 grid generation using uploaded photos
4. ✅ Multi-cell selection
5. ✅ Editable prompts before generation
6. ✅ Clear cost tracking
7. ✅ Full 4K generation per selected cell

Start implementation?
