/**
 * Approval Tools
 * AI tools for approval workflow management
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const getApprovalsParams = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'info_requested', 'all']).default('pending'),
  executiveId: z.string().uuid().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
  limit: z.number().min(1).max(50).default(10),
});

const getApprovalDetailsParams = z.object({
  approvalId: z.string().uuid(),
});

const summarizeApprovalParams = z.object({
  approvalId: z.string().uuid(),
});

registerTool({
  name: 'get_approvals',
  description: 'Retrieve pending or historical approvals. Useful for checking what needs executive attention.',
  parameters: getApprovalsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getApprovalsParams.parse(params);
    return {
      success: true,
      data: { message: 'Approvals retrieved', params: validated },
    };
  },
});

registerTool({
  name: 'get_approval_details',
  description: 'Get full details of a specific approval including attachments and history.',
  parameters: getApprovalDetailsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getApprovalDetailsParams.parse(params);
    return {
      success: true,
      data: { message: 'Approval details retrieved', approvalId: validated.approvalId },
    };
  },
});

registerTool({
  name: 'summarize_approval',
  description: 'Generate a concise summary of an approval request for quick executive review.',
  parameters: summarizeApprovalParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = summarizeApprovalParams.parse(params);
    return {
      success: true,
      data: { 
        message: 'Approval summarized', 
        approvalId: validated.approvalId,
        summary: 'Summary would be generated here',
      },
    };
  },
});

export { getApprovalsParams, getApprovalDetailsParams, summarizeApprovalParams };
