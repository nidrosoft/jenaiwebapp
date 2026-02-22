/**
 * Meeting Calendar Sync API Route
 * POST /api/meetings/sync - Sync a meeting to external calendars
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  badRequestResponse,
} from '@/lib/api/utils';
import { syncMeetingToExternalCalendars } from '@/lib/calendar-sync';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const body = await request.json();
    const { meeting_id } = body;

    if (!meeting_id) {
      return badRequestResponse('meeting_id is required');
    }

    // Fetch the meeting using admin client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meeting_id)
      .eq('org_id', context.user.org_id)
      .single();

    if (error || !meeting) {
      return badRequestResponse('Meeting not found');
    }

    const results = await syncMeetingToExternalCalendars(
      meeting,
      context.user.id,
      context.user.org_id
    );

    return successResponse({
      data: results,
      synced: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error('Error syncing meeting:', error);
    return internalErrorResponse();
  }
}

export const POST = withAuth(handlePost);
