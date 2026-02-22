/**
 * Bulk Contact Import API
 * POST /api/contacts/import
 * Imports a batch of contacts (max 50 per request)
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { bulkImportContactSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    bulkImportContactSchema,
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();
    const { contacts, skip_duplicates, update_duplicates } = body;

    // Check which emails already exist in this org
    const emails = contacts.map((c) => c.email.toLowerCase());
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, email')
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .in('email', emails);

    const existingMap = new Map(
      (existing || []).map((c: { id: string; email: string }) => [c.email.toLowerCase(), c.id]),
    );

    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; data: Record<string, unknown> }[] = [];
    let skipped = 0;
    let failed = 0;
    const errors: { rowIndex: number; message: string }[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const existingId = existingMap.get(contact.email.toLowerCase());

      if (existingId) {
        if (skip_duplicates && !update_duplicates) {
          skipped++;
          continue;
        }
        if (update_duplicates) {
          const { address, ...rest } = contact;
          const updateData: Record<string, unknown> = { ...rest };
          if (address) {
            updateData.address_line1 = address.line1;
            updateData.address_line2 = address.line2 || null;
            updateData.city = address.city;
            updateData.state = address.state;
            updateData.postal_code = address.postal_code;
            updateData.country = address.country;
          }
          toUpdate.push({ id: existingId, data: updateData });
          continue;
        }
      }

      // Flatten address for insert
      const { address, ...rest } = contact;
      const contactData: Record<string, unknown> = {
        ...rest,
        org_id: context.user.org_id,
        created_by: context.user.id,
      };
      if (address) {
        contactData.address_line1 = address.line1;
        contactData.address_line2 = address.line2 || null;
        contactData.city = address.city;
        contactData.state = address.state;
        contactData.postal_code = address.postal_code;
        contactData.country = address.country;
      }

      toInsert.push(contactData);
    }

    // Bulk insert new contacts
    let created = 0;
    if (toInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('contacts')
        .insert(toInsert)
        .select('id');

      if (insertError) {
        console.error('Bulk insert error:', insertError);
        // If bulk insert fails, try one by one to identify which rows fail
        for (let i = 0; i < toInsert.length; i++) {
          const { error: singleError } = await supabase
            .from('contacts')
            .insert(toInsert[i]);

          if (singleError) {
            failed++;
            errors.push({ rowIndex: i, message: singleError.message });
          } else {
            created++;
          }
        }
      } else {
        created = inserted?.length || toInsert.length;
      }
    }

    // Update existing contacts
    let updated = 0;
    for (const { id, data } of toUpdate) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        failed++;
        errors.push({ rowIndex: -1, message: `Failed to update ${id}: ${updateError.message}` });
      } else {
        updated++;
      }
    }

    return successResponse({
      created,
      updated,
      skipped,
      failed,
      errors,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const POST = withAuth(handlePost);
