/**
 * Predefined Schedule Templates
 * 
 * This module provides a collection of ready-to-use templates that users can
 * choose from. Each template is optimized for different use cases and platforms.
 */

import {
  ScheduleTemplate,
  PRESET_RESOLUTIONS,
  COLOR_SCHEMES,
  createDefaultTemplate,
} from '../types/template';

/**
 * Default template - Optimized for Instagram posts (4:5 ratio)
 * Shows essential information with clean, professional styling
 */
export const DEFAULT_TEMPLATE: ScheduleTemplate = createDefaultTemplate({
  id: 'default',
  name: 'Default',
  description: 'Clean and professional layout for Instagram posts',
});

/**
 * Compact template - Fits more events in less space
 * Ideal for schedules with many events
 */
export const COMPACT_TEMPLATE: ScheduleTemplate = createDefaultTemplate({
  id: 'compact',
  name: 'Compact',
  description: 'Minimalist layout that fits more events',
  
  typography: {
    titleSize: 48,
    subtitleSize: 36,
    eventTitleSize: 38,
    eventMetaSize: 28,
    footerSize: 10,
    fontFamily: 'Roboto, sans-serif',
  },
  
  layout: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingSides: 40,
    eventSpacing: 6,
    headerSpacing: 16,
    borderRadius: 20,
    eventWidth: 780,
  },
  
  eventDisplay: {
    showEndDate: false,
    showDuration: false,
    showCategory: true,
    showCategoryImage: false, // Hide images to save space
    dateFormat: 'MM-DD hh:mm A',
  },
  
  maxEvents: 10,
});

/**
 * Story template - Optimized for Instagram/Snapchat stories (9:16 ratio)
 * Vertical format with large, readable text
 */
export const STORY_TEMPLATE: ScheduleTemplate = createDefaultTemplate({
  id: 'story',
  name: 'Story',
  description: 'Vertical layout for Instagram and Snapchat stories',
  
  resolution: PRESET_RESOLUTIONS.INSTAGRAM_STORY,
  
  typography: {
    titleSize: 64,
    subtitleSize: 48,
    eventTitleSize: 52,
    eventMetaSize: 40,
    footerSize: 16,
    fontFamily: 'Roboto, sans-serif',
  },
  
  layout: {
    paddingTop: 80,
    paddingBottom: 100,
    paddingSides: 60,
    eventSpacing: 16,
    headerSpacing: 28,
    borderRadius: 24,
    eventWidth: 960,
  },
  
  eventDisplay: {
    showEndDate: false,
    showDuration: true,
    showCategory: true,
    showCategoryImage: true,
    dateFormat: 'ddd, MMM DD - hh:mm A',
  },
  
  maxEvents: 5,
});

/**
 * Wide template - Optimized for Twitter/X and Discord (16:9 ratio)
 * Horizontal layout with side-by-side events if needed
 */
export const WIDE_TEMPLATE: ScheduleTemplate = createDefaultTemplate({
  id: 'wide',
  name: 'Wide',
  description: 'Horizontal layout for Twitter and Discord',
  
  resolution: PRESET_RESOLUTIONS.TWITTER_POST,
  
  typography: {
    titleSize: 48,
    subtitleSize: 36,
    eventTitleSize: 36,
    eventMetaSize: 26,
    footerSize: 12,
    fontFamily: 'Roboto, sans-serif',
  },
  
  layout: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingSides: 60,
    eventSpacing: 20,
    headerSpacing: 18,
    borderRadius: 16,
    eventWidth: 1080,
    mode: 'horizontal-row',
  },
  
  eventDisplay: {
    showEndDate: false,
    showDuration: true,
    showCategory: true,
    showCategoryImage: true,
    dateFormat: 'MM/DD hh:mm A',
  },
  
  profileConfig: {
    showAvatar: true,
    avatarSize: 90,
    avatarBorderColor: '#9146FF',
    showUsername: true,
    showDateRange: true,
  },
  
  maxEvents: 4,
});

/**
 * Light mode template - Same as default but with light color scheme
 */
export const LIGHT_TEMPLATE: ScheduleTemplate = createDefaultTemplate({
  id: 'light',
  name: 'Light',
  description: 'Clean light theme for bright, airy schedules',
  
  colorScheme: COLOR_SCHEMES.LIGHT,
  lightMode: true,
});

/**
 * Minimal template - Ultra-clean design with minimal decorations
 */
export const MINIMAL_TEMPLATE: ScheduleTemplate = createDefaultTemplate({
  id: 'minimal',
  name: 'Minimal',
  description: 'Ultra-clean design with no borders or images',
  
  typography: {
    titleSize: 52,
    subtitleSize: 38,
    eventTitleSize: 42,
    eventMetaSize: 30,
    footerSize: 11,
    fontFamily: 'Roboto, sans-serif',
  },
  
  layout: {
    paddingTop: 50,
    paddingBottom: 80,
    paddingSides: 50,
    eventSpacing: 10,
    headerSpacing: 20,
    borderRadius: 0, // No rounded corners
    eventWidth: 750,
  },
  
  eventDisplay: {
    showEndDate: false,
    showDuration: false,
    showCategory: true,
    showCategoryImage: false, // No images for minimal look
    dateFormat: 'MM-DD-YYYY hh:mm A',
  },
  
  profileConfig: {
    showAvatar: false, // No avatar for minimal look
    avatarSize: 0,
    showUsername: true,
    showDateRange: true,
  },
  
  footer: {
    text: '',
    show: false, // No footer for minimal look
  },
});

/**
 * All available templates exported as an array
 */
export const ALL_TEMPLATES: ScheduleTemplate[] = [
  DEFAULT_TEMPLATE,
  COMPACT_TEMPLATE,
  STORY_TEMPLATE,
  WIDE_TEMPLATE,
  LIGHT_TEMPLATE,
  MINIMAL_TEMPLATE,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ScheduleTemplate | undefined {
  return ALL_TEMPLATES.find(template => template.id === id);
}

/**
 * Get template by name
 */
export function getTemplateByName(name: string): ScheduleTemplate | undefined {
  return ALL_TEMPLATES.find(template => template.name.toLowerCase() === name.toLowerCase());
}
