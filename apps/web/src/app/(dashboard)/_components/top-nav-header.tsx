"use client";

/**
 * Top Navigation Header
 * Sticky header with search, notifications, settings, and user profile
 */

import { useMemo } from "react";
import { Bell01, HelpCircle, SearchLg, Settings01 } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger, Popover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { NavAccountMenu } from "@/components/application/app-navigation/base-components/nav-account-card";
import { NavItemButton } from "@/components/application/app-navigation/base-components/nav-item-button";
import { useUser } from "@/hooks/useUser";

interface TopNavHeaderProps {
  className?: string;
}

export function TopNavHeader({ className }: TopNavHeaderProps) {
  const { profile } = useUser();

  const userInitials = useMemo(() => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return profile?.email ? profile.email[0].toUpperCase() : 'U';
  }, [profile]);

  const userDisplayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';

  return (
    <header
      className={cx(
        "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-secondary bg-primary px-4 lg:px-6",
        className
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <Input
          shortcut
          size="sm"
          aria-label="Search"
          placeholder="Search..."
          icon={SearchLg}
          className="w-full"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <NavItemButton
          size="md"
          icon={HelpCircle}
          label="Help"
          href="/support"
          tooltipPlacement="bottom"
        />
        <NavItemButton
          size="md"
          icon={Settings01}
          label="Settings"
          href="/settings/profile"
          tooltipPlacement="bottom"
        />
        <NavItemButton
          size="md"
          icon={Bell01}
          label="Notifications"
          href="/notifications"
          tooltipPlacement="bottom"
        />

        {/* User Avatar Dropdown */}
        <DialogTrigger>
          <AriaButton
            className={({ isPressed, isFocused }) =>
              cx(
                "group relative ml-2 inline-flex cursor-pointer rounded-full",
                (isPressed || isFocused) && "outline-2 outline-offset-2 outline-focus-ring"
              )
            }
          >
            <Avatar alt={userDisplayName} initials={userInitials} size="md" status="online" />
          </AriaButton>
          <Popover
            placement="bottom right"
            offset={8}
            className={({ isEntering, isExiting }) =>
              cx(
                "will-change-transform",
                isEntering &&
                  "duration-300 ease-out animate-in fade-in placement-bottom:slide-in-from-top-2",
                isExiting &&
                  "duration-150 ease-in animate-out fade-out placement-bottom:slide-out-to-top-2"
              )
            }
          >
            <NavAccountMenu />
          </Popover>
        </DialogTrigger>
      </div>
    </header>
  );
}
