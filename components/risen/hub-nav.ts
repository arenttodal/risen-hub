import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  Home,
  Landmark,
  Mountain,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface HubNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the internal navigation. Route segments stay in
 * English (see `docs/PLATFORM-SPEC.md` section 8); the interface copy is
 * Norwegian.
 */
export const hubNav: HubNavItem[] = [
  { href: '/hub', label: 'Overview', icon: Home },
  { href: '/hub/projects', label: 'Projects', icon: FolderKanban },
  { href: '/hub/work', label: 'Work', icon: ClipboardList },
  { href: '/hub/funding', label: 'Funding', icon: CircleDollarSign },
  { href: '/hub/farm', label: 'Farm', icon: Landmark },
  { href: '/hub/events', label: 'Events', icon: CalendarDays },
  { href: '/hub/community', label: 'Community', icon: Users },
  { href: '/hub/public', label: 'Public', icon: Mountain },
];

/**
 * Longest matching prefix wins, so a detail route such as
 * `/hub/projects/laven` keeps `Projects` highlighted instead of `Overview`.
 */
export function activeHubItem(pathname: string): HubNavItem {
  let match = hubNav[0];
  for (const item of hubNav) {
    const isMatch = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (isMatch && item.href.length > match.href.length) match = item;
  }
  return match;
}
