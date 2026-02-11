"use client";

/**
 * Calendar Page
 * Full calendar view with day/week/month views, mini calendar sidebar, and meeting management
 * Connected to real database via /api/meetings
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Users01, 
  VideoRecorder, 
  MarkerPin01,
  CalendarPlus01,
  Link01,
  Building02,
  Briefcase01,
  User01,
  TrendUp01,
  CheckCircle,
  Plane,
} from "@untitledui/icons";
import { Calendar, type CalendarEvent } from "@/components/application/calendar/calendar";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { NewMeetingSlideout, type MeetingFormData } from "../_components/new-meeting-slideout";
import { AddEventSlideout, type EventFormData } from "../_components/add-event-slideout";
import { EditMeetingSlideout, type MeetingData } from "../_components/edit-meeting-slideout";
import { useCalendarMeetings, type CalendarMeeting } from "@/hooks/useDashboard";
import { notify } from "@/lib/notifications";

// Helper function to map meeting type to calendar color
const getMeetingColor = (meetingType: string, locationType: string): CalendarEvent['color'] => {
  // Map meeting types to colors
  const typeColorMap: Record<string, CalendarEvent['color']> = {
    'internal': 'blue',
    'external': 'purple',
    'client': 'purple',
    'one_on_one': 'blue',
    'team': 'green',
    'interview': 'orange',
    'other': 'gray',
  };
  
  // Travel/in-person meetings get special colors
  if (locationType === 'in_person') {
    return 'orange';
  }
  
  return typeColorMap[meetingType] || 'blue';
};

// Helper function to convert database meeting to calendar event
const convertToCalendarEvent = (meeting: CalendarMeeting): CalendarEvent => ({
  id: meeting.id,
  title: meeting.title,
  start: new Date(meeting.start_time),
  end: new Date(meeting.end_time),
  color: getMeetingColor(meeting.meeting_type, meeting.location_type),
  dot: meeting.location_type === 'in_person',
  // Extended properties for edit functionality
  location: meeting.location,
  description: meeting.description,
  meetingType: meeting.meeting_type,
  locationType: meeting.location_type,
});

// Connected calendars - TODO: Wire to integrations API
// For now, show empty state until calendar integrations are implemented
interface ConnectedCalendar {
  id: string;
  name: string;
  provider: string;
  color: string;
  enabled: boolean;
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditMeetingOpen, setIsEditMeetingOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);

  // Fetch meetings from database
  const { meetings, stats, isLoading, refetch } = useCalendarMeetings();

  // Handle event click to open edit slideout
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // Find the full meeting data from the meetings array
    const meeting = meetings.find(m => m.id === event.id);
    if (meeting) {
      setSelectedMeeting({
        id: meeting.id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meeting_type: meeting.meeting_type,
        location_type: meeting.location_type,
        location: meeting.location,
        location_details: (meeting as any).location_details,
        video_link: (meeting as any).video_link,
        description: meeting.description,
        status: meeting.status,
      });
      setIsEditMeetingOpen(true);
    }
  }, [meetings]);

  // Handle meeting update
  const handleUpdateMeeting = useCallback(async (id: string, data: Partial<MeetingData>) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        notify.success('Meeting updated', 'Your changes have been saved.');
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to update meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to update meeting:", err);
      notify.error('Failed to update meeting', 'An unexpected error occurred.');
    }
  }, [refetch]);

  // Handle meeting delete
  const handleDeleteMeeting = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notify.success('Meeting deleted', 'The meeting has been removed from your calendar.');
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to delete meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to delete meeting:", err);
      notify.error('Failed to delete meeting', 'An unexpected error occurred.');
    }
  }, [refetch]);
  
  // Connected calendars - fetched from integrations API
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);

  useEffect(() => {
    async function fetchCalendarIntegrations() {
      try {
        const response = await fetch('/api/integrations');
        if (!response.ok) return;
        const result = await response.json();
        const integrations = result.data?.data ?? result.data ?? [];
        if (Array.isArray(integrations)) {
          const colorMap: Record<string, string> = {
            google_calendar: '#4285F4',
            outlook_calendar: '#0078D4',
            apple_calendar: '#FF3B30',
          };
          setConnectedCalendars(
            integrations
              .filter((i: any) => i.integration_type === 'calendar' && i.status === 'active')
              .map((i: any) => ({
                id: i.id,
                name: i.provider_email || i.provider,
                provider: i.provider,
                color: colorMap[i.provider] || '#6B7280',
                enabled: true,
              })),
          );
        }
      } catch {
        // Silently fail - calendars sidebar is non-critical
      }
    }
    fetchCalendarIntegrations();
  }, []);

  // Convert database meetings to calendar events
  const calendarEvents = useMemo(() => {
    return meetings.map(convertToCalendarEvent);
  }, [meetings]);

  // Helper function to map meeting type from slideout to API schema
  const mapMeetingType = (type?: string): 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other' => {
    const typeMap: Record<string, 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other'> = {
      'internal': 'internal',
      'external': 'external',
      'personal': 'other',
      'travel': 'other',
      'focus': 'other',
    };
    return typeMap[type || ''] || 'other';
  };

  // Helper function to parse attendees string into array of attendee objects
  const parseAttendees = (attendeesStr: string): Array<{ email: string; name?: string; is_optional: boolean }> => {
    if (!attendeesStr.trim()) return [];
    return attendeesStr.split(',').map(email => ({
      email: email.trim(),
      is_optional: false,
    })).filter(a => a.email.includes('@'));
  };

  // Helper function to map recurrence pattern to RRULE
  const mapRecurrenceRule = (pattern?: string): string | undefined => {
    const ruleMap: Record<string, string> = {
      'daily': 'FREQ=DAILY',
      'weekly': 'FREQ=WEEKLY',
      'biweekly': 'FREQ=WEEKLY;INTERVAL=2',
      'monthly': 'FREQ=MONTHLY',
    };
    return ruleMap[pattern || ''] || undefined;
  };

  const handleCreateMeeting = async (meetingFormData: MeetingFormData) => {
    try {
      // Parse the date and times to create ISO datetime strings
      const dateStr = meetingFormData.date;
      const startTimeStr = meetingFormData.startTime || '09:00';
      const endTimeStr = meetingFormData.endTime || '10:00';
      
      const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
      const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

      const apiMeetingData = {
        title: meetingFormData.title,
        description: meetingFormData.description || '',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_all_day: meetingFormData.isAllDay || false,
        location_type: meetingFormData.videoLink ? 'virtual' as const : (meetingFormData.location ? 'in_person' as const : 'virtual' as const),
        location: meetingFormData.location || undefined,
        video_conference_url: meetingFormData.videoLink || undefined,
        meeting_type: mapMeetingType(meetingFormData.meetingType),
        attendees: meetingFormData.attendees ? parseAttendees(meetingFormData.attendees) : [],
        is_recurring: meetingFormData.isRecurring || false,
        recurrence_rule: meetingFormData.isRecurring ? mapRecurrenceRule(meetingFormData.recurrencePattern) : undefined,
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiMeetingData),
        credentials: 'include',
      });
      
      if (response.ok) {
        notify.success('Meeting scheduled', `"${meetingFormData.title}" has been added to your calendar.`);
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to schedule meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to schedule meeting:", err);
      notify.error('Failed to schedule meeting', 'An unexpected error occurred.');
    }
  };

  const handleAddEvent = async (eventFormData: EventFormData) => {
    try {
      // Parse dates for event
      const startDateStr = eventFormData.startDate;
      const endDateStr = eventFormData.endDate || eventFormData.startDate;
      const startTimeStr = eventFormData.isAllDay ? '00:00' : (eventFormData.startTime || '09:00');
      const endTimeStr = eventFormData.isAllDay ? '23:59' : (eventFormData.endTime || '17:00');
      
      const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`);
      const endDateTime = new Date(`${endDateStr}T${endTimeStr}:00`);

      const apiEventData = {
        title: eventFormData.title,
        description: eventFormData.description || '',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_all_day: eventFormData.isAllDay || false,
        location_type: eventFormData.location ? 'in_person' as const : 'virtual' as const,
        location: eventFormData.location || undefined,
        meeting_type: 'other' as const,
        attendees: eventFormData.attendees ? parseAttendees(eventFormData.attendees) : [],
        is_recurring: eventFormData.isRecurring || false,
        recurrence_rule: eventFormData.isRecurring ? mapRecurrenceRule(eventFormData.recurrencePattern) : undefined,
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiEventData),
        credentials: 'include',
      });
      
      if (response.ok) {
        notify.success('Event created', `"${eventFormData.title}" has been added to your calendar.`);
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to create event', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to create event:", err);
      notify.error('Failed to create event', 'An unexpected error occurred.');
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Calendar</h1>
          <p className="text-sm text-tertiary">Manage schedules for your executives</p>
        </div>
        <div className="flex gap-3">
          <Button size="md" color="secondary" iconLeading={Plus} onClick={() => setIsNewMeetingOpen(true)}>
            New Meeting
          </Button>
          <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddEventOpen(true)}>
            Add event
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-6">
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden w-72 flex-col gap-5 lg:flex">
          {/* Connected Calendars Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md dark:from-gray-900 dark:to-gray-950 dark:ring-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FeaturedIcon icon={Link01} size="sm" color="brand" theme="light" />
                <h3 className="text-sm font-semibold text-primary">Connected</h3>
              </div>
              {connectedCalendars.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-50 px-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {connectedCalendars.length}
                </span>
              )}
            </div>
            
            {connectedCalendars.length > 0 ? (
              <div className="space-y-2.5">
                {connectedCalendars.map((cal) => (
                  <label 
                    key={cal.id} 
                    className="group/item flex cursor-pointer items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        defaultChecked={cal.enabled}
                        className="peer sr-only"
                      />
                      <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-gray-200 bg-white transition-all peer-checked:border-brand-600 peer-checked:bg-brand-600 dark:border-gray-700 dark:bg-gray-800">
                        <CheckCircle className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                      </div>
                    </div>
                    <div 
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm dark:ring-gray-900"
                      style={{ 
                        backgroundColor: cal.color === 'blue' ? '#3B82F6' : cal.color === 'green' ? '#22C55E' : '#A855F7'
                      }} 
                    />
                    <span className="flex-1 truncate text-sm font-medium text-secondary group-hover/item:text-primary">{cal.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-sm text-tertiary">No calendars connected yet</p>
                <p className="mt-1 text-xs text-quaternary">Connect your Google or Outlook calendar to sync events</p>
              </div>
            )}
            
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white/40 py-2.5 text-sm font-medium text-tertiary transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400">
              <CalendarPlus01 className="h-4 w-4" />
              Connect Calendar
            </button>
          </div>

          {/* This Week Stats Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md dark:from-gray-900 dark:to-gray-950 dark:ring-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FeaturedIcon icon={TrendUp01} size="sm" color="success" theme="light" />
                <h3 className="text-sm font-semibold text-primary">This Week</h3>
              </div>
              {stats.total_meetings > 0 && (
                <span className="text-xs font-medium text-success-600 dark:text-success-400">+12%</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
                    <CalendarIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.total_meetings}</span>
                <span className="text-xs text-tertiary">Meetings</span>
              </div>
              
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                    <VideoRecorder className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.video_calls}</span>
                <span className="text-xs text-tertiary">Video Calls</span>
              </div>
              
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                    <MarkerPin01 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.in_person}</span>
                <span className="text-xs text-tertiary">In-Person</span>
              </div>
              
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <Users01 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.total_attendees}</span>
                <span className="text-xs text-tertiary">Attendees</span>
              </div>
            </div>
          </div>

          {/* Meeting Types Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md dark:from-gray-900 dark:to-gray-950 dark:ring-white/[0.04]">
            <div className="mb-4 flex items-center gap-3">
              <FeaturedIcon icon={Briefcase01} size="sm" color="gray" theme="light" />
              <h3 className="text-sm font-semibold text-primary">Meeting Types</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                  <Building02 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Internal</span>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                  <Briefcase01 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">External / Client</span>
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                  <User01 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Personal</span>
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-500/10">
                  <Plane className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Travel</span>
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Calendar View */}
        <div className="flex-1">
          <Calendar 
            events={calendarEvents} 
            view={view} 
            className="h-full" 
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {/* New Meeting Slideout */}
      <NewMeetingSlideout
        isOpen={isNewMeetingOpen}
        onOpenChange={setIsNewMeetingOpen}
        onSubmit={handleCreateMeeting}
      />

      {/* Add Event Slideout */}
      <AddEventSlideout
        isOpen={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        onSubmit={handleAddEvent}
      />

      {/* Edit Meeting Slideout */}
      <EditMeetingSlideout
        isOpen={isEditMeetingOpen}
        onOpenChange={setIsEditMeetingOpen}
        meeting={selectedMeeting}
        onUpdate={handleUpdateMeeting}
        onDelete={handleDeleteMeeting}
      />
    </div>
  );
}
