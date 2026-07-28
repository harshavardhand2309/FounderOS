
import { MatchAnalytics, ShotFilterState } from "@/types/analytics";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import dynamic from '@/lib/dynamic';
import {
    Trophy, Zap, Target, Activity, AlertCircle, Crosshair, Move, Footprints,
    TrendingUp, Shield, Flame, Eye, BarChart3, PieChart as PieChartIcon,
    Gauge, ArrowUpRight, ArrowDownRight, Minus, Maximize2
} from "lucide-react";
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Legend
} from "recharts";
import { DEFAULT_FILTERS } from "./analytics/ShotFilterPanel";
import PickleballHeatmap from "./analytics/PickleballHeatmap";

const Court3D = dynamic(() => import('./Court3D'), { ssr: false });

interface Props { data: MatchAnalytics; }

/* ═══════════════ PICKLEBALL COLORS ═══════════════ */
const PB = {
    green: '#22c55e', lime: '#84cc16', orange: '#f97316', amber: '#fbbf24',
    cyan: '#06b6d4', purple: '#a855f7', red: '#ef4444', emerald: '#10b981',
    p1: '#22c55e', p2: '#f97316',
};

/* ═══════════════ REUSABLE COMPONENTS ═══════════════ */
const SectionTitle = ({ icon: Icon, title, color = PB.green }: any) => (
    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }} className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
            <Icon size={22} style={{ color }} />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-wide">{title}</h2>
    </motion.div>
);

const GlassCard = ({ children, className = '', delay = 0, glowColor = '' }: any) => (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.5, delay }}
        whileHover={{ scale: 1.015, y: -2 }}
        className={`group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5
            hover:border-white/25 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20
            transition-all duration-300 cursor-default ${className}`}
        style={glowColor ? { boxShadow: `inset 0 1px 0 ${glowColor}15` } : {}}>
        {glowColor && <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: `0 0 30px ${glowColor}12, inset 0 0 20px ${glowColor}06` }} />}
        {children}
    </motion.div>
);

/* Player name badge with color indicator */
const PlayerBadge = ({ name, color, align = 'left' }: any) => (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
        <span className="text-[13px] font-bold tracking-wide" style={{ color }}>{name}</span>
    </div>
);

const StatMini = ({ label, value, color = PB.green, suffix = '' }: any) => (
    <div className="text-center">
        <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black" style={{ color }}>{value}<span className="text-sm font-normal text-white/40">{suffix}</span></p>
    </div>
);

/* Dual-stat card that clearly labels each player */
const DualStatCard = ({ label, v1, v2, p1Name, p2Name, suffix = '', color, icon: Icon }: any) => (
    <GlassCard glowColor={color}>
        <div className="flex items-center gap-2 mb-4">
            {Icon && <Icon size={16} style={{ color }} />}
            <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest">{label}</p>
        </div>
        <div className="flex justify-between items-end">
            <div className="text-center">
                <PlayerBadge name={p1Name} color={PB.p1} />
                <p className="text-2xl font-black mt-1" style={{ color }}>{v1 || 0}<span className="text-xs text-white/40 font-normal">{suffix}</span></p>
            </div>
            <div className="text-white/10 text-[11px] font-bold">VS</div>
            <div className="text-center">
                <PlayerBadge name={p2Name} color={PB.p2} align="right" />
                <p className="text-2xl font-black mt-1" style={{ color }}>{v2 || 0}<span className="text-xs text-white/40 font-normal">{suffix}</span></p>
            </div>
        </div>
    </GlassCard>
);

const CompareBar = ({ label, v1, v2, p1Name, p2Name, suffix = '', better = 'higher' }: any) => {
    const max = Math.max(v1, v2, 1);
    const w1 = (v1 / max) * 100;
    const w2 = (v2 / max) * 100;
    const p1Better = better === 'higher' ? v1 > v2 : v1 < v2;
    return (
        <div className="mb-4">
            <div className="flex justify-between text-[12px] font-bold mb-1.5">
                <span style={{ color: p1Better ? PB.p1 : 'rgba(255,255,255,0.5)' }}>{p1Name || 'P1'}: {v1}{suffix}</span>
                <span className="text-white/40 font-semibold">{label}</span>
                <span style={{ color: !p1Better ? PB.p2 : 'rgba(255,255,255,0.5)' }}>{p2Name || 'P2'}: {v2}{suffix}</span>
            </div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                <div className="flex-1 flex justify-end"><div className="rounded-l-full h-full transition-all duration-700" style={{ width: `${w1}%`, background: `linear-gradient(90deg, transparent, ${PB.p1})` }} /></div>
                <div className="flex-1"><div className="rounded-r-full h-full transition-all duration-700" style={{ width: `${w2}%`, background: `linear-gradient(90deg, ${PB.p2}, transparent)` }} /></div>
            </div>
        </div>
    );
};

/* Radial gauge ring */
const RadialGauge = ({ value, maxValue = 100, label, color, size = 90 }: any) => {
    const pct = Math.min((value / maxValue) * 100, 100);
    const r = 15;
    const dash = pct * 0.942;
    return (
        <div className="flex flex-col items-center">
            <div style={{ width: size, height: size }} className="relative">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.5"
                        strokeDasharray={`${dash} 100`} strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
                    {value}
                </span>
            </div>
            <p className="text-[11px] font-bold text-white/60 mt-1 uppercase tracking-wider">{label}</p>
        </div>
    );
};

const PlayerToggle = ({ selected, onChange, p1, p2 }: any) => (
    <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
        {['both', 'p1', 'p2'].map(v => (
            <button key={v} onClick={() => onChange(v)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${selected === v ? 'bg-white/15 text-white shadow-inner' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                {v === 'both' ? 'Both' : v === 'p1' ? p1.split(' ').pop() : p2.split(' ').pop()}
            </button>
        ))}
    </div>
);

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function PickleballAnalyticsView({ data }: Props) {
    const [view, setView] = useState<'both' | 'p1' | 'p2'>('both');
    const [shotFilters, setShotFilters] = useState<ShotFilterState>(DEFAULT_FILTERS);
    const [selectedPlayer, setSelectedPlayer] = useState<'all' | 'player1' | 'player2'>('all');
    const p1 = data.players.player1;
    const p2 = data.players.player2;
    const active = view === 'p1' ? p1 : view === 'p2' ? p2 : null;
    const p1Won = (p1.totalPointsWon || 0) > (p2.totalPointsWon || 0);
    const p1Short = p1.name?.split(' ').pop() || 'P1';
    const p2Short = p2.name?.split(' ').pop() || 'P2';

    /* ─── Combine & filter shots for 3D court ─── */
    const allShots = useMemo(() => {
        const s1 = data.heatmaps?.player1 || [];
        const s2 = data.heatmaps?.player2 || [];
        return [...s1, ...s2];
    }, [data.heatmaps]);

    const visibleShots = useMemo(() => {
        if (selectedPlayer === 'all') return allShots;
        return allShots.filter(s => s.playerId === selectedPlayer);
    }, [allShots, selectedPlayer]);

    /* 3rd shot pie data */
    const thirdShotPie = (p: any) => [
        { name: 'Drop', value: p.thirdShotDropPct || 0, color: PB.cyan },
        { name: 'Drive', value: p.thirdShotDrivePct || 0, color: PB.orange },
        { name: 'Lob', value: p.thirdShotLobPct || 0, color: PB.purple },
    ];

    /* error donut */
    const errDonut = (p: any) => [
        { name: 'Net', value: p.ueNet || 0, color: PB.red },
        { name: 'Long', value: p.ueLong || 0, color: PB.orange },
        { name: 'Wide', value: p.ueWide || 0, color: PB.amber },
    ];

    /* Radar data */
    const radarData = [
        { metric: 'Serve', p1: p1.serveInPct || 0, p2: p2.serveInPct || 0 },
        { metric: 'Return', p1: p1.returnSuccessPct || 0, p2: p2.returnSuccessPct || 0 },
        { metric: '3rd Shot', p1: p1.thirdShotSuccessPct || 0, p2: p2.thirdShotSuccessPct || 0 },
        { metric: 'Kitchen', p1: p1.timeInKitchenPct || 0, p2: p2.timeInKitchenPct || 0 },
        { metric: 'Net Play', p1: p1.netPointsWonPct || 0, p2: p2.netPointsWonPct || 0 },
        { metric: 'Accuracy', p1: p1.dinkAccuracy || 0, p2: p2.dinkAccuracy || 0 },
    ];

    /* Stroke performance grouped bar data */
    const strokeBarData = useMemo(() => {
        const types = ['Forehand', 'Backhand', 'Volley', 'Smash', 'Lob', 'Drop', 'Dink'];
        return types.map(t => {
            const s1 = (p1.strokePerformance || []).find((s: any) => s.type === t);
            const s2 = (p2.strokePerformance || []).find((s: any) => s.type === t);
            return {
                type: t,
                [`${p1Short} Winners`]: s1?.winners || 0,
                [`${p2Short} Winners`]: s2?.winners || 0,
                [`${p1Short} Errors`]: -((s1?.forcedErrors || 0) + (s1?.unforcedErrors || 0)),
                [`${p2Short} Errors`]: -((s2?.forcedErrors || 0) + (s2?.unforcedErrors || 0)),
            };
        });
    }, [p1, p2, p1Short, p2Short]);

    return (
        <div className="space-y-10 pb-20">
            {/* ═══ MATCH HEADER ═══ */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent rounded-3xl blur-3xl" />
                <div className="relative">
                    <p className="text-white/40 text-[13px] font-bold uppercase tracking-[0.3em] mb-3">
                        {data.tournament?.name || 'PPA Tour Finals'} • Pickleball Singles
                    </p>
                    <div className="flex items-center justify-center gap-8 mb-4">
                        <div className="text-right">
                            <h2 className={`text-3xl font-black ${p1Won ? 'text-green-400' : 'text-white/70'}`}>{p1.name}</h2>
                            <p className="text-5xl font-black text-white">{p1.totalPointsWon || 0}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Trophy className={`w-9 h-9 mb-1 ${p1Won ? 'text-green-400' : 'text-orange-400'}`} />
                            <span className="text-white/30 text-[13px] font-bold">VS</span>
                        </div>
                        <div className="text-left">
                            <h2 className={`text-3xl font-black ${!p1Won ? 'text-orange-400' : 'text-white/70'}`}>{p2.name}</h2>
                            <p className="text-5xl font-black text-white">{p2.totalPointsWon || 0}</p>
                        </div>
                    </div>
                    <PlayerToggle selected={view} onChange={setView} p1={p1.name} p2={p2.name} />
                </div>
            </motion.div>

            {/* ═══ OVERVIEW RADAR ═══ */}
            <GlassCard glowColor={PB.green}>
                <SectionTitle icon={Eye} title="Performance Overview" color={PB.green} />
                <div className="flex items-center justify-center gap-6 mb-3">
                    <PlayerBadge name={p1.name} color={PB.p1} />
                    <span className="text-white/20 text-xs font-bold">VS</span>
                    <PlayerBadge name={p2.name} color={PB.p2} />
                </div>
                <div className="h-[320px]">
                    <ResponsiveContainer>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                            {(view === 'both' || view === 'p1') && <Radar name={p1.name} dataKey="p1" stroke={PB.p1} fill={PB.p1} fillOpacity={0.2} strokeWidth={2.5} />}
                            {(view === 'both' || view === 'p2') && <Radar name={p2.name} dataKey="p2" stroke={PB.p2} fill={PB.p2} fillOpacity={0.2} strokeWidth={2.5} />}
                            <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 13, fontWeight: 600 }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            {/* ═══ 3D PICKLEBALL COURT ═══ */}
            <div>
                <SectionTitle icon={Maximize2} title="3D Court — Shot Trajectories" color={PB.lime} />
                <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                        {/* Left sidebar */}
                        <div className="lg:w-60 p-5 border-b lg:border-b-0 lg:border-r border-white/[0.08] space-y-5">
                            <div>
                                <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-2">Player Filter</p>
                                <div className="space-y-1.5">
                                    {[
                                        { key: 'all' as const, label: 'All Players', color: PB.green },
                                        { key: 'player1' as const, label: p1.name, color: PB.p1 },
                                        { key: 'player2' as const, label: p2.name, color: PB.p2 },
                                    ].map(opt => (
                                        <button key={opt.key} onClick={() => setSelectedPlayer(opt.key)}
                                            className={`w-full px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all text-left flex items-center gap-2 ${selectedPlayer === opt.key
                                                ? 'bg-white/15 text-white border border-white/20 shadow-inner'
                                                : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                                                }`}>
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color, boxShadow: `0 0 6px ${opt.color}50` }} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-2">Shot Legend</p>
                                <div className="space-y-2 text-[12px] font-bold text-white/60">
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#22C55E] shadow-lg shadow-green-500/50" /> WINNER</span>
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-lg shadow-red-500/50" /> ERROR</span>
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#22C55E]/60" /> IN</span>
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#F97316] shadow-lg shadow-orange-500/50" /> OUT</span>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="text-white/40 text-[11px] font-bold uppercase mb-1">Visible Shots</p>
                                <p className="text-3xl font-black text-white">{visibleShots.length}</p>
                            </div>
                        </div>
                        <div className="flex-1 relative h-[550px]">
                            <Court3D shots={visibleShots} sport="pickleball" filters={shotFilters}
                                selectedPlayer={selectedPlayer} player1Name={p1.name} player2Name={p2.name}
                                onFilterChange={setShotFilters} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ PLAYER HEATMAPS ═══ */}
            <PickleballHeatmap
                player1Shots={data.heatmaps?.player1 || []}
                player2Shots={data.heatmaps?.player2 || []}
                player1Name={p1.name}
                player2Name={p2.name}
                view={view}
            />

            {/* ═══ 1. SERVE METRICS ═══ */}
            <div>
                <SectionTitle icon={Zap} title="Serve Metrics" color={PB.amber} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Speed — Radial Gauges */}
                    <GlassCard glowColor={PB.amber}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-5">Serve Speed (km/h)</p>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <PlayerBadge name={p1Short} color={PB.p1} />
                                <div className="flex gap-5 mt-3 justify-center">
                                    <RadialGauge value={p1.serveAvgSpeed || 0} maxValue={100} label="AVG" color={PB.amber} size={80} />
                                    <RadialGauge value={p1.serveMaxSpeed || 0} maxValue={100} label="MAX" color={PB.orange} size={80} />
                                </div>
                            </div>
                            <div>
                                <PlayerBadge name={p2Short} color={PB.p2} />
                                <div className="flex gap-5 mt-3 justify-center">
                                    <RadialGauge value={p2.serveAvgSpeed || 0} maxValue={100} label="AVG" color={PB.amber} size={80} />
                                    <RadialGauge value={p2.serveMaxSpeed || 0} maxValue={100} label="MAX" color={PB.orange} size={80} />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                    {/* Serve Bars */}
                    <GlassCard glowColor={PB.amber}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-5">Serve Breakdown</p>
                        <CompareBar label="Serve In %" v1={p1.serveInPct || 0} v2={p2.serveInPct || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        <CompareBar label="Serve Depth %" v1={p1.serveDepthPct || 0} v2={p2.serveDepthPct || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        <CompareBar label="Service Winners" v1={p1.serviceWinners || 0} v2={p2.serviceWinners || 0} p1Name={p1Short} p2Name={p2Short} />
                        <CompareBar label="Service Errors" v1={p1.serviceErrors || 0} v2={p2.serviceErrors || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                    </GlassCard>
                </div>
            </div>

            {/* ═══ 2. RETURN METRICS — Radial Gauges ═══ */}
            <div>
                <SectionTitle icon={Shield} title="Return Metrics" color={PB.cyan} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Return Success', v1: p1.returnSuccessPct, v2: p2.returnSuccessPct, suffix: '%', color: PB.cyan },
                        { label: 'Return Depth', v1: p1.returnDepthPct, v2: p2.returnDepthPct, suffix: '%', color: PB.emerald },
                        { label: 'Return Errors', v1: p1.returnErrors, v2: p2.returnErrors, suffix: '', color: PB.red },
                        { label: 'Aggression', v1: p1.returnAggression, v2: p2.returnAggression, suffix: '', color: PB.orange },
                    ].map((m, i) => (
                        <DualStatCard key={i} label={m.label} v1={m.v1} v2={m.v2}
                            p1Name={p1Short} p2Name={p2Short} suffix={m.suffix} color={m.color} />
                    ))}
                </div>
            </div>

            {/* ═══ 3. THIRD SHOT ANALYTICS ═══ */}
            <div>
                <SectionTitle icon={Target} title="3rd Shot Analytics" color={PB.purple} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pie Chart */}
                    <GlassCard className="md:row-span-2" glowColor={PB.purple}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Shot Type Split</p>
                        <div className="grid grid-cols-1 gap-5">
                            {(view === 'both' ? [p1, p2] : [active || p1]).map((p: any, idx: number) => (
                                <div key={idx}>
                                    <PlayerBadge name={p.name} color={idx === 0 ? PB.p1 : PB.p2} />
                                    <div className="h-[130px] mt-2">
                                        <ResponsiveContainer>
                                            <PieChart><Pie data={thirdShotPie(p)} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                                                {thirdShotPie(p).map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                                            </Pie><Tooltip contentStyle={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff' }} formatter={(value: any, name: any) => [`${value}%`, name]} labelStyle={{ color: 'rgba(255,255,255,0.7)' }} itemStyle={{ color: '#fff' }} /></PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center gap-4 text-[11px] font-bold">
                                        {thirdShotPie(p).map((e: any, i: number) => <span key={i} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} /><span className="text-white/60">{e.name} {e.value}%</span></span>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                    {/* Success & Errors */}
                    <GlassCard glowColor={PB.emerald}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Success & Errors</p>
                        <CompareBar label="Success %" v1={p1.thirdShotSuccessPct || 0} v2={p2.thirdShotSuccessPct || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        <CompareBar label="Winner %" v1={p1.thirdShotWinnerPct || 0} v2={p2.thirdShotWinnerPct || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        <CompareBar label="Errors" v1={p1.thirdShotErrors || 0} v2={p2.thirdShotErrors || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                        <CompareBar label="Forced Err" v1={p1.thirdShotForcedErrors || 0} v2={p2.thirdShotForcedErrors || 0} p1Name={p1Short} p2Name={p2Short} />
                    </GlassCard>
                    {/* Outcome */}
                    <GlassCard glowColor={PB.lime}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">After 3rd Shot</p>
                        <CompareBar label="Points Won" v1={p1.pointsWonAfter3rdShot || 0} v2={p2.pointsWonAfter3rdShot || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        <CompareBar label="Kitchen Entry" v1={p1.kitchenEntrySuccessPct || 0} v2={p2.kitchenEntrySuccessPct || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-3">3rd Shot Drops</p>
                            <CompareBar label="Total Drops" v1={p1.thirdShotDrops || 0} v2={p2.thirdShotDrops || 0} p1Name={p1Short} p2Name={p2Short} />
                            <CompareBar label="Drop Success" v1={p1.thirdShotDropSuccess || 0} v2={p2.thirdShotDropSuccess || 0} p1Name={p1Short} p2Name={p2Short} suffix="%" />
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ═══ 4. RALLY & POINT STRUCTURE — Vertical Bar Chart ═══ */}
            <div>
                <SectionTitle icon={BarChart3} title="Rally & Point Structure" color={PB.emerald} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassCard glowColor={PB.emerald}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Rally Length Distribution</p>
                        {(view === 'both' ? [p1, p2] : [active || p1]).map((p: any, idx: number) => (
                            <div key={idx} className={idx > 0 ? 'mt-5 pt-4 border-t border-white/10' : ''}>
                                <PlayerBadge name={p.name} color={idx === 0 ? PB.p1 : PB.p2} />
                                <div className="space-y-2.5 mt-3">
                                    {(p.rallyWinLoss || []).map((r: any, i: number) => {
                                        const total = (r.won || 0) + (r.lost || 0);
                                        const winPct = total > 0 ? (r.won / total) * 100 : 0;
                                        return (
                                            <div key={i} className="flex items-center gap-3 group/bar hover:bg-white/5 rounded-lg px-2 py-1 transition-all">
                                                <span className="text-white/50 text-[12px] font-bold w-12">{r.bucket}</span>
                                                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden flex">
                                                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${winPct}%` }}
                                                        viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }}
                                                        className="h-full rounded-l-full" style={{ background: `linear-gradient(90deg, ${PB.green}80, ${PB.green})` }} />
                                                    <div className="h-full rounded-r-full" style={{ width: `${100 - winPct}%`, background: PB.red + '40' }} />
                                                </div>
                                                <span className="text-white/60 text-[12px] font-bold w-20 text-right">{r.won}W / {r.lost}L</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </GlassCard>
                    {/* Point Outcome — Vertical grouped bar */}
                    <GlassCard glowColor={PB.amber}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Point Outcome Breakdown</p>
                        <div className="h-[200px] mb-4">
                            <ResponsiveContainer>
                                <BarChart data={[
                                    { name: 'Winners', [p1Short]: p1.winners || 0, [p2Short]: p2.winners || 0 },
                                    { name: 'Forced Err', [p1Short]: p1.forcedErrors || 0, [p2Short]: p2.forcedErrors || 0 },
                                    { name: 'Unforced Err', [p1Short]: p1.unforcedErrors || 0, [p2Short]: p2.unforcedErrors || 0 },
                                ]} barGap={4}>
                                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 13, fontWeight: 600 }} />
                                    <Bar dataKey={p1Short} fill={PB.p1} radius={[6, 6, 0, 0]} />
                                    <Bar dataKey={p2Short} fill={PB.p2} radius={[6, 6, 0, 0]} />
                                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Stacked proportion bars */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                            {[p1, p2].map((p, i) => {
                                const w = p.winners || 0, fe = p.forcedErrors || 0, ue = p.unforcedErrors || 0;
                                const total = w + fe + ue || 1;
                                return (
                                    <div key={i}>
                                        <PlayerBadge name={p.name?.split(' ').pop()} color={i === 0 ? PB.p1 : PB.p2} />
                                        <div className="h-3 rounded-full flex overflow-hidden mt-2">
                                            <div style={{ width: `${(w / total) * 100}%`, background: PB.green }} />
                                            <div style={{ width: `${(fe / total) * 100}%`, background: PB.amber }} />
                                            <div style={{ width: `${(ue / total) * 100}%`, background: PB.red }} />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-white/50 font-bold mt-1">
                                            <span>{Math.round((w / total) * 100)}% W</span>
                                            <span>{Math.round((fe / total) * 100)}% FE</span>
                                            <span>{Math.round((ue / total) * 100)}% UE</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ═══ 5. STROKE PERFORMANCE — Grouped Bar Chart ═══ */}
            <div>
                <SectionTitle icon={Flame} title="Stroke-Based Performance" color={PB.orange} />
                <GlassCard glowColor={PB.orange}>
                    <div className="flex items-center gap-6 mb-4">
                        <PlayerBadge name={p1.name} color={PB.p1} />
                        <span className="text-white/20 text-xs font-bold">VS</span>
                        <PlayerBadge name={p2.name} color={PB.p2} />
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer>
                            <BarChart data={strokeBarData} barGap={2} barCategoryGap="15%">
                                <XAxis dataKey="type" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff' }} formatter={(value: any, name: any) => [Math.abs(Number(value)), name]} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }} itemStyle={{ color: '#fff' }} />
                                <Bar dataKey={`${p1Short} Winners`} fill={PB.p1} radius={[4, 4, 0, 0]} />
                                <Bar dataKey={`${p2Short} Winners`} fill={PB.p2} radius={[4, 4, 0, 0]} />
                                <Bar dataKey={`${p1Short} Errors`} fill={`${PB.p1}60`} radius={[0, 0, 4, 4]} />
                                <Bar dataKey={`${p2Short} Errors`} fill={`${PB.p2}60`} radius={[0, 0, 4, 4]} />
                                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* ═══ 6. SHOT INTENT — Radial Gauges ═══ */}
            <div>
                <SectionTitle icon={Crosshair} title="Shot Intent Categories" color={PB.lime} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(view === 'both' ? [p1, p2] : [active || p1]).map((p: any, idx: number) => {
                        const intent = [
                            { name: 'Dink', pct: p.dinks ? Math.round((p.dinks / ((p.dinks || 0) + (p.drivePercentage || 0) + (p.lobPercentage || 0) + (p.dropPercentage || 0))) * 100) : (p.dinkAccuracy || 0), color: PB.cyan },
                            { name: 'Drive', pct: p.drivePercentage || 0, color: PB.orange },
                            { name: 'Drop', pct: p.dropPercentage || 0, color: PB.purple },
                            { name: 'Lob', pct: p.lobPercentage || 0, color: PB.amber },
                        ];
                        return (
                            <GlassCard key={idx} glowColor={idx === 0 ? PB.p1 : PB.p2}>
                                <PlayerBadge name={p.name} color={idx === 0 ? PB.p1 : PB.p2} />
                                <div className="flex justify-center gap-5 mt-4">
                                    {intent.map((s, i) => (
                                        <RadialGauge key={i} value={s.pct} maxValue={100} label={s.name} color={s.color} size={75} />
                                    ))}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>

            {/* ═══ 7. MOVEMENT & POSITIONING — Clear player labels ═══ */}
            <div>
                <SectionTitle icon={Footprints} title="Movement & Positioning" color={PB.cyan} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Distance', v1: p1.distanceCovered, v2: p2.distanceCovered, suffix: 'm', icon: Move, color: PB.cyan },
                        { label: 'Lateral Speed', v1: p1.lateralSpeed, v2: p2.lateralSpeed, suffix: ' km/h', icon: Activity, color: PB.lime },
                        { label: 'Sprints', v1: p1.sprints, v2: p2.sprints, suffix: '', icon: Zap, color: PB.orange },
                        { label: 'Court Coverage', v1: p1.courtCoveragePercentage, v2: p2.courtCoveragePercentage, suffix: '%', icon: Eye, color: PB.emerald },
                    ].map((m, i) => (
                        <DualStatCard key={i} label={m.label} v1={m.v1} v2={m.v2}
                            p1Name={p1Short} p2Name={p2Short} suffix={m.suffix} color={m.color} icon={m.icon} />
                    ))}
                </div>
            </div>

            {/* ═══ 8. ERROR INTELLIGENCE — Donut + Grouped Bars ═══ */}
            <div>
                <SectionTitle icon={AlertCircle} title="Error Intelligence" color={PB.red} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* UE Breakdown Donut - bigger */}
                    <GlassCard glowColor={PB.red}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Unforced Error Breakdown</p>
                        {(view === 'both' ? [p1, p2] : [active || p1]).map((p: any, idx: number) => (
                            <div key={idx} className={idx > 0 ? 'mt-4 pt-4 border-t border-white/10' : ''}>
                                <PlayerBadge name={p.name} color={idx === 0 ? PB.p1 : PB.p2} />
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="w-24 h-24">
                                        <ResponsiveContainer>
                                            <PieChart><Pie data={errDonut(p)} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" strokeWidth={0}>
                                                {errDonut(p).map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                                            </Pie></PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="text-[12px] space-y-1.5 font-bold">
                                        {errDonut(p).map((e: any, i: number) => <div key={i} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} /><span className="text-white/60">{e.name}: <span className="text-white">{e.value}</span></span></div>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </GlassCard>
                    {/* Error by Shot Type — Grouped Bars */}
                    <GlassCard glowColor={PB.amber}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Error by Shot Type</p>
                        <div className="h-[180px]">
                            <ResponsiveContainer>
                                <BarChart data={[
                                    { type: 'Dink', [p1Short]: p1.errDink || 0, [p2Short]: p2.errDink || 0 },
                                    { type: 'Volley', [p1Short]: p1.errVolley || 0, [p2Short]: p2.errVolley || 0 },
                                    { type: 'FH', [p1Short]: p1.errFH || 0, [p2Short]: p2.errFH || 0 },
                                ]} barGap={4}>
                                    <XAxis dataKey="type" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 13, fontWeight: 600 }} />
                                    <Bar dataKey={p1Short} fill={PB.p1} radius={[6, 6, 0, 0]} />
                                    <Bar dataKey={p2Short} fill={PB.p2} radius={[6, 6, 0, 0]} />
                                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                    {/* Error Location + Total */}
                    <GlassCard glowColor={PB.red}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Error Location</p>
                        <CompareBar label="Kitchen Zone" v1={p1.errKitchen || 0} v2={p2.errKitchen || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                        <CompareBar label="Mid-Court" v1={p1.errMid || 0} v2={p2.errMid || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-3">Total Errors</p>
                            <div className="flex justify-between">
                                {[p1, p2].map((p, i) => {
                                    const t = (p.ueNet || 0) + (p.ueLong || 0) + (p.ueWide || 0);
                                    return (
                                        <div key={i} className="text-center">
                                            <PlayerBadge name={p.name?.split(' ').pop()} color={i === 0 ? PB.p1 : PB.p2} />
                                            <p className="text-3xl font-black text-red-400 mt-1">{t}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ═══ 9. BASELINE vs NET — Radial Gauges ═══ */}
            <div>
                <SectionTitle icon={TrendingUp} title="Baseline vs Net Performance" color={PB.emerald} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[p1, p2].map((p, idx) => (
                        <GlassCard key={idx} glowColor={idx === 0 ? PB.p1 : PB.p2}>
                            <PlayerBadge name={p.name} color={idx === 0 ? PB.p1 : PB.p2} />
                            <div className="flex justify-center gap-8 mt-4">
                                <RadialGauge value={p.netPointsWonPct || 0} maxValue={100} label="Net Won" color={PB.emerald} size={95} />
                                <RadialGauge value={p.baselinePointsWonPct || 0} maxValue={100} label="Baseline Won" color={PB.cyan} size={95} />
                                <RadialGauge value={p.netErrorsPct || 0} maxValue={100} label="Net Err" color={PB.red} size={95} />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>

            {/* ═══ 10. KITCHEN (NVZ) PRESENCE ═══ */}
            <div>
                <SectionTitle icon={Gauge} title="Kitchen (NVZ) Presence" color={PB.lime} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Time in Kitchen — Large Radials */}
                    <GlassCard glowColor={PB.lime}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Time in Kitchen</p>
                        <div className="flex justify-around items-end">
                            {[p1, p2].map((p, i) => (
                                <div key={i} className="text-center">
                                    <PlayerBadge name={p.name?.split(' ').pop()} color={i === 0 ? PB.p1 : PB.p2} />
                                    <div className="mt-2">
                                        <RadialGauge value={p.timeInKitchenPct || 0} maxValue={100} label="" color={i === 0 ? PB.p1 : PB.p2} size={100} />
                                    </div>
                                    <p className="text-[12px] font-bold text-white/50 mt-1">{p.timeInKitchenPct || 0}%</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                    {/* Points Won from Kitchen */}
                    <GlassCard glowColor={PB.emerald}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Points Won from Kitchen</p>
                        <CompareBar label="Points Won" v1={p1.pointsWonKitchen || 0} v2={p2.pointsWonKitchen || 0} p1Name={p1Short} p2Name={p2Short} />
                        <div className="mt-4 flex justify-between">
                            <div className="text-center">
                                <PlayerBadge name={p1Short} color={PB.p1} />
                                <p className="text-3xl font-black mt-1" style={{ color: PB.p1 }}>{p1.pointsWonKitchen || 0}</p>
                            </div>
                            <div className="text-center">
                                <PlayerBadge name={p2Short} color={PB.p2} align="right" />
                                <p className="text-3xl font-black mt-1" style={{ color: PB.p2 }}>{p2.pointsWonKitchen || 0}</p>
                            </div>
                        </div>
                    </GlassCard>
                    {/* Kitchen Errors & Violations */}
                    <GlassCard glowColor={PB.red}>
                        <p className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-4">Kitchen Errors & Violations</p>
                        <CompareBar label="Kitchen Errors" v1={p1.kitchenErrors || 0} v2={p2.kitchenErrors || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                        <CompareBar label="Kitchen Violations" v1={p1.kitchenViolations || 0} v2={p2.kitchenViolations || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <CompareBar label="Handspeed (ms)" v1={p1.handspeed || 0} v2={p2.handspeed || 0} p1Name={p1Short} p2Name={p2Short} better="lower" />
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ═══ KEY STATS ROW — with player names ═══ */}
            <div>
                <SectionTitle icon={Activity} title="Key Match Stats" color={PB.green} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Dinks', v1: p1.dinks, v2: p2.dinks, color: PB.cyan },
                        { label: 'Dink Accuracy', v1: p1.dinkAccuracy, v2: p2.dinkAccuracy, suffix: '%', color: PB.emerald },
                        { label: 'Aces', v1: p1.aces, v2: p2.aces, color: PB.amber },
                        { label: 'Double Faults', v1: p1.doubleFaults, v2: p2.doubleFaults, color: PB.red },
                    ].map((m, i) => (
                        <DualStatCard key={i} label={m.label} v1={m.v1} v2={m.v2}
                            p1Name={p1Short} p2Name={p2Short} suffix={m.suffix || ''} color={m.color} />
                    ))}
                </div>
            </div>
        </div>
    );
}
