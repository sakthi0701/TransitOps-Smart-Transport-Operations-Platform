import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Truck, Users, Navigation, Wrench,
  BarChart3, Trophy, UserCheck, LogOut, Menu, ChevronRight
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import useRBAC from '../store/useRBAC'
import toast from 'react-hot-toast'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const { isManager, isDispatcher, isSafety, isFinance, canDispatch, canManageFleet, canManageSafety, canManageFinance } = useRBAC()
  
  const NAV_ITEMS = [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',      show: true },
    { to: '/dispatch',    icon: Navigation,      label: 'Dispatch',       show: canDispatch || isManager },
    { to: '/fleet',       icon: Truck,           label: 'Fleet',          show: canManageFleet || isManager },
    { to: '/drivers',     icon: Users,           label: 'Drivers',        show: canManageFleet || isManager },
    { to: '/maintenance', icon: Wrench,          label: 'Maintenance',    show: canManageSafety || isManager },
    { to: '/fuel',        icon: BarChart3,       label: 'Fuel & Expense', show: canManageFinance || isManager || isDispatcher },
    { to: '/analytics',   icon: Trophy,          label: 'Analytics',      show: isManager || isFinance || isDispatcher },
    { to: '/leaderboard', icon: Trophy,          label: 'Leaderboard',    show: true },
    { to: '/driver-view', icon: UserCheck,       label: 'Driver View',    show: isManager || isDispatcher },
  ].filter(item => item.show !== false)

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
            {user?.role && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                user.role === 'Manager'    ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' :
                user.role === 'Dispatcher' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' :
                user.role === 'Safety'     ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' :
                                             'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              }`}>
                {user.role}
              </span>
            )}
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
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
