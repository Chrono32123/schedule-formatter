/**
 * Canvas-based schedule image renderer
 * 
 * This module handles rendering the schedule directly to Canvas, eliminating
 * viewport-dependent CSS issues and providing precise control over output.
 * 
 * Key benefits:
 * - Always renders at exact 1080×1350px regardless of viewport
 * - Pixel-perfect control over layout and spacing
 * - No DOM conversion overhead
 * - Consistent output across all devices (desktop, mobile, tablet)
 */

import { ParsedEvent } from '../App';
import { formatStartEndDates } from './dateFormatting';
import moment from 'moment';

interface CanvasConfig {
  width: number;
  height: number;
  eventCount: number;
  dpi?: number;
}

interface TextMetrics {
  width: number;
  height: number;
}

// Color palette matching the dark theme
const COLORS = {
  background: '#1a1a1a',
  text: '#ffffff',
  subtle: '#cccccc',
  accent: '#9146FF',
  border: '#555555',
};

// Typography sizing (will scale based on event count via fitScale)
const TYPOGRAPHY = {
  baseSize: 16,
  titleSize: 56,
  subtitleSize: 42,
  eventTitleSize: 44,
  eventMetaSize: 32,
  footerSize: 12,
};

// Layout constants
const LAYOUT = {
  canvasWidth: 1080,
  canvasHeight: 1350,
  wrapperWidth: 960,
  wrapperHeight: 1350,
  eventWidth: 750,
  paddingTop: 50,
  paddingBottom: 80,
  paddingSides: 50,
  headerSpacing: 20,
  eventSpacing: 8,
  eventImageWidth: 130,
  eventImageHeight: 182,
  avatarSize: 110,
  borderRadius: 20,
  avatarMarginRight: 16,
  headerBottomMargin: 30,
  eventImageGap: 8,
  footerHeight: 30,
};

/**
 * Calculate fitScale based on event count
 * This scales content to fit 1-7 events in the same vertical space
 * Matches the formula in ScheduleImage.tsx: Math.max(0.95 - (eventCount - 1) * 0.06, 0.5)
 */
function calculateFitScale(eventCount: number): number {
  return Math.max(0.95 - (eventCount - 1) * 0.06, 0.5);
}

/**
 * Scale a dimension based on fitScale and optionally pixelRatio
 */
function scaleDimension(value: number, fitScale: number, pixelRatio: number = 1): number {
  return value * fitScale * pixelRatio;
}

/**
 * Draw rounded rectangle on canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Wrap text to fit within a maximum width
 * Returns array of text lines
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Draw text with automatic wrapping and line height
 * Returns the height consumed by the text
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = wrapText(ctx, text, maxWidth);
  let currentY = y;

  for (const line of lines) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY - y;
}

/**
 * Load and draw an image on canvas with rounded corners and optional border
 * Returns a promise that resolves when image is drawn
 */
function drawImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number = 0,
  borderColor?: string,
  borderWidth: number = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        ctx.save();

        // Create clipped region for rounded corners
        if (borderRadius > 0) {
          ctx.beginPath();
          drawRoundedRect(ctx, x, y, width, height, borderRadius);
          ctx.clip();
        }

        // Draw image
        ctx.drawImage(img, x, y, width, height);

        // Draw border if specified
        if (borderColor && borderWidth > 0) {
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = borderWidth;
          if (borderRadius > 0) {
            ctx.beginPath();
            drawRoundedRect(ctx, x, y, width, height, borderRadius);
            ctx.stroke();
          } else {
            ctx.strokeRect(x, y, width, height);
          }
        }

        ctx.restore();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Main canvas rendering function
 * 
 * This function:
 * 1. Creates a canvas at exact 1080×1350px resolution
 * 2. Renders header with avatar and title
 * 3. Renders all events with scaling based on event count
 * 4. Renders footer
 * 5. Exports as PNG data URL
 * 
 * The fitScale parameter ensures all events fit in the same vertical space
 * regardless of event count (1-7 events).
 */
export async function renderScheduleToCanvas(
  config: CanvasConfig,
  events: ParsedEvent[],
  twitchUsername: string,
  profileImageUrl: string | undefined,
  footerText: string,
  extractCategory: (desc: string) => string | null,
  showEndDate?: boolean,
  showDuration?: boolean,
  dateFormat?: string
): Promise<string> {
  const { width, height, eventCount, dpi = 1 } = config;
  const fitScale = calculateFitScale(eventCount);

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Set up high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  let currentY = 0;

  // ============================================
  // HEADER: Avatar + Title + Subtitle (Centered)
  // ============================================
  const headerTopMargin = 65; // Moved down 25px from original 40px
  let headerCenterX = width / 2;
  
  // Draw profile image if available (centered)
  if (profileImageUrl) {
    try {
      const avatarSize = scaleDimension(LAYOUT.avatarSize, 1);
      const avatarX = headerCenterX - avatarSize / 2;
      const avatarY = headerTopMargin;
      // Draw avatar with Twitch purple border
      await drawImage(ctx, profileImageUrl, avatarX, avatarY, avatarSize, avatarSize, 20, COLORS.accent, 4);
    } catch (err) {
      console.warn('Failed to load profile image', err);
    }
  }

  // Title text (centered)
  const titleSize = scaleDimension(TYPOGRAPHY.titleSize, fitScale);
  ctx.font = `bold ${titleSize}px 'Roboto', sans-serif`;
  ctx.fillStyle = COLORS.text;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  const titleText = twitchUsername ? `${twitchUsername}'s Stream Schedule` : 'Stream Schedule';
  ctx.fillText(titleText, headerCenterX, headerTopMargin + scaleDimension(LAYOUT.avatarSize, 1) + 16);

  // Subtitle (date range) - centered below title
  if (events.length > 0 && events[0].start) {
    const subtitleSize = scaleDimension(TYPOGRAPHY.subtitleSize, fitScale);
    ctx.font = `bold ${subtitleSize}px 'Roboto', sans-serif`;
    ctx.fillStyle = COLORS.subtle;

    // Only show date range if there's more than one event
    if (events.length > 1) {
      // Extract date part only (no time)
      // Handle both custom schedule format "MMM D, YYYY [at] h:mm A" and calendar formats like "MM-DD-YYYY hh:mm A"
      const extractDateOnly = (dateStr: string) => {
        // Try parsing with custom schedule format first
        let parsed = moment(dateStr, 'MMM D, YYYY [at] h:mm A');
        
        // If that didn't work, try with the calendar format
        if (!parsed.isValid() && dateFormat) {
          parsed = moment(dateStr, dateFormat);
        }
        
        // Format to a clean date format: "MMM D, YYYY"
        return parsed.isValid() ? parsed.format('MMM D, YYYY') : dateStr.split(' ')[0];
      };
      
      const startDate = extractDateOnly(events[0].start);
      const lastEventWithStart = events.findLast((e) => e.start) || events[0];
      const endDate = extractDateOnly(lastEventWithStart.start);
      
      const subtitleText = `${startDate} - ${endDate}`;
      ctx.fillText(subtitleText, headerCenterX, headerTopMargin + scaleDimension(LAYOUT.avatarSize, 1) + 16 + titleSize + 8);
    }
  }

  ctx.textAlign = 'left'; // Reset alignment for events

  // ============================================
  // EVENTS: Calculate total height and center vertically
  // ============================================
  currentY = 210; // Start events below centered header
  const contentHeight = height - currentY - scaleDimension(LAYOUT.footerHeight, fitScale) - 40;
  
  // Filter valid events and limit to maximum 7
  const validEvents = events.filter(e => e && e.summary).slice(0, 7);

  // Calculate total height needed for all events
  let totalEventHeight = 0;
  const eventTitleSize = scaleDimension(TYPOGRAPHY.eventTitleSize, fitScale);
  const eventMetaSize = scaleDimension(TYPOGRAPHY.eventMetaSize, fitScale);
  const eventImageHeight = scaleDimension(LAYOUT.eventImageHeight, fitScale);
  const eventDetailsWidth = width - 240 - scaleDimension(LAYOUT.eventImageWidth, fitScale) - scaleDimension(LAYOUT.eventImageGap, fitScale);

  for (const event of validEvents) {
    ctx.font = `bold ${eventTitleSize}px 'Roboto', sans-serif`;
    const titleLines = wrapText(ctx, event.summary, eventDetailsWidth);
    const titleHeight = titleLines.length * eventTitleSize * 1.2;
    const metadataHeight = eventMetaSize * 1.3 * 2;
    const eventHeight = Math.max(titleHeight + metadataHeight, eventImageHeight) + scaleDimension(16, fitScale);
    totalEventHeight += eventHeight;
  }

  // Center events vertically within available space
  const startingY = currentY + Math.max(0, (contentHeight - totalEventHeight) / 2);
  currentY = startingY;

  // ============================================
  // EVENTS: Render each event
  // ============================================
  const eventImageWidth = scaleDimension(LAYOUT.eventImageWidth, fitScale);
  const eventImageGap = scaleDimension(LAYOUT.eventImageGap, fitScale);

  for (const event of validEvents) {
    const eventLeft = 120;
    const eventImageX = width - 120 - eventImageWidth; // Right side with 120px right margin

    let eventContentY = currentY;

    // Draw event title
    ctx.font = `bold ${eventTitleSize}px 'Roboto', sans-serif`;
    ctx.fillStyle = COLORS.text;

    const titleLines = wrapText(ctx, event.summary, eventDetailsWidth);
    for (const line of titleLines) {
      ctx.fillText(line, eventLeft, eventContentY);
      eventContentY += eventTitleSize * 1.2;
    }

    // Draw event metadata (category + start time)
    ctx.font = `${eventMetaSize}px 'Roboto', sans-serif`;
    ctx.fillStyle = COLORS.subtle;

    const category = extractCategory(event.description) || 'Stream';
    ctx.fillText(`Playing: ${category}`, eventLeft, eventContentY);
    eventContentY += eventMetaSize * 1.3;

    // Format start/end dates intelligently (same day = show only end time)
    const dateFormatPattern = dateFormat || 'MM-DD-YYYY hh:mm A';
    const { startDisplay, endDisplay } = formatStartEndDates(event.start, event.end, dateFormatPattern);

    // Show date range: just start if no end date, or "start - end" if end date exists and showEndDate is true
    if (!showEndDate) {
      ctx.fillText(startDisplay, eventLeft, eventContentY);
    } else if (endDisplay) {
      ctx.fillText(`${startDisplay} - ${endDisplay}`, eventLeft, eventContentY);
    }
    eventContentY += eventMetaSize * 1.3;

    // Draw duration if showDuration is true and duration exists
    if (showDuration && event.duration) {
      ctx.fillText(`Duration: ${event.duration}`, eventLeft, eventContentY);
    }

    // Draw event image on the right if available
    if (event.categoryImage) {
      try {
        await drawImage(ctx, event.categoryImage, eventImageX, currentY, eventImageWidth, eventImageHeight, 8);
      } catch (err) {
        console.warn('Failed to load event image', err);
      }
    }

    // Move to next event with spacing
    const titleHeight = titleLines.length * eventTitleSize * 1.2;
    const metadataHeight = eventMetaSize * 1.3 * (2 + (showEndDate && event.end ? 1 : 0) + (showDuration && event.duration ? 1 : 0));
    const eventHeight = Math.max(titleHeight + metadataHeight, eventImageHeight) + scaleDimension(16, fitScale);
    currentY += eventHeight;
  }

  // ============================================
  // FOOTER
  // ============================================
  const footerSize = scaleDimension(TYPOGRAPHY.footerSize, fitScale) * 1.5;
  ctx.font = `${footerSize}px 'Roboto', sans-serif`;
  ctx.fillStyle = COLORS.subtle;
  ctx.globalAlpha = 0.85;
  ctx.textAlign = 'center';

  const footerY = height - 35;
  ctx.fillText(footerText, width / 2, footerY);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  // Convert canvas to PNG data URL
  return canvas.toDataURL('image/png', 1.0);
}
