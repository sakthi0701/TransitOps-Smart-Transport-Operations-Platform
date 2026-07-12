import { useEffect, useState, useCallback } from 'react'
import {
  Wrench, Plus, X, CheckCircle2, AlertTriangle, RefreshCw,
  Truck, Clock, XCircle, Lock
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import useRBAC from '../store/useRBAC'

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return status === 'Open'
    ? <span className="badge-yellow flex items-center gap-1"><Clock size={11} /> Open</span>
    : <span className="badge-green flex items-center gap-1"><CheckCircle2 size={11} /> Closed</span>
}

// ── Risk indicator ─────────────────────────────────────────────────────────────
function RiskBar({ score }) {
  const pct = Math.min(Math.max(score, 0), 100)
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'
  const label = pct >= 70 ? 'High Risk' : pct >= 40 ? 'Medium Risk' : 'Low Risk'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${pct >= 70 ? 'text-red-400' : pct >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
        {pct.toFixed(0)}% {label}
      </span>
    </div>
  )
}

// ── Add Maintenance Modal ──────────────────────────────────────────────────────
function AddMaintenanceModal({ onClose, onCreated }) {
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({
    vehicle_id: '', type: 'Scheduled', cost: '', components_replaced: '', total_cost: '', date_logged: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/vehicles/').then(r => setVehicles(r.data)).catch(() => toast.error('Failed to load vehicles'))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/maintenance/', {
        vehicle_id: parseInt(form.vehicle_id),
        type: form.type,
        cost: parseFloat(form.cost) || 0,
        components_replaced: form.components_replaced || null,
        total_cost: parseFloat(form.total_cost) || parseFloat(form.cost) || 0,
        date_logged: form.date_logged,
      })
      toast.success('Maintenance record created. Vehicle is now In Shop.')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench size={18} className="text-yellow-400" /> New Maintenance Record
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm flex items-center gap-2">
          <AlertTriangle size={15} /> Creating this record will move the vehicle to <strong>In Shop</strong>.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Vehicle *</label>
            <select className="input" required value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
              <option value="">— Select vehicle —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id} disabled={v.status === 'On Trip'}>
                  {v.registration_number} — {v.model} ({v.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type *</label>
              <select className="input" required value={form.type} onChange={e => set('type', e.target.value)}>
                {['Scheduled', 'Breakdown', 'Inspection', 'Tire Change', 'Oil Change', 'Other'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input className="input" type="date" required value={form.date_logged} onChange={e => set('date_logged', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cost (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">Total Cost (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.total_cost} onChange={e => set('total_cost', e.target.value)} placeholder="Same as cost" />
            </div>
          </div>

          <div>
            <label className="form-label">Components Replaced</label>
            <input className="input" value={form.components_replaced} onChange={e => set('components_replaced', e.target.value)} placeholder="e.g. Brake pads, Air filter" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Maintenance Page ──────────────────────────────────────────────────────
export default function Maintenance() {
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [closing, setClosing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [logsRes, vehiclesRes] = await Promise.all([
        api.get('/maintenance/'),
        api.get('/vehicles/'),
      ])
      setLogs(logsRes.data)
      setVehicles(vehiclesRes.data)
    } catch {
      toast.error('Failed to load maintenance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [])

  const handleClose = async (logId) => {
    setClosing(logId)
    try {
      await api.post(`/maintenance/${logId}/close`)
      toast.success('Record closed. Vehicle returned to Available.')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to close record')
    } finally {
      setClosing(null)
    }
  }

  const handleDelete = async (logId) => {
    if (!window.confirm('Delete this maintenance record?')) return
    setDeleting(logId)
    try {
      await api.delete(`/maintenance/${logId}`)
      toast.success('Record deleted.')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete record')
    } finally {
      setDeleting(null)
    }
  }

  const vehicleName = (vid) => {
    const v = vehicles.find(v => v.id === vid)
    return v ? v.registration_number : `#${vid}`
  }

  const vehicleModel = (vid) => {
    const v = vehicles.find(v => v.id === vid)
    return v ? `${v.model} · ${v.type}` : '—'
  }

  const filtered = statusFilter ? logs.filter(l => l.status === statusFilter) : logs

  // Vehicles with high risk score for the warning strip
  const highRiskVehicles = vehicles.filter(v => v.breakdown_risk_score >= 40).sort((a, b) => b.breakdown_risk_score - a.breakdown_risk_score)

  const { canManageSafety, role } = useRBAC()

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Vehicle repair records — status auto-updates fleet availability</p>
        </div>
        <div className="flex items-center gap-3">
          {!canManageSafety && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
              <Lock size={11} /> {role} — view only
            </span>
          )}
          <button id="refresh-maintenance" onClick={loadAll} className="btn-ghost btn-sm"><RefreshCw size={14} /> Refresh</button>
          {canManageSafety && (
            <button id="add-maintenance-btn" onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
              <Plus size={14} /> Add Record
            </button>
          )}
        </div>
      </div>

      {/* High-risk vehicle strip */}
      {highRiskVehicles.length > 0 && (
        <div className="mb-5 p-4 rounded-2xl bg-red-500/8 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-400" />
            <p className="text-red-300 text-sm font-semibold">Vehicles Requiring Attention</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {highRiskVehicles.slice(0, 6).map(v => (
              <div key={v.id} className="rounded-xl bg-surface p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white text-sm font-medium">{v.registration_number}</p>
                    <p className="text-slate-500 text-xs">{v.model}</p>
                  </div>
                  <Truck size={14} className={v.breakdown_risk_score >= 70 ? 'text-red-400' : 'text-yellow-400'} />
                </div>
                <RiskBar score={v.breakdown_risk_score} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {['', 'Open', 'Closed'].map(s => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === s
              ? 'bg-primary-600 text-white'
              : 'bg-surface text-slate-400 hover:text-white border border-surface-border'
              }`}
          >
            {s || 'All'}
          </button>
        ))}
        <span className="ml-auto text-slate-500 text-sm self-center">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Wrench size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No maintenance records found.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 btn-primary btn-sm">
              <Plus size={13} /> Add First Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Components Replaced</th>
                  <th>Cost</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => b.id - a.id)
                  .map(log => (
                    <tr key={log.id}>
                      <td>
                        <p className="font-medium text-white">{vehicleName(log.vehicle_id)}</p>
                        <p className="text-xs text-slate-500">{vehicleModel(log.vehicle_id)}</p>
                      </td>
                      <td>
                        <span className="badge-blue">{log.type}</span>
                      </td>
                      <td className="max-w-[200px] truncate text-slate-400 text-sm">
                        {log.components_replaced || '—'}
                      </td>
                      <td>
                        <p className="text-white">${log.total_cost.toLocaleString()}</p>
                        {log.cost !== log.total_cost && (
                          <p className="text-xs text-slate-500">Labour: ${log.cost.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="text-slate-400 text-sm">{log.date_logged}</td>
                      <td><StatusBadge status={log.status} /></td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {log.status === 'Open' && canManageSafety && (
                            <>
                              <button
                                onClick={() => handleClose(log.id)}
                                disabled={closing === log.id}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors border border-emerald-500/20"
                              >
                                {closing === log.id ? '...' : '✓ Close'}
                              </button>
                              <button
                                onClick={() => handleDelete(log.id)}
                                disabled={deleting === log.id}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                              >
                                {deleting === log.id ? '...' : <XCircle size={13} />}
                              </button>
                            </>
                          )}
                          {log.status === 'Closed' && (
                            <span className="text-xs text-slate-600">Archived</span>
                          )}
                          {log.status === 'Open' && !canManageSafety && (
                            <span className="text-xs text-slate-600 italic">View only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddMaintenanceModal onClose={() => setShowAdd(false)} onCreated={loadAll} />
      )}
    </div>
  )
}
