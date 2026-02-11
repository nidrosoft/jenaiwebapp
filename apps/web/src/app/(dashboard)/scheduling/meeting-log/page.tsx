"use client";

/**
 * Meeting Log Page
 * Searchable table of all meetings with tabs for upcoming/past/all
 * Wired to /api/meetings endpoint
 */

import { useMemo, useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Edit01,
  Eye,
  FilterLines,
  SearchLg,
  Trash01,
  VideoRecorder,
  MarkerPin01,
  Users01,
  RefreshCw01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { Table, TableRowActionsDropdown } from "@/components/application/table/table";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Avatar } from "@/components/base/avatar/avatar";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { useMeetingLog, type MeetingLogEntry } from "@/hooks/useDashboard";

// Display meeting type derived from API data
interface DisplayMeeting {
  id: string;
  title: string;
  executive: string;
  executiveAvatar?: string;
  date: number;
  duration: string;
  attendees: number;
  location: string;
  locationType: "video" | "in-person" | "phone";
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  type: "internal" | "external" | "personal";
}

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};

const getLocationIcon = (type: DisplayMeeting["locationType"]) => {
  switch (type) {
    case "video":
      return VideoRecorder;
    case "in-person":
      return MarkerPin01;
    case "phone":
      return Clock;
    default:
      return MarkerPin01;
  }
};

// Helper to calculate duration from start/end times
const calculateDuration = (startTime: string, endTime: string, isAllDay?: boolean): string => {
  if (isAllDay) return "All day";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return "All day";
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
};

// Map API meeting to display format
const mapMeetingToDisplay = (meeting: MeetingLogEntry): DisplayMeeting => {
  // Map location_type to display format
  const locationTypeMap: Record<string, "video" | "in-person" | "phone"> = {
    virtual: "video",
    in_person: "in-person",
    phone: "phone",
    hybrid: "in-person",
  };

  // Map meeting_type to display format
  const meetingTypeMap: Record<string, "internal" | "external" | "personal"> = {
    internal: "internal",
    external: "external",
    one_on_one: "internal",
    team: "internal",
    client: "external",
    interview: "external",
    other: "personal",
  };

  // Map status
  const statusMap: Record<string, "scheduled" | "completed" | "cancelled" | "rescheduled"> = {
    scheduled: "scheduled",
    confirmed: "scheduled",
    tentative: "scheduled",
    cancelled: "cancelled",
    completed: "completed",
  };

  return {
    id: meeting.id,
    title: meeting.title,
    executive: (meeting as any).executive?.full_name || "Unassigned",
    date: new Date(meeting.start_time).getTime(),
    duration: calculateDuration(meeting.start_time, meeting.end_time, (meeting as any).is_all_day),
    attendees: meeting.attendees?.length || 0,
    location: meeting.location || (meeting.video_conference_url ? "Video Call" : "TBD"),
    locationType: locationTypeMap[meeting.location_type] || "video",
    status: statusMap[meeting.status] || "scheduled",
    type: meetingTypeMap[meeting.meeting_type] || "internal",
  };
};

export default function MeetingLogPage() {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled" | "all">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch meetings from API
  const { meetings: apiMeetings, isLoading, error, pagination, setPage, refetch } = useMeetingLog(
    activeTab,
    debouncedSearch,
    20
  );

  // Transform API meetings to display format
  const displayMeetings = useMemo(() => {
    return apiMeetings.map(mapMeetingToDisplay);
  }, [apiMeetings]);

  // Sort meetings
  const sortedMeetings = useMemo(() => {
    if (!sortDescriptor) return displayMeetings;

    return [...displayMeetings].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof DisplayMeeting];
      const second = b[sortDescriptor.column as keyof DisplayMeeting];

      if (typeof first === "number" && typeof second === "number") {
        return sortDescriptor.direction === "ascending" ? first - second : second - first;
      }

      if (typeof first === "string" && typeof second === "string") {
        const result = first.localeCompare(second);
        return sortDescriptor.direction === "ascending" ? result : -result;
      }

      return 0;
    });
  }, [sortDescriptor, displayMeetings]);

  // Calculate counts (from pagination total or estimate)
  const upcomingCount = activeTab === "upcoming" ? pagination.total : 0;
  const pastCount = activeTab === "past" ? pagination.total : 0;
  const cancelledCount = activeTab === "cancelled" ? pagination.total : 0;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Meeting Log</h1>
          <p className="text-sm text-tertiary">View and manage all scheduled meetings</p>
        </div>
        <div className="flex gap-3">
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button size="md" color="secondary" iconLeading={FilterLines}>
            Filters
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as "upcoming" | "past" | "cancelled" | "all")}>
          <TabList
            type="button-minimal"
            items={[
              { id: "upcoming", label: `Upcoming (${upcomingCount})` },
              { id: "past", label: `Past (${pastCount})` },
              { id: "cancelled", label: `Cancelled (${cancelledCount})` },
              { id: "all", label: "All" },
            ]}
          />
        </Tabs>
        <div className="w-full lg:max-w-xs">
          <InputBase
            size="sm"
            type="search"
            aria-label="Search"
            placeholder="Search meetings..."
            icon={SearchLg}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
        </div>
      </div>

      {/* Meeting Table */}
      <div className="rounded-xl border border-secondary bg-primary">
        <Table
          aria-label="Meeting log"
          selectionMode="multiple"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          className="bg-primary"
        >
          <Table.Header className="bg-primary">
            <Table.Head id="title" label="Meeting" isRowHeader allowsSorting className="w-full" />
            <Table.Head id="executive" label="Executive" allowsSorting className="max-lg:hidden" />
            <Table.Head id="date" label="Date & Time" allowsSorting className="max-md:hidden" />
            <Table.Head id="duration" label="Duration" allowsSorting className="max-lg:hidden" />
            <Table.Head id="attendees" label="Attendees" allowsSorting className="max-lg:hidden" />
            <Table.Head id="location" label="Location" allowsSorting className="max-lg:hidden" />
            <Table.Head id="status" label="Status" allowsSorting className="max-md:hidden" />
            <Table.Head id="actions" />
          </Table.Header>

          <Table.Body items={sortedMeetings}>
            {(meeting) => {
              const LocationIcon = getLocationIcon(meeting.locationType);
              return (
                <Table.Row id={meeting.id}>
                  <Table.Cell className="text-nowrap">
                    <div className="flex w-max items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          meeting.type === "internal"
                            ? "bg-utility-blue-500"
                            : meeting.type === "external"
                            ? "bg-utility-purple-500"
                            : "bg-utility-orange-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-primary">{meeting.title}</p>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-nowrap max-lg:hidden">
                    <div className="flex items-center gap-2">
                      <Avatar initials={getInitials(meeting.executive)} alt={meeting.executive} size="xs" />
                      <span className="text-sm text-secondary">{meeting.executive}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-nowrap max-md:hidden">
                    <div className="flex flex-col">
                      <span className="text-sm text-primary">{formatDate(meeting.date)}</span>
                      <span className="text-xs text-tertiary">{formatTime(meeting.date)}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-nowrap max-lg:hidden">
                    <span className="text-sm text-secondary">{meeting.duration}</span>
                  </Table.Cell>
                  <Table.Cell className="text-nowrap max-lg:hidden">
                    <div className="flex items-center gap-1">
                      <Users01 className="h-4 w-4 text-fg-quaternary" />
                      <span className="text-sm text-secondary">{meeting.attendees}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-nowrap max-lg:hidden">
                    <div className="flex items-center gap-2">
                      <LocationIcon className="h-4 w-4 text-fg-quaternary" />
                      <span className="text-sm text-secondary">{meeting.location}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="max-md:hidden">
                    <BadgeWithDot
                      color={
                        meeting.status === "completed"
                          ? "success"
                          : meeting.status === "scheduled"
                          ? "blue"
                          : meeting.status === "cancelled"
                          ? "error"
                          : "warning"
                      }
                      type="pill-color"
                      size="sm"
                      className="capitalize"
                    >
                      {meeting.status}
                    </BadgeWithDot>
                  </Table.Cell>
                  <Table.Cell className="pr-4 pl-4">
                    <div className="flex justify-end gap-0.5 max-lg:hidden">
                      <ButtonUtility size="xs" color="tertiary" tooltip="View" icon={Eye} />
                      <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} />
                      <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} />
                    </div>
                    <div className="flex items-center justify-end lg:hidden">
                      <TableRowActionsDropdown />
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            }}
          </Table.Body>
        </Table>
        <div className="border-t border-secondary px-4 py-3">
          <PaginationPageMinimalCenter 
            page={pagination.page} 
            total={pagination.totalPages || 1} 
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && sortedMeetings.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw01 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-2 text-sm text-tertiary">Loading meetings...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedMeetings.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-primary">No meetings found</h3>
          <p className="mt-1 text-sm text-tertiary">
            {activeTab === "upcoming" 
              ? "No upcoming meetings scheduled" 
              : activeTab === "past"
              ? "No past meetings found"
              : activeTab === "cancelled"
              ? "No cancelled meetings"
              : "No meetings match your search"}
          </p>
        </div>
      )}
    </div>
  );
}
