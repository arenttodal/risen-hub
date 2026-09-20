'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Menu, Mountain, Plus, Search } from 'lucide-react';
import { activeHubItem, hubNav } from './hub-nav';
import { JosefaProvider } from './josefa-context';
import { Josefa } from './josefa';
import { QuickCapture, type CaptureOption } from './quick-capture';

export function HubShell({
  children,
  projects,
  places,
}: {
  children: ReactNode;
  projects: CaptureOption[];
  places: CaptureOption[];
}) {
  const [josefaOpen, setJosefaOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname() ?? '/hub';
  const active = activeHubItem(pathname);

  // The shell lives in the layout and survives navigation, so the mobile drawer
  // has to be closed explicitly whenever the route changes.
  useEffect(() => setMobileNav(false), [pathname]);

  const openJosefa = useCallback(() => setJosefaOpen(true), []);
  const openCapture = useCallback(() => setCaptureOpen(true), []);

  // Keyboard shortcuts from PLATFORM-SPEC.md section 8. They must never fire
  // while someone is typing, so anything with a text entry focused is ignored.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;

      if (event.key === 'Escape') {
        setCaptureOpen(false);
        setJosefaOpen(false);
        setMobileNav(false);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        setCaptureOpen(true);
      }
      if (event.key === 'j' || event.key === 'J') {
        event.preventDefault();
        setJosefaOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <JosefaProvider value={{ open: openJosefa }}>
      <div className="hub-app">
        <button
          type="button"
          className={`hub-scrim ${mobileNav ? 'is-visible' : ''}`}
          onClick={() => setMobileNav(false)}
          tabIndex={mobileNav ? 0 : -1}
          aria-label="Lukk menyen"
          aria-hidden={!mobileNav}
        />
        <aside className={`hub-sidebar ${mobileNav ? 'is-open' : ''}`}>
          <Link className="hub-brand" href="/">
            <Mountain size={25} />
            <span>
              risen<small>Farm platform</small>
            </span>
          </Link>
          <nav aria-label="Risen-moduler">
            {hubNav.map(({ href, label, icon: Icon }) => {
              const isActive = href === active.href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={isActive ? 'active' : ''}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="hub-sidebar-foot">
            <span>Workspace</span>
            <strong>Risen gård</strong>
            <small>Internal preview · no login</small>
          </div>
        </aside>
        <main className="hub-main">
          <header className="hub-topbar">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Meny"
              aria-expanded={mobileNav}
            >
              <Menu />
            </button>
            <div>
              <p>20. september 2026</p>
              <h1>{active.label}</h1>
            </div>
            <div className="hub-actions">
              <button type="button" className="search-button">
                <Search size={17} />
                Søk i Risen
              </button>
              <button type="button" className="capture-button" onClick={openCapture}>
                <Plus size={16} />
                Ny sak
              </button>
              <button type="button" className="josefa-button" onClick={openJosefa}>
                <BookOpen size={16} />
                Josefa
              </button>
            </div>
          </header>
          {children}
        </main>
        <Josefa open={josefaOpen} onClose={() => setJosefaOpen(false)} />
        <QuickCapture
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          projects={projects}
          places={places}
        />
      </div>
    </JosefaProvider>
  );
}
