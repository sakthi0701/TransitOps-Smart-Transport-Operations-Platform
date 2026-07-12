import { useEffect, useState, useCallback } from 'react'
import {
  Navigation, Plus, CheckSquare, Square, Zap, X, ChevronRight,
  Truck, Users, AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
  Sparkles, Send, Bell, Brain, Lock
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import useRBAC from '../store/useRBAC'

// ── Status badge helper ────────────────────────────────────────────────────────
function TripBadge({ status }) {
  const map = {
    Draft: 'badge-yellow',
    Dispatched: 'badge-blue',
    Completed: 'badge-green',
    Cancelled: 'badge-red',
  }
  const icons = {
    Draft: <Clock size={11} />,
    Dispatched: <Zap size={11} />,
    Completed: <CheckCircle2 size={11} />,
    Cancelled: <XCircle size={11} />,
  }
  return (
    <span className={`${map[status] || 'badge-yellow'} flex items-center gap-1`}>
      {icons[status]} {status}
    </span>
  )
}

// ── Safety checklist items ─────────────────────────────────────────────────────
const CHECKLIST_ITEMS = ['Tires & Pressure', 'Brakes', 'Lights & Indicators', 'Fluids & Oil', 'Documents & Permits']

// ── Create Trip Modal ──────────────────────────────────────────────────────────
function CreateTripModal({ onClose, onCreated }) {
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({
    source: '', destination: '', cargo_weight_kg: '', planned_distance_km: '',
    primary_driver_id: '', secondary_driver_id: '', vehicle_id: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/drivers/?assignable=true'),
      api.get('/vehicles/?dispatchable=true'),
    ]).then(([d, v]) => {
      setDrivers(d.data)
      setVehicles(v.data)
    }).catch(() => toast.error('Failed to load drivers/vehicles'))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const distNum = parseFloat(form.planned_distance_km) || 0
  const longHaul = distNum > 500

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        source: form.source.trim(),
        destination: form.destination.trim(),
        cargo_weight_kg: parseFloat(form.cargo_weight_kg),
        planned_distance_km: parseFloat(form.planned_distance_km),
        primary_driver_id: parseInt(form.primary_driver_id),
        vehicle_id: parseInt(form.vehicle_id),
        secondary_driver_id: form.secondary_driver_id ? parseInt(form.secondary_driver_id) : null,
      }
      await api.post('/trips/', body)
      toast.success('Trip created successfully!')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create trip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation size={20} className="text-primary-400" /> New Trip
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Source *</label>
              <input className="input" required value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. Mumbai" />
            </div>
            <div>
              <label className="form-label">Destination *</label>
              <input className="input" required value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Pune" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cargo Weight (kg) *</label>
              <input className="input" type="number" min="0" step="0.1" required value={form.cargo_weight_kg} onChange={e => set('cargo_weight_kg', e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div>
              <label className="form-label">Planned Distance (km) *</label>
              <input className="input" type="number" min="0" step="0.1" required value={form.planned_distance_km} onChange={e => set('planned_distance_km', e.target.value)} placeholder="e.g. 350" />
            </div>
          </div>

          {longHaul && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Long-haul trip (&gt;500 km): requires an Expert primary driver (level ≥7) and a Beginner secondary driver (level ≤3).</span>
            </div>
          )}

          <div>
            <label className="form-label">Vehicle *</label>
            <select className="input" required value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
              <option value="">— Select vehicle —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.model} ({v.type}, max {v.max_capacity_kg} kg)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Primary Driver * {longHaul && <span className="text-yellow-400 text-xs ml-1">(must be Expert, level ≥7)</span>}</label>
            <select className="input" required value={form.primary_driver_id} onChange={e => set('primary_driver_id', e.target.value)}>
              <option value="">— Select primary driver —</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} — Lvl {d.experience_level} | Safety {d.safety_score}
                  {d.experience_level >= 7 ? ' ⭐ Expert' : d.experience_level <= 3 ? ' 🌱 Beginner' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Secondary Driver
              {longHaul && <span className="text-amber-400 text-xs ml-1">(Recommended — Beginner, level ≤3)</span>}
            </label>
            {longHaul && !form.secondary_driver_id && (
              <div className="mb-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span>Recommended for long-haul trips. Assigning a Beginner driver (level ≤3) enables mentor-pairing. You can skip this and dispatch will still work.</span>
              </div>
            )}
            <select
              className="input"
              value={form.secondary_driver_id}
              onChange={e => set('secondary_driver_id', e.target.value)}
            >
              <option value="">— Optional (add Beginner for mentor pair) —</option>
              {drivers.filter(d => d.id !== parseInt(form.primary_driver_id)).map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} — Lvl {d.experience_level} | Safety {d.safety_score}
                  {d.experience_level >= 7 ? ' ⭐ Expert' : d.experience_level <= 3 ? ' 🌱 Beginner' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Complete Trip Modal ────────────────────────────────────────────────────────
function CompleteModal({ trip, onClose, onDone }) {
  const [actual_distance_km, setDist] = useState(trip.planned_distance_km || '')
  const [fuel_consumed_liters, setFuel] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/trips/${trip.id}/complete`, {
        actual_distance_km: parseFloat(actual_distance_km),
        fuel_consumed_liters: parseFloat(fuel_consumed_liters),
      })
      toast.success('Trip completed! Statuses updated.')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete trip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Complete Trip #{trip.id}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Actual Distance (km) *</label>
            <input className="input" type="number" min="0" step="0.1" required value={actual_distance_km} onChange={e => setDist(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Fuel Consumed (liters) *</label>
            <input className="input" type="number" min="0" step="0.1" required value={fuel_consumed_liters} onChange={e => setFuel(e.target.value)} placeholder="e.g. 45.5" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-500">
              {saving ? 'Completing...' : '✓ Complete Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Trip Detail Panel ──────────────────────────────────────────────────────────
function TripDetail({ trip, drivers, vehicles, onRefresh, canDispatch }) {
  const [checklistDone, setChecklistDone] = useState(trip.is_safety_checklist_complete)
  const [checkedItems, setCheckedItems] = useState(
    trip.is_safety_checklist_complete
      ? new Set(CHECKLIST_ITEMS.map((_, i) => i))
      : new Set()
  )
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [acting, setActing] = useState(false)

  // Auto-Assign (Agentic Dispatcher)
  const [assigning, setAssigning] = useState(false)
  const [reasoning, setReasoning] = useState('')

  // Alert sender (for Dispatched trips)
  const [alertMsg, setAlertMsg] = useState('')
  const [sendingAlert, setSendingAlert] = useState(false)

  useEffect(() => {
    setChecklistDone(trip.is_safety_checklist_complete)
    setCheckedItems(
      trip.is_safety_checklist_complete
        ? new Set(CHECKLIST_ITEMS.map((_, i) => i))
        : new Set()
    )
    // Clear reasoning when a different trip is selected
    setReasoning('')
    setAlertMsg('')
  }, [trip.id, trip.is_safety_checklist_complete])

  const primaryDriver = drivers.find(d => d.id === trip.primary_driver_id)
  const secondaryDriver = trip.secondary_driver_id ? drivers.find(d => d.id === trip.secondary_driver_id) : null
  const vehicle = vehicles.find(v => v.id === trip.vehicle_id)

  const toggleItem = (idx) => {
    const next = new Set(checkedItems)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setCheckedItems(next)
  }

  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length

  const handleChecklist = async () => {
    if (trip.status !== 'Draft') return
    setActing(true)
    try {
      await api.post(`/trips/${trip.id}/checklist`)
      toast.success(checklistDone ? 'Checklist unmarked' : 'Safety checklist complete!')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update checklist')
    } finally {
      setActing(false)
    }
  }

  const handleDispatch = async () => {
    setActing(true)
    try {
      await api.post(`/trips/${trip.id}/dispatch`)
      toast.success('Trip dispatched! Vehicle & drivers are now On Trip.')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Dispatch failed')
    } finally {
      setActing(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this trip? Statuses will be restored.')) return
    setActing(true)
    try {
      await api.post(`/trips/${trip.id}/cancel`)
      toast.success('Trip cancelled. Resources freed.')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed')
    } finally {
      setActing(false)
    }
  }

  // ── Auto-Assign (Agentic Dispatcher) ─────────────────────────────────────────
  const handleAutoAssign = async () => {
    setAssigning(true)
    setReasoning('')
    try {
      const res = await api.post(`/trips/${trip.id}/auto-assign`)
      setReasoning(res.data.reasoning)
      toast.success('⚡ Auto-Assign complete! Best pair selected.')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Auto-Assign failed')
    } finally {
      setAssigning(false)
    }
  }

  // ── Send Dispatch Alert ───────────────────────────────────────────────────────
  const handleSendAlert = async (e) => {
    e.preventDefault()
    if (!alertMsg.trim()) return
    setSendingAlert(true)
    try {
      await api.post('/alerts/', { trip_id: trip.id, message: alertMsg.trim() })
      toast.success('Alert sent to driver!')
      setAlertMsg('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send alert')
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs mb-1">Trip #{trip.id}</p>
          <h3 className="text-white font-bold text-lg">{trip.source} → {trip.destination}</h3>
        </div>
        <TripBadge status={trip.status} />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-slate-400 text-xs mb-1">Cargo Weight</p>
          <p className="text-white font-medium">{trip.cargo_weight_kg} kg</p>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="text-slate-400 text-xs mb-1">Planned Distance</p>
          <p className="text-white font-medium">{trip.planned_distance_km} km</p>
        </div>
        {trip.actual_distance_km != null && (
          <div className="rounded-xl bg-surface p-3">
            <p className="text-slate-400 text-xs mb-1">Actual Distance</p>
            <p className="text-white font-medium">{trip.actual_distance_km} km</p>
          </div>
        )}
        {trip.fuel_consumed_liters != null && (
          <div className="rounded-xl bg-surface p-3">
            <p className="text-slate-400 text-xs mb-1">Fuel Consumed</p>
            <p className="text-white font-medium">{trip.fuel_consumed_liters} L</p>
          </div>
        )}
      </div>

      {/* Long haul badge */}
      {trip.planned_distance_km > 500 && (
        <div className="flex items-center gap-2 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
          <AlertTriangle size={14} /> Long-haul — Mentor Pair Required
        </div>
      )}

      {/* Drivers & Vehicle */}
      <div className="space-y-2">
        <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Assignment</p>
        {vehicle && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface">
            <Truck size={16} className="text-primary-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">{vehicle.registration_number}</p>
              <p className="text-slate-500 text-xs">{vehicle.model} · {vehicle.type}</p>
            </div>
          </div>
        )}
        {primaryDriver && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface">
            <Users size={16} className="text-teal-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">{primaryDriver.name}</p>
              <p className="text-slate-500 text-xs">Primary · Level {primaryDriver.experience_level}</p>
            </div>
          </div>
        )}
        {secondaryDriver && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface">
            <Users size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">{secondaryDriver.name}</p>
              <p className="text-slate-500 text-xs">Secondary · Level {secondaryDriver.experience_level}</p>
            </div>
          </div>
        )}
      </div>

      {/* Safety checklist — only show for Draft */}
      {trip.status === 'Draft' && (
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-2">Pre-Trip Safety Checklist</p>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(idx)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-xl bg-surface hover:bg-white/5 transition-colors text-left"
              >
                {checkedItems.has(idx)
                  ? <CheckSquare size={16} className="text-emerald-400 flex-shrink-0" />
                  : <Square size={16} className="text-slate-500 flex-shrink-0" />}
                <span className={`text-sm ${checkedItems.has(idx) ? 'text-white' : 'text-slate-400'}`}>{item}</span>
              </button>
            ))}
          </div>
          <button
            disabled={!allChecked || acting}
            onClick={handleChecklist}
            className={`mt-3 w-full py-2 px-4 rounded-xl text-sm font-medium transition-all ${allChecked
                ? checklistDone
                  ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                : 'bg-surface text-slate-500 cursor-not-allowed'
              }`}
          >
            {checklistDone ? '✓ Checklist Complete (click to unmark)' : allChecked ? 'Mark Checklist Complete' : `Check all ${CHECKLIST_ITEMS.length} items first`}
          </button>
        </div>
      )}

      {/* ── Agentic Dispatcher — Auto-Assign (Draft trips, dispatch-capable roles only) ── */}
      {trip.status === 'Draft' && canDispatch && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} className="text-purple-400" />
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Agentic Dispatcher</p>
            {/* Show 'override' label when driver/vehicle already manually assigned */}
            {trip.primary_driver_id && (
              <span className="ml-auto text-xs text-slate-500 italic">will override manual selection</span>
            )}
          </div>
          <button
            id={`auto-assign-${trip.id}`}
            onClick={handleAutoAssign}
            disabled={assigning}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200
              bg-gradient-to-r from-purple-600 to-primary-600
              hover:from-purple-500 hover:to-primary-500
              text-white shadow-lg shadow-purple-900/30
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {assigning
              ? <RefreshCw size={14} className="animate-spin" />
              : <Sparkles size={14} />}
            {assigning
              ? 'Finding best match…'
              : trip.primary_driver_id
                ? '⚡ Override with Magic Assign'
                : '⚡ Auto-Assign (Magic Assign)'}
          </button>

          {/* Reasoning log */}
          {reasoning && (
            <div className="mt-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 animate-fade-in">
              <div className="flex items-start gap-2">
                <Brain size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-purple-300 text-xs font-medium mb-1">AI Reasoning Log</p>
                  <p className="text-slate-300 text-xs leading-relaxed">{reasoning}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Alert Sender — for Dispatched trips (dispatch-capable roles only) ── */}
      {trip.status === 'Dispatched' && canDispatch && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-yellow-400" />
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Send Dispatch Alert</p>
          </div>
          <form onSubmit={handleSendAlert} className="flex gap-2">
            <input
              className="input flex-1 text-sm py-2"
              value={alertMsg}
              onChange={e => setAlertMsg(e.target.value)}
              placeholder="Type a priority message to the driver…"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={sendingAlert || !alertMsg.trim()}
              className="flex-shrink-0 py-2 px-3 rounded-xl bg-yellow-600 hover:bg-yellow-500
                text-white text-sm font-medium transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5"
            >
              {sendingAlert ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              Send
            </button>
          </form>
          <p className="text-slate-600 text-xs mt-1.5">Driver View polls for this every 10s</p>
        </div>
      )}

      {/* Dispatch / Complete / Cancel actions (dispatch-capable roles only) */}
      {canDispatch && (
        <div className="flex gap-2 pt-1">
          {trip.status === 'Draft' && (
            <button
              disabled={!trip.is_safety_checklist_complete || acting}
              onClick={handleDispatch}
              className={`flex-1 btn-primary ${!trip.is_safety_checklist_complete ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!trip.is_safety_checklist_complete ? 'Complete checklist first' : 'Dispatch this trip'}
            >
              <Zap size={14} /> Dispatch
            </button>
          )}
          {trip.status === 'Dispatched' && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} /> Complete
            </button>
          )}
          {(trip.status === 'Draft' || trip.status === 'Dispatched') && (
            <button
              disabled={acting}
              onClick={handleCancel}
              className="flex-1 py-2 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium transition-all border border-red-500/20 flex items-center justify-center gap-2"
            >
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      )}

      {showCompleteModal && (
        <CompleteModal trip={trip} onClose={() => setShowCompleteModal(false)} onDone={onRefresh} />
      )}
    </div>
  )
}

// ── Main Dispatch Page ─────────────────────────────────────────────────────────
export default function Dispatch() {
  const [trips, setTrips] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [tripsRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/trips/'),
        api.get('/drivers/'),
        api.get('/vehicles/'),
      ])
      setTrips(tripsRes.data)
      setDrivers(driversRes.data)
      setVehicles(vehiclesRes.data)
      // Re-select updated version of selected trip
      if (selected) {
        const updated = tripsRes.data.find(t => t.id === selected.id)
        setSelected(updated || null)
      }
    } catch {
      toast.error('Failed to load dispatch data')
    } finally {
      setLoading(false)
    }
  }, [selected?.id])

  useEffect(() => { loadAll() }, [])

  const { canDispatch, can, role } = useRBAC()

  const filtered = statusFilter ? trips.filter(t => t.status === statusFilter) : trips

  const STATUS_FILTERS = ['', 'Draft', 'Dispatched', 'Completed', 'Cancelled']

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip Dispatch</h1>
          <p className="page-subtitle">Manage trip lifecycle — create, dispatch, complete, cancel</p>
        </div>
        <div className="flex items-center gap-3">
          {!canDispatch && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
              <Lock size={11} /> {role} — view only
            </span>
          )}
          <button id="refresh-trips" onClick={loadAll} className="btn-ghost btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          {canDispatch && (
            <button id="create-trip-btn" onClick={() => setShowCreate(true)} className="btn-primary btn-sm">
              <Plus size={14} /> New Trip
            </button>
          )}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-surface text-slate-400 hover:text-white hover:bg-surface-card border border-surface-border'
              }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Trip list ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 h-20 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <Navigation size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No trips found.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 btn-primary btn-sm">
                <Plus size={13} /> Create First Trip
              </button>
            </div>
          ) : (
            filtered
              .slice()
              .sort((a, b) => b.id - a.id)
              .map(trip => {
                const driver = drivers.find(d => d.id === trip.primary_driver_id)
                const vehicle = vehicles.find(v => v.id === trip.vehicle_id)
                const isSelected = selected?.id === trip.id
                return (
                  <button
                    key={trip.id}
                    id={`trip-${trip.id}`}
                    onClick={() => setSelected(isSelected ? null : trip)}
                    className={`w-full text-left card p-4 transition-all border ${isSelected
                        ? 'border-primary-500/50 bg-primary-900/10'
                        : 'border-surface-border hover:border-slate-600'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-medium text-sm">
                          #{trip.id} {trip.source} → {trip.destination}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {vehicle?.registration_number || '—'} · {driver?.name || '—'}
                        </p>
                      </div>
                      <TripBadge status={trip.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{trip.cargo_weight_kg} kg</span>
                      <span>·</span>
                      <span>{trip.planned_distance_km} km</span>
                      {trip.planned_distance_km > 500 && <span className="text-yellow-400">⚡ Long-haul</span>}
                      <ChevronRight size={12} className="ml-auto text-slate-600" />
                    </div>
                  </button>
                )
              })
          )}
        </div>

        {/* ── Trip detail panel ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          {selected ? (
            <TripDetail
              key={selected.id}
              trip={selected}
              drivers={drivers}
              vehicles={vehicles}
              onRefresh={loadAll}
              canDispatch={canDispatch}
            />
          ) : (
            <div className="card p-10 flex flex-col items-center justify-center text-center h-full min-h-64">
              <Navigation size={40} className="text-slate-700 mb-4" />
              <p className="text-slate-400 text-sm">Select a trip from the list to view details,<br />or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={loadAll}
        />
      )}
    </div>
  )
}
