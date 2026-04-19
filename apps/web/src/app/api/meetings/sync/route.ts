/**
 * Meeting Calendar Sync API Route
 * POST /api/meetings/sync          - Sync a specific meeting (body: { meeting_id })
 * POST /api/meetings/sync?all=1    - Sync all unsynced meetings for the current user
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  badRequestResponse,
} from '@/lib/api/utils';
import { syncMeetingToExternalCalendars } from '@/lib/calendar-sync';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const url = new URL(request.url);
    const syncAll = url.searchParams.get('all') === '1';

    if (syncAll) {
      // Bulk sync: push every un-synced future meeting for this org to the
      // user's connected external calendars.
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('org_id', context.user.org_id)
        .is('deleted_at', null)
        .is('external_event_id', null)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(200);

      if (error) return internalErrorResponse(error.message);

      let synced = 0;
      let failed = 0;
      for (const m of meetings || []) {
        const results = await syncMeetingToExternalCalendars(m, context.user.id, context.user.org_id);
        synced += results.filter((r) => r.success).length;
        failed += results.filter((r) => !r.success).length;
      }

      return successResponse({
        processed: meetings?.length ?? 0,
        synced,
        failed,
      });
    }

    // Single meeting sync
    const body = await request.json();
    const { meeting_id } = body;

    if (!meeting_id) {
      return badRequestResponse('meeting_id is required');
    }

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
      context.user.org_id,
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
