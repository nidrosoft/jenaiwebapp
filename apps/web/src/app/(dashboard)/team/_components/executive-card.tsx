"use client";

/**
 * Executive Card Component
 * Beautiful card display for executive in grid view with color-coded departments
 */

import Link from "next/link";
import { Mail01, Phone01, MarkerPin01, ChevronRight, Building02, Briefcase01, Code01, Target04, Settings01, Users01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import type { Executive } from "./executive-data";
import { getInitials } from "./executive-data";

interface ExecutiveCardProps {
  executive: Executive;
}

// Department color configurations - subtle backgrounds with 5-10% opacity
const departmentColors: Record<string, { bg: string; border: string; icon: string; badge: string; iconComponent: typeof Building02 }> = {
  Executive: { 
    bg: "from-purple-50/30 to-purple-100/10 dark:from-purple-950/10 dark:to-purple-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
    iconComponent: Building02
  },
  Finance: { 
    bg: "from-emerald-50/30 to-emerald-100/10 dark:from-emerald-950/10 dark:to-emerald-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    iconComponent: Briefcase01
  },
  Engineering: { 
    bg: "from-blue-50/30 to-blue-100/10 dark:from-blue-950/10 dark:to-blue-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    iconComponent: Code01
  },
  Marketing: { 
    bg: "from-pink-50/30 to-pink-100/10 dark:from-pink-950/10 dark:to-pink-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400",
    iconComponent: Target04
  },
  Operations: { 
    bg: "from-amber-50/30 to-amber-100/10 dark:from-amber-950/10 dark:to-amber-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    iconComponent: Settings01
  },
  "Human Resources": { 
    bg: "from-cyan-50/30 to-cyan-100/10 dark:from-cyan-950/10 dark:to-cyan-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
    iconComponent: Users01
  },
};

const defaultColors = {
  bg: "from-gray-50/30 to-gray-100/10 dark:from-gray-950/10 dark:to-gray-900/5",
  border: "border-gray-200 dark:border-gray-800",
  icon: "bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400",
  badge: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400",
  iconComponent: Building02
};

export function ExecutiveCard({ executive }: ExecutiveCardProps) {
  const colors = departmentColors[executive.department] || defaultColors;
  const DeptIcon = colors.iconComponent || defaultColors.iconComponent;

  return (
    <Link
      href={`/team/executives/${executive.id}`}
      className={`group relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${colors.bg} ${colors.border}`}
    >
      {/* Department Icon Badge - Top Right */}
      <div className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon}`}>
        <DeptIcon className="h-5 w-5" />
      </div>

      {/* Avatar and Name Section */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar
            initials={getInitials(executive.name)}
            alt={executive.name}
            size="xl"
            className="ring-4 ring-white dark:ring-gray-900 shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" />
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {executive.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{executive.title}</p>
          <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colors.badge}`}>
            {executive.department}
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="mt-5 space-y-2.5 border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-sm">
            <Mail01 className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{executive.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-sm">
            <Phone01 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{executive.phone}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-sm">
            <MarkerPin01 className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{executive.location}</span>
        </div>
      </div>

      {/* View Profile Link */}
      <div className="mt-4 flex items-center justify-end text-sm font-medium text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
        View Profile
        <ChevronRight className="h-4 w-4 ml-1" />
      </div>
    </Link>
  );
}
