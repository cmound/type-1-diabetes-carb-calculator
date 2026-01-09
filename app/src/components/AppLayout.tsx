import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/templates', label: 'Templates' },
    { path: '/journal', label: 'Meal Journal' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Type 1 Diabetes Calculator</h1>
      </header>

      <nav className="app-nav" role="navigation" aria-label="Main navigation">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                end={item.path === '/'}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="app-main">{children}</main>
    </div>
  );
}
