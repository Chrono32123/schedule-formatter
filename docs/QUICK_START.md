# Template System - Quick Start Guide

## For Users

### Using Template Selection in Share Sheet

1. **Generate Your Schedule**
   - Load your Twitch calendar or create a custom schedule
   - Click "Share Schedule" button

2. **Select a Template**
   - In the Share Sheet dialog, you'll see a "Template Style" dropdown
   - Select any template to instantly preview it
   - The image will regenerate automatically

3. **Download or Share**
   - Once you're happy with the template, click "Download Image" or "Copy Image"
   - The filename will include the template name (e.g., `mychannel_compact.png`)

### Template Recommendations

- **1-4 events**: Use "Default" template
- **5-7 events**: Use "Default" template
- **8+ events**: Use "Compact" template
- **Instagram Stories**: Use "Story" template (vertical)
- **Twitter/Discord**: Use "Wide" template (horizontal)
- **Light backgrounds**: Use "Light" template
- **Clean minimal look**: Use "Minimal" template

## For Developers

### Adding the Template System to Your App

#### 1. Import Template Components

```typescript
import { GenerateScheduleImageFromTemplate } from './components/ScheduleImage';
import { ALL_TEMPLATES, getTemplateById } from './templates/templates';
```

#### 2. Generate Images with Templates

```typescript
// Using a predefined template
const template = getTemplateById('compact');
const imageUrl = await GenerateScheduleImageFromTemplate({
  template,
  events: parsedEvents,
  eventCount: parsedEvents.length,
  twitchUsername: 'myChannel',
  daysForward: '7',
  profileImageUrl: 'https://...',
  extractCategory: (desc) => extractCategoryFromDesc(desc),
});
```

#### 3. Enable Template Selection in Share Sheet

Simply pass the required props to ShareSheet:

```typescript
<ShareSheet
  open={shareSheetOpen}
  onClose={() => setShareSheetOpen(false)}
  imageDataUrl={scheduleImageDataUrl}
  filename="schedule.png"
  title="My Schedule"
  // Add these props to enable template selection:
  events={events}
  twitchUsername={twitchUsername}
  profileImageUrl={profileImageUrl}
  extractCategory={extractCategory}
/>
```

### Creating Custom Templates

```typescript
import { createDefaultTemplate, ScheduleTemplate } from './types/template';

const myTemplate: ScheduleTemplate = createDefaultTemplate({
  id: 'my-custom',
  name: 'My Custom Template',
  resolution: { width: 1080, height: 1350 },
  colorScheme: {
    background: '#1a1a1a',
    text: '#ffffff',
    accent: '#00ff00',
    border: '#333333',
    subtle: '#cccccc',
  },
  eventDisplay: {
    showEndDate: true,
    showDuration: true,
    showCategory: true,
    showCategoryImage: true,
    dateFormat: 'MM-DD-YYYY hh:mm A',
  },
});
```

### Architecture Overview

```
User clicks "Share Schedule"
         ↓
App.tsx generates image with current settings
         ↓
ShareSheet opens with initial image
         ↓
User selects different template
         ↓
ShareSheet.tsx calls GenerateScheduleImageFromTemplate()
         ↓
ScheduleImage.tsx calls renderScheduleToCanvasWithTemplate()
         ↓
canvasRenderer.ts generates new image with template config
         ↓
ShareSheet updates preview with new image
         ↓
User downloads/shares the styled image
```

## File Structure

```
src/
├── types/
│   └── template.ts              # Template interfaces and presets
├── templates/
│   └── templates.ts             # Predefined template configurations
├── components/
│   ├── ScheduleImage.tsx        # Template-aware image generation
│   └── ShareSheet.tsx           # Template selection UI
├── utils/
│   └── canvasRenderer.ts        # Template-based canvas rendering
└── App.tsx                      # Integration point
```

## Key Functions

### Template Creation
- `createDefaultTemplate(overrides)` - Create template with defaults
- `mergeTemplate(base, updates)` - Merge template configurations
- `getTemplateById(id)` - Get predefined template by ID

### Image Generation
- `GenerateScheduleImage(props)` - Legacy function (still works)
- `GenerateScheduleImageFromTemplate(props)` - Template-based generation
- `renderScheduleToCanvas(...)` - Low-level canvas rendering
- `renderScheduleToCanvasWithTemplate(...)` - Template-aware rendering

### React Components
- `<ScheduleImageTemplate>` - Legacy component (still works)
- `<ScheduleImageTemplateFromTemplate>` - Template-based component
- `<ShareSheet>` - With built-in template selection

## Backward Compatibility

✅ All existing code continues to work
✅ No breaking changes to APIs
✅ Template features are opt-in
✅ Legacy components and functions are maintained

## Next Steps

1. **Try the Templates**: Open Share Sheet and select different templates
2. **Create Custom Templates**: Use `createDefaultTemplate()` for your brand
3. **Extend the System**: Add more presets to `templates.ts`
4. **Improve UX**: Add template thumbnails, recommendations, etc.

For detailed documentation, see:
- `docs/TEMPLATES.md` - Complete template system documentation
- `docs/SHARE_SHEET_TEMPLATES.md` - Share Sheet feature guide
