
import { motion } from "framer-motion";
import { useState } from "react";
import {
    Trophy, Activity, Zap, Target, TrendingUp, AlertCircle,
    Maximize2, Sparkles, User, Shield, Crosshair, Map,
    Footprints, ArrowRightCircle
} from "lucide-react";
import dynamic from '@/lib/dynamic';
import {
    ResponsiveContainer, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip
} from "recharts";
import { MatchAnalytics } from "@/types/analytics";

const Court3D = dynamic(() => import('./Court3D'), { ssr: false });

interface FootballAnalyticsViewProps {
    data: MatchAnalytics;
}

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
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

export default function FootballAnalyticsView({ data }: FootballAnalyticsViewProps) {
    const p1 = data.players.player1;
    const role = (p1.role || 'Forward').toLowerCase(); // Forward, Midfielder, Defender, Goalkeeper

    // Derived or Parsed Stats
    const stats = {
        goals: p1.goals || 0,
        assists: p1.assists || 0,
        passing: p1.passAccuracy ? `${p1.passAccuracy.toFixed(1)}%` : '85.4%',
        tackles: p1.tacklesWon || 0,
        xG: p1.xG || 0.0,
        xA: p1.xA || 0.0,
        distance: p1.distanceCovered ? (p1.distanceCovered / 1000).toFixed(2) : '0.0',
        topSpeed: p1.maxSpeed || 0
    };

    // Overlay Stats for 3D View
    const overlayStats = [
        { label: "Minutes", value: `${p1.minutesPlayed || 90}'` },
        { label: "Dist", value: `${stats.distance}km` },
        { label: "Chances", value: p1.chancesCreated || 0 },
        { label: "Fouls", value: p1.fouls || 0 },
        { label: "Offsides", value: p1.offsides || 0 },
        { label: "Crosses", value: p1.crosses || 0 }
    ];

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 relative">

            {/* HEADER */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-mono tracking-widest uppercase">
                        FOOTBALL ANALYTICS
                    </span>
                    <span className="text-white/30 text-sm font-mono">
                        {data.tournament.name} • {data.tournament.date}
                    </span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black font-display text-white uppercase tracking-tight mb-2">
                    {p1.name}
                </h1>
                <div className="flex gap-4 text-white/50 font-mono text-sm uppercase">
                    <span>ARGENTINA</span>
                    <span>•</span>
                    <span className="text-green-400 font-bold">{p1.role || 'PLAYER'}</span>
                    <span>•</span>
                    <span>#10</span>
                </div>
            </motion.div>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* LEFT COLUMN: KEY STATS */}
                <div className="md:col-span-3 space-y-4">
                    <StatCard title="Goals" value={stats.goals} subtext={`${stats.xG} xG`} icon={Trophy} color="text-yellow-400" />
                    <StatCard title="Assists" value={stats.assists} subtext={`${stats.xA} xA`} icon={Target} color="text-blue-400" />
                    <StatCard title="Passing" value={stats.passing} subtext={`${p1.passesCompleted}/${p1.passesAttempted} Passes`} icon={Activity} color="text-green-400" />
                    {role === 'defender' || role === 'midfielder' ? (
                        <StatCard title="Tackles" value={stats.tackles} subtext="Won" icon={Shield} color="text-red-400" />
                    ) : (
                        <StatCard title="Top Speed" value={stats.topSpeed} subtext="km/h" icon={Zap} color="text-orange-400" />
                    )}
                </div>

                {/* MIDDLE COLUMN: HEATMAP / FIELD VIEW */}
                <div className="md:col-span-6 flex flex-col gap-6">
                    <div className="glass-panel p-1 rounded-3xl h-[500px] overflow-hidden relative group">
                        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/10">
                            <span className="text-[10px] uppercase font-mono text-white/80">Heatmap & Touch Map</span>
                        </div>
                        {/* Reusing Court3D with 'football' mode */}
                        <Court3D shots={data.heatmaps.player1} sport="football" overlayStats={overlayStats} />
                    </div>
                </div>

                {/* RIGHT COLUMN: ADDITIONAL METRICS */}
                <div className="md:col-span-3 flex flex-col gap-4">
                    <div className="glass-panel p-6 rounded-3xl flex-1">
                        <h3 className="text-white font-bold font-display mb-4 text-sm text-white/60">PHYSICAL</h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-xs font-mono text-white/80 mb-2"><span>DISTANCE COVERED</span><span>{stats.distance} km</span></div>
                                <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[85%] bg-blue-400 h-full rounded-full"></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-mono text-white/80 mb-2"><span>SPRINTS</span><span>24</span></div>
                                <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[60%] bg-yellow-400 h-full rounded-full"></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-mono text-white/80 mb-2"><span>INTENSITY</span><span>High</span></div>
                                <div className="w-full bg-white/10 rounded-full h-1.5"><div className="w-[90%] bg-red-400 h-full rounded-full"></div></div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl flex-1 flex flex-col justify-center items-center text-center">
                        <Footprints size={32} className="text-white/20 mb-2" />
                        <div className="text-4xl font-black text-white">92%</div>
                        <div className="text-xs text-white/40 font-mono mt-1">Work Rate</div>
                    </div>
                </div>

            </div>
        </div>
    );
}
