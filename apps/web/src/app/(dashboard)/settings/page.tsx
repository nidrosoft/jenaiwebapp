"use client";

/**
 * Settings Page
 * Unified settings with tab-based navigation
 * Connected to real database via /api/settings/* endpoints
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard02, Plus, SearchLg, RefreshCw01 } from "@untitledui/icons";
import { InviteMemberSlideout, type InviteMemberData } from "./_components/invite-member-slideout";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { notify } from "@/lib/notifications";

const tabs = [
  { id: "profile", label: "My Profile" },
  { id: "organization", label: "Organization" },
  { id: "integrations", label: "Integrations" },
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing" },
  { id: "audit", label: "Audit Log" },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get("tab") || "profile";
  const [selectedTab, setSelectedTab] = useState<string>(tabFromUrl);

  useEffect(() => {
    setSelectedTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Settings</h1>
          <Input className="lg:w-80" size="sm" shortcut aria-label="Search" placeholder="Search settings..." icon={SearchLg} />
        </div>
        <NativeSelect
          aria-label="Settings tabs"
          className="md:hidden"
          value={selectedTab}
          onChange={(e) => handleTabChange(e.target.value)}
          options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
        />
        <div className="-mx-4 -my-1 flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
          <Tabs className="hidden w-full md:flex" selectedKey={selectedTab} onSelectionChange={(v) => handleTabChange(v as string)}>
            <TabList type="underline" className="w-full" items={tabs} />
          </Tabs>
        </div>
      </div>

      {selectedTab === "profile" && <ProfileTab />}
      {selectedTab === "organization" && <OrganizationTab />}
      {selectedTab === "integrations" && <IntegrationsTab />}
      {selectedTab === "team" && <TeamTab />}
      {selectedTab === "billing" && <BillingTab />}
      {selectedTab === "audit" && <AuditTab />}
    </div>
  );
}

// Types for profile data
interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  timezone?: string;
  role: string;
  job_title?: string;
  phone?: string;
}

function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/settings/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload avatar');
      }

      const result = await response.json();
      const uploadedUrl = result.data?.data?.avatar_url ?? result.data?.avatar_url;
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        setProfile(prev => prev ? { ...prev, avatar_url: uploadedUrl } : prev);
      }
      notify.success('Photo updated', 'Your profile photo has been updated.');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const result = await response.json();
        const profileData = result.data?.data ?? result.data;
        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || "");
          setEmail(profileData.email || "");
          setJobTitle(profileData.job_title || "");
          setPhone(profileData.phone || "");
          setTimezone(profileData.timezone || "America/Los_Angeles");
          setAvatarUrl(profileData.avatar_url || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          job_title: jobTitle || null,
          phone: phone || null,
          timezone,
        }),
      });
      if (!response.ok) throw new Error('Failed to save profile');
      const result = await response.json();
      const savedProfile = result.data?.data ?? result.data;
      setProfile(savedProfile);
      notify.success('Profile updated', 'Your profile has been saved successfully.');
    } catch (err) {
      console.error('Failed to save profile:', err);
      notify.error('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setJobTitle(profile.job_title || "");
      setPhone(profile.phone || "");
      setTimezone(profile.timezone || "America/Los_Angeles");
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0]?.charAt(0) || "?";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load profile</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Personal Information</h2>
        <p className="text-sm text-tertiary">Update your personal details and preferences.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar size="2xl" src={avatarUrl || undefined} initials={getInitials(fullName)} alt={fullName} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button color="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? 'Uploading...' : 'Change photo'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Full Name</label>
              <Input size="sm" value={fullName} onChange={(val) => setFullName(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Email</label>
              <Input size="sm" value={email} isDisabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Job Title</label>
              <Input size="sm" value={jobTitle} onChange={(val) => setJobTitle(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Phone</label>
              <Input size="sm" value={phone} onChange={(val) => setPhone(val)} />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-secondary">Timezone</label>
              <NativeSelect
                size="sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
                  { label: "Mountain Time (MT)", value: "America/Denver" },
                  { label: "Central Time (CT)", value: "America/Chicago" },
                  { label: "Eastern Time (ET)", value: "America/New_York" },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-secondary pt-4">
          <Button color="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button color="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Types for organization data
interface OrganizationData {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
}

function OrganizationTab() {
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("technology");
  const [companySize, setCompanySize] = useState("11-50");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/settings/organization/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload logo');
      }

      const result = await response.json();
      const uploadedUrl = result.data?.data?.logo_url ?? result.data?.logo_url;
      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
        setOrg(prev => prev ? { ...prev, logo_url: uploadedUrl } : prev);
      }
      notify.success('Logo updated', 'Your organization logo has been updated.');
    } catch (err) {
      console.error('Failed to upload logo:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Fetch organization data
  useEffect(() => {
    const fetchOrg = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/organization');
        if (!response.ok) throw new Error('Failed to fetch organization');
        const result = await response.json();
        const orgData = result.data?.data ?? result.data;
        if (orgData) {
          setOrg(orgData);
          setName(orgData.name || "");
          setWebsite(orgData.website || "");
          setIndustry(orgData.industry || "technology");
          setCompanySize(orgData.size || orgData.company_size || "11-50");
          setLogoUrl(orgData.logo_url || null);
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrg();
  }, []);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website: website || null,
          industry,
          company_size: companySize,
        }),
      });
      if (!response.ok) throw new Error('Failed to save organization');
      const result = await response.json();
      const savedOrg = result.data?.data ?? result.data;
      setOrg(savedOrg);
      notify.success('Organization updated', 'Your organization settings have been saved.');
    } catch (err) {
      console.error('Failed to save organization:', err);
      notify.error('Error', 'Failed to save organization. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (org) {
      setName(org.name || "");
      setWebsite(org.website || "");
      setIndustry(org.industry || "technology");
      setCompanySize((org as any).size || org.company_size || "11-50");
    }
  };

  // Get initials for logo
  const getInitials = (orgName: string) => orgName?.charAt(0)?.toUpperCase() || "O";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load organization</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Organization Settings</h2>
        <p className="text-sm text-tertiary">Manage your workspace and company details.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-16 w-16 rounded-xl object-cover ring-1 ring-secondary" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-600">
                <span className="text-2xl font-bold text-white">{getInitials(name)}</span>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button color="secondary" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}>
              {isUploadingLogo ? 'Uploading...' : 'Change logo'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Organization Name</label>
              <Input size="sm" value={name} onChange={(val) => setName(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Website</label>
              <Input size="sm" value={website} onChange={(val) => setWebsite(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Industry</label>
              <NativeSelect
                size="sm"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                options={[
                  { label: "Technology", value: "technology" },
                  { label: "Finance", value: "finance" },
                  { label: "Healthcare", value: "healthcare" },
                  { label: "Other", value: "other" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Company Size</label>
              <NativeSelect
                size="sm"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                options={[
                  { label: "1-10 employees", value: "1-10" },
                  { label: "11-50 employees", value: "11-50" },
                  { label: "51-200 employees", value: "51-200" },
                  { label: "200+ employees", value: "200+" },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-secondary pt-4">
          <Button color="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button color="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Available integrations config (static list of supported integrations)
const availableIntegrations = [
  { provider: "google_calendar", name: "Google Calendar", description: "Sync your Google Calendar events and meetings.", logo: "https://www.untitledui.com/logos/integrations/google-calendar.svg" },
  { provider: "outlook_calendar", name: "Outlook Calendar", description: "Connect Microsoft Outlook for calendar sync.", logo: "https://www.untitledui.com/logos/integrations/outlook.svg" },
  { provider: "zoom", name: "Zoom", description: "Create Zoom meetings automatically.", logo: "https://www.untitledui.com/logos/integrations/zoom.svg" },
  { provider: "teams", name: "Microsoft Teams", description: "Create Teams meetings and send notifications.", logo: "https://www.untitledui.com/logos/integrations/teams.svg" },
  { provider: "slack", name: "Slack", description: "Send notifications to channels.", logo: "https://www.untitledui.com/logos/integrations/slack.svg" },
  { provider: "gmail", name: "Gmail", description: "Connect Gmail for email integration.", logo: "https://www.untitledui.com/logos/integrations/gmail.svg" },
];

// Types for integration data
interface IntegrationData {
  id: string;
  provider: string;
  integration_type: string;
  status: string;
  provider_email?: string;
  last_synced_at?: string;
}

function IntegrationsTab() {
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/integrations');
        if (!response.ok) throw new Error('Failed to fetch integrations');
        const result = await response.json();
        const integrationsList = result.data?.data ?? result.data ?? [];
        setConnectedIntegrations(Array.isArray(integrationsList) ? integrationsList : []);
      } catch (err) {
        console.error('Failed to fetch integrations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  // Check if an integration is connected
  const isConnected = (provider: string) => {
    return connectedIntegrations.some(i => i.provider === provider && i.status === 'active');
  };

  // Handle toggle (would connect/disconnect integration)
  const handleToggle = async (provider: string, currentlyConnected: boolean) => {
    if (currentlyConnected) {
      notify.info('Disconnect', 'To disconnect an integration, please use the Configure option.');
    } else {
      notify.info('Connect Integration', `Please use the Configure button to connect ${provider}.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading integrations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load integrations</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Integrations</h2>
          <p className="text-sm text-tertiary">Connect your calendars, email, and other tools.</p>
        </div>
        <Button color="secondary" size="sm" iconLeading={Plus}>Request integration</Button>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {availableIntegrations.map((integration) => {
          const connected = isConnected(integration.provider);
          const connectedData = connectedIntegrations.find(i => i.provider === integration.provider);
          return (
            <li key={integration.provider} className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-xs ring-1 ring-secondary ring-inset">
                      <img src={integration.logo} alt={integration.name} className="h-8 w-8 object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{integration.name}</p>
                      {connectedData?.provider_email && (
                        <p className="text-xs text-tertiary">{connectedData.provider_email}</p>
                      )}
                    </div>
                  </div>
                  <Toggle 
                    isSelected={connected} 
                    size="sm" 
                    onChange={() => handleToggle(integration.provider, connected)}
                  />
                </div>
                <p className="text-sm text-tertiary">{integration.description}</p>
              </div>
              <div className="border-t border-secondary px-5 py-3">
                <Button color="link-color" size="sm">Configure</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Types for team data
interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

function TeamTab() {
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch team members
  const fetchTeam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/team');
      if (!response.ok) throw new Error('Failed to fetch team');
      const result = await response.json();
      const teamData = result.data?.data ?? result.data;
      setMembers(teamData?.members || []);
      setPendingInvitations(teamData?.pending_invitations || []);
    } catch (err) {
      console.error('Failed to fetch team:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  // Handle invite member
  const handleInviteMember = async (memberData: InviteMemberData) => {
    try {
      const response = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: memberData.email,
          role: memberData.role,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
      notify.success('Invitation sent', `An invitation has been sent to ${memberData.email}.`);
      setIsInviteMemberOpen(false);
      fetchTeam(); // Refresh the list
    } catch (err) {
      console.error('Failed to invite member:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to send invitation.');
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load team</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => fetchTeam()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Team Members</h2>
          <p className="text-sm text-tertiary">Manage your team and their access levels.</p>
        </div>
        <Button color="primary" size="sm" iconLeading={Plus} onClick={() => setIsInviteMemberOpen(true)}>Invite member</Button>
      </div>
      
      {/* Active Members */}
      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
        <ul className="divide-y divide-secondary">
          {members.length === 0 ? (
            <li className="p-4 text-center text-sm text-tertiary">No team members yet</li>
          ) : (
            members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <Avatar size="md" initials={getInitials(member.full_name || member.email)} alt={member.full_name || member.email} />
                  <div>
                    <p className="text-sm font-medium text-primary">{member.full_name || 'Unnamed User'}</p>
                    <p className="text-sm text-tertiary">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${member.role === "admin" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-700"}`}>
                    {member.role === "admin" ? "Admin" : "User"}
                  </span>
                  <Button color="tertiary" size="sm">Edit</Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-secondary">Pending Invitations</h3>
          <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <ul className="divide-y divide-secondary">
              {pendingInvitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="md" initials="?" alt={invitation.email} />
                    <div>
                      <p className="text-sm font-medium text-primary">{invitation.email}</p>
                      <p className="text-xs text-tertiary">Expires: {new Date(invitation.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-700">
                      Pending
                    </span>
                    <Button color="tertiary" size="sm">Resend</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Invite Member Slideout */}
      <InviteMemberSlideout
        isOpen={isInviteMemberOpen}
        onOpenChange={setIsInviteMemberOpen}
        onSubmit={handleInviteMember}
      />
    </div>
  );
}

// Types for billing data
interface BillingData {
  subscription_tier?: string;
  subscription_status?: string;
  billing_cycle?: string;
  current_period_end?: string;
}

function BillingTab() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch billing data from organization
  useEffect(() => {
    const fetchBilling = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/organization');
        if (!response.ok) throw new Error('Failed to fetch billing info');
        const result = await response.json();
        const orgData = result.data?.data ?? result.data;
        if (orgData) {
          setBilling({
            subscription_tier: orgData.subscription_tier || 'free',
            subscription_status: orgData.subscription_status || 'active',
            billing_cycle: orgData.billing_cycle || 'monthly',
            current_period_end: orgData.current_period_end,
          });
        }
      } catch (err) {
        console.error('Failed to fetch billing:', err);
        setError(err instanceof Error ? err.message : 'Failed to load billing');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBilling();
  }, []);

  // Get plan display info
  const getPlanInfo = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'trial':
        return { name: 'Trial', price: '$0', features: '14-day free trial' };
      case 'starter':
        return { name: 'Starter', price: '$29', features: 'Core features' };
      case 'professional':
      case 'pro':
        return { name: 'Professional', price: '$49', features: 'All features included' };
      case 'enterprise':
        return { name: 'Enterprise', price: 'Custom', features: 'Custom pricing' };
      default:
        return { name: 'Free', price: '$0', features: 'Basic features' };
    }
  };

  const planInfo = getPlanInfo(billing?.subscription_tier || 'free');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading billing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load billing</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Billing & Subscription</h2>
        <p className="text-sm text-tertiary">Manage your subscription and payment methods.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
          <h3 className="text-sm font-semibold text-primary">Current Plan</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-primary">{planInfo.name}</span>
            <span className="text-sm text-tertiary">/ {billing?.billing_cycle || 'month'}</span>
          </div>
          <p className="mt-2 text-sm text-tertiary">{planInfo.price}/{billing?.billing_cycle || 'month'} • {planInfo.features}</p>
          {billing?.current_period_end && (
            <p className="mt-1 text-xs text-tertiary">
              Next billing: {new Date(billing.current_period_end).toLocaleDateString()}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button color="secondary" size="sm">Change plan</Button>
            <Button color="tertiary" size="sm">Cancel</Button>
          </div>
        </div>
        <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
          <h3 className="text-sm font-semibold text-primary">Payment Method</h3>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100">
              <CreditCard02 className="h-5 w-5 text-fg-quaternary" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">No payment method on file</p>
              <p className="text-xs text-tertiary">Add a payment method to upgrade</p>
            </div>
          </div>
          <div className="mt-4">
            <Button color="secondary" size="sm">Add payment method</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Types for audit log data
interface AuditLogEntry {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/audit?limit=50');
        if (!response.ok) throw new Error('Failed to fetch audit log');
        const result = await response.json();
        const auditData = result.data?.data ?? result.data;
        setLogs(Array.isArray(auditData) ? auditData : []);
        const paginationData = result.data?.pagination ?? result.pagination;
        setTotal(paginationData?.total || 0);
      } catch (err) {
        console.error('Failed to fetch audit log:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format action for display
  const formatAction = (log: AuditLogEntry) => {
    if (log.entity_type) {
      return `${log.action} ${log.entity_type}`;
    }
    return log.action;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading audit log...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load audit log</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Audit Log</h2>
          <p className="text-sm text-tertiary">Track all activity in your workspace. {total > 0 && `(${total} entries)`}</p>
        </div>
      </div>
      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary">
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-tertiary">
                    No audit log entries yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-primary">{formatAction(log)}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{log.user_email || 'System'}</td>
                    <td className="px-4 py-3 text-sm text-tertiary">{formatTimestamp(log.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-tertiary">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
