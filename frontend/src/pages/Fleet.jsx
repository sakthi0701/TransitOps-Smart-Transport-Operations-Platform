import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Truck, Edit2, Trash2, Search, AlertTriangle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import useRBAC from '../store/useRBAC'

// ── Zod schema ─────────────────────────────────────────────────────────────────
const vehicleSchema = z.object({
  registration_number: z.string().min(1, 'Required').max(20),
  model: z.string().min(1, 'Required'),
  type: z.string().min(1, 'Required'),
  max_capacity_kg: z.coerce.number().positive('Must be positive'),
  odometer_km: z.coerce.number().min(0),
  acquisition_cost: z.coerce.number().positive('Must be positive'),
  optimal_mileage_kmpl: z.coerce.number().positive('Must be positive'),
  status: z.enum(['Available', 'On Trip', 'In Shop', 'Retired']),
})

const STATUS_BADGE = {
  Available: 'badge-green',
  'On Trip': 'badge-blue',
  'In Shop': 'badge-yellow',
  Retired: 'badge-gray',
}

const RISK_COLOR = (score) =>
  score >= 70 ? 'text-red-400' : score >= 40 ? 'text-yellow-400' : 'text-emerald-400'

// ── Modal ──────────────────────────────────────────────────────────────────────
function VehicleModal({ vehicle, onClose, onSaved }) {
  const isEdit = !!vehicle
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle || {
      status: 'Available',
      odometer_km: 0,
    },
  })

  const onSubmit = async (data) => {
    try {
      // Sanitize inputs
      const sanitizedData = {
        ...data,
        registration_number: data.registration_number?.trim(),
        model: data.model?.trim(),
      }
      if (isEdit) {
        await api.put(`/vehicles/${vehicle.id}`, sanitizedData)
        toast.success('Vehicle updated')
      } else {
        await api.post('/vehicles/', sanitizedData)
        toast.success('Vehicle added to fleet')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button id="close-vehicle-modal" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form id="vehicle-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Registration Number</label>
              <input id="v-reg" className={`input ${errors.registration_number ? 'input-error' : ''}`} placeholder="TN-01-AB-1234" {...register('registration_number')} disabled={isEdit} />
              {errors.registration_number && <p className="mt-1 text-xs text-red-400">{errors.registration_number.message}</p>}
            </div>
            <div>
              <label className="label">Model</label>
              <input id="v-model" className={`input ${errors.model ? 'input-error' : ''}`} placeholder="Tata Ace Gold" {...register('model')} />
              {errors.model && <p className="mt-1 text-xs text-red-400">{errors.model.message}</p>}
            </div>
            <div>
              <label className="label">Type</label>
              <select id="v-type" className="input" {...register('type')}>
                <option value="">Select type</option>
                {['Mini Truck', 'Medium Truck', 'Heavy Truck', 'Van', 'Pickup', 'Mini Bus', 'Light Truck'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type.message}</p>}
            </div>
            <div>
              <label className="label">Max Capacity (kg)</label>
              <input id="v-capacity" type="number" className={`input ${errors.max_capacity_kg ? 'input-error' : ''}`} placeholder="5000" {...register('max_capacity_kg')} />
              {errors.max_capacity_kg && <p className="mt-1 text-xs text-red-400">{errors.max_capacity_kg.message}</p>}
            </div>
            <div>
              <label className="label">Odometer (km)</label>
              <input id="v-odometer" type="number" className="input" placeholder="0" {...register('odometer_km')} />
            </div>
            <div>
              <label className="label">Acquisition Cost ($)</label>
              <input id="v-cost" type="number" className={`input ${errors.acquisition_cost ? 'input-error' : ''}`} placeholder="1200000" {...register('acquisition_cost')} />
              {errors.acquisition_cost && <p className="mt-1 text-xs text-red-400">{errors.acquisition_cost.message}</p>}
            </div>
            <div>
              <label className="label">Optimal Mileage (kmpl)</label>
              <input id="v-mileage" type="number" step="0.1" className={`input ${errors.optimal_mileage_kmpl ? 'input-error' : ''}`} placeholder="12.5" {...register('optimal_mileage_kmpl')} />
              {errors.optimal_mileage_kmpl && <p className="mt-1 text-xs text-red-400">{errors.optimal_mileage_kmpl.message}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select id="v-status" className="input" {...register('status')}>
                {['Available', 'On Trip', 'In Shop', 'Retired'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" id="cancel-vehicle" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" id="save-vehicle" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ vehicle, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/vehicles/${vehicle.id}`)
      toast.success(`${vehicle.registration_number} removed from fleet`)
      onDeleted()
      onClose()
    } catch {
      toast.error('Failed to delete vehicle')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-sm text-center">
        <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-semibold text-lg mb-2">Remove Vehicle?</h2>
        <p className="text-slate-400 text-sm mb-6">
          <strong className="text-white">{vehicle.registration_number}</strong> will be permanently removed from the fleet registry.
        </p>
        <div className="flex gap-3 justify-center">
          <button id="cancel-delete-vehicle" onClick={onClose} className="btn-ghost">Cancel</button>
          <button id="confirm-delete-vehicle" onClick={handleDelete} disabled={loading} className="btn-danger">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Fleet page ────────────────────────────────────────────────────────────
export default function Fleet() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(null) // 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null)

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const res = await api.get('/vehicles/')
      setVehicles(res.data)
    } catch {
      toast.error('Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVehicles() }, [])

  const { canManageFleet, role } = useRBAC()

  const filtered = vehicles.filter(v => {
    const matchSearch = !search || v.registration_number.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || v.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Registry</h1>
          <p className="page-subtitle">{vehicles.length} vehicles registered</p>
        </div>
        <div className="flex items-center gap-3">
          {!canManageFleet && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
              <Lock size={11} /> {role} — read only
            </span>
          )}
          {canManageFleet && (
            <button id="add-vehicle-btn" onClick={() => setModal('add')} className="btn-primary">
              <Plus size={16} /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="fleet-search"
            type="text"
            placeholder="Search by reg. number or model..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          id="fleet-status-filter"
          className="input w-44"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {['Available', 'On Trip', 'In Shop', 'Retired'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Model / Type</th>
              <th>Capacity (kg)</th>
              <th>Odometer (km)</th>
              <th>Mileage (kmpl)</th>
              <th>Risk Score</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-surface rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-12">
                  {search || filterStatus ? 'No vehicles match your filters' : 'No vehicles registered yet. Click "Add Vehicle" to start.'}
                </td>
              </tr>
            ) : filtered.map(v => (
              <tr key={v.id}>
                <td className="font-mono font-medium text-primary-400">{v.registration_number}</td>
                <td>
                  <p className="text-white font-medium">{v.model}</p>
                  <p className="text-slate-500 text-xs">{v.type}</p>
                </td>
                <td className="text-slate-200">{v.max_capacity_kg.toLocaleString()}</td>
                <td className="text-slate-200">{v.odometer_km.toLocaleString()}</td>
                <td className="text-slate-200">{v.optimal_mileage_kmpl}</td>
                <td>
                  <span className={`font-bold text-sm ${RISK_COLOR(v.breakdown_risk_score)}`}>
                    {v.breakdown_risk_score.toFixed(0)}
                  </span>
                </td>
                <td><span className={STATUS_BADGE[v.status] || 'badge-gray'}>{v.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    {canManageFleet ? (
                      <>
                        <button
                          id={`edit-vehicle-${v.id}`}
                          onClick={() => { setSelected(v); setModal('edit') }}
                          className="btn-ghost btn-sm p-1.5"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          id={`delete-vehicle-${v.id}`}
                          onClick={() => { setSelected(v); setModal('delete') }}
                          className="btn-danger btn-sm p-1.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600 italic">View only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal === 'add' && <VehicleModal vehicle={null} onClose={() => setModal(null)} onSaved={loadVehicles} />}
      {modal === 'edit' && <VehicleModal vehicle={selected} onClose={() => setModal(null)} onSaved={loadVehicles} />}
      {modal === 'delete' && <DeleteConfirm vehicle={selected} onClose={() => setModal(null)} onDeleted={loadVehicles} />}
    </div>
  )
}
