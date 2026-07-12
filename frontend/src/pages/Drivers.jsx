import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Users, Edit2, Trash2, Search, AlertTriangle, ShieldAlert, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import useRBAC from '../store/useRBAC'

// ── Zod schema ─────────────────────────────────────────────────────────────────
const driverSchema = z.object({
  name: z.string().min(1, 'Required'),
  license_number: z.string().min(1, 'Required'),
  license_expiry: z.string().min(1, 'Required'),
  safety_score: z.coerce.number().min(0).max(100),
  inclination_factor: z.coerce.number().min(0).max(100),
  experience_level: z.coerce.number().int().min(1).max(10),
  total_km_run: z.coerce.number().min(0),
  status: z.enum(['Available', 'On Trip', 'Off Duty', 'Suspended']),
})

const STATUS_BADGE = {
  Available:  'badge-green',
  'On Trip':  'badge-blue',
  'Off Duty': 'badge-gray',
  Suspended:  'badge-red',
}

const XP_LABEL = (level) =>
  level <= 3 ? '🌱 Beginner' : level >= 7 ? '⭐ Expert' : '🔵 Mid-level'

// ── Modal ──────────────────────────────────────────────────────────────────────
function DriverModal({ driver, onClose, onSaved }) {
  const isEdit = !!driver
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(driverSchema),
    defaultValues: driver
      ? { ...driver, license_expiry: driver.license_expiry }
      : { status: 'Available', safety_score: 50, inclination_factor: 50, experience_level: 5, total_km_run: 0 },
  })

  const onSubmit = async (data) => {
    try {
      // Sanitize inputs
      const sanitizedData = {
        ...data,
        license_number: data.license_number?.trim(),
        name: data.name?.trim(),
      }
      if (isEdit) {
        await api.put(`/drivers/${driver.id}`, sanitizedData)
        toast.success('Driver profile updated')
      } else {
        await api.post('/drivers/', sanitizedData)
        toast.success('Driver registered successfully')
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
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Driver' : 'Register Driver'}</h2>
          <button id="close-driver-modal" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form id="driver-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input id="d-name" className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Rajan Murugesan" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">License Number</label>
              <input id="d-license" className={`input ${errors.license_number ? 'input-error' : ''}`} placeholder="TN-DL-001" {...register('license_number')} disabled={isEdit} />
              {errors.license_number && <p className="mt-1 text-xs text-red-400">{errors.license_number.message}</p>}
            </div>
            <div>
              <label className="label">License Expiry</label>
              <input id="d-expiry" type="date" className={`input ${errors.license_expiry ? 'input-error' : ''}`} {...register('license_expiry')} />
              {errors.license_expiry && <p className="mt-1 text-xs text-red-400">{errors.license_expiry.message}</p>}
            </div>
            <div>
              <label className="label">Safety Score (0–100)</label>
              <input id="d-safety" type="number" className="input" {...register('safety_score')} />
            </div>
            <div>
              <label className="label">Inclination Factor (0–100)</label>
              <input id="d-inclination" type="number" className="input" {...register('inclination_factor')} />
            </div>
            <div>
              <label className="label">Experience Level (1–10)</label>
              <input id="d-experience" type="number" min={1} max={10} className="input" {...register('experience_level')} />
              {errors.experience_level && <p className="mt-1 text-xs text-red-400">{errors.experience_level.message}</p>}
            </div>
            <div>
              <label className="label">Total KM Run</label>
              <input id="d-km" type="number" className="input" {...register('total_km_run')} />
            </div>
            <div className="col-span-2">
              <label className="label">Status</label>
              <select id="d-status" className="input" {...register('status')}>
                {['Available', 'On Trip', 'Off Duty', 'Suspended'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" id="cancel-driver" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" id="save-driver" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ driver, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/drivers/${driver.id}`)
      toast.success(`${driver.name} removed`)
      onDeleted()
      onClose()
    } catch {
      toast.error('Failed to remove driver')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-sm text-center">
        <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-semibold text-lg mb-2">Remove Driver?</h2>
        <p className="text-slate-400 text-sm mb-6">
          <strong className="text-white">{driver.name}</strong> will be permanently removed from the roster.
        </p>
        <div className="flex gap-3 justify-center">
          <button id="cancel-delete-driver" onClick={onClose} className="btn-ghost">Cancel</button>
          <button id="confirm-delete-driver" onClick={handleDelete} disabled={loading} className="btn-danger">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Drivers page ──────────────────────────────────────────────────────────
export default function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)

  const loadDrivers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/drivers/')
      setDrivers(res.data)
    } catch {
      toast.error('Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDrivers() }, [])

  const { canManageFleet, role } = useRBAC()

  const filtered = drivers.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.license_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || d.status === filterStatus
    return matchSearch && matchStatus
  })


  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver Roster</h1>
          <p className="page-subtitle">{drivers.length} drivers registered</p>
        </div>
        <div className="flex items-center gap-3">
          {!canManageFleet && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
              <Lock size={11} /> {role} — read only
            </span>
          )}
          {canManageFleet && (
            <button id="add-driver-btn" onClick={() => setModal('add')} className="btn-primary">
              <Plus size={16} /> Register Driver
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="driver-search"
            type="text"
            placeholder="Search by name or license number..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          id="driver-status-filter"
          className="input w-44"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {['Available', 'On Trip', 'Off Duty', 'Suspended'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>License</th>
              <th>Experience</th>
              <th>Safety Score</th>
              <th>Inclination</th>
              <th>Total KM</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => (
                  <td key={j}><div className="h-4 bg-surface rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-12">
                  {search || filterStatus ? 'No drivers match your filters' : 'No drivers registered. Click "Register Driver" to start.'}
                </td>
              </tr>
            ) : filtered.map(d => (
              <tr key={d.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {d.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{d.name}</p>
                      {d.license_expired && (
                        <span className="badge-red text-xs flex items-center gap-1">
                          <ShieldAlert size={10} /> License Expired
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="font-mono text-slate-300 text-xs">{d.license_number}</td>
                <td>
                  <span className="text-sm">{XP_LABEL(d.experience_level)}</span>
                  <span className="text-slate-500 text-xs ml-1">Lv.{d.experience_level}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface max-w-16">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${d.safety_score}%` }}
                      />
                    </div>
                    <span className="text-slate-300 text-xs">{d.safety_score}</span>
                  </div>
                </td>
                <td className="text-slate-300">{d.inclination_factor}</td>
                <td className="text-slate-200">{d.total_km_run.toLocaleString()}</td>
                <td><span className={STATUS_BADGE[d.status] || 'badge-gray'}>{d.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    {canManageFleet ? (
                      <>
                        <button
                          id={`edit-driver-${d.id}`}
                          onClick={() => { setSelected(d); setModal('edit') }}
                          className="btn-ghost btn-sm p-1.5"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          id={`delete-driver-${d.id}`}
                          onClick={() => { setSelected(d); setModal('delete') }}
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
      {modal === 'add'    && <DriverModal driver={null}     onClose={() => setModal(null)} onSaved={loadDrivers} />}
      {modal === 'edit'   && <DriverModal driver={selected} onClose={() => setModal(null)} onSaved={loadDrivers} />}
      {modal === 'delete' && <DeleteConfirm driver={selected} onClose={() => setModal(null)} onDeleted={loadDrivers} />}
    </div>
  )
}
