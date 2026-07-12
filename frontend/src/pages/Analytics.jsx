import { useEffect, useState } from 'react'
import {
  TrendingUp, DollarSign, Navigation, BarChart3, Download,
  MessageSquare, Send, HelpCircle, Activity, ArrowUpRight, ArrowDownRight, Compass
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [kpis, setKpis] = useState(null)
  const [charts, setCharts] = useState(null)
  const [roiData, setRoiData] = useState([])
  const [loading, setLoading] = useState(true)

  // Chat/NLP states
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am your TransitOps Conversational Analytics assistant. Ask me questions like: \n- *'Show me high risk vehicles'*\n- *'Which driver licenses are expiring?'*\n- *'What is our total operational cost?'*\n- *'Who is leading the driver rankings?'*",
    }
  ])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const [kpisRes, chartsRes, roiRes] = await Promise.all([
        api.get('/analytics/kpis'),
        api.get('/analytics/charts'),
        api.get('/analytics/roi')
      ])
      setKpis(kpisRes.data)
      setCharts(chartsRes.data)
      setRoiData(roiRes.data)
    } catch (err) {
      toast.error('Failed to load analytics reports')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    // Standard file download trigger from backend endpoint
    const url = `${api.defaults.baseURL}/analytics/export/csv`
    const token = localStorage.getItem('token') // get token to attach if needed or trigger direct download
    
    // We can open the URL in a new window or trigger download via window.location
    // Since it's protected, we can also download it via axios but direct window.open is easy if token is set.
    // Let's download using fetch/axios to keep auth headers!
    toast.loading('Preparing CSV export...', { id: 'csv-export' })
    api.get('/analytics/export/csv', { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'transitops_fleet_roi.csv')
        document.body.appendChild(link)
        link.click()
        link.remove()
        toast.success('CSV downloaded successfully!', { id: 'csv-export' })
      })
      .catch((err) => {
        toast.error('CSV export failed', { id: 'csv-export' })
        console.error(err)
      })
  }

  const handleChatSend = async (textToSend) => {
    const input = textToSend || chatInput
    if (!input.trim()) return

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: input }])
    if (!textToSend) setChatInput('')
    setChatLoading(true)

    try {
      const res = await api.post('/analytics/chat', { query: input })
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.data.answer,
        data: res.data.data,
        columns: res.data.columns
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Sorry, I encountered an error while processing your request. Please try again."
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const getRoiColorBadge = (roi) => {
    if (roi <= 0) return 'bg-red-500/10 text-red-400 border border-red-500/20'
    if (roi < 15) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="text-primary-500" size={28} /> Reports & Analytics
          </h1>
          <p className="page-subtitle">Detailed financial ROI charts, operational KPIs, and interactive reporting.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary flex items-center gap-1.5">
            <Download size={14} /> Export CSV Report
          </button>
          <button onClick={loadAnalyticsData} className="btn-ghost btn-sm">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-surface-card rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
            <div className="h-80 bg-surface-card rounded-xl" />
            <div className="h-80 bg-surface-card rounded-xl" />
          </div>
          <div className="h-96 bg-surface-card rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Distance Run', value: `${kpis?.total_distance_km.toLocaleString()} km`, sub: 'all completed trips', icon: Navigation, bg: 'bg-blue-500/10', color: 'text-blue-500' },
              { label: 'Fleet Utilization', value: `${kpis?.fleet_utilization_pct}%`, sub: 'active / total vehicles', icon: Activity, bg: 'bg-blue-500/10', color: 'text-blue-500' },
              { label: 'Total Revenue', value: `$${kpis?.total_revenue.toLocaleString()}`, sub: 'distance + cargo weighting', icon: DollarSign, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
              { label: 'Operational Cost', value: `$${kpis?.total_operational_cost.toLocaleString()}`, sub: 'fuel + maint + expenses', icon: BarChart3, bg: 'bg-red-500/10', color: 'text-red-500' },
              { label: 'Average Vehicle ROI', value: `${kpis?.average_roi_pct}%`, sub: 'lifetime performance', icon: TrendingUp, bg: 'bg-slate-500/10', color: 'text-slate-400' },
            ].map((k) => (
              <div key={k.label} className="kpi-card hover:border-white/5 transition-colors">
                <div className={`kpi-icon ${k.bg}`}>
                  <k.icon size={20} className={k.color} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{k.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{k.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts area (Custom SVG styled charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Fuel Efficiency (Actual vs Optimal) */}
            <div className="card p-6">
              <h2 className="text-white font-semibold mb-1">Fuel Efficiency per Vehicle</h2>
              <p className="text-slate-500 text-xs mb-6">Actual mileage (km/liter) compared to optimal mileage.</p>

              {charts?.fuel_efficiency.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">No fuel efficiency data available</p>
              ) : (
                <div className="space-y-4">
                  {charts?.fuel_efficiency.slice(0, 5).map((item) => (
                    <div key={item.registration_number} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-white font-medium">{item.registration_number} ({item.model})</span>
                        <span className="text-slate-400">
                          Actual: <strong className="text-slate-100">{item.actual_mileage_kmpl}</strong> / Optimal: <strong className="text-slate-400">{item.optimal_mileage_kmpl}</strong> kmpl
                        </span>
                      </div>
                      <div className="relative h-6 bg-surface rounded-md overflow-hidden border border-surface-border/50">
                        {/* Optimal Mileage Bar */}
                        <div
                          className="absolute top-0 left-0 h-full bg-slate-700/40 border-r border-slate-500/30"
                          style={{ width: `${Math.min((item.optimal_mileage_kmpl / 25) * 100, 100)}%` }}
                        />
                        {/* Actual Mileage Bar */}
                        <div
                          className="absolute top-1 left-1 h-3.5 bg-blue-500 rounded-sm"
                          style={{ width: `${Math.min((item.actual_mileage_kmpl / 25) * 100, 99)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 justify-end text-xxs text-slate-500 mt-4 border-t border-surface-border/30 pt-3">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-slate-700/50 rounded-sm" /> Optimal KMPL</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-blue-500 rounded-sm" /> Actual KMPL</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Cost Breakdown by Vehicle Type */}
            <div className="card p-6">
              <h2 className="text-white font-semibold mb-1">Operational Cost by Vehicle Type</h2>
              <p className="text-slate-500 text-xs mb-6">Stacked costs (Fuel, Maintenance, Tolls) grouped by vehicle category.</p>

              {charts?.cost_trends.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">No cost breakdown data available</p>
              ) : (
                <div className="space-y-5">
                  {charts?.cost_trends.map((item) => {
                    const total = item.total_cost || 1 // Avoid division by zero
                    const fuelPct = (item.fuel_cost / total) * 100
                    const maintPct = (item.maintenance_cost / total) * 100
                    const otherPct = (item.other_cost / total) * 100

                    return (
                      <div key={item.vehicle_type} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-white font-semibold">{item.vehicle_type}</span>
                          <span className="text-slate-400">Total Spend: <strong className="text-white">${item.total_cost.toLocaleString()}</strong></span>
                        </div>
                        <div className="h-6 flex rounded-md overflow-hidden border border-surface-border/50">
                          {item.fuel_cost > 0 && (
                            <div
                              className="bg-blue-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                              style={{ width: `${fuelPct}%` }}
                              title={`Fuel: $${item.fuel_cost.toLocaleString()}`}
                            >
                              {fuelPct > 15 && 'Fuel'}
                            </div>
                          )}
                          {item.maintenance_cost > 0 && (
                            <div
                              className="bg-slate-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-slate-100 font-bold"
                              style={{ width: `${maintPct}%` }}
                              title={`Maint: $${item.maintenance_cost.toLocaleString()}`}
                            >
                              {maintPct > 15 && 'Maint'}
                            </div>
                          )}
                          {item.other_cost > 0 && (
                            <div
                              className="bg-slate-300 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-slate-900 font-bold"
                              style={{ width: `${otherPct}%` }}
                              title={`Other: $${item.other_cost.toLocaleString()}`}
                            >
                              {otherPct > 15 && 'Other'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-4 justify-end text-xxs text-slate-500 mt-4 border-t border-surface-border/30 pt-3">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded" /> Fuel</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-500 rounded" /> Maintenance</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-300 rounded" /> Tolls / Other</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversational NLP Analytics Terminal */}
          <div className="card p-6 border-surface-border/40 bg-gradient-to-b from-surface-card to-slate-950/40">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={20} className="text-blue-500" />
              <h2 className="text-white font-semibold">Conversational Analytics Assistant</h2>
              <span className="badge-blue text-[10px] ml-auto">Interactive SQLite Console</span>
            </div>
            <p className="text-slate-400 text-xs mb-4">
              Query metrics in real time. Ask questions about licenses, costs, high-risk vehicles, leaderboard standings, or utilization.
            </p>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto rounded-xl bg-slate-950/80 p-4 border border-surface-border/60 space-y-4 mb-4 font-sans scrollbar-thin">
              {messages.map((m, index) => (
                <div key={index} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`text-xxs text-slate-500 mb-1`}>
                    {m.role === 'user' ? 'Manager' : 'TransitOps Copilot'}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white rounded-tr-none'
                        : 'bg-surface border border-surface-border text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {m.text}

                    {/* Render table if data is present in response */}
                    {m.data && m.data.length > 0 && m.columns && (
                      <div className="mt-4 overflow-x-auto border border-surface-border rounded-lg bg-slate-950/50">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-surface-border bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold">
                              {m.columns.map(col => <th key={col} className="p-2">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border/50 text-slate-300">
                            {m.data.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-white/5">
                                {m.columns.map(col => <td key={col} className="p-2 font-mono">{row[col]}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                  <Compass size={14} className="animate-spin" /> Fetching database insights...
                </div>
              )}
            </div>

            {/* Quick Prompts Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: 'High Risk Vehicles ⚠️', query: 'Show me high risk vehicles' },
                { label: 'Expiring Licenses 🪪', query: 'Are there any expiring licenses?' },
                { label: 'Fleet Cost Summary 💰', query: 'Operational costs summary' },
                { label: 'Top Drivers Leaderboard 🏆', query: 'Who is on the leaderboard?' },
              ].map(t => (
                <button
                  key={t.label}
                  onClick={() => handleChatSend(t.query)}
                  className="text-xxs px-2.5 py-1 bg-surface hover:bg-white/5 border border-surface-border/60 hover:border-blue-500/40 text-slate-400 hover:text-white rounded-full transition-all"
                  disabled={chatLoading}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleChatSend()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about active vehicles, maintenance spend, or leaderboard ratings..."
                className="input flex-1"
                disabled={chatLoading}
              />
              <button type="submit" className="btn-primary p-3 flex items-center justify-center" disabled={chatLoading}>
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* ROI Table */}
          <div className="card p-6">
            <h2 className="text-white font-semibold mb-1">Vehicle ROI Table</h2>
            <p className="text-slate-500 text-xs mb-6">Financial performance metrics compiled for each fleet asset.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border text-slate-400 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Registration</th>
                    <th className="py-3 px-4">Model & Type</th>
                    <th className="py-3 px-4 text-right">Acquisition</th>
                    <th className="py-3 px-4 text-right font-semibold text-red-400">Total Costs</th>
                    <th className="py-3 px-4 text-right font-semibold text-emerald-400">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Net Profit</th>
                    <th className="py-3 px-4 text-right">ROI %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/40 text-sm">
                  {roiData.map((v) => {
                    const totalCost = v.fuel_cost + v.maintenance_cost + v.other_cost
                    return (
                      <tr key={v.registration_number} className="hover:bg-white/3 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{v.registration_number}</td>
                        <td className="py-3.5 px-4">
                          <p className="text-white font-medium">{v.model}</p>
                          <p className="text-slate-500 text-xs">{v.type}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 font-mono">${v.acquisition_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-4 text-right text-red-300/80 font-mono">
                          <p className="font-semibold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Fuel: ${v.fuel_cost.toLocaleString()} | Maint: ${v.maintenance_cost.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-300/80 font-semibold font-mono">
                          ${v.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold font-mono ${v.net_profit < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                          ${v.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoiColorBadge(v.roi_pct)}`}>
                            {v.roi_pct >= 0 ? '+' : ''}{v.roi_pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
