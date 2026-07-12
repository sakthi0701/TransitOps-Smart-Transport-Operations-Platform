import { useEffect, useState, useCallback, useMemo } from 'react'
import { Fuel, Receipt, Plus, X, Trash2, RefreshCw, TrendingDown, DollarSign } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

// ── Log Fuel Modal ─────────────────────────────────────────────────────────────
function LogFuelModal({ onClose, onSaved }) {
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  const [form, setForm] = useState({
    vehicle_id: '', trip_id: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/vehicles/'), api.get('/trips/')]).then(([v, t]) => {
      setVehicles(v.data)
      setTrips(t.data)
    }).catch(() => toast.error('Failed to load data'))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/fuel/', {
        vehicle_id: parseInt(form.vehicle_id),
        trip_id: form.trip_id ? parseInt(form.trip_id) : null,
        liters: parseFloat(form.liters),
        cost: parseFloat(form.cost),
        date: form.date,
      })
      toast.success('Fuel log saved!')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to log fuel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Fuel size={18} className="text-teal-400" /> Log Fuel Fill-Up
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Vehicle *</label>
            <select className="input" required value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
              <option value="">— Select vehicle —</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.model}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Linked Trip (optional)</label>
            <select className="input" value={form.trip_id} onChange={e => set('trip_id', e.target.value)}>
              <option value="">— No trip link —</option>
              {trips.filter(t => t.status !== 'Cancelled').map(t => (
                <option key={t.id} value={t.id}>#{t.id} {t.source} → {t.destination} ({t.status})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Liters *</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.liters} onChange={e => set('liters', e.target.value)} placeholder="e.g. 45.5" />
            </div>
            <div>
              <label className="form-label">Cost (₹) *</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="e.g. 4200" />
            </div>
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input className="input" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Log Fuel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Log Expense Modal ──────────────────────────────────────────────────────────
function LogExpenseModal({ onClose, onSaved }) {
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({
    vehicle_id: '', type: 'Toll', amount: '', date: new Date().toISOString().split('T')[0]
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
      await api.post('/expenses/', {
        vehicle_id: parseInt(form.vehicle_id),
        type: form.type,
        amount: parseFloat(form.amount),
        date: form.date,
      })
      toast.success('Expense logged!')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to log expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt size={18} className="text-purple-400" /> Log Expense
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Vehicle *</label>
            <select className="input" required value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
              <option value="">— Select vehicle —</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.model}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type *</label>
              <select className="input" required value={form.type} onChange={e => set('type', e.target.value)}>
                {['Toll', 'Permit', 'Parking', 'Fine', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Amount (₹) *</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 250" />
            </div>
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input className="input" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main FuelExpense Page ──────────────────────────────────────────────────────
export default function FuelExpense() {
  const [activeTab, setActiveTab] = useState('fuel')
  const [fuelLogs, setFuelLogs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [fuelRes, expRes, vehiclesRes] = await Promise.all([
        api.get('/fuel/'),
        api.get('/expenses/'),
        api.get('/vehicles/'),
      ])
      setFuelLogs(fuelRes.data)
      setExpenses(expRes.data)
      setVehicles(vehiclesRes.data)
    } catch {
      toast.error('Failed to load fuel & expense data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [])

  const vehicleName = (vid) => {
    const v = vehicles.find(v => v.id === vid)
    return v ? v.registration_number : `#${vid}`
  }

  const totalFuelCost = useMemo(() => fuelLogs.reduce((s, l) => s + l.cost, 0), [fuelLogs])
  const totalFuelLiters = useMemo(() => fuelLogs.reduce((s, l) => s + l.liters, 0), [fuelLogs])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const totalOpCost = totalFuelCost + totalExpenses

  const handleDeleteFuel = async (id) => {
    if (!window.confirm('Delete this fuel log?')) return
    setDeleting(id)
    try {
      await api.delete(`/fuel/${id}`)
      toast.success('Fuel log deleted.')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    } finally { setDeleting(null) }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    setDeleting(id)
    try {
      await api.delete(`/expenses/${id}`)
      toast.success('Expense deleted.')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    } finally { setDeleting(null) }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fuel & Expense</h1>
          <p className="page-subtitle">Track operational costs — fuel fill-ups and miscellaneous expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button id="refresh-fuel" onClick={loadAll} className="btn-ghost btn-sm"><RefreshCw size={14} /> Refresh</button>
          <button id="log-expense-btn" onClick={() => setShowExpenseModal(true)} className="btn-ghost btn-sm text-purple-400 border-purple-500/30 hover:bg-purple-500/10">
            <Receipt size={14} /> Log Expense
          </button>
          <button id="log-fuel-btn" onClick={() => setShowFuelModal(true)} className="btn-primary btn-sm">
            <Fuel size={14} /> Log Fuel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Fuel Cost', value: `₹${totalFuelCost.toLocaleString()}`, sub: `${totalFuelLiters.toFixed(1)} liters`, icon: Fuel, color: 'text-teal-400', bg: 'bg-teal-500/15' },
          { label: 'Total Expenses', value: `₹${totalExpenses.toLocaleString()}`, sub: `${expenses.length} record${expenses.length !== 1 ? 's' : ''}`, icon: Receipt, color: 'text-purple-400', bg: 'bg-purple-500/15' },
          { label: 'Total Operational Cost', value: `₹${totalOpCost.toLocaleString()}`, sub: 'Fuel + Expenses', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
          { label: 'Avg Cost/Liter', value: totalFuelLiters > 0 ? `₹${(totalFuelCost / totalFuelLiters).toFixed(2)}` : '—', sub: 'Fleet average', icon: TrendingDown, color: 'text-primary-400', bg: 'bg-primary-600/15' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-slate-500 text-xs">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-surface rounded-xl w-fit">
        {[
          { id: 'fuel', label: 'Fuel Logs', icon: Fuel },
          { id: 'expenses', label: 'Expenses', icon: Receipt },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tables */}
      {activeTab === 'fuel' ? (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : fuelLogs.length === 0 ? (
            <div className="p-10 text-center">
              <Fuel size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No fuel logs yet.</p>
              <button onClick={() => setShowFuelModal(true)} className="mt-3 btn-primary btn-sm"><Plus size={13} /> Log First Fill-Up</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Liters</th>
                    <th>Cost (₹)</th>
                    <th>₹/Liter</th>
                    <th>Date</th>
                    <th>Trip</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fuelLogs.slice().sort((a, b) => b.id - a.id).map(log => (
                    <tr key={log.id}>
                      <td className="font-medium text-white">{vehicleName(log.vehicle_id)}</td>
                      <td className="text-teal-300">{log.liters.toFixed(1)} L</td>
                      <td className="text-white">₹{log.cost.toLocaleString()}</td>
                      <td className="text-slate-400">₹{(log.cost / log.liters).toFixed(2)}</td>
                      <td className="text-slate-400 text-sm">{log.date}</td>
                      <td className="text-slate-500 text-sm">{log.trip_id ? `#${log.trip_id}` : '—'}</td>
                      <td>
                        <button onClick={() => handleDeleteFuel(log.id)} disabled={deleting === log.id}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="p-10 text-center">
              <Receipt size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No expenses logged yet.</p>
              <button onClick={() => setShowExpenseModal(true)} className="mt-3 btn-primary btn-sm"><Plus size={13} /> Log First Expense</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Amount (₹)</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice().sort((a, b) => b.id - a.id).map(exp => (
                    <tr key={exp.id}>
                      <td className="font-medium text-white">{vehicleName(exp.vehicle_id)}</td>
                      <td>
                        <span className="badge-blue">{exp.type}</span>
                      </td>
                      <td className="text-white">₹{exp.amount.toLocaleString()}</td>
                      <td className="text-slate-400 text-sm">{exp.date}</td>
                      <td>
                        <button onClick={() => handleDeleteExpense(exp.id)} disabled={deleting === exp.id}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showFuelModal && <LogFuelModal onClose={() => setShowFuelModal(false)} onSaved={loadAll} />}
      {showExpenseModal && <LogExpenseModal onClose={() => setShowExpenseModal(false)} onSaved={loadAll} />}
    </div>
  )
}
