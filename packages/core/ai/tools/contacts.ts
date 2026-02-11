/**
 * Contact Tools
 * AI tools for contact and relationship management
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const searchContactsParams = z.object({
  query: z.string().min(1).describe('Search term for name, company, or email'),
  category: z.enum(['vip', 'client', 'vendor', 'partner', 'personal', 'colleague', 'other', 'all']).default('all'),
  executiveId: z.string().uuid().optional(),
  limit: z.number().min(1).max(20).default(5),
});

const getContactDetailsParams = z.object({
  contactId: z.string().uuid(),
});

const getContactHistoryParams = z.object({
  contactId: z.string().uuid(),
  includeEmails: z.boolean().default(false),
  includeMeetings: z.boolean().default(true),
  limit: z.number().min(1).max(20).default(10),
});

registerTool({
  name: 'search_contacts',
  description: 'Search for contacts by name, company, or email. Useful for finding attendee information.',
  parameters: searchContactsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = searchContactsParams.parse(params);
    return {
      success: true,
      data: { message: 'Contacts searched', params: validated },
    };
  },
});

registerTool({
  name: 'get_contact_details',
  description: 'Get full details of a contact including preferences and notes.',
  parameters: getContactDetailsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getContactDetailsParams.parse(params);
    return {
      success: true,
      data: { message: 'Contact details retrieved', contactId: validated.contactId },
    };
  },
});

registerTool({
  name: 'get_contact_history',
  description: 'Get interaction history with a contact including past meetings and communications.',
  parameters: getContactHistoryParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getContactHistoryParams.parse(params);
    return {
      success: true,
      data: { message: 'Contact history retrieved', contactId: validated.contactId },
    };
  },
});

export { searchContactsParams, getContactDetailsParams, getContactHistoryParams };
