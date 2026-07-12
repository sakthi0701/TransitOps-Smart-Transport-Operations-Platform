import { useEffect, useState } from 'react'
import { Trophy, Award, Crown, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function Leaderboard() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await api.get('/analytics/leaderboard')
      setDrivers(res.data)
    } catch (err) {
      toast.error('Failed to load leaderboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Helper for tier styling
  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Gold':
        return 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
      case 'Silver':
        return 'bg-slate-300/15 text-slate-200 border border-slate-300/20'
      case 'Bronze':
        return 'bg-amber-600/15 text-amber-300 border border-amber-500/20'
      default:
        return 'bg-slate-700/30 text-slate-400 border border-slate-700/20'
    }
  }

  const topThree = drivers.slice(0, 3)
  const remaining = drivers.slice(3)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Trophy className="text-yellow-400" size={28} /> Eco-Efficiency Leaderboard
          </h1>
          <p className="page-subtitle">Ranks drivers by distance run and fuel eco-efficiency metrics.</p>
        </div>
        <button onClick={fetchLeaderboard} className="btn-ghost btn-sm">
          Refresh Standings
        </button>
      </div>

      {/* Formula Explanation Banner */}
      <div className="card bg-gradient-to-r from-slate-900/20 via-surface-card to-slate-900/20 p-4 border border-surface-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HelpCircle size={20} className="text-blue-500 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-white">How is this scored?</span>
            <p className="text-slate-400 text-xs mt-0.5">
              Score = <code className="text-slate-100 font-mono">(Total KM × 0.7) + (Eco-Ratio × 100 × 0.3)</code> where Eco-Ratio represents actual mileage vs. optimal mileage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="badge-teal px-2 py-0.5 rounded">Weight: 70% KM / 30% Eco-Ratio</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-64 animate-pulse bg-surface-card rounded-2xl" />
          <div className="h-96 animate-pulse bg-surface-card rounded-2xl" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center gap-3">
          <ShieldAlert size={48} className="text-slate-500" />
          <p className="text-white font-medium">No leaderboard data found</p>
          <p className="text-slate-500 text-sm max-w-sm">Complete trips with fuel logs and distance to display rankings.</p>
        </div>
      ) : (
        <>
          {/* Podium section for Top 3 */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
              {/* Rank 2 */}
              {topThree[1] && (
                <div className="order-2 md:order-1 card p-5 relative bg-gradient-to-b from-slate-900/40 via-surface-card to-surface-card border-slate-500/20 text-center hover:scale-[1.02] transition-transform duration-200">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-500/20 border border-slate-400/50 flex items-center justify-center font-bold text-slate-200">
                    2
                  </div>
                  <Award size={24} className="mx-auto text-slate-400 mb-2" />
                  <h3 className="text-white font-bold text-lg truncate">{topThree[1].name}</h3>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${getTierBadge(topThree[1].reward_tier)}`}>
                    {topThree[1].reward_tier}
                  </span>
                  <div className="mt-4 pt-4 border-t border-surface-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Total KM</p>
                      <p className="text-white font-semibold mt-0.5">{topThree[1].total_km_run.toLocaleString()} km</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Eco-Ratio</p>
                      <p className="text-white font-semibold mt-0.5">{topThree[1].average_eco_ratio.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="mt-4 text-slate-500 font-mono text-xs">
                    Score: <span className="text-slate-300 font-bold">{topThree[1].score.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Rank 1 (Crown / Golden accent) */}
              {topThree[0] && (
                <div className="order-1 md:order-2 card p-6 relative bg-gradient-to-b from-yellow-950/20 via-surface-card to-surface-card border-yellow-500/30 text-center scale-105 hover:scale-[1.07] transition-all duration-200 shadow-xl shadow-yellow-950/5">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-400 flex items-center justify-center font-extrabold text-yellow-400 text-lg glow-yellow">
                    1
                  </div>
                  <div className="flex justify-center -mt-2 mb-2 relative">
                    <Crown size={36} className="text-yellow-400 animate-pulse-slow" />
                    <Sparkles size={14} className="text-yellow-300 absolute -top-1 -right-2 animate-pulse" />
                  </div>
                  <h3 className="text-white font-extrabold text-xl truncate">{topThree[0].name}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getTierBadge(topThree[0].reward_tier)}`}>
                    🥇 {topThree[0].reward_tier} Leader
                  </span>
                  <div className="mt-5 pt-4 border-t border-surface-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Total KM</p>
                      <p className="text-white font-semibold mt-0.5">{topThree[0].total_km_run.toLocaleString()} km</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Eco-Ratio</p>
                      <p className="text-white font-semibold mt-0.5">{topThree[0].average_eco_ratio.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="mt-4 text-slate-500 font-mono text-xs">
                    Score: <span className="text-yellow-400 font-extrabold text-sm">{topThree[0].score.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Rank 3 */}
              {topThree[2] && (
                <div className="order-3 card p-5 relative bg-gradient-to-b from-amber-950/20 via-surface-card to-surface-card border-amber-500/20 text-center hover:scale-[1.02] transition-transform duration-200">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-900/20 border border-amber-600/50 flex items-center justify-center font-bold text-amber-400">
                    3
                  </div>
                  <Award size={24} className="mx-auto text-amber-500 mb-2" />
                  <h3 className="text-white font-bold text-lg truncate">{topThree[2].name}</h3>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${getTierBadge(topThree[2].reward_tier)}`}>
                    {topThree[2].reward_tier}
                  </span>
                  <div className="mt-4 pt-4 border-t border-surface-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Total KM</p>
                      <p className="text-white font-semibold mt-0.5">{topThree[2].total_km_run.toLocaleString()} km</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Eco-Ratio</p>
                      <p className="text-white font-semibold mt-0.5">{topThree[2].average_eco_ratio.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="mt-4 text-slate-500 font-mono text-xs">
                    Score: <span className="text-slate-300 font-bold">{topThree[2].score.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remaining Drivers List */}
          <div className="card p-6">
            <h2 className="text-white font-semibold mb-4">Complete Leaderboard Standings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border text-slate-400 text-xs font-semibold uppercase">
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">Reward Tier</th>
                    <th className="py-3 px-4 text-right">Total KM</th>
                    <th className="py-3 px-4 text-right">Avg Eco-Ratio</th>
                    <th className="py-3 px-4 text-right">Leaderboard Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/40 text-sm">
                  {drivers.map((d, index) => (
                    <tr
                      key={d.driver_id}
                      className={`hover:bg-white/3 transition-colors ${index === 0 ? 'bg-yellow-500/5' :
                          index === 1 ? 'bg-slate-300/5' :
                            index === 2 ? 'bg-amber-600/5' : ''
                        }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-1.5">
                        {index === 0 && <span title="Winner">👑</span>}
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">{d.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadge(d.reward_tier)}`}>
                          {d.reward_tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                        {d.total_km_run.toLocaleString()} km
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                        {d.average_eco_ratio.toFixed(2)}x
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-100 font-bold font-mono">
                        {d.score.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
