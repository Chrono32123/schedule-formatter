/**
 * Twitch Schedule API utilities
 * Handles creating, updating, and deleting schedule segments
 */

export interface TwitchScheduleSegment {
  id?: string;
  start_time: string; // ISO 8601 format (e.g., "2024-12-09T20:00:00Z")
  timezone: string; // IANA timezone (e.g., "America/New_York")
  duration: string; // Duration in minutes as string (e.g., "120")
  is_recurring?: boolean;
  category_id?: string;
  title: string;
}

export interface CreateSegmentParams {
  broadcasterId: string;
  startTime: string; // ISO 8601
  timezone: string;
  duration: number; // minutes
  title: string;
  categoryId?: string;
  isRecurring?: boolean;
}

/**
 * Create a new schedule segment on Twitch
 */
export async function createScheduleSegment(
  params: CreateSegmentParams,
  accessToken: string,
  clientId: string
): Promise<{ id: string } | null> {
  try {
    const body: Record<string, unknown> = {
      start_time: params.startTime,
      timezone: params.timezone,
      duration: params.duration.toString(),
      title: params.title,
      is_recurring: params.isRecurring || false,
    };

    if (params.categoryId) {
      body.category_id = params.categoryId;
    }

    const response = await fetch(
      `https://api.twitch.tv/helix/schedule/segment?broadcaster_id=${params.broadcasterId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create schedule segment:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data?.segments?.[0] || null;
  } catch (error) {
    console.error('Error creating schedule segment:', error);
    return null;
  }
}

/**
 * Update an existing schedule segment on Twitch
 */
export async function updateScheduleSegment(
  broadcasterId: string,
  segmentId: string,
  params: Partial<CreateSegmentParams>,
  accessToken: string,
  clientId: string
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {};

    if (params.startTime) body.start_time = params.startTime;
    if (params.timezone) body.timezone = params.timezone;
    if (params.duration !== undefined) body.duration = params.duration.toString();
    if (params.title) body.title = params.title;
    if (params.categoryId !== undefined) body.category_id = params.categoryId;
    if (params.isRecurring !== undefined) body.is_recurring = params.isRecurring;

    const response = await fetch(
      `https://api.twitch.tv/helix/schedule/segment?broadcaster_id=${broadcasterId}&id=${segmentId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update schedule segment:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating schedule segment:', error);
    return false;
  }
}

/**
 * Delete a schedule segment from Twitch
 */
export async function deleteScheduleSegment(
  broadcasterId: string,
  segmentId: string,
  accessToken: string,
  clientId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/schedule/segment?broadcaster_id=${broadcasterId}&id=${segmentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete schedule segment:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting schedule segment:', error);
    return false;
  }
}

/**
 * Get category ID by category name
 */
export async function getCategoryIdByName(
  categoryName: string,
  accessToken: string,
  clientId: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/games?name=${encodeURIComponent(categoryName)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.id || null;
  } catch (error) {
    console.error('Error fetching category ID:', error);
    return null;
  }
}

/**
 * Fetch existing schedule segments for a broadcaster
 */
export async function fetchScheduleSegments(
  broadcasterId: string,
  accessToken: string,
  clientId: string
): Promise<Array<{
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  category_id?: string;
  category_name?: string;
}> | null> {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/schedule?broadcaster_id=${broadcasterId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch schedule segments:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.segments || [];
  } catch (error) {
    console.error('Error fetching schedule segments:', error);
    return null;
  }
}
