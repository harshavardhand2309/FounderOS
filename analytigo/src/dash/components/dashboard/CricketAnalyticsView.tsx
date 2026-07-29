
import { motion } from "framer-motion";
import { useState } from "react";
import { Trophy, Activity, Zap, Target, TrendingUp, AlertCircle, Maximize2, Sparkles, User, Shield, Crosshair } from "lucide-react";
import dynamic from '@/lib/dynamic';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const Court3D = dynamic(() => import('./Court3D'), { ssr: false });

// Reuse the generic analytics type for now, but map it specifically for cricket logic
// In a real app, strict typing for CricketAnalytics would be better
import { MatchAnalytics } from "@/types/analytics";

interface CricketAnalyticsViewProps {
    data: MatchAnalytics;
}

// --- SUB-COMPONENTS ---

const CricketStatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`glass-panel p-6 rounded-3xl relative overflow-hidden group hover:bg-white/5 transition-colors border border-white/5`}
    >
        <div className={`absolute top-0 right-0 p-3 opacity-20 ${color}`}>
            <Icon size={48} />
        </div>
        <div className="relative z-10">
            <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-3xl font-black font-display text-white">{value}</h3>
            {subtext && <p className={`text-xs font-mono mt-2 ${color.replace('text-', 'text-opacity-80 ')}`}>{subtext}</p>}
        </div>
    </motion.div>
);

const WagonWheel = ({ data }: { data: any[] }) => {
    // Default sectors if no data provided
    const defaultSectors = [
        { name: 'Third Man', value: 0, color: '#3b82f6' },
        { name: 'Point', value: 0, color: '#0ea5e9' },
        { name: 'Cover', value: 0, color: '#06b6d4' },
        { name: 'Mid-Off', value: 0, color: '#14b8a6' },
        { name: 'Mid-On', value: 0, color: '#10b981' },
        { name: 'Mid-Wicket', value: 0, color: '#84cc16' },
        { name: 'Square Leg', value: 0, color: '#eab308' },
        { name: 'Fine Leg', value: 0, color: '#f59e0b' },
    ];

    // Map incoming data to sectors
    const sectors = data && data.length > 0 ? data.map((item, index) => ({
        name: item.zone,
        value: item.runs,
        color: defaultSectors[index % defaultSectors.length]?.color || '#ffffff'
    })) : defaultSectors;

    return (
        <div className="relative h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sectors}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#ffffff60', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 50]} tick={false} axisLine={false} />
                    <Radar name="Runs" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full opacity-50" />
            </div>
        </div>
    );
};

export default function CricketAnalyticsView({ data }: CricketAnalyticsViewProps) {
    const p1 = data.players.player1;

    // STRICT ROLE DETECTION
    const playerRole = (p1.role || 'Batsman').toLowerCase();

    // Determine allowed tabs based on role
    const allowedTabs: string[] = [];
    if (playerRole === 'batsman') allowedTabs.push('batsman');
    if (playerRole === 'bowler') allowedTabs.push('bowler');
    if (playerRole === 'all-rounder') {
        allowedTabs.push('batsman');
        allowedTabs.push('bowler');
        allowedTabs.push('allrounder');
    }

    // Default active tab to the first allowed one
    const [activeRole, setActiveRole] = useState<string>(allowedTabs[0] || 'batsman');

    // ... (rest of mapping logic) ...

    const batsmanStats = {
        runs: p1.totalPointsWon, // Mapped from Total Points
        balls: p1.balls || p1.netPointsPlayed,
        strikeRate: p1.strikeRate || p1.maxSpeed,
        fours: p1.fours || p1.winners,
        sixes: p1.sixes || p1.aces,
        control: `${p1.firstServePercentage}%`,
        wagonWheel: p1.wagonWheel || [],
        dots: p1.dots || p1.unforcedErrors
    };

    const bowlerStats = {
        overs: p1.overs || Math.floor(p1.netPointsPlayed / 6),
        maidens: p1.maidens || p1.doubleFaults,
        runsConceded: p1.runsConceded || p1.totalPointsWon,
        wickets: p1.wickets || p1.winners,
        economy: p1.economy || p1.avgSpeed,
        dots: p1.dots || p1.unforcedErrors,
        yorkers: p1.breakPointsWon
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 relative">

            {/* --- HEADER: INDIVIDUAL PLAYER FOCUS --- */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-mono tracking-widest uppercase">
                        CRICKET ANALYTICS
                    </span>
                    <span className="text-white/30 text-sm font-mono">
                        {data.tournament.name} • {data.tournament.date}
                    </span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black font-display text-white uppercase tracking-tight mb-2">
                    {p1.name}
                </h1>
                <div className="flex gap-4 text-white/50 font-mono text-sm uppercase">
                    <span>INDIA</span>
                    <span>•</span>
                    <span className="text-blue-400 font-bold">{p1.role || 'Player'}</span>
                </div>
            </motion.div>

            {/* --- ROLE SELECTOR TABS --- */}
            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit backdrop-blur-sm border border-white/10">
                {allowedTabs.map((role) => (
                    <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold font-mono uppercase transition-all ${activeRole === role
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {role} Report
                    </button>
                ))}
            </div>

            {/* --- BATSMAN REPORT --- */}
            {activeRole === 'batsman' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6"
                >
                    {/* Key Metrics */}
                    <div className="md:col-span-3 space-y-4">
                        <CricketStatCard title="Runs Scored" value={batsmanStats.runs} subtext={`off ${batsmanStats.balls} balls`} icon={Trophy} color="text-yellow-400" />
                        <CricketStatCard title="Strike Rate" value={batsmanStats.strikeRate} subtext="High Impact" icon={Zap} color="text-blue-400" />
                        <CricketStatCard title="Boundaries" value={`${batsmanStats.fours} / ${batsmanStats.sixes}`} subtext="4s / 6s" icon={Target} color="text-green-400" />
                        <CricketStatCard title="Control %" value={batsmanStats.control} subtext="Elite Level" icon={Shield} color="text-purple-400" />
                    </div>

                    {/* Wagon Wheel (Expanded) */}
                    <div className="md:col-span-9 flex flex-col gap-6">
                        <div className="glass-panel p-6 rounded-3xl h-[400px] relative">
                            <h3 className="text-white font-bold font-display mb-4 flex items-center gap-2">
                                <Activity className="text-blue-400" size={18} />
                                SCORING AREAS (WAGON WHEEL)
                            </h3>
                            <WagonWheel data={batsmanStats.wagonWheel} />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* --- BOWLER REPORT --- */}
            {activeRole === 'bowler' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6"
                >
                    {/* Key Metrics */}
                    <div className="md:col-span-3 space-y-4">
                        <CricketStatCard title="Overs" value={bowlerStats.overs} subtext={`${bowlerStats.maidens} Maidens`} icon={Activity} color="text-orange-400" />
                        <CricketStatCard title="Wickets" value={bowlerStats.wickets} subtext={`${bowlerStats.runsConceded} Runs`} icon={Trophy} color="text-red-400" />
                        <CricketStatCard title="Economy" value={bowlerStats.economy} subtext="Runs per Over" icon={TrendingUp} color="text-green-400" />
                        <CricketStatCard title="Dot Balls" value={bowlerStats.dots} subtext={`${((bowlerStats.dots / 60) * 100).toFixed(1)}%`} icon={Shield} color="text-blue-400" />
                        <CricketStatCard title="Yorkers" value={bowlerStats.yorkers} subtext="Execution" icon={Crosshair} color="text-yellow-400" />
                    </div>

                    {/* 3D Visualization (Takes center stage for bowlers) */}
                    <div className="md:col-span-6 h-full min-h-[400px]">
                        <div className="glass-panel p-1 rounded-3xl h-full overflow-hidden relative group">
                            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/10">
                                <span className="text-[10px] uppercase font-mono text-white/80">Pitch Map & Trajectory</span>
                            </div>
                            <Court3D shots={data.heatmaps.player1} sport="cricket" />
                        </div>
                    </div>

                    {/* Line & Length Stats */}
                    <div className="md:col-span-3 flex flex-col gap-4">
                        <div className="glass-panel p-6 rounded-3xl flex-1">
                            <h3 className="text-white font-bold font-display mb-4 text-sm text-white/60">LENGTH DISTRIBUTION</h3>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono text-white/80"><span>YORKER</span><span>15%</span></div>
                                    <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[15%] bg-yellow-400 h-full rounded-full"></div></div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono text-white/80"><span>FULL</span><span>25%</span></div>
                                    <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[25%] bg-blue-400 h-full rounded-full"></div></div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono text-white/80"><span>GOOD</span><span>40%</span></div>
                                    <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[40%] bg-green-400 h-full rounded-full"></div></div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono text-white/80"><span>SHORT</span><span>20%</span></div>
                                    <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[20%] bg-red-400 h-full rounded-full"></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* --- ALL-ROUNDER REPORT (Just a placeholder overlap for now) --- */}
            {activeRole === 'allrounder' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {/* IMPACT METRICS */}
                    {(p1.impactMetrics || []).map((stat: any, index: number) => (
                        <div key={index} className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                            <h3 className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">{stat.metric}</h3>
                            <div className="text-4xl font-black font-display text-white">{stat.value}</div>
                            <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${Math.min(stat.value, 100)}%` }}
                                    className={`h-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'}`}
                                />
                            </div>
                        </div>
                    ))}

                    {/* TOTAL MATCH INFLUENCE */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-1 glass-panel p-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 flex flex-col justify-center items-center text-center">
                        <Sparkles className="text-yellow-400 mb-2" size={32} />
                        <h3 className="text-white/60 text-xs font-mono uppercase tracking-widest mb-1">Total MII</h3>
                        <div className="text-6xl font-black font-display text-white">
                            {(p1.impactMetrics?.find((m: any) => m.metric.includes('Total'))?.value || 0)}
                        </div>
                        <p className="text-xs text-white/40 mt-2 font-mono">Match Influence Index</p>
                    </div>

                    {/* 3D Visualization */}
                    <div className="md:col-span-2 lg:col-span-3 h-[300px]">
                        <div className="glass-panel p-1 rounded-3xl h-full overflow-hidden relative group">
                            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/10">
                                <span className="text-[10px] uppercase font-mono text-white/80">Performance Distribution</span>
                            </div>
                            <Court3D shots={data.heatmaps.player1} sport="cricket" />
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
