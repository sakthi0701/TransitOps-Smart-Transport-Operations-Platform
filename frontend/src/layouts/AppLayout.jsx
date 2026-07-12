import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Truck, Users, Navigation, Wrench,
  BarChart3, Trophy, UserCheck, LogOut, Menu, ChevronRight,
  Sun, Moon
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import useRBAC from '../store/useRBAC'
import useThemeStore from '../store/themeStore'
import toast from 'react-hot-toast'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const { isManager, isDispatcher, isSafety, isFinance, canDispatch, canManageFleet, canManageSafety, canManageFinance } = useRBAC()
  const { isDark, toggleTheme, initTheme } = useThemeStore()

  // Apply persisted theme on mount
  useEffect(() => {
    initTheme()
  }, [])

  const NAV_ITEMS = [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',    show: true },
    { to: '/dispatch',    icon: Navigation,      label: 'Dispatch',     show: canDispatch || isManager },
    { to: '/fleet',       icon: Truck,           label: 'Fleet',        show: canManageFleet || isManager },
    { to: '/drivers',     icon: Users,           label: 'Drivers',      show: canManageFleet || isManager },
    { to: '/maintenance', icon: Wrench,          label: 'Maintenance',  show: canManageSafety || isManager },
    { to: '/fuel',        icon: BarChart3,       label: 'Fuel & Expense', show: canManageFinance || isManager || isDispatcher },
    { to: '/analytics',   icon: Trophy,          label: 'Analytics',    show: isManager || isFinance || isDispatcher },
    { to: '/leaderboard', icon: Trophy,          label: 'Leaderboard',  show: true },
    { to: '/driver-view', icon: UserCheck,       label: 'Driver View',  show: isManager || isDispatcher },
  ].filter(item => item.show !== false)

  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`
          flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
          theme-transition
          ${sidebarOpen ? 'w-64' : 'w-16'}
        `}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center glow-accent">
            <Truck size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="text-gradient-brand font-bold text-lg leading-none block">TransitOps</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Fleet Intelligence</span>
            </div>
          )}
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {sidebarOpen ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              id={`nav-${label.toLowerCase().replace(' ', '-')}`}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          {sidebarOpen && user && (
            <div className="mb-3 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
              <p className="text-xs mt-0.5">
                <span className="badge-teal px-1.5 py-0.5 rounded-full text-xs">{user.role}</span>
              </p>
            </div>
          )}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="sidebar-link w-full"
            style={{ color: '#ef5350' }}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto theme-transition" style={{ backgroundColor: 'var(--bg-canvas)' }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 h-14 flex items-center px-6 backdrop-blur-md"
          style={{
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'rgba(var(--bg-card-rgb, 255,255,255), 0.85)',
            background: isDark ? 'rgba(30,30,46,0.85)' : 'rgba(255,255,255,0.85)',
          }}
        >
          <div className="ml-auto flex items-center gap-3">
            {user?.role && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                user.role === 'Manager'    ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-primary-600/20 dark:text-primary-300 dark:border-primary-500/30' :
                user.role === 'Dispatcher' ? 'bg-blue-100 text-blue-700 border border-blue-200'    :
                user.role === 'Safety'     ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                             'bg-purple-100 text-purple-700 border border-purple-200'
              }`}>
                {user.role}
              </span>
            )}

            {/* ── Dark / Light toggle ── */}
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg-muted)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>System Online</span>
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
