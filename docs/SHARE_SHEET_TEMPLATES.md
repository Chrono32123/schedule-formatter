# Template Selection in Share Sheet

## Overview

The Share Sheet now includes a **Template Selector** that allows users to preview and export their schedules using different visual templates without leaving the share dialog.

## Features

### Template Selection
- **Dropdown Menu**: Users can select from 8 predefined templates
- **Live Preview**: Image regenerates automatically when template is selected
- **Loading Indicator**: Visual feedback while the new image is being generated
- **Disabled State**: Buttons are disabled during image generation to prevent conflicts

### Available Templates in Share Sheet

When users click "Share Schedule", they can choose from:

1. **Default** - The currently generated template
2. **Compact** - Minimalist layout that fits more events
3. **Story** - Vertical layout for Instagram/Snapchat stories (1080×1920)
4. **Wide** - Horizontal layout for Twitter/Discord (1200×675)
5. **Light** - Clean light theme
6. **Minimal** - Ultra-clean design with no decorations

### How It Works

1. User generates a schedule image (using current settings)
2. Share Sheet opens with the generated image
3. User can select a different template from the dropdown
4. Image automatically regenerates with the new template
5. User can download or share the newly styled image

### Technical Implementation

#### Canvas Renderer Support

The `canvasRenderer.ts` now includes a template-aware function:

```typescript
export async function renderScheduleToCanvasWithTemplate(
  template: ScheduleTemplate,
  events: ParsedEvent[],
  twitchUsername: string,
  profileImageUrl: string | undefined,
  extractCategory: (desc: string) => string | null
): Promise<string>
```

This function:
- Accepts a `ScheduleTemplate` object
- Extracts all rendering parameters from the template
- Calls the existing `renderScheduleToCanvas` with proper configuration
- Returns a data URL of the generated image

#### Share Sheet Enhancements

The `ShareSheet` component now:
- Accepts optional template-related props (`events`, `twitchUsername`, `profileImageUrl`, `extractCategory`)
- Shows template selector only when these props are provided
- Manages image regeneration state with loading indicator
- Updates filename to include template name
- Maintains backward compatibility (works without template support)

#### Props Interface

```typescript
interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl: string;
  filename: string;
  title: string;
  // Template support (optional)
  events?: ParsedEvent[];
  twitchUsername?: string;
  profileImageUrl?: string;
  extractCategory?: (desc: string) => string | null;
}
```

### User Experience

#### Visual Feedback
- **Loading Spinner**: Appears over the preview during regeneration
- **Disabled Buttons**: Download and Copy buttons are disabled during generation
- **Helper Text**: Informs users that preview updates automatically

#### Performance
- **On-Demand Generation**: Only regenerates when template is changed
- **Caching**: Initial image is cached and reused when returning to default
- **Efficient Rendering**: Canvas-based rendering is fast (typically < 1 second)

### Usage Example

```typescript
// In App.tsx
<ShareSheet
  open={shareSheetOpen}
  onClose={() => setShareSheetOpen(false)}
  imageDataUrl={scheduleImageDataUrl}
  filename={`${twitchUsername}_schedule.png`}
  title={`${twitchUsername}'s Stream Schedule`}
  // Template support props
  events={events}
  twitchUsername={twitchUsername}
  profileImageUrl={profileImageUrl}
  extractCategory={extractCategory}
/>
```

### Backward Compatibility

The template selector only appears when template support props are provided. If called without these props, the Share Sheet works exactly as before:

```typescript
// Still works - no template selector shown
<ShareSheet
  open={open}
  onClose={onClose}
  imageDataUrl={imageUrl}
  filename="schedule.png"
  title="Schedule"
/>
```

### Future Enhancements

Potential improvements:
- Template thumbnails/previews in the dropdown
- Remember user's last selected template
- Custom template creator in the Share Sheet
- Side-by-side template comparison
- Template recommendations based on event count
- Export multiple templates at once
