/**
 * Single Delegation API Routes
 * GET /api/delegations/[id] - Get delegation
 * PATCH /api/delegations/[id] - Update delegation status
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
  badRequestResponse,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateDelegationSchema = z.object({
  status: z.enum(['accepted', 'completed', 'rejected']),
  completion_notes: z.string().max(2000).optional(),
});

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('delegations')
      .select('*, tasks(*)')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (error || !data) {
      return notFoundResponse('Delegation');
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
    updateDelegationSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('delegations')
      .select('id, status, delegated_to')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (!existing) {
      return notFoundResponse('Delegation');
    }

    // Only the delegated_to user can update status
    if (existing.delegated_to !== context.user.id) {
      return badRequestResponse('Only the assigned user can update this delegation');
    }

    const updateData: Record<string, unknown> = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    if (body.status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    } else if (body.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completion_notes = body.completion_notes;
    }

    const { data, error } = await supabase
      .from('delegations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating delegation:', error);
      return internalErrorResponse(error.message);
    }

    // TODO: Send notification to delegated_by user

    return successResponse({ data });
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
