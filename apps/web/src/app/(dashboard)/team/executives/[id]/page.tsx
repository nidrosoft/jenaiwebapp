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
import { InfoCard, InfoItem } from "../../_components/info-card";
import {
  type Executive,
  type DirectReport,
  type FamilyMember,
  type Membership,
  getInitials,
} from "../../_components/executive-data";
import { useExecutives, type DatabaseExecutive } from "@/hooks/useExecutives";

// Convert database executive to UI format
const convertToUIExecutive = (dbExec: DatabaseExecutive): Executive => {
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
    // Preferences would come from extended executive data in a full implementation
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
              <Button size="md" color="secondary" iconLeading={Edit01}>
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
          action={<Button size="sm" color="secondary" iconLeading={Plus}>Add</Button>}
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
          action={<Button size="sm" color="secondary" iconLeading={Plus}>Add</Button>}
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
          action={<Button size="sm" color="secondary" iconLeading={Plus}>Add</Button>}
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
    </div>
  );
}
