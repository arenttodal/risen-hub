import {
  CalendarDays,
  Coins,
  FileText,
  Hammer,
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
 * Single source of truth for the internal navigation.
 *
 * Route segments stay English (PLATFORM-SPEC.md section 8); the labels are
 * Norwegian, which is the internal product language. The label set is fixed by
 * CLAUDE-HANDOFF.md section 2.
 */
export const hubNav: HubNavItem[] = [
  { href: '/hub', label: 'Oversikt', icon: Home },
  { href: '/hub/projects', label: 'Prosjekter', icon: FileText },
  { href: '/hub/work', label: 'Arbeid', icon: Hammer },
  { href: '/hub/funding', label: 'Finansiering', icon: Coins },
  { href: '/hub/farm', label: 'Gården', icon: Landmark },
  { href: '/hub/events', label: 'Arrangement', icon: CalendarDays },
  { href: '/hub/community', label: 'Fellesskap', icon: Users },
  { href: '/hub/public', label: 'Offentlig', icon: Mountain },
];

/**
 * Longest matching prefix wins, so a detail route such as
 * `/hub/projects/barn` keeps `Prosjekter` highlighted.
 */
export function activeHubItem(pathname: string): HubNavItem {
  let match = hubNav[0];
  for (const item of hubNav) {
    const isMatch = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (isMatch && item.href.length > match.href.length) match = item;
  }
  return match;
}
