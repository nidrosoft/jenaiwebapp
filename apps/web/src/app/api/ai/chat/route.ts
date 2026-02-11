/**
 * AI Chat API Route
 * POST /api/ai/chat - Send message to AI assistant
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
  executiveId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    chatRequestSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    // TODO: Import and use the AI orchestrator once packages are installed
    // import { chat } from '@jeniferai/ai';
    // const response = await chat(body.messages, {
    //   userId: context.user.id,
    //   orgId: context.user.org_id,
    //   executiveId: body.executiveId,
    //   timezone: context.user.timezone,
    //   conversationId: body.conversationId,
    // });

    // Placeholder response until AI packages are installed
    const response = {
      content: 'AI chat functionality will be available once the AI packages are installed and configured.',
      toolCalls: [],
    };

    return successResponse({ data: response });
  } catch (error) {
    console.error('AI chat error:', error);
    return internalErrorResponse('Failed to process AI request');
  }
}

export const POST = withAuth(handlePost);
