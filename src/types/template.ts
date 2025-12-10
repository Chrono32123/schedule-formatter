/**
 * Template Types and Interfaces
 * 
 * This module defines the template system for customizable schedule images.
 * Templates allow users to choose from different layouts, styles, and configurations
 * while maintaining consistency with the ParsedEvent data model.
 */

import { ParsedEvent } from '../App';

/**
 * Image resolution/size configuration
 */
export interface ImageResolution {
  width: number;
  height: number;
  label?: string; // User-friendly label like "Instagram Story (1080x1920)"
}

/**
 * Color scheme for the template
 */
export interface ColorScheme {
  background: string;
  text: string;
  accent: string;
  border: string;
  subtle: string;
}

/**
 * Typography configuration
 */
export interface TypographyConfig {
  titleSize: number;
  subtitleSize: number;
  eventTitleSize: number;
  eventMetaSize: number;
  footerSize: number;
  fontFamily?: string;
}

/**
 * Layout spacing and dimensions
 */
export interface LayoutConfig {
  paddingTop: number;
  paddingBottom: number;
  paddingSides: number;
  eventSpacing: number;
  headerSpacing: number;
  borderRadius: number;
  eventWidth?: number; // Optional, can be auto-calculated
  mode?: 'vertical' | 'horizontal-row'; // Layout rendering mode
}

/**
 * Display options for event information
 */
export interface EventDisplayOptions {
  showEndDate: boolean;
  showDuration: boolean;
  showCategory: boolean;
  showCategoryImage: boolean;
  dateFormat: string;
}

/**
 * Profile/Header configuration
 */
export interface ProfileConfig {
  showAvatar: boolean;
  avatarSize: number;
  avatarBorderColor?: string;
  showUsername: boolean;
  showDateRange: boolean;
}

/**
 * Footer configuration
 */
export interface FooterConfig {
  text: string;
  show: boolean;
}

/**
 * Complete template configuration
 * This interface combines all customization options for schedule image generation
 */
export interface ScheduleTemplate {
  // Template metadata
  id: string;
  name: string;
  description?: string;
  
  // Visual styling
  resolution: ImageResolution;
  colorScheme: ColorScheme;
  lightMode: boolean;
  
  // Typography
  typography: TypographyConfig;
  
  // Layout
  layout: LayoutConfig;
  
  // Display options
  eventDisplay: EventDisplayOptions;
  profileConfig: ProfileConfig;
  footer: FooterConfig;
  
  // Additional customizations
  maxEvents?: number; // Maximum events to display
  autoScale?: boolean; // Auto-scale content to fit
}

/**
 * Props for template-based rendering
 * Combines the template with runtime data (events, username, etc.)
 */
export interface TemplateRenderProps {
  template: ScheduleTemplate;
  events: ParsedEvent[];
  twitchUsername: string;
  profileImageUrl?: string;
  extractCategory: (desc: string) => string | null;
}

/**
 * Predefined image resolutions for common use cases
 */
export const PRESET_RESOLUTIONS: Record<string, ImageResolution> = {
  INSTAGRAM_STORY: {
    width: 1080,
    height: 1920,
    label: 'Instagram Story',
  },
  INSTAGRAM_POST: {
    width: 1080,
    height: 1350,
    label: 'Instagram Post (4:5)',
  },
  TWITTER_POST: {
    width: 1200,
    height: 675,
    label: 'Twitter Post (16:9)',
  },
  DISCORD_EMBED: {
    width: 1920,
    height: 1080,
    label: 'Discord Embed (16:9)',
  },
  SQUARE: {
    width: 1080,
    height: 1080,
    label: 'Square (1:1)',
  },
  CUSTOM: {
    width: 1080,
    height: 1350,
    label: 'Custom',
  },
};

/**
 * Default color schemes
 */
export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  DARK: {
    background: '#1a1a1a',
    text: '#ffffff',
    accent: '#9146FF',
    border: '#555555',
    subtle: '#cccccc',
  },
  LIGHT: {
    background: '#f5f5f5',
    text: '#2a2a2a',
    accent: '#9146FF',
    border: '#d0d0d0',
    subtle: '#666666',
  },
  PURPLE: {
    background: '#2d1b4e',
    text: '#ffffff',
    accent: '#b794f6',
    border: '#6b46c1',
    subtle: '#d6bcfa',
  },
  BLUE: {
    background: '#1e3a5f',
    text: '#ffffff',
    accent: '#60a5fa',
    border: '#3b82f6',
    subtle: '#93c5fd',
  },
  GREEN: {
    background: '#1a3d2e',
    text: '#ffffff',
    accent: '#34d399',
    border: '#10b981',
    subtle: '#6ee7b7',
  },
};

/**
 * Helper function to create a default template
 */
export function createDefaultTemplate(overrides?: Partial<ScheduleTemplate>): ScheduleTemplate {
  return {
    id: 'default',
    name: 'Default Template',
    description: 'Standard schedule layout for Instagram posts',
    
    resolution: PRESET_RESOLUTIONS.INSTAGRAM_POST,
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
      text: 'Powered by Easy Stream Schedule Tool',
      show: true,
    },
    
    maxEvents: 7,
    autoScale: true,
    
    ...overrides,
  };
}

/**
 * Merge template with partial updates
 */
export function mergeTemplate(
  base: ScheduleTemplate,
  updates: Partial<ScheduleTemplate>
): ScheduleTemplate {
  return {
    ...base,
    ...updates,
    resolution: { ...base.resolution, ...updates.resolution },
    colorScheme: { ...base.colorScheme, ...updates.colorScheme },
    typography: { ...base.typography, ...updates.typography },
    layout: { ...base.layout, ...updates.layout },
    eventDisplay: { ...base.eventDisplay, ...updates.eventDisplay },
    profileConfig: { ...base.profileConfig, ...updates.profileConfig },
    footer: { ...base.footer, ...updates.footer },
  };
}
