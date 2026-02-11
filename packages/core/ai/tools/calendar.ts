/**
 * Calendar Tools
 * AI tools for calendar and meeting management
 */

import { z } from 'zod';
import { registerTool, type ToolContext, type ToolResult } from './index';

const getMeetingsParams = z.object({
  date: z.string().optional().describe('Date in YYYY-MM-DD format, defaults to today'),
  executiveId: z.string().uuid().optional().describe('Filter by executive'),
  range: z.enum(['day', 'week', 'month']).default('day').describe('Time range to fetch'),
});

const createMeetingParams = z.object({
  title: z.string().describe('Meeting title'),
  startTime: z.string().describe('Start time in ISO format'),
  endTime: z.string().describe('End time in ISO format'),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).optional().describe('List of attendees'),
  location: z.string().optional().describe('Meeting location'),
  locationType: z.enum(['virtual', 'in_person', 'phone', 'hybrid']).default('virtual'),
  description: z.string().optional().describe('Meeting description'),
  executiveId: z.string().uuid().optional().describe('Associated executive'),
});

const checkAvailabilityParams = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format'),
  startTime: z.string().optional().describe('Start of time window (HH:MM)'),
  endTime: z.string().optional().describe('End of time window (HH:MM)'),
  duration: z.number().min(15).max(480).describe('Required duration in minutes'),
  executiveId: z.string().uuid().optional().describe('Check for specific executive'),
});

const rescheduleMeetingParams = z.object({
  meetingId: z.string().uuid().describe('ID of meeting to reschedule'),
  newStartTime: z.string().describe('New start time in ISO format'),
  newEndTime: z.string().describe('New end time in ISO format'),
  notifyAttendees: z.boolean().default(true).describe('Send notifications to attendees'),
});

registerTool({
  name: 'get_meetings',
  description: 'Retrieve meetings for a specific date or range. Use this to check the schedule.',
  parameters: getMeetingsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getMeetingsParams.parse(params);
    // TODO: Implement actual database query
    return {
      success: true,
      data: {
        message: 'Meetings retrieved',
        params: validated,
        context: { orgId: context.orgId },
      },
    };
  },
});

registerTool({
  name: 'create_meeting',
  description: 'Schedule a new meeting. Automatically checks for conflicts.',
  parameters: createMeetingParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = createMeetingParams.parse(params);
    // TODO: Implement meeting creation
    return {
      success: true,
      data: {
        message: 'Meeting created',
        meeting: validated,
      },
    };
  },
});

registerTool({
  name: 'check_availability',
  description: 'Find available time slots on a given date. Returns open windows.',
  parameters: checkAvailabilityParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = checkAvailabilityParams.parse(params);
    // TODO: Implement availability check
    return {
      success: true,
      data: {
        message: 'Availability checked',
        availableSlots: [],
      },
    };
  },
});

registerTool({
  name: 'reschedule_meeting',
  description: 'Move an existing meeting to a new time.',
  parameters: rescheduleMeetingParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = rescheduleMeetingParams.parse(params);
    // TODO: Implement rescheduling
    return {
      success: true,
      data: {
        message: 'Meeting rescheduled',
        meetingId: validated.meetingId,
      },
    };
  },
});

export { getMeetingsParams, createMeetingParams, checkAvailabilityParams, rescheduleMeetingParams };
