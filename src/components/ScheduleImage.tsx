// src/components/ScheduleImage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ParsedEvent } from '../App';
import { renderScheduleToCanvas, renderScheduleToCanvasWithTemplate } from '../utils/canvasRenderer';
import { formatStartEndDates } from '../utils/dateFormatting';
import { Typography } from '@mui/material';
import './scheduleImage.css';
import { ScheduleTemplate } from '../types/template';

interface ImageSize {
  width: number;
  height: number;
}

/**
 * Legacy Props interface for backward compatibility
 * Use TemplateProps for new template-based rendering
 */
interface Props {
  events: ParsedEvent[];
  eventCount: number;
  twitchUsername: string;
  daysForward: string;
  profileImageUrl?: string;
  extractCategory: (desc: string) => string | null;
  size: ImageSize;
  showEndDate?: boolean;
  showDuration?: boolean;
  dateFormat?: string;
  lightMode?: boolean;
  profileRingColor?: string;
}

/**
 * Template-based Props interface
 * Combines template configuration with runtime data
 */
interface TemplateProps {
  template: ScheduleTemplate;
  events: ParsedEvent[];
  eventCount: number;
  twitchUsername: string;
  daysForward: string;
  profileImageUrl?: string;
  extractCategory: (desc: string) => string | null;
}

/**
 * Convert legacy Props to TemplateProps for backward compatibility
 */
function propsToTemplateProps(props: Props): TemplateProps & { template: ScheduleTemplate } {
  const { size, showEndDate, showDuration, dateFormat, lightMode, profileRingColor, ...rest } = props;
  
  // Create a template from legacy props
  const template: ScheduleTemplate = {
    id: 'legacy',
    name: 'Legacy',
    resolution: { width: size.width, height: size.height },
    colorScheme: lightMode 
      ? {
          background: '#f5f5f5',
          text: '#2a2a2a',
          accent: '#9146FF',
          border: '#d0d0d0',
          subtle: '#666666',
        }
      : {
          background: '#1a1a1a',
          text: '#ffffff',
          accent: '#9146FF',
          border: '#555555',
          subtle: '#cccccc',
        },
    lightMode: lightMode ?? false,
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
      showEndDate: showEndDate ?? false,
      showDuration: showDuration ?? false,
      showCategory: true,
      showCategoryImage: true,
      dateFormat: dateFormat ?? 'MM-DD-YYYY hh:mm A',
    },
    profileConfig: {
      showAvatar: true,
      avatarSize: 110,
      avatarBorderColor: profileRingColor ?? '#9146FF',
      showUsername: true,
      showDateRange: true,
    },
    footer: {
      text: 'Powered by Easy Stream Schedule Tool',
      show: true,
    },
    maxEvents: 7,
    autoScale: true,
  };
  
  return {
    ...rest,
    template,
  };
}

export const GenerateScheduleImage = async (props: Props): Promise<string | null> => {
  const { size, events, eventCount, twitchUsername, profileImageUrl, extractCategory, showEndDate, showDuration, dateFormat, lightMode, profileRingColor } = props;

  try {
    // Use Canvas-based rendering instead of html-to-image
    // This ensures:
    // 1. Always renders at exact 1080×1350px resolution
    // 2. No viewport-dependent CSS affecting output
    // 3. Consistent output across all devices (mobile, tablet, desktop)
    // 4. Faster rendering with no DOM conversion overhead
    const dataUrl = await renderScheduleToCanvas(
      {
        width: size.width,
        height: size.height,
        eventCount: eventCount,
      },
      events,
      twitchUsername,
      profileImageUrl,
      'Created with Stream Share',
      extractCategory,
      showEndDate,
      showDuration,
      dateFormat,
      lightMode,
      profileRingColor
    );

    return dataUrl;
  } catch (err) {
    console.error('Image generation failed', err);
    return null;
  }
};

/**
 * Generate schedule image using a template configuration
 * This is the preferred method for new implementations
 */
export const GenerateScheduleImageFromTemplate = async (props: TemplateProps): Promise<string | null> => {
  const { template, events, twitchUsername, profileImageUrl, extractCategory } = props;
  
  try {
    const dataUrl = await renderScheduleToCanvasWithTemplate(
      template,
      events,
      twitchUsername,
      profileImageUrl,
      extractCategory
    );

    return dataUrl;
  } catch (err) {
    console.error('Template-based image generation failed', err);
    return null;
  }
};

export const ScheduleImageTemplate: React.FC<Props> = ({
  events,
  twitchUsername,
  eventCount,
  daysForward,
  profileImageUrl,
  extractCategory,
  size,
  showEndDate,
  showDuration,
  dateFormat,
  lightMode = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const eventsRef = useRef<HTMLDivElement | null>(null);
  const [centerEvents, setCenterEvents] = useState<boolean>(false);

  // Measure available vs required height and toggle centering when events fit.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const header = headerRef.current;
    const footer = footerRef.current;
    const eventsEl = eventsRef.current;
    if (!wrapper || !header || !footer || !eventsEl) return;

    // Compute available vertical space inside the wrapper for events.
    const wrapperHeight = wrapper.clientHeight; // includes padding
    const headerHeight = header.offsetHeight;
    const footerHeight = footer.offsetHeight;

    const availableHeight = wrapperHeight - headerHeight - footerHeight;

    // Required height is the natural scrollHeight of the events list (all items stacked).
    const requiredHeight = eventsEl.scrollHeight;

    const fits = requiredHeight <= availableHeight;
    setCenterEvents(fits);

    // If it doesn't fit, compute a small nudge so the list is moved upward a bit
    // to avoid the last event being cut off visually. Clamp the nudge to 80px.
    const overflow = Math.max(0, requiredHeight - availableHeight);
    const nudge = Math.min(overflow, 80);
    eventsEl.style.setProperty('--events-nudge', `${nudge}px`);
  }, [events, eventCount, size.width, size.height]);

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: 0, width: `${size.width}px`, height: `${size.height}px` }}>
      {/* Canvas = target size, wrapper = base layout */}
      <div
        id="schedule-image-canvas"
        className={`schedule-image-root ${lightMode ? 'light-mode' : ''}`}
        style={{
          '--target-width': `${size.width}px`,
          '--target-height': `${size.height}px`,
          '--event-count': String(eventCount),
          '--fit-scale': `${Math.max(0.95 - (eventCount - 1) * 0.06, 0.5)}`,
          '--scale': `${size.width / 960}`,
        } as React.CSSProperties}
      >
        <div className="schedule-image-wrapper" ref={wrapperRef}>
          <div className="schedule-image-centering">
            {/* Header */}
            <div className="schedule-image-header" ref={headerRef}>
              {profileImageUrl && (
                <img src={profileImageUrl} className="schedule-image-avatar" alt="avatar" />
              )}
              <div className="schedule-image-header-text">
                <Typography variant="h3" className="schedule-image-title">
                  <strong>{twitchUsername ? `${twitchUsername}'s` : ''} Stream Schedule</strong>
                </Typography>
                <Typography variant="h4" className="schedule-image-subtitle">
                  <strong>{events[0].start.split(" ")[0]} - {events[events.length - 1].start.split(" ")[0]}</strong>
                </Typography>
              </div>
            </div>

            {/* Events */}
            <div
              ref={eventsRef}
              className={`schedule-image-events ${centerEvents ? 'center-events' : ''}`}>
              {events.map((ev, i) => {
                const dateFormatPattern = dateFormat || 'MM-DD-YYYY hh:mm A';
                const { startDisplay, endDisplay } = formatStartEndDates(ev.start, ev.end, dateFormatPattern);
                return (
                <div key={i} className="event-container">
                  <div className="event">
                    <div className="event-details">
                      <Typography variant="h4" className="event-title">
                        <strong>{ev.summary}</strong>
                      </Typography>
                      <Typography className="event-category">
                        <strong>Category:</strong> {extractCategory(ev.description)}
                      </Typography>
                      <Typography className="event-start">
                        <strong>Start:</strong> {startDisplay}
                      </Typography>
                      {showEndDate && endDisplay && (
                        <Typography className="event-end">
                          <strong>End:</strong> {endDisplay}
                        </Typography>
                      )}
                      {showDuration && ev.duration && (
                        <Typography className="event-duration">
                          <strong>Duration:</strong> {ev.duration}
                        </Typography>
                      )}
                    </div>
                    {ev.categoryImage && (
                      <img
                      src={ev.categoryImage}
                      alt="category"
                      className="event-image"
                      />
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="schedule-image-footer" ref={footerRef}>
              <Typography variant="caption">
                Powered by StreamShare
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Template-based Schedule Image Component
 * Renders schedule using a ScheduleTemplate configuration
 */
export const ScheduleImageTemplateFromTemplate: React.FC<TemplateProps> = (props) => {
  const { template, events, eventCount, twitchUsername, daysForward, profileImageUrl, extractCategory } = props;
  
  // Convert template to legacy props format to reuse existing component
  const legacyProps: Props = {
    events,
    eventCount,
    twitchUsername,
    daysForward,
    profileImageUrl,
    extractCategory,
    size: {
      width: template.resolution.width,
      height: template.resolution.height,
    },
    showEndDate: template.eventDisplay.showEndDate,
    showDuration: template.eventDisplay.showDuration,
    dateFormat: template.eventDisplay.dateFormat,
    lightMode: template.lightMode,
    profileRingColor: template.profileConfig.avatarBorderColor,
  };
  
  return <ScheduleImageTemplate {...legacyProps} />;
};