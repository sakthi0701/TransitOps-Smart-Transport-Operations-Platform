import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Truck, Users, Navigation, Wrench,
  BarChart3, Trophy, Zap, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/dispatch',    icon: Navigation,      label: 'Dispatch'    },
  { to: '/fleet',       icon: Truck,           label: 'Fleet'       },
  { to: '/drivers',     icon: Users,           label: 'Drivers'     },
  { to: '/maintenance', icon: Wrench,          label: 'Maintenance' },
  { to: '/analytics',   icon: BarChart3,       label: 'Analytics'   },
  { to: '/leaderboard', icon: Trophy,          label: 'Leaderboard' },
  { to: '/driver-view', icon: Zap,             label: 'Driver View' },
]

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`
          flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
          bg-surface-card border-r border-surface-border
          ${sidebarOpen ? 'w-64' : 'w-16'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-border">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center glow-accent">
            <Truck size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="text-gradient-brand font-bold text-lg leading-none block">TransitOps</span>
              <span className="text-slate-500 text-xs">Fleet Intelligence</span>
            </div>
          )}
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
        <div className="px-3 py-4 border-t border-surface-border">
          {sidebarOpen && user && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-surface">
              <p className="text-white text-sm font-medium truncate">{user.email}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                <span className="badge-teal px-1.5 py-0.5 rounded-full text-xs">{user.role}</span>
              </p>
            </div>
          )}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 h-14 border-b border-surface-border bg-surface-card/80 backdrop-blur-md flex items-center px-6">
          <div className="ml-auto flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
            <span className="text-slate-400 text-sm">System Online</span>
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
