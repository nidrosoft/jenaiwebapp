/**
 * Dashboard API Route
 * GET /api/dashboard - Get dashboard data
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse } from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

    // Fetch today's meetings
    const { data: todaysMeetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('org_id', context.user.org_id)
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)
      .is('deleted_at', null)
      .order('start_time', { ascending: true })
      .limit(10);

    // Fetch priority tasks
    const { data: priorityTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('org_id', context.user.org_id)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(5);

    // Fetch pending approvals count
    const { count: pendingApprovalsCount } = await supabase
      .from('approvals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .eq('status', 'pending');

    // Fetch upcoming key dates (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: upcomingKeyDates } = await supabase
      .from('key_dates')
      .select('*')
      .eq('org_id', context.user.org_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .lte('date', thirtyDaysFromNow.toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('date', { ascending: true })
      .limit(5);

    // Fetch metrics
    const { count: meetingsToday } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)
      .is('deleted_at', null);

    const { count: meetingsThisWeek } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .gte('start_time', weekStart)
      .is('deleted_at', null);

    const { count: tasksPending } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null);

    const { count: tasksOverdue } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', new Date().toISOString().split('T')[0])
      .is('deleted_at', null);

    const dashboardData = {
      todays_meetings: todaysMeetings || [],
      priority_tasks: priorityTasks || [],
      pending_approvals_count: pendingApprovalsCount || 0,
      upcoming_key_dates: upcomingKeyDates || [],
      metrics: {
        meetings_today: meetingsToday || 0,
        meetings_this_week: meetingsThisWeek || 0,
        tasks_pending: tasksPending || 0,
        tasks_overdue: tasksOverdue || 0,
        approvals_pending: pendingApprovalsCount || 0,
      },
    };

    return successResponse({ data: dashboardData });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
