// src/components/ScheduleImage.tsx
import React from 'react';
import { toPng } from 'html-to-image';
import { ParsedEvent } from '../App';
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
}

export const GenerateScheduleImage = async (props: Props): Promise<void> => {
  const { size } = props;
  const { eventCount } = props;
  const node = document.getElementById('schedule-image-canvas');
  if (!node) return;

  // Fixed size for 1080×1350
  node.style.setProperty('--target-width', size.width.toString(),'px');
  node.style.setProperty('--target-height', size.height.toString(),'px');
  node.style.setProperty('--event-count', eventCount.toString());
  node.style.setProperty('--fit-scale', (Math.max(0.95 - (eventCount - 1) * 0.04)).toString());

  try {
    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 1,
      width: size.width,
      height: size.height,
    });

    const link = document.createElement('a');
    link.download = `${props.twitchUsername || 'schedule'}_${size.width}x${size.height}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Image generation failed', err);
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
}) => {
  return (
    <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
      {/* Canvas = target size, wrapper = base layout */}
      <div
        id="schedule-image-canvas"
        className="schedule-image-root"
        style={{
          '--target-width': `${size.width}px`,
          '--target-height': `${size.height}px`,
          '--event-count': eventCount,        // ← pass to CSS
          '--spacing-scale': `${Math.max(0.95 - (eventCount - 1) * 0.04)}`, // ← auto-scale
        } as React.CSSProperties}
      >
        <div className="schedule-image-wrapper">
          <div className="schedule-image-centering">
            {/* Header */}
            <div className="schedule-image-header">
              {profileImageUrl && (
                <img src={profileImageUrl} className="schedule-image-avatar" alt="avatar" />
              )}
              <Typography variant="h2" className="schedule-image-title">
                <strong>{twitchUsername ? `${twitchUsername}'s` : ''} Stream Schedule</strong>
              </Typography>
              <Typography variant="h3" className="schedule-image-subtitle">
                <strong>{events[0].start.split(" ")[0]} - {events[events.length - 1].start.split(" ")[0]}</strong>
              </Typography>
            </div>

            {/* Events */}
            <div className="schedule-image-events">
              {events.map((ev, i) => (
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
                        <strong>Start:</strong> {ev.start}
                      </Typography>
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
              ))}
            </div>

            {/* Footer */}
            <div className="schedule-image-footer">
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