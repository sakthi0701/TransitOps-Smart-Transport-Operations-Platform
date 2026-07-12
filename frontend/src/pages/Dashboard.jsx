import { useEffect, useState } from 'react'
import { Truck, Users, Navigation, Wrench, Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="kpi-card group hover:border-primary-600/40 transition-all duration-200">
      <div className={`kpi-icon ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-3xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
      </div>
    </div>
  )
}

function RiskVehicleRow({ vehicle }) {
  const riskColor =
    vehicle.breakdown_risk_score >= 70 ? 'badge-red' :
      vehicle.breakdown_risk_score >= 40 ? 'badge-yellow' : 'badge-green'

  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-lg transition-colors" style={{ '--hover-bg': 'rgba(0,0,0,0.03)' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{vehicle.registration_number}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{vehicle.model} · {vehicle.type}</p>
      </div>
      <span className={riskColor}>
        {vehicle.breakdown_risk_score >= 70 ? '🔴' : vehicle.breakdown_risk_score >= 40 ? '🟡' : '🟢'}{' '}
        {vehicle.breakdown_risk_score.toFixed(0)}%
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadKpis()
  }, [])

  const loadKpis = async () => {
    setLoading(true)
    try {
      // Fetch vehicles and drivers to compute live KPIs
      const [vehiclesRes, driversRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/drivers/'),
      ])
      const vehicles = vehiclesRes.data
      const drivers = driversRes.data

      const activeVehicles = vehicles.filter(v => v.status === 'On Trip').length
      const availableVehicles = vehicles.filter(v => v.status === 'Available').length
      const inMaintenance = vehicles.filter(v => v.status === 'In Shop').length
      const driversOnDuty = drivers.filter(d => d.status === 'On Trip').length
      const totalVehicles = vehicles.length
      const utilization = totalVehicles > 0
        ? Math.round((activeVehicles / totalVehicles) * 100)
        : 0

      const highRisk = vehicles
        .filter(v => v.breakdown_risk_score >= 40)
        .sort((a, b) => b.breakdown_risk_score - a.breakdown_risk_score)
        .slice(0, 4)

      setKpis({ activeVehicles, availableVehicles, inMaintenance, driversOnDuty, utilization, totalVehicles, highRisk, totalDrivers: drivers.length })
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const KPI_CARDS = kpis ? [
    { icon: Truck, label: 'Active Vehicles', value: kpis.activeVehicles, sub: `of ${kpis.totalVehicles} total`, iconBg: 'bg-blue-500/15', iconColor: 'text-blue-500' },
    { icon: Activity, label: 'Available Vehicles', value: kpis.availableVehicles, sub: 'ready to dispatch', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-500' },
    { icon: Wrench, label: 'In Maintenance', value: kpis.inMaintenance, sub: 'in shop / offline', iconBg: 'bg-slate-500/15', iconColor: 'text-slate-400' },
    { icon: Users, label: 'Drivers On Duty', value: kpis.driversOnDuty, sub: `of ${kpis.totalDrivers} registered`, iconBg: 'bg-blue-500/15', iconColor: 'text-blue-500' },
    { icon: TrendingUp, label: 'Fleet Utilization', value: `${kpis.utilization}%`, sub: 'active / total vehicles', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-500' },
    { icon: Navigation, label: 'Available Drivers', value: kpis.totalDrivers - kpis.driversOnDuty, sub: 'assignable now', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-500' },
  ] : []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Fleet Operations Overview — Live Data</p>
        </div>
        <button id="refresh-dashboard" onClick={loadKpis} className="btn-ghost btn-sm">
          <Activity size={14} /> Refresh
        </button>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-surface-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {KPI_CARDS.map((c) => <KpiCard key={c.label} {...c} />)}
        </div>
      )}

      {/* Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-blue-500" />
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Maintenance Risk Alerts</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-surface animate-pulse" />)}
            </div>
          ) : kpis?.highRisk?.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All vehicles are in good health ✅</p>
          ) : (
            <div className="space-y-1">
              {kpis?.highRisk?.map(v => <RiskVehicleRow key={v.id} vehicle={v} />)}
            </div>
          )}
        </div>

        {/* Quick-start guide */}
        <div className="card p-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'Add a Vehicle',    href: '/fleet' },
              { label: 'Register Driver',  href: '/drivers' },
              { label: 'Create a Trip',    href: '/dispatch' },
              { label: 'View Leaderboard', href: '/leaderboard' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center justify-between p-3 rounded-xl border transition-all group"
                style={{
                  backgroundColor: 'var(--bg-card-alt)',
                  borderColor: 'var(--border-color)',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-card-alt)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="transition-colors" style={{ color: 'var(--accent)' }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
