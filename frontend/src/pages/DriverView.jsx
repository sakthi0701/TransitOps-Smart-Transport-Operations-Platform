import { useEffect, useState, useRef, useCallback } from 'react'
import {
  MapPin, Truck, Navigation, CheckCircle2, AlertTriangle,
  Clock, Zap, Users, Bell, BellOff, RefreshCw, Flag,
  ChevronRight, Activity, X
} from 'lucide-react'
import api from '../api/client'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

// ── ETA calculator ──────────────────────────────────────────────────────────────
// Assumed average speed: 60 km/h. Each checkpoint = planned_distance / 10 km.
const CHECKPOINTS_TOTAL = 10
const AVG_SPEED_KMH = 60

function calcEta(trip) {
  if (!trip) return null
  const kmPerCheckpoint = trip.planned_distance_km / CHECKPOINTS_TOTAL
  const distanceCovered = trip.checkpoints_cleared * kmPerCheckpoint
  const remaining = Math.max(trip.planned_distance_km - distanceCovered, 0)
  const etaMinutes = (remaining / AVG_SPEED_KMH) * 60
  return { remaining: remaining.toFixed(1), etaMinutes: Math.round(etaMinutes) }
}

function formatEta(minutes) {
  if (minutes <= 0) return 'Arrived'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `~${h}h ${m}m`
  return `~${m}m`
}

// ── Alert Banner ────────────────────────────────────────────────────────────────
function AlertBanner({ alerts, onRead }) {
  const unread = alerts.filter(a => a.status === 'Unread')
  if (unread.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {unread.map(alert => (
        <div
          key={alert.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-red-500/15 border border-red-500/40 animate-fade-in"
        >
          <Bell size={16} className="text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-red-300 text-sm font-medium">Dispatch Alert</p>
            <p className="text-white text-sm mt-0.5">{alert.message}</p>
            <p className="text-red-400/60 text-xs mt-1">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => onRead(alert.id)}
            className="flex-shrink-0 p-1 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
            title="Mark as read"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Checkpoint Progress Bar ─────────────────────────────────────────────────────
function ProgressBar({ cleared, total = CHECKPOINTS_TOTAL }) {
  const pct = Math.min((cleared / total) * 100, 100)
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Checkpoint {cleared} / {total}</span>
        <span>{pct.toFixed(0)}% complete</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-600 to-teal-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Checkpoint dots */}
      <div className="flex gap-1.5 mt-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all duration-500 ${
              i < cleared ? 'bg-teal-500' : 'bg-surface-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ── No Active Trip Panel ────────────────────────────────────────────────────────
function NoTripPanel({ onRefresh, loading }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="w-20 h-20 rounded-full bg-surface-card flex items-center justify-center border border-surface-border">
        <Truck size={36} className="text-slate-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">No Active Trip</h2>
        <p className="text-slate-400 text-sm">You don't have a dispatched trip at the moment.</p>
        <p className="text-slate-500 text-xs mt-1">The Fleet Manager will assign one when ready.</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="btn-ghost btn-sm flex items-center gap-2"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  )
}

// ── Main Driver View ────────────────────────────────────────────────────────────
export default function DriverView() {
  const { user } = useAuthStore()
  const [trip, setTrip] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkpointing, setCheckpointing] = useState(false)
  const pollRef = useRef(null)

  // ── Load trip for this driver (any dispatched trip they're on)
  const loadTrip = useCallback(async () => {
    try {
      const res = await api.get('/trips/?status=Dispatched')
      const dispatched = res.data
      // Find the trip the current user/driver is assigned to.
      // Since users are not 1:1 with drivers in seed data, we show the first dispatched trip
      // in a real scenario you'd filter by driver_id tied to user. For demo we show any active trip.
      const active = dispatched.length > 0 ? dispatched[0] : null
      setTrip(active)
      return active
    } catch {
      // silent — handled by polling
    }
  }, [])

  // ── Load alerts for the active trip
  const loadAlerts = useCallback(async (tripId) => {
    if (!tripId) return
    try {
      const res = await api.get(`/alerts/?trip_id=${tripId}`)
      setAlerts(res.data)
    } catch {
      // silent
    }
  }, [])

  // ── Combined poll tick
  const poll = useCallback(async () => {
    const active = await loadTrip()
    if (active) {
      await loadAlerts(active.id)
    } else {
      setAlerts([])
    }
  }, [loadTrip, loadAlerts])

  // ── Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await poll()
      setLoading(false)
    }
    init()
  }, [poll])

  // ── 10-second polling
  useEffect(() => {
    pollRef.current = setInterval(poll, 10_000)
    return () => clearInterval(pollRef.current)
  }, [poll])

  // ── Checkpoint action
  const handleCheckpoint = async () => {
    if (!trip) return
    setCheckpointing(true)
    try {
      const res = await api.post(`/trips/${trip.id}/checkpoint`)
      setTrip(res.data)
      toast.success(`Checkpoint ${res.data.checkpoints_cleared} cleared! ETA updated.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record checkpoint')
    } finally {
      setCheckpointing(false)
    }
  }

  // ── Mark alert as read
  const markRead = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read`)
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Read' } : a))
    } catch {
      toast.error('Could not mark alert as read')
    }
  }

  const eta = calcEta(trip)
  const unreadCount = alerts.filter(a => a.status === 'Unread').length
  const allCompleted = trip && trip.checkpoints_cleared >= CHECKPOINTS_TOTAL

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Navigation size={22} className="text-primary-400" />
            Driver View
          </h1>
          <p className="page-subtitle">
            Live trip status &amp; simulated tracking
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-400">
                <Bell size={12} className="animate-pulse" /> {unreadCount} unread alert{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); poll().finally(() => setLoading(false)) }}
          className="btn-ghost btn-sm"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-28 animate-pulse" />)}
        </div>
      ) : !trip ? (
        <NoTripPanel onRefresh={() => { setLoading(true); poll().finally(() => setLoading(false)) }} loading={loading} />
      ) : (
        <div className="space-y-4">

          {/* ── Alert Banners ─────────────────────────────────────────────── */}
          <AlertBanner alerts={alerts} onRead={markRead} />

          {/* ── Trip Header Card ──────────────────────────────────────────── */}
          <div className="card p-5 border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-1">
                  Active Trip #{trip.id}
                </p>
                <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                  {trip.source}
                  <ChevronRight size={20} className="text-slate-500" />
                  {trip.destination}
                </h2>
              </div>
              <span className="badge-blue flex items-center gap-1.5 text-sm px-3 py-1.5">
                <Activity size={12} className="animate-pulse" />
                Dispatched
              </span>
            </div>

            {/* Trip Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-surface p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">Cargo</p>
                <p className="text-white font-bold text-lg">{trip.cargo_weight_kg}<span className="text-slate-500 text-xs ml-1">kg</span></p>
              </div>
              <div className="rounded-xl bg-surface p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">Distance</p>
                <p className="text-white font-bold text-lg">{trip.planned_distance_km}<span className="text-slate-500 text-xs ml-1">km</span></p>
              </div>
              <div className="rounded-xl bg-surface p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">ETA</p>
                <p className="text-teal-400 font-bold text-lg">{formatEta(eta?.etaMinutes)}</p>
              </div>
            </div>
          </div>

          {/* ── Live Tracking Card ────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-primary-400" />
                <h3 className="text-white font-semibold">Live Tracking</h3>
              </div>
              <div className="text-xs text-slate-500">
                ~{eta?.remaining} km remaining
              </div>
            </div>

            <ProgressBar cleared={trip.checkpoints_cleared} total={CHECKPOINTS_TOTAL} />

            {/* Journey line visualization */}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400">{trip.source}</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 via-primary-500/50 to-slate-600/30 relative">
                {/* Position marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary-500 border-2 border-surface flex items-center justify-center transition-all duration-700"
                  style={{ left: `${Math.min((trip.checkpoints_cleared / CHECKPOINTS_TOTAL) * 100, 95)}%` }}
                >
                  <Truck size={8} className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{trip.destination}</span>
                <Flag size={12} className="text-red-400" />
              </div>
            </div>

            {/* Checkpoint button */}
            <div className="mt-5">
              {allCompleted ? (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 size={18} />
                  <span className="font-medium">All checkpoints cleared — ready to complete!</span>
                </div>
              ) : (
                <button
                  id="checkpoint-btn"
                  onClick={handleCheckpoint}
                  disabled={checkpointing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-teal-600
                    hover:from-primary-500 hover:to-teal-500 text-white font-semibold text-base
                    transition-all duration-200 active:scale-[0.98] shadow-lg shadow-primary-900/30
                    flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkpointing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  {checkpointing ? 'Recording…' : `Reached Checkpoint ${trip.checkpoints_cleared + 1}`}
                </button>
              )}
              <p className="text-center text-slate-500 text-xs mt-2">
                Click each time you reach a waypoint. ETA auto-recalculates.
              </p>
            </div>
          </div>

          {/* ── Long-Haul Badge ───────────────────────────────────────────── */}
          {trip.planned_distance_km > 500 && (
            <div className="card p-4 flex items-center gap-3 border border-yellow-500/20 bg-yellow-500/5">
              <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 font-medium text-sm">Long-Haul Mentor Trip</p>
                <p className="text-yellow-400/70 text-xs">Expert + Beginner driver pair required for {trip.planned_distance_km} km journey</p>
              </div>
            </div>
          )}

          {/* ── Alert History ─────────────────────────────────────────────── */}
          {alerts.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-slate-400" />
                <h3 className="text-white font-semibold text-sm">Dispatch Alerts</h3>
                <span className="ml-auto text-xs text-slate-500">{alerts.length} total</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      alert.status === 'Unread'
                        ? 'bg-red-500/10 border border-red-500/25'
                        : 'bg-surface'
                    }`}
                  >
                    {alert.status === 'Unread'
                      ? <Bell size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                      : <BellOff size={13} className="text-slate-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${alert.status === 'Unread' ? 'text-white' : 'text-slate-400'}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {alert.status === 'Unread' && (
                      <button
                        onClick={() => markRead(alert.id)}
                        className="text-xs text-red-400 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Polling indicator ─────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 pb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Auto-refreshing every 10 seconds
          </div>
        </div>
      )}
    </div>
  )
}
