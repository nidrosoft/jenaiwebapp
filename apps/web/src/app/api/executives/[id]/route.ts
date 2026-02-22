/**
 * Single Executive API Routes
 * GET /api/executives/[id] - Get executive
 * PATCH /api/executives/[id] - Update executive
 * DELETE /api/executives/[id] - Deactivate executive
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { updateExecutiveSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

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
      .from('executive_profiles')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (error || !data) {
      return notFoundResponse('Executive');
    }

    // Fetch related sub-entities in parallel
    const [directReportsResult, familyMembersResult, membershipsResult] = await Promise.all([
      supabase
        .from('direct_reports')
        .select('*')
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id)
        .order('full_name'),
      supabase
        .from('family_members')
        .select('*')
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id)
        .order('full_name'),
      supabase
        .from('memberships')
        .select('*')
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id)
        .order('category', { ascending: true }),
    ]);

    return successResponse({
      data: {
        ...data,
        direct_reports: directReportsResult.data || [],
        family_members: familyMembersResult.data || [],
        memberships: membershipsResult.data || [],
      },
    });
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
    updateExecutiveSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('executive_profiles')
      .select('id')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (!existing) {
      return notFoundResponse('Executive');
    }

    // Map schema fields to actual DB columns
    const { phones, main_office_location, office_address, home_address, ...rest } = body;
    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };
    if (phones !== undefined) {
      const primaryPhone = phones?.find((p: { is_primary?: boolean }) => p.is_primary) || phones?.[0];
      updatePayload.phone = primaryPhone?.number || null;
    }
    if (main_office_location !== undefined) {
      updatePayload.office_location = main_office_location;
    }
    if (office_address !== undefined) {
      updatePayload.office_address = office_address ? JSON.stringify(office_address) : null;
    }
    if (home_address !== undefined) {
      updatePayload.home_address = home_address
        ? (typeof home_address === 'string' ? home_address : JSON.stringify(home_address))
        : null;
    }

    const { data, error } = await supabase
      .from('executive_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating executive:', error);
      return internalErrorResponse(error.message);
    }

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

    // Soft delete by deactivating
    const { error } = await supabase
      .from('executive_profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deactivating executive:', error);
      return internalErrorResponse(error.message);
    }

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
