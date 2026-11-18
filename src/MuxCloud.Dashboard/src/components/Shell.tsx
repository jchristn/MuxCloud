import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useCurrentTitle } from '../context/PageTitleContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { Icon } from './Icon';
import { LanguageSelector } from './LanguageSelector';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export const APP_VERSION = '2.0.0';
const GITHUB_URL = 'https://github.com/jchristn/MuxCloud';

interface NavItem {
  to: string;
  key: string;
  icon: string;
  end?: boolean;
}

interface NavGroup {
  key: string;
  items: NavItem[];
  admin?: boolean;
}

const GROUPS: NavGroup[] = [
  {
    key: 'nav.groupWork',
    items: [
      { to: '/machines', key: 'nav.machines', icon: 'server' },
      { to: '/conversations', key: 'nav.conversations', icon: 'messages' },
    ],
  },
  {
    key: 'nav.groupAccount',
    items: [
      { to: '/account', key: 'nav.account', icon: 'user', end: true },
      { to: '/account/billing', key: 'nav.billing', icon: 'card' },
    ],
  },
  {
    key: 'nav.groupAdmin',
    admin: true,
    items: [
      { to: '/admin', key: 'nav.adminOverview', icon: 'gauge', end: true },
      { to: '/admin/users', key: 'nav.adminUsers', icon: 'users' },
      { to: '/admin/machines', key: 'nav.adminMachines', icon: 'layers' },
      { to: '/admin/plans', key: 'nav.adminPlans', icon: 'tag' },
      { to: '/admin/overrides', key: 'nav.adminOverrides', icon: 'key' },
      { to: '/admin/audit', key: 'nav.adminAudit', icon: 'shield' },
    ],
  },
  {
    key: 'nav.groupObserve',
    admin: true,
    items: [
      { to: '/admin/requests', key: 'nav.adminRequests', icon: 'activity' },
      { to: '/admin/explorer', key: 'nav.adminExplorer', icon: 'terminal' },
      { to: '/admin/settings', key: 'nav.adminSettings', icon: 'settings' },
    ],
  },
];

function LiveStatus() {
  const { t } = useTranslation();
  const { state } = useEvents();
  const map = {
    open: { cls: 'pill-success', key: 'shell.live', tip: 'shell.liveTooltip' },
    connecting: { cls: 'pill-warning', key: 'shell.connecting', tip: 'shell.offlineTooltip' },
    closed: { cls: 'pill-danger', key: 'shell.offline', tip: 'shell.offlineTooltip' },
  }[state];
  return (
    <span className={'pill ' + map.cls} title={t(map.tip)} data-testid="live-status">
      <span className="dot" aria-hidden="true" />
      {t(map.key)}
    </span>
  );
}

/** Authenticated layout: grouped sidebar, topbar with context and utilities, scrollable workspace. */
export function Shell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const title = useCurrentTitle();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = usePersistentState('muxcloud.sidebar.collapsed', false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [location.pathname]);

  const groups = GROUPS.filter((g) => !g.admin || user?.isAdmin);

  return (
    <div className={'shell' + (collapsed ? ' collapsed' : '') + (drawer ? ' drawer-open' : '')}>
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      <aside className="sidebar">
        <div className="sidebar-head">
          <NavLink to="/machines" className="sidebar-brand" aria-label={t('common.appName')}>
            <Logo className="brand-logo" onDark />
            <span className="brand-name">
              <span className="brand-cloud">{t('common.appName')}</span>
            </span>
          </NavLink>
          <button
            type="button"
            className="icon-btn drawer-close mobile-only"
            onClick={() => setDrawer(false)}
            aria-label={t('nav.closeMenu')}
            title={t('nav.closeMenu')}
          >
            <Icon name="x" />
          </button>
        </div>
        <nav className="sidebar-nav" aria-label={t('nav.mainNavigation')}>
          {groups.map((group) => (
            <div className="nav-group" key={group.key}>
              <div className="nav-group-label">{t(group.key)}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                  title={collapsed ? t(item.key) : undefined}
                >
                  <Icon name={item.icon} />
                  <span className="label">{t(item.key)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a
            href="/machines?add=1"
            onClick={(e) => {
              e.preventDefault();
              navigate('/machines?add=1');
            }}
          >
            <Icon name="plug" size={14} />
            <span className="label">{t('shell.tour')}</span>
          </a>
          <a
            href="/legal/terms"
            onClick={(e) => {
              e.preventDefault();
              navigate('/legal/terms');
            }}
          >
            <Icon name="book" size={14} />
            <span className="label">{t('shell.legal')}</span>
          </a>
          <span className="mobile-only">
            <LanguageSelector variant="sidebar" />
          </span>
          <span className="label">{t('shell.version', { version: '\u2066' + APP_VERSION + '\u2069' })}</span>
        </div>
      </aside>
      {drawer ? <div className="drawer-backdrop" onClick={() => setDrawer(false)} /> : null}
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setDrawer(!drawer)}
            aria-label={drawer ? t('nav.closeMenu') : t('nav.openMenu')}
            title={t('nav.openMenu')}
          >
            <Icon name="menu" />
          </button>
          <button
            type="button"
            className="icon-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} className="flip-rtl" />
          </button>
          <div className="topbar-title">{title}</div>
          <LiveStatus />
          <span className="topbar-spacer" />
          <span className="principal" title={user ? t('shell.signedInAs', { email: user.email }) : undefined}>
            <Icon name="user" size={16} />
            <span className="email">{user?.email}</span>
            {user?.isAdmin ? <span className="pill pill-accent">{t('shell.admin')}</span> : null}
          </span>
          <div className="topbar-actions">
            <span className="desktop-only">
              <LanguageSelector />
            </span>
            <ThemeToggle />
            <a
              className="icon-btn desktop-only"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t('shell.github')}
              title={t('shell.github')}
            >
              <Icon name="github" />
            </a>
            <button
              type="button"
              className="icon-btn"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              aria-label={t('shell.logout')}
              title={t('shell.logout')}
            >
              <Icon name="logout" className="flip-rtl" />
            </button>
          </div>
        </header>
        <main id="main" className={'content' + (flush ? ' flush' : '')}>
          {children}
        </main>
      </div>
    </div>
  );
}
