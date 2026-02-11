/**
 * Task Tools
 * AI tools for task management
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const getTasksParams = z.object({
  status: z.enum(['todo', 'in_progress', 'waiting', 'done', 'all']).default('all'),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
  executiveId: z.string().uuid().optional(),
  dueWithinDays: z.number().min(1).max(365).optional(),
  limit: z.number().min(1).max(50).default(10),
});

const createTaskParams = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum(['general', 'meeting_prep', 'follow_up', 'travel', 'expense', 'communication', 'research', 'other']).default('general'),
  dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
  dueTime: z.string().optional().describe('Due time in HH:MM format'),
  executiveId: z.string().uuid().optional(),
  relatedMeetingId: z.string().uuid().optional(),
});

const updateTaskParams = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  title: z.string().optional(),
});

const completeTaskParams = z.object({
  taskId: z.string().uuid(),
  notes: z.string().optional(),
});

registerTool({
  name: 'get_tasks',
  description: 'Retrieve tasks with optional filters. Use to check pending work.',
  parameters: getTasksParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getTasksParams.parse(params);
    return {
      success: true,
      data: { message: 'Tasks retrieved', params: validated },
    };
  },
});

registerTool({
  name: 'create_task',
  description: 'Create a new task. Can be linked to meetings or executives.',
  parameters: createTaskParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = createTaskParams.parse(params);
    return {
      success: true,
      data: { message: 'Task created', task: validated },
    };
  },
});

registerTool({
  name: 'update_task',
  description: 'Update an existing task status, priority, or due date.',
  parameters: updateTaskParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = updateTaskParams.parse(params);
    return {
      success: true,
      data: { message: 'Task updated', taskId: validated.taskId },
    };
  },
});

registerTool({
  name: 'complete_task',
  description: 'Mark a task as completed.',
  parameters: completeTaskParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = completeTaskParams.parse(params);
    return {
      success: true,
      data: { message: 'Task completed', taskId: validated.taskId },
    };
  },
});

export { getTasksParams, createTaskParams, updateTaskParams, completeTaskParams };
