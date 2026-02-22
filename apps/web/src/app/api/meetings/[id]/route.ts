/**
 * Single Meeting API Routes
 * GET /api/meetings/[id] - Get meeting
 * PATCH /api/meetings/[id] - Update meeting
 * DELETE /api/meetings/[id] - Delete meeting
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { updateMeetingSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';
import { eventBus } from '@jeniferai/core-event-bus';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse('Meeting');
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  const { data: body, error: validationError } = await validateBody(
    request,
    updateMeetingSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Check if meeting exists and belongs to org
    const { data: existing } = await supabase
      .from('meetings')
      .select('id')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return notFoundResponse('Meeting');
    }

    const { data, error } = await supabase
      .from('meetings')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meeting:', error);
      return internalErrorResponse(error.message);
    }

    // Emit meeting.updated event (fire-and-forget for proactive AI)
    void eventBus.publish({
      type: 'meeting.updated',
      payload: data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api.meetings.patch',
        orgId: context.user.org_id,
        userId: context.user.id,
        correlationId: id,
      },
    });

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Soft delete
    const { error } = await supabase
      .from('meetings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deleting meeting:', error);
      return internalErrorResponse(error.message);
    }

    // Emit meeting.deleted event (fire-and-forget)
    void eventBus.publish({
      type: 'meeting.deleted',
      payload: { id },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api.meetings.delete',
        orgId: context.user.org_id,
        userId: context.user.id,
        correlationId: id,
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function GET(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleGet(req, ctx, routeParams))(request);
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}

export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
