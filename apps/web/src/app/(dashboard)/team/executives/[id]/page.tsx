"use client";

/**
 * Executive Profile Page
 * Detailed view of an executive with tabs for different sections
 * Connected to real database via /api/executives/[id]
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail01,
  Phone01,
  MarkerPin01,
  Clock,
  Edit01,
  Briefcase01,
  Users01,
  Heart,
  Award01,
  Plus,
  Calendar,
  Plane,
  Building07,
  CreditCard01,
  RefreshCw01,
} from "@untitledui/icons";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { NativeSelect } from "@/components/base/select/select-native";
import { InfoCard, InfoItem } from "../../_components/info-card";
import {
  type Executive,
  type DirectReport,
  type FamilyMember,
  type Membership,
  getInitials,
} from "../../_components/executive-data";
import { useExecutives, type DatabaseExecutive } from "@/hooks/useExecutives";
import { notify } from "@/lib/notifications";

// Convert database executive to UI format
const convertToUIExecutive = (dbExec: DatabaseExecutive): Executive & { home_address?: string } => {
  return {
    id: dbExec.id,
    name: dbExec.full_name,
    title: dbExec.title || '',
    email: dbExec.email || '',
    phone: dbExec.phone || '',
    location: dbExec.office_location || '',
    timezone: dbExec.timezone || 'America/Los_Angeles',
    department: 'Executive',
    bio: dbExec.bio || undefined,
    home_address: (dbExec as any).home_address || undefined,
    preferences: undefined,
  };
};

export default function ExecutiveProfilePage() {
  const params = useParams();
  const executiveId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [executive, setExecutive] = useState<Executive | null>(null);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', title: '', email: '', phone: '', office_location: '', home_address: '', timezone: '', bio: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Add modals state
  const [isAddDirectReportOpen, setIsAddDirectReportOpen] = useState(false);
  const [isAddFamilyMemberOpen, setIsAddFamilyMemberOpen] = useState(false);
  const [isAddMembershipOpen, setIsAddMembershipOpen] = useState(false);

  // Fetch executive by ID
  const { getExecutive } = useExecutives();

  useEffect(() => {
    const fetchExecutive = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/executives/${executiveId}`);
        if (!response.ok) {
          throw new Error('Executive not found');
        }
        const result = await response.json();
        // Unwrap double-nesting: successResponse wraps { data: { data: {...} } }
        const execData = result.data?.data ?? result.data;
        if (execData) {
          setExecutive(convertToUIExecutive(execData));
          // Map sub-entity data from API
          if (execData.direct_reports) {
            setDirectReports(execData.direct_reports.map((dr: any) => ({
              id: dr.id,
              name: dr.full_name,
              title: dr.title || '',
              email: dr.email || '',
              department: dr.department || '',
            })));
          }
          if (execData.family_members) {
            setFamilyMembers(execData.family_members.map((fm: any) => ({
              id: fm.id,
              name: fm.full_name,
              relationship: fm.relationship,
              birthday: fm.birthday ? new Date(fm.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
              notes: fm.notes || undefined,
            })));
          }
          if (execData.memberships) {
            setMemberships(execData.memberships.map((m: any) => ({
              id: m.id,
              name: m.provider_name + (m.program_name && m.program_name !== m.provider_name ? ` ${m.program_name}` : ''),
              category: m.category as Membership['category'],
              memberNumber: m.member_number || undefined,
              tier: m.tier || undefined,
              expirationDate: m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
            })));
          }
        } else {
          throw new Error('Executive not found');
        }
      } catch (err) {
        console.error('Failed to fetch executive:', err);
        setError(err instanceof Error ? err.message : 'Failed to load executive');
      } finally {
        setIsLoading(false);
      }
    };

    if (executiveId) {
      fetchExecutive();
    }
  }, [executiveId]);

  const refetchExecutive = useCallback(async () => {
    try {
      const response = await fetch(`/api/executives/${executiveId}`);
      if (!response.ok) return;
      const result = await response.json();
      const execData = result.data?.data ?? result.data;
      if (execData) {
        setExecutive(convertToUIExecutive(execData));
        if (execData.direct_reports) {
          setDirectReports(execData.direct_reports.map((dr: any) => ({
            id: dr.id, name: dr.full_name, title: dr.title || '', email: dr.email || '', department: dr.department || '',
          })));
        }
        if (execData.family_members) {
          setFamilyMembers(execData.family_members.map((fm: any) => ({
            id: fm.id, name: fm.full_name, relationship: fm.relationship,
            birthday: fm.birthday ? new Date(fm.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
            notes: fm.notes || undefined,
          })));
        }
        if (execData.memberships) {
          setMemberships(execData.memberships.map((m: any) => ({
            id: m.id,
            name: m.provider_name + (m.program_name && m.program_name !== m.provider_name ? ` ${m.program_name}` : ''),
            category: m.category as Membership['category'],
            memberNumber: m.member_number || undefined,
            tier: m.tier || undefined,
            expirationDate: m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to refetch executive:', err);
    }
  }, [executiveId]);

  // Edit Profile handlers
  const openEditProfile = () => {
    if (!executive) return;
    setEditForm({
      full_name: executive.name,
      title: executive.title,
      email: executive.email,
      phone: executive.phone,
      office_location: executive.location,
      home_address: (executive as any)?.home_address || '',
      timezone: executive.timezone,
      bio: executive.bio || '',
    });
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/executives/${executiveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name,
          title: editForm.title || null,
          email: editForm.email || null,
          phones: editForm.phone ? [{ number: editForm.phone, type: 'mobile', is_primary: true }] : [],
          main_office_location: editForm.office_location || null,
          home_address: editForm.home_address || null,
          timezone: editForm.timezone || null,
          bio: editForm.bio || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      notify.success('Profile updated', 'Executive profile has been saved.');
      setIsEditProfileOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Add Direct Report handler
  const handleAddDirectReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/direct-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          title: fd.get('title') || undefined,
          department: fd.get('department') || undefined,
          email: fd.get('email') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add direct report');
      notify.success('Direct report added', 'The direct report has been added.');
      setIsAddDirectReportOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to add direct report.');
    }
  };

  // Add Family Member handler
  const handleAddFamilyMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/family-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          relationship: fd.get('relationship'),
          birthday: fd.get('birthday') || undefined,
          notes: fd.get('notes') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add family member');
      notify.success('Family member added', 'The family member has been added.');
      setIsAddFamilyMemberOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to add family member.');
    }
  };

  // Add Membership handler
  const handleAddMembership = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: fd.get('category'),
          provider_name: fd.get('provider_name'),
          program_name: fd.get('program_name') || undefined,
          member_number: fd.get('member_number') || undefined,
          tier: fd.get('tier') || undefined,
          expires_at: fd.get('expires_at') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add membership');
      notify.success('Membership added', 'The membership has been added.');
      setIsAddMembershipOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to add membership.');
    }
  };

  const getMembershipIcon = (category: string) => {
    switch (category) {
      case "airlines": return Plane;
      case "hotels": return Building07;
      case "lounges": return Briefcase01;
      default: return CreditCard01;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <Link
          href="/team/executives"
          className="inline-flex items-center gap-2 text-sm text-tertiary hover:text-primary w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Executives
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading executive profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !executive) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <Link
          href="/team/executives"
          className="inline-flex items-center gap-2 text-sm text-tertiary hover:text-primary w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Executives
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-semibold text-primary">Unable to load executive</p>
            <p className="text-sm text-tertiary max-w-md">{error || 'Executive not found'}</p>
            <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Back Button */}
      <Link
        href="/team/executives"
        className="inline-flex items-center gap-2 text-sm text-tertiary hover:text-primary w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Executives
      </Link>

      {/* Profile Header */}
      <div className="rounded-xl border border-secondary bg-primary p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <Avatar initials={getInitials(executive.name)} alt={executive.name} size="2xl" />
          <div className="flex-1">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-primary lg:text-2xl">{executive.name}</h1>
                <p className="text-sm text-tertiary">{executive.title}</p>
                <Badge color="gray" type="pill-color" size="sm" className="mt-2">
                  {executive.department}
                </Badge>
              </div>
              <Button size="md" color="secondary" iconLeading={Edit01} onClick={openEditProfile}>
                Edit Profile
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Mail01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{executive.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{executive.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MarkerPin01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{executive.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{executive.timezone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
        <TabList
          type="button-minimal"
          items={[
            { id: "overview", label: "Overview" },
            { id: "direct-reports", label: "Direct Reports" },
            { id: "family", label: "Family" },
            { id: "memberships", label: "Memberships" },
          ]}
        />
      </Tabs>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <InfoCard title="About">
            <p className="text-sm text-secondary">{executive.bio || "No bio available."}</p>
          </InfoCard>

          <InfoCard title="Contact Information">
            <div className="space-y-1 divide-y divide-secondary">
              <InfoItem label="Email" value={executive.email} />
              <InfoItem label="Phone" value={executive.phone} />
              <InfoItem label="Office" value={executive.location} />
              <InfoItem label="Home Address" value={(executive as any).home_address || 'Not set'} />
              <InfoItem label="Timezone" value={executive.timezone} />
            </div>
          </InfoCard>

          <InfoCard title="Scheduling Preferences">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-tertiary">Meeting Buffer</p>
                <p className="text-sm font-medium text-primary">{executive.preferences?.meetingBuffer || 15} minutes</p>
              </div>
              <div>
                <p className="text-xs text-tertiary mb-1">Preferred Meeting Times</p>
                <div className="flex flex-wrap gap-2">
                  {(executive.preferences?.preferredMeetingTimes || []).map((time, i) => (
                    <Badge key={i} color="gray" type="pill-color" size="sm">{time}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Other Preferences">
            <div className="space-y-1 divide-y divide-secondary">
              <InfoItem label="Dietary" value={executive.preferences?.dietary || "None specified"} />
              <InfoItem label="Travel" value={executive.preferences?.travel || "None specified"} />
            </div>
          </InfoCard>
        </div>
      )}

      {activeTab === "direct-reports" && (
        <InfoCard
          title="Direct Reports"
          action={<Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddDirectReportOpen(true)}>Add</Button>}
        >
          {directReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users01 className="h-10 w-10 text-fg-quaternary mb-2" />
              <p className="text-sm font-medium text-primary">No direct reports</p>
              <p className="text-xs text-tertiary">Add direct reports to track this executive's team.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {directReports.map((report) => (
                <div key={report.id} className="flex items-center gap-3 rounded-lg border border-secondary p-3">
                  <Avatar initials={getInitials(report.name)} alt={report.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{report.name}</p>
                    <p className="text-xs text-tertiary">{report.title}</p>
                  </div>
                  <Badge color="gray" type="pill-color" size="sm">{report.department}</Badge>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}

      {activeTab === "family" && (
        <InfoCard
          title="Family Members"
          action={<Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddFamilyMemberOpen(true)}>Add</Button>}
        >
          {familyMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Heart className="h-10 w-10 text-fg-quaternary mb-2" />
              <p className="text-sm font-medium text-primary">No family members</p>
              <p className="text-xs text-tertiary">Add family members to track birthdays and preferences.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border border-secondary p-3">
                  <Avatar initials={getInitials(member.name)} alt={member.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{member.name}</p>
                    <p className="text-xs text-tertiary">{member.relationship}</p>
                  </div>
                  {member.birthday && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-fg-quaternary" />
                      <span className="text-xs text-tertiary">{member.birthday}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}

      {activeTab === "memberships" && (
        <InfoCard
          title="Memberships & Loyalty Programs"
          action={<Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddMembershipOpen(true)}>Add</Button>}
        >
          {memberships.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Award01 className="h-10 w-10 text-fg-quaternary mb-2" />
              <p className="text-sm font-medium text-primary">No memberships</p>
              <p className="text-xs text-tertiary">Add loyalty programs and memberships for this executive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => {
                const Icon = getMembershipIcon(membership.category);
                return (
                  <div key={membership.id} className="flex items-center gap-3 rounded-lg border border-secondary p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-5 w-5 text-fg-quaternary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{membership.name}</p>
                      <p className="text-xs text-tertiary">{membership.memberNumber}</p>
                    </div>
                    {membership.tier && (
                      <Badge color="brand" type="pill-color" size="sm">{membership.tier}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </InfoCard>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Executive Profile</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update {executive.name}&apos;s profile details.</p>
            <div className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <input value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Office Location</label>
                  <input value={editForm.office_location} onChange={(e) => setEditForm(prev => ({ ...prev, office_location: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  <NativeSelect size="sm" value={editForm.timezone} onChange={(e) => setEditForm(prev => ({ ...prev, timezone: e.target.value }))} options={[
                    { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
                    { label: "Mountain Time (MT)", value: "America/Denver" },
                    { label: "Central Time (CT)", value: "America/Chicago" },
                    { label: "Eastern Time (ET)", value: "America/New_York" },
                    { label: "GMT", value: "Europe/London" },
                    { label: "CET", value: "Europe/Berlin" },
                  ]} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Home Address</label>
                <textarea rows={2} value={editForm.home_address} onChange={(e) => setEditForm(prev => ({ ...prev, home_address: e.target.value }))} placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <textarea rows={3} value={editForm.bio} onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button size="md" color="secondary" className="flex-1" onClick={() => setIsEditProfileOpen(false)}>Cancel</Button>
              <Button size="md" color="primary" className="flex-1" onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Direct Report Modal */}
      {isAddDirectReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Direct Report</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a direct report for {executive.name}.</p>
            <form onSubmit={handleAddDirectReport} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                <input name="full_name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input name="title" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <input name="department" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input name="email" type="email" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddDirectReportOpen(false)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Direct Report</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {isAddFamilyMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Family Member</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a family member for {executive.name}.</p>
            <form onSubmit={handleAddFamilyMember} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                  <input name="full_name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship *</label>
                  <select name="relationship" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Birthday</label>
                <input name="birthday" type="date" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea name="notes" rows={2} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddFamilyMemberOpen(false)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Family Member</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Membership Modal */}
      {isAddMembershipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Membership</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a loyalty program or membership.</p>
            <form onSubmit={handleAddMembership} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <select name="category" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
                    <option value="airlines">Airlines</option>
                    <option value="hotels">Hotels</option>
                    <option value="lounges">Lounges</option>
                    <option value="car_rental">Car Rental</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider Name *</label>
                  <input name="provider_name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" placeholder="e.g., United Airlines" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Program Name</label>
                  <input name="program_name" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" placeholder="e.g., MileagePlus" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Member Number</label>
                  <input name="member_number" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tier</label>
                  <input name="tier" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" placeholder="e.g., Gold, Platinum" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expires</label>
                  <input name="expires_at" type="date" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddMembershipOpen(false)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Membership</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
