/**
 * Calendar Sync Service
 * Creates events in external calendars (Google Calendar, Microsoft Outlook) via API
 * Requires user to have connected their calendar via OAuth
 */

interface MeetingData {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  attendees?: Array<{ email: string; name?: string; is_optional?: boolean }> | null;
  timezone?: string | null;
  is_all_day?: boolean;
}

interface IntegrationTokens {
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  provider: string;
}

interface CalendarSyncResult {
  success: boolean;
  provider: string;
  external_event_id?: string;
  error?: string;
}

/**
 * Refresh Microsoft OAuth token if expired
 */
async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid profile email offline_access Calendars.ReadWrite Mail.Read',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Microsoft token:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error);
    return null;
  }
}

/**
 * Refresh Google OAuth token if expired
 */
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken(
  integration: IntegrationTokens,
  updateTokenFn?: (newToken: string, expiresAt: string, newRefreshToken?: string) => Promise<void>
): Promise<string | null> {
  const now = new Date();
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;

  // If token hasn't expired yet, use it
  if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return integration.access_token;
  }

  // Token is expired or about to expire, refresh it
  if (!integration.refresh_token) {
    console.error('No refresh token available for', integration.provider);
    return null;
  }

  let refreshed: { access_token: string; refresh_token?: string; expires_in: number } | null = null;

  if (integration.provider === 'microsoft') {
    refreshed = await refreshMicrosoftToken(integration.refresh_token);
  } else if (integration.provider === 'google') {
    refreshed = await refreshGoogleToken(integration.refresh_token);
  }

  if (!refreshed) return null;

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  // Persist the new token
  if (updateTokenFn) {
    await updateTokenFn(refreshed.access_token, newExpiresAt, refreshed.refresh_token);
  }

  return refreshed.access_token;
}

/**
 * Create an event in Microsoft Outlook Calendar via Graph API
 */
async function createMicrosoftCalendarEvent(
  accessToken: string,
  meeting: MeetingData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const attendees = (meeting.attendees || []).map((a) => ({
      emailAddress: {
        address: a.email,
        name: a.name || a.email,
      },
      type: a.is_optional ? 'optional' : 'required',
    }));

    const timezone = meeting.timezone || 'UTC';

    const event: Record<string, unknown> = {
      subject: meeting.title,
      body: {
        contentType: 'text',
        content: meeting.description || '',
      },
      start: {
        dateTime: meeting.start_time.replace('Z', '').replace('+00', ''),
        timeZone: timezone,
      },
      end: {
        dateTime: meeting.end_time.replace('Z', '').replace('+00', ''),
        timeZone: timezone,
      },
      attendees,
      isAllDay: meeting.is_all_day || false,
    };

    if (meeting.location) {
      event.location = {
        displayName: meeting.location,
      };
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Microsoft Calendar API error:', response.status, errorText);
      return { success: false, error: `Microsoft API error: ${response.status}` };
    }

    const result = await response.json();
    return { success: true, eventId: result.id };
  } catch (error) {
    console.error('Error creating Microsoft calendar event:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create an event in Google Calendar via Calendar API
 */
async function createGoogleCalendarEvent(
  accessToken: string,
  meeting: MeetingData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const attendees = (meeting.attendees || []).map((a) => ({
      email: a.email,
      displayName: a.name || undefined,
      optional: a.is_optional || false,
    }));

    const event: Record<string, unknown> = {
      summary: meeting.title,
      description: meeting.description || '',
      start: meeting.is_all_day
        ? { date: meeting.start_time.split('T')[0] }
        : { dateTime: meeting.start_time, timeZone: meeting.timezone || 'UTC' },
      end: meeting.is_all_day
        ? { date: meeting.end_time.split('T')[0] }
        : { dateTime: meeting.end_time, timeZone: meeting.timezone || 'UTC' },
      attendees,
    };

    if (meeting.location) {
      event.location = meeting.location;
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar API error:', response.status, errorText);
      return { success: false, error: `Google API error: ${response.status}` };
    }

    const result = await response.json();
    return { success: true, eventId: result.id };
  } catch (error) {
    console.error('Error creating Google calendar event:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a meeting to all connected external calendars for a user
 */
export async function syncMeetingToExternalCalendars(
  meeting: MeetingData,
  userId: string,
  orgId: string
): Promise<CalendarSyncResult[]> {
  const results: CalendarSyncResult[] = [];

  try {
    // Use admin client to get integrations
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all active calendar integrations for this user
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('integration_type', 'calendar')
      .eq('status', 'active');

    if (error || !integrations?.length) {
      console.log('No active calendar integrations found for user', userId);
      return results;
    }

    for (const integration of integrations) {
      const updateTokenFn = async (newToken: string, expiresAt: string, newRefreshToken?: string) => {
        const updateData: Record<string, string> = {
          access_token: newToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        };
        if (newRefreshToken) {
          updateData.refresh_token = newRefreshToken;
        }
        await supabase
          .from('integrations')
          .update(updateData)
          .eq('id', integration.id);
      };

      const accessToken = await getValidAccessToken(
        {
          access_token: integration.access_token,
          refresh_token: integration.refresh_token,
          token_expires_at: integration.token_expires_at,
          provider: integration.provider,
        },
        updateTokenFn
      );

      if (!accessToken) {
        results.push({
          success: false,
          provider: integration.provider,
          error: 'Failed to obtain valid access token',
        });
        continue;
      }

      let result: { success: boolean; eventId?: string; error?: string };

      if (integration.provider === 'microsoft') {
        result = await createMicrosoftCalendarEvent(accessToken, meeting);
      } else if (integration.provider === 'google') {
        result = await createGoogleCalendarEvent(accessToken, meeting);
      } else {
        results.push({
          success: false,
          provider: integration.provider,
          error: 'Calendar sync not supported for this provider',
        });
        continue;
      }

      results.push({
        success: result.success,
        provider: integration.provider,
        external_event_id: result.eventId,
        error: result.error,
      });

      // Store the external event ID in the meeting metadata
      if (result.success && result.eventId) {
        await supabase
          .from('meetings')
          .update({
            [`external_${integration.provider}_event_id`]: result.eventId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', meeting.id);
      }
    }
  } catch (error) {
    console.error('Error syncing to external calendars:', error);
    results.push({
      success: false,
      provider: 'unknown',
      error: String(error),
    });
  }

  return results;
}

/**
 * Delete an event from external calendars
 */
export async function deleteMeetingFromExternalCalendars(
  meetingId: string,
  userId: string,
  orgId: string
): Promise<void> {
  // Implementation for when meetings are deleted/cancelled
  // TODO: Track external_event_ids in a junction table for proper cleanup
  console.log(`TODO: Delete external calendar events for meeting ${meetingId}`);
}
