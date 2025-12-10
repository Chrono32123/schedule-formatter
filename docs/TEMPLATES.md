# Template System Documentation

## Overview

The Stream Share template system provides a flexible, modular way to create and customize schedule images. Users can choose from predefined templates or create custom ones with full control over layout, styling, and content display.

## Architecture

### Core Components

1. **`src/types/template.ts`** - Type definitions and interfaces
2. **`src/templates/templates.ts`** - Predefined template configurations
3. **`src/components/ScheduleImage.tsx`** - Rendering components (supports both legacy and template-based props)

## Template Interface

### `ScheduleTemplate`

The main template interface includes:

- **Metadata**: `id`, `name`, `description`
- **Visual Styling**: `resolution`, `colorScheme`, `lightMode`
- **Typography**: Font sizes and family configuration
- **Layout**: Padding, spacing, and dimensions
- **Event Display**: What event information to show and how
- **Profile Config**: Avatar and header settings
- **Footer**: Footer text and visibility

### Example Template Structure

```typescript
const MY_TEMPLATE: ScheduleTemplate = {
  id: 'my-template',
  name: 'My Template',
  description: 'Custom template description',
  
  resolution: { width: 1080, height: 1350, label: 'Instagram Post' },
  colorScheme: COLOR_SCHEMES.DARK,
  lightMode: false,
  
  typography: {
    titleSize: 56,
    subtitleSize: 42,
    eventTitleSize: 44,
    eventMetaSize: 32,
    footerSize: 12,
    fontFamily: 'Roboto, sans-serif',
  },
  
  layout: {
    paddingTop: 50,
    paddingBottom: 80,
    paddingSides: 50,
    eventSpacing: 8,
    headerSpacing: 20,
    borderRadius: 20,
    eventWidth: 750,
  },
  
  eventDisplay: {
    showEndDate: false,
    showDuration: false,
    showCategory: true,
    showCategoryImage: true,
    dateFormat: 'MM-DD-YYYY hh:mm A',
  },
  
  profileConfig: {
    showAvatar: true,
    avatarSize: 110,
    avatarBorderColor: '#9146FF',
    showUsername: true,
    showDateRange: true,
  },
  
  footer: {
    text: 'Powered by Stream Share',
    show: true,
  },
  
  maxEvents: 7,
  autoScale: true,
};
```

## Predefined Templates

### Available Templates

1. **Default** - Clean, professional layout for Instagram posts (1080×1350)
2. **Compact** - Fits more events with smaller text and no category images (up to 10 events)
3. **Story** - Optimized for Instagram/Snapchat stories (1080×1920)
4. **Wide** - Horizontal layout for Twitter/Discord (1200×675)
5. **Light** - Same as default but with light color scheme
6. **Minimal** - Ultra-clean design with no borders, images, or footer

### Template Selection

```typescript
import { getTemplateById, ALL_TEMPLATES } from './templates/templates';

// Get specific template
const template = getTemplateById('compact');

// List all available templates
console.log(ALL_TEMPLATES.map(t => t.name));
```

## Preset Configurations

### Resolutions

```typescript
PRESET_RESOLUTIONS = {
  INSTAGRAM_STORY: { width: 1080, height: 1920, label: 'Instagram Story' },
  INSTAGRAM_POST: { width: 1080, height: 1350, label: 'Instagram Post (4:5)' },
  TWITTER_POST: { width: 1200, height: 675, label: 'Twitter Post (16:9)' },
  DISCORD_EMBED: { width: 1920, height: 1080, label: 'Discord Embed (16:9)' },
  SQUARE: { width: 1080, height: 1080, label: 'Square (1:1)' },
};
```

### Color Schemes

```typescript
COLOR_SCHEMES = {
  DARK: { background: '#1a1a1a', text: '#ffffff', accent: '#9146FF', ... },
  LIGHT: { background: '#f5f5f5', text: '#2a2a2a', accent: '#9146FF', ... },
  PURPLE: { background: '#2d1b4e', text: '#ffffff', accent: '#b794f6', ... },
  BLUE: { background: '#1e3a5f', text: '#ffffff', accent: '#60a5fa', ... },
  GREEN: { background: '#1a3d2e', text: '#ffffff', accent: '#34d399', ... },
};
```

## Usage

### Generating Images with Templates

```typescript
import { GenerateScheduleImageFromTemplate } from './components/ScheduleImage';
import { DEFAULT_TEMPLATE } from './templates/templates';

// Generate image using a template
const imageDataUrl = await GenerateScheduleImageFromTemplate({
  template: DEFAULT_TEMPLATE,
  events: parsedEvents,
  eventCount: parsedEvents.length,
  twitchUsername: 'MyChannel',
  profileImageUrl: 'https://...',
  extractCategory: (desc) => extractCategoryFromDescription(desc),
});
```

### Rendering Template-Based Components

```typescript
import { ScheduleImageTemplateFromTemplate } from './components/ScheduleImage';

<ScheduleImageTemplateFromTemplate
  template={STORY_TEMPLATE}
  events={events}
  eventCount={events.length}
  twitchUsername="MyChannel"
  profileImageUrl="https://..."
  extractCategory={extractCategory}
  daysForward="7"
/>
```

### Creating Custom Templates

```typescript
import { createDefaultTemplate, mergeTemplate } from './types/template';

// Create from scratch with some defaults
const customTemplate = createDefaultTemplate({
  id: 'custom',
  name: 'Custom',
  resolution: PRESET_RESOLUTIONS.SQUARE,
  colorScheme: COLOR_SCHEMES.BLUE,
});

// Merge with existing template
const modifiedTemplate = mergeTemplate(DEFAULT_TEMPLATE, {
  lightMode: true,
  colorScheme: COLOR_SCHEMES.LIGHT,
  eventDisplay: {
    ...DEFAULT_TEMPLATE.eventDisplay,
    showDuration: true,
  },
});
```

## Backward Compatibility

The system maintains full backward compatibility with existing code. The original `Props` interface and functions still work:

```typescript
// Legacy approach still works
<ScheduleImageTemplate
  events={events}
  size={{ width: 1080, height: 1350 }}
  showEndDate={false}
  lightMode={false}
  // ... other props
/>

// Legacy image generation still works
const imageUrl = await GenerateScheduleImage({
  events,
  size: { width: 1080, height: 1350 },
  // ... other props
});
```

## Migration Path

To migrate existing code to use templates:

1. Choose a predefined template or create a custom one
2. Replace individual props with `template` prop
3. Use `GenerateScheduleImageFromTemplate` instead of `GenerateScheduleImage`
4. Use `ScheduleImageTemplateFromTemplate` instead of `ScheduleImageTemplate`

## Future Enhancements

Potential additions to the template system:

- Template editor UI component
- Save/load custom templates to localStorage
- Template preview gallery
- More preset templates (gaming themes, holidays, etc.)
- Template validation and error handling
- Export/import templates as JSON
- Template sharing between users
