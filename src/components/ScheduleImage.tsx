// src/components/ScheduleImage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ParsedEvent } from '../App';
import { renderScheduleToCanvas } from '../utils/canvasRenderer';
import { formatStartEndDates } from '../utils/dateFormatting';
import { Typography } from '@mui/material';
import './scheduleImage.css';

interface ImageSize {
  width: number;
  height: number;
}

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
}

export const GenerateScheduleImage = async (props: Props): Promise<string | null> => {
  const { size, events, eventCount, twitchUsername, profileImageUrl, extractCategory, showEndDate, showDuration, dateFormat } = props;

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
      'Created with Stream Schedule Formatter',
      extractCategory,
      showEndDate,
      showDuration,
      dateFormat
    );

    return dataUrl;
  } catch (err) {
    console.error('Image generation failed', err);
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
        className="schedule-image-root"
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
                Powered by Easy Stream Schedule Tool
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};