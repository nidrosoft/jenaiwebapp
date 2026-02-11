/**
 * Generation Tools
 * AI tools for content generation
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const generateMeetingBriefParams = z.object({
  meetingId: z.string().uuid(),
  includeAttendeeInfo: z.boolean().default(true),
  includePreviousMeetings: z.boolean().default(true),
  includeActionItems: z.boolean().default(true),
});

const generateEmailDraftParams = z.object({
  type: z.enum(['meeting_request', 'follow_up', 'thank_you', 'reschedule', 'cancellation', 'general']),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  context: z.string().describe('Context or key points to include'),
  tone: z.enum(['formal', 'professional', 'friendly']).default('professional'),
  executiveId: z.string().uuid().optional(),
});

const generateSummaryParams = z.object({
  type: z.enum(['daily', 'weekly', 'meeting_notes']),
  date: z.string().optional().describe('Date for daily summary (YYYY-MM-DD)'),
  meetingId: z.string().uuid().optional().describe('Meeting ID for meeting notes'),
  executiveId: z.string().uuid().optional(),
});

registerTool({
  name: 'generate_meeting_brief',
  description: 'Generate a comprehensive meeting brief with attendee info, context, and talking points.',
  parameters: generateMeetingBriefParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = generateMeetingBriefParams.parse(params);
    return {
      success: true,
      data: { 
        message: 'Meeting brief generated', 
        meetingId: validated.meetingId,
        brief: 'Brief content would be generated here',
      },
    };
  },
});

registerTool({
  name: 'generate_email_draft',
  description: 'Draft an email based on type and context. Matches executive communication style.',
  parameters: generateEmailDraftParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = generateEmailDraftParams.parse(params);
    return {
      success: true,
      data: { 
        message: 'Email draft generated', 
        type: validated.type,
        draft: 'Email draft would be generated here',
      },
    };
  },
});

registerTool({
  name: 'generate_summary',
  description: 'Generate daily/weekly summaries or meeting notes.',
  parameters: generateSummaryParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = generateSummaryParams.parse(params);
    return {
      success: true,
      data: { 
        message: 'Summary generated', 
        type: validated.type,
        summary: 'Summary content would be generated here',
      },
    };
  },
});

export { generateMeetingBriefParams, generateEmailDraftParams, generateSummaryParams };
