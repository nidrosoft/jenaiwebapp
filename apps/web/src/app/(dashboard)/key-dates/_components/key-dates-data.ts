/**
 * Key Dates - Types and Utilities
 */

// Key Date type definition
export interface KeyDate {
  id: string;
  title: string;
  date: string;
  category: KeyDateCategory;
  description?: string;
  reminder?: number; // days before
  recurring?: "yearly" | "monthly" | "none";
  relatedPerson?: string;
}

// Category types
export type KeyDateCategory =
  | "birthdays"
  | "anniversaries"
  | "deadlines"
  | "milestones"
  | "travel"
  | "financial"
  | "team"
  | "personal"
  | "vip"
  | "expirations"
  | "holidays"
  | "other";

// Category configuration
export interface CategoryConfig {
  id: KeyDateCategory | "all";
  label: string;
  icon: string;
  color: string;
}

export const categories: CategoryConfig[] = [
  { id: "all", label: "All", icon: "📅", color: "gray" },
  { id: "birthdays", label: "Birthdays", icon: "🎂", color: "pink" },
  { id: "anniversaries", label: "Anniversaries", icon: "💍", color: "purple" },
  { id: "deadlines", label: "Deadlines", icon: "⏰", color: "error" },
  { id: "milestones", label: "Milestones", icon: "🎯", color: "success" },
  { id: "travel", label: "Travel", icon: "✈️", color: "blue" },
  { id: "financial", label: "Financial", icon: "💰", color: "warning" },
  { id: "team", label: "Team", icon: "👥", color: "indigo" },
  { id: "personal", label: "Personal", icon: "🏠", color: "orange" },
  { id: "vip", label: "VIP/Client", icon: "⭐", color: "purple" },
  { id: "expirations", label: "Expirations", icon: "📋", color: "gray" },
  { id: "holidays", label: "Holidays", icon: "🎉", color: "success" },
  { id: "other", label: "Other", icon: "📌", color: "gray" },
];

export const getCategoryConfig = (category: KeyDateCategory): CategoryConfig => {
  return categories.find((c) => c.id === category) || categories[0];
};

// Helper to get dates by category
export const getDatesByCategory = (dates: KeyDate[], category: KeyDateCategory | "all"): KeyDate[] => {
  if (category === "all") return dates;
  return dates.filter((d) => d.category === category);
};

// Helper to sort dates
export const sortDatesByDate = (dates: KeyDate[]): KeyDate[] => {
  return [...dates].sort((a, b) => {
    const dateA = new Date(a.date.split("-")[0]);
    const dateB = new Date(b.date.split("-")[0]);
    return dateA.getTime() - dateB.getTime();
  });
};
