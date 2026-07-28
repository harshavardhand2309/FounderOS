
import { MatchAnalytics, ShotFilterState, AccuracyLevel } from "@/types/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Trophy, Activity, Zap, Target, TrendingUp, AlertCircle, Maximize2, Sparkles, Gauge, ChevronDown, Crosshair, Footprints, Move } from "lucide-react";
import dynamic from '@/lib/dynamic';
import { useState, useMemo } from 'react';
import RallyDistributionChart from "./analytics/RallyDistributionChart";
import BreakPointAnalysis from "./analytics/BreakPointAnalysis";
import ShotTypeChart from "./analytics/ShotTypeChart";
import MovementAnalytics from "./analytics/MovementAnalytics";
import PlayerComparison from "./analytics/PlayerComparison";
import AccuracyBadge from "./analytics/AccuracyBadge";
import ShotFilterPanel, { DEFAULT_FILTERS } from "./analytics/ShotFilterPanel";
import AdvancedMatchIntelligence from "./analytics/AdvancedMatchIntelligence";
import { computeAdvancedIntelligence } from "@/utils/advancedIntelligenceEngine";
import {
    computeServeSpeed,
    computeServePercentages,
    computeAces,
    computeDoubleFaultRate,
    computeServePlus1,
    computeReturnAggressionIndex,
    computeShotToleranceIndex,
    computeCompositeMomentum,
    computeBaselineVsNet,
    computeWinnersErrorsByType,
    computeDirectionBias,
    computeSprintCount,
    computeSpinMetrics,
    computeRallyWinLoss,
    computeResponseDelayIndex,
    computeBaselineVsNetWinPct,
    computeMovementHeatmap,
    computeExplosiveBursts,
    computeMovementEfficiency,
} from "@/utils/metricEngine";

const Court3D = dynamic(() => import('./Court3D'), { ssr: false });

interface AnalyticsViewProps {
    data: MatchAnalytics;
    selectedSport: string;
}

// ═══════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════

const StatCard = ({
    title,
    value,
    subtext,
    icon: Icon,
    color = "text-[#06b6d4]",
    index = 0,
    accuracy,
}: any) => {
    let glowClass = "hover-glow-cyan";
    if (color.includes("#fbbf24") || color.includes("amber")) glowClass = "hover-glow-gold";
    if (color.includes("#ef4444") || color.includes("red")) glowClass = "hover-glow-red";
    if (color.includes("#10b981") || color.includes("emerald")) glowClass = "hover-glow-emerald";
    if (color.includes("#8b5cf6") || color.includes("purple")) glowClass = "hover-glow-purple";

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            className={`glass-panel glass-panel-hover card-3d-wrapper p-0 rounded-3xl relative group cursor-pointer ${glowClass}`}
        >
            <div className="card-3d-content p-6 h-full min-h-[140px] flex flex-col justify-between relative z-20">
                <div className="flex justify-between items-start z-10 relative">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <p className="text-white/40 text-xs font-mono uppercase tracking-widest">{title}</p>
                            {accuracy && <AccuracyBadge accuracy={accuracy} />}
                        </div>
                        <h3 className="text-4xl font-black font-display text-white drop-shadow-lg">{value}</h3>
                    </div>
                    <motion.div
                        whileHover={{ rotate: 360, scale: 1.2 }}
                        transition={{ duration: 0.6 }}
                        className={`p-3 rounded-2xl ${color} bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg`}
                    >
                        <Icon size={22} strokeWidth={2.5} />
                    </motion.div>
                </div>
                {subtext && (
                    <p className="text-white/30 text-xs mt-4 font-mono z-10 relative">{subtext}</p>
                )}
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0 pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-br ${color.replace('text-', 'from-')}/10 to-transparent`} />
            </div>
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 ${color.replace('text-', 'bg-')}`} />
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════

const CollapsibleSection = ({ title, icon: Icon, iconColor, children, defaultOpen = true }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="mt-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 w-full text-left group mb-4"
            >
                <Icon className={iconColor} size={20} />
                <span className="text-white font-display font-bold text-lg tracking-wide uppercase">{title}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="text-white/40" size={18} />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
// METRIC ROW — for detailed metric sections
// ═══════════════════════════════════════════════════════

const MetricRow = ({ label, value, accuracy, description }: {
    label: string; value: string | number; accuracy: AccuracyLevel; description?: string;
}) => (
    <motion.div
        className="metric-row-interactive flex items-center justify-between py-2.5 px-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
        whileHover={{ scale: 1.015 }}
        transition={{ duration: 0.15 }}
    >
        <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm font-mono">{label}</span>
            <AccuracyBadge accuracy={accuracy} />
        </div>
        <div className="flex items-center gap-2">
            <motion.span
                key={String(value)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-white font-bold font-display text-lg tabular-nums"
            >
                {value}
            </motion.span>
            {description && (
                <span className="text-white/30 text-[10px] font-mono hidden group-hover:inline transition-all">{description}</span>
            )}
        </div>
    </motion.div>
);

// ═══════════════════════════════════════════════════════
// 3D HOVER CARD WRAPPER
// ═══════════════════════════════════════════════════════

const Hover3DCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
        className={`glass-panel p-6 rounded-3xl relative overflow-hidden group ${className}`}
        whileHover={{
            scale: 1.01,
            rotateX: 1,
            rotateY: 1,
        }}
        style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
            <div className="absolute inset-0 shadow-[0_20px_60px_rgba(139,92,246,0.2)]" />
        </div>
        <div className="relative z-10">
            {children}
        </div>
    </motion.div>
);

// ═══════════════════════════════════════════════════════
// GRAPHICAL COMPONENTS
// ═══════════════════════════════════════════════════════

// Half-circle speed gauge
const SpeedGauge = ({ value, max, label, color = "#fbbf24" }: { value: number; max: number; label: string; color?: string }) => {
    const pct = Math.min(value / max, 1);
    const r = 50;
    const circumference = Math.PI * r;
    const fill = pct * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg width={130} height={75} viewBox="0 0 130 80" className="mb-2">
                {/* Track */}
                <path d={`M 15 65 A ${r} ${r} 0 0 1 115 65`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} strokeLinecap="round" />
                {/* Fill */}
                <motion.path
                    d={`M 15 65 A ${r} ${r} 0 0 1 115 65`}
                    fill="none"
                    stroke={color}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`${fill} ${circumference}`}
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: `${fill} ${circumference}` }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                    filter="url(#glow)"
                />
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
            </svg>
            <motion.span className="text-white font-display font-black text-[26px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {value}
            </motion.span>
            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase mt-1">{label}</span>
        </div>
    );
};

// Circular progress ring
const CircularProgress = ({ value, label, color = "#fbbf24" }: { value: number; label: string; color?: string }) => {
    const r = 35;
    const circumference = 2 * Math.PI * r;
    const fill = (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg width={90} height={90} viewBox="0 0 90 90" className="mb-2">
                <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <motion.circle
                    cx={45}
                    cy={45}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - fill}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - fill }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                    transform="rotate(-90 45 45)"
                    filter="url(#glow)"
                />
                <text x={45} y={50} textAnchor="middle" className="text-white font-display font-black text-xl" fill="white">{value}%</text>
            </svg>
            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase">{label}</span>
        </div>
    );
};

// Vertical bar with glow
const VerticalBar = ({ value, max, label, color = "#10b981" }: { value: number; max: number; label: string; color?: string }) => {
    const pct = (value / max) * 100;

    return (
        <div className="flex flex-col items-center justify-end h-32">
            <motion.span className="text-white font-display font-bold text-xl mb-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {value}
            </motion.span>
            <div className="w-16 flex-1 bg-white/5 rounded-full relative overflow-hidden">
                <motion.div
                    className="absolute bottom-0 left-0 right-0 rounded-full"
                    style={{ background: `linear-gradient(0deg, ${color}, ${color}99)`, boxShadow: `0 0 15px ${color}80` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                />
            </div>
            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase mt-2">{label}</span>
        </div>
    );
};

// ══════════════════════════════════════════════════════════
// ENHANCED SERVE & RETURN COMPONENTS
// ══════════════════════════════════════════════════════════

// Dual Speed Gauge (Avg + Max)
const DualSpeedGauge = ({ avg, max, label, color = "#fbbf24" }: { avg: number; max: number; label: string; color?: string }) => {
    const avgPct = Math.min(avg / 220, 1);
    const maxPct = Math.min(max / 220, 1);
    const r = 50;
    const circumference = Math.PI * r;

    return (
        <div className="flex flex-col items-center">
            <svg width={140} height={85} viewBox="0 0 140 90" className="mb-2">
                {/* Track */}
                <path d={`M 20 70 A ${r} ${r} 0 0 1 120 70`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} strokeLinecap="round" />
                {/* Max Fill (lighter) */}
                <motion.path
                    d={`M 20 70 A ${r} ${r} 0 0 1 120 70`}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={`${maxPct * circumference} ${circumference}`}
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: `${maxPct * circumference} ${circumference}` }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                    opacity={0.4}
                />
                {/* Avg Fill (brighter) */}
                <motion.path
                    d={`M 20 70 A ${r} ${r} 0 0 1 120 70`}
                    fill="none"
                    stroke={color}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`${avgPct * circumference} ${circumference}`}
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: `${avgPct * circumference} ${circumference}` }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                    filter="url(#glow)"
                />
            </svg>
            <div className="flex gap-4 items-center">
                <div className="text-center">
                    <motion.span className="text-white font-display font-black text-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        {avg}
                    </motion.span>
                    <p className="text-white/40 text-[10px] font-mono">AVG</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                    <motion.span className="text-white/60 font-display font-bold text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                        {max}
                    </motion.span>
                    <p className="text-white/30 text-[10px] font-mono">MAX</p>
                </div>
            </div>
            <span className="text-white/70 text-[13px] font-mono font-semibold uppercase mt-1">{label}</span>
        </div>
    );
};

// Serve Percentage Bars (1st/2nd)
const ServePctBars = ({ first, second }: { first: number; second: number }) => {
    return (
        <div className="space-y-3">
            {/* 1st Serve */}
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-white/60 text-xs font-mono">1ST SERVE</span>
                    <span className="text-emerald-400 font-bold text-sm">{first}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${first}%` }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                        style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}
                    />
                </div>
            </div>
            {/* 2nd Serve */}
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-white/60 text-xs font-mono">2ND SERVE</span>
                    <span className="text-cyan-400 font-bold text-sm">{second}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${second}%` }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                        style={{ boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}
                    />
                </div>
            </div>
        </div>
    );
};

// Ace Split Display (1st/2nd)
const AceSplit = ({ total, first, second, color = "#06b6d4" }: { total: number; first: number; second: number; color?: string }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-3 border border-white/10"
        >
            <div className="text-center mb-2">
                <motion.span
                    className="text-white font-display font-black text-3xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                    style={{ color }}
                >
                    {total}
                </motion.span>
                <p className="text-white/70 text-xs font-mono uppercase mt-1">Total Aces</p>
            </div>
            <div className="flex gap-2 justify-center">
                <div className="bg-white/5 px-2 py-1 rounded">
                    <span className="text-emerald-400 text-xs font-bold">{first}</span>
                    <span className="text-white/40 text-[9px] ml-1">1st</span>
                </div>
                <div className="bg-white/5 px-2 py-1 rounded">
                    <span className="text-cyan-400 text-xs font-bold">{second}</span>
                    <span className="text-white/40 text-[9px] ml-1">2nd</span>
                </div>
            </div>
        </motion.div>
    );
};

// Serve Type Pie Chart (Flat/Spin/Slice)
const ServeTypePie = ({ flat, spin, slice }: { flat: number; spin: number; slice: number }) => {
    const total = flat + spin + slice || 1;
    const flatPct = (flat / total) * 100;
    const spinPct = (spin / total) * 100;
    const slicePct = (slice / total) * 100;

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
                <svg width={60} height={60} viewBox="0 0 60 60">
                    <motion.circle
                        cx={30}
                        cy={30}
                        r={25}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={8}
                        strokeDasharray={`${flatPct * 1.57} 157`}
                        initial={{ strokeDasharray: "0 157" }}
                        animate={{ strokeDasharray: `${flatPct * 1.57} 157` }}
                        transition={{ duration: 1 }}
                        transform="rotate(-90 30 30)"
                    />
                    <motion.circle
                        cx={30}
                        cy={30}
                        r={25}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth={8}
                        strokeDasharray={`${spinPct * 1.57} 157`}
                        strokeDashoffset={-flatPct * 1.57}
                        initial={{ strokeDasharray: "0 157" }}
                        animate={{ strokeDasharray: `${spinPct * 1.57} 157` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        transform="rotate(-90 30 30)"
                    />
                    <motion.circle
                        cx={30}
                        cy={30}
                        r={25}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth={8}
                        strokeDasharray={`${slicePct * 1.57} 157`}
                        strokeDashoffset={-(flatPct + spinPct) * 1.57}
                        initial={{ strokeDasharray: "0 157" }}
                        animate={{ strokeDasharray: `${slicePct * 1.57} 157` }}
                        transition={{ duration: 1, delay: 0.4 }}
                        transform="rotate(-90 30 30)"
                    />
                </svg>
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 font-mono flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                            Flat
                        </span>
                        <span className="text-xs text-white font-bold">{Math.round(flatPct)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 font-mono flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                            Spin
                        </span>
                        <span className="text-xs text-white font-bold">{Math.round(spinPct)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60 font-mono flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                            Slice
                        </span>
                        <span className="text-xs text-white font-bold">{Math.round(slicePct)}%</span>
                    </div>
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-[9px] text-amber-400/60 font-mono uppercase text-center flex items-center justify-center gap-1">
                    <AlertCircle size={10} />
                    AI-Estimated
                </p>
            </div>
        </div>
    );
};

// Return Stat Card (Success/Errors)
const ReturnStatCard = ({ value, label, sublabel, color, isPercentage = false }: { value: number; label: string; sublabel?: string; color: string; isPercentage?: boolean }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-3 border border-white/10"
        >
            <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <motion.span
                    className="text-white font-display font-black text-2xl block"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    style={{ color }}
                >
                    {value}{isPercentage ? '%' : ''}
                </motion.span>
                <p className="text-white/70 text-xs font-mono uppercase mt-1">{label}</p>
                {sublabel && <p className="text-white/40 text-[9px] font-mono">{sublabel}</p>}
            </motion.div>
        </motion.div>
    );
};

// Placement Indicator (Court directions)
const PlacementIndicator = ({ deep, short, wide }: { deep: number; short: number; wide: number }) => {
    const total = deep + short + wide || 1;
    return (
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-3 border border-white/10">
            <p className="text-white/60 text-xs font-mono uppercase mb-2 text-center">Return Placement</p>
            <div className="flex justify-around items-center">
                <div className="text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-1">
                        <span className="text-emerald-400 text-xs font-bold">{Math.round((deep / total) * 100)}</span>
                    </div>
                    <span className="text-[9px] text-white/50 font-mono">Deep</span>
                </div>
                <div className="text-center">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mb-1">
                        <span className="text-amber-400 text-xs font-bold">{Math.round((short / total) * 100)}</span>
                    </div>
                    <span className="text-[9px] text-white/50 font-mono">Short</span>
                </div>
                <div className="text-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center mb-1">
                        <span className="text-purple-400 text-xs font-bold">{Math.round((wide / total) * 100)}</span>
                    </div>
                    <span className="text-[9px] text-white/50 font-mono">Wide</span>
                </div>
            </div>
        </div>
    );
};

// Net Clearance Bar
const NetClearanceBar = ({ avgHeight, label }: { avgHeight: number; label?: string }) => {
    const pct = Math.min((avgHeight / 2) * 100, 100); // Assuming 2m is max
    return (
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-3 border border-white/10">
            <div className="flex justify-between mb-2">
                <span className="text-white/60 text-xs font-mono uppercase">{label || 'Net Clearance'}</span>
                <span className="text-cyan-400 font-bold text-sm">{avgHeight}m</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                    style={{ boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}
                />
            </div>
            <p className="text-[9px] text-white/40 font-mono mt-1 text-center">Approximate</p>
        </div>
    );
};


// Dual horizontal bars (FH/BH comparison)
const DualBar = ({ label, p1Value, p2Value, p1Label, p2Label, p1Color = "#FACC15", p2Color = "#22D3EE" }: any) => {
    const total = Math.max(p1Value + p2Value, 1);
    const p1Pct = (p1Value / total) * 100;
    const p2Pct = (p2Value / total) * 100;

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-[15px] font-mono font-semibold uppercase">{label}</span>
                <div className="flex gap-3 text-sm font-mono">
                    <span className="text-white/60">{p1Label}: <span className="text-white font-bold">{p1Value}</span></span>
                    <span className="text-white/60">{p2Label}: <span className="text-white font-bold">{p2Value}</span></span>
                </div>
            </div>
            <div className="flex gap-1 h-3">
                <motion.div
                    className="rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p1Color}, ${p1Color}99)`, boxShadow: `0 0 10px ${p1Color}60` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p1Pct}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.div
                    className="rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p2Color}99, ${p2Color})`, boxShadow: `0 0 10px ${p2Color}60` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p2Pct}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
// MOMENTUM CHART
// ═══════════════════════════════════════════════════════

const MomentumChart = ({ data, player1Name, player2Name }: any) => {
    const chartData = data && data.length > 0 ? data : [
        { pointIndex: 1, dominanceIndex: 0 },
        { pointIndex: 50, dominanceIndex: 30 },
        { pointIndex: 100, dominanceIndex: -20 },
        { pointIndex: 150, dominanceIndex: 50 }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-panel glass-panel-hover p-6 rounded-3xl h-full flex flex-col relative overflow-hidden group hover-glow-cyan"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-white font-display font-bold mb-4 flex items-center gap-2 shrink-0">
                    <TrendingUp className="text-[#06b6d4]" size={20} />
                    <span className="text-gradient-gold">MATCH MOMENTUM</span>
                    <AccuracyBadge accuracy="ADVANCED" />
                </h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="matchMomentumGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="pointIndex" hide />
                            <YAxis hide domain={[-100, 100]} />
                            <Tooltip
                                content={({ active, payload }: any) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const val = payload[0].value as number;
                                    return (
                                        <div className="bg-black/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-3 shadow-xl max-w-[220px]">
                                            <p className="text-cyan-400 text-xs font-mono font-bold">
                                                Momentum: {val > 0 ? '+' : ''}{val}
                                            </p>
                                            <p className="text-white/40 text-[9px] font-mono mt-1.5 leading-relaxed">
                                                = (Winners × 2) − Errors + (BP Won × 3) + Rally Dominance
                                            </p>
                                        </div>
                                    );
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="dominanceIndex"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#matchMomentumGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/30 mt-2 shrink-0">
                    <span>{player2Name || 'PLAYER 2'} DOMINANT</span>
                    <span>NEUTRAL</span>
                    <span>{player1Name || 'PLAYER 1'} DOMINANT</span>
                </div>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
// SERVE ANALYSIS
// ═══════════════════════════════════════════════════════

const ServeAnalysis = ({ p1, p2, selectedPlayer = 'all' }: any) => {
    const data = [
        { name: '1st Serve %', p1: p1.firstServePercentage, p2: p2.firstServePercentage },
        { name: 'Win % (1st)', p1: p1.winPercentageFirstServe, p2: p2.winPercentageFirstServe },
        { name: 'Win % (2nd)', p1: p1.winPercentageSecondServe, p2: p2.winPercentageSecondServe },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-panel glass-panel-hover p-6 rounded-3xl h-full group hover-glow-gold"
        >
            <h3 className="text-white font-display font-bold mb-6 flex items-center gap-2">
                <Zap className="text-[#fbbf24]" size={20} />
                <span className="text-gradient-gold">SERVE PERFORMANCE</span>
            </h3>
            <div className="h-[200px] w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#FFFFFF60', fontSize: 11 }} />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                        />
                        {selectedPlayer !== 'player2' && <Bar dataKey="p1" name={p1.name} fill="#fbbf24" radius={[0, 8, 8, 0]} barSize={12} />}
                        {selectedPlayer !== 'player1' && <Bar dataKey="p2" name={p2.name} fill="#06b6d4" radius={[0, 8, 8, 0]} barSize={12} />}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-[10px] font-mono text-white/60">
                {selectedPlayer !== 'player2' && (
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-1.5 bg-[#fbbf24] rounded-full" /> {p1.name}
                    </div>
                )}
                {selectedPlayer !== 'player1' && (
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-1.5 bg-[#06b6d4] rounded-full" /> {p2.name}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
// MATCH WINNER BANNER
// ═══════════════════════════════════════════════════════

const MatchWinnerBanner = ({ data }: { data: MatchAnalytics }) => {
    const p1Sets = data.sets?.filter(s => s.player1Score > s.player2Score).length || 0;
    const p2Sets = data.sets?.filter(s => s.player2Score > s.player1Score).length || 0;
    const winner = p1Sets > p2Sets ? data.players.player1.name : p2Sets > p1Sets ? data.players.player2.name : null;
    const score = data.sets?.map(s => `${s.player1Score}-${s.player2Score}`).join(' / ') || `${p1Sets} - ${p2Sets}`;
    console.log('test')
    if (!winner) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#fbbf24]/10 via-[#f59e0b]/5 to-transparent border border-[#fbbf24]/20 backdrop-blur-sm flex items-center gap-4"
        >
            <div className="p-3 rounded-xl bg-[#fbbf24]/20">
                <Trophy className="text-[#fbbf24]" size={28} />
            </div>
            <div>
                <p className="text-[10px] font-mono text-[#fbbf24]/60 uppercase tracking-widest">MATCH WINNER</p>
                <p className="text-2xl font-black font-display text-white">{winner}</p>
            </div>
            <div className="ml-auto text-right">
                <p className="text-white/40 text-xs font-mono">FINAL SCORE</p>
                <p className="text-xl font-bold text-white font-display">{score}</p>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function AnalyticsView({ data, selectedSport }: AnalyticsViewProps) {
    const [shotFilters, setShotFilters] = useState<ShotFilterState>(DEFAULT_FILTERS);
    const [selectedPlayer, setSelectedPlayer] = useState<'all' | 'player1' | 'player2'>('all');

    // ─── Combine BOTH players' shots ───────────────────
    const allShots = useMemo(() => {
        const p1 = data.heatmaps?.player1 || [];
        const p2 = data.heatmaps?.player2 || [];
        return [...p1, ...p2];
    }, [data.heatmaps]);

    // ─── Filter by selected player ─────────────────────
    const visibleShots = useMemo(() => {
        if (selectedPlayer === 'all') return allShots;
        return allShots.filter(s => s.playerId === selectedPlayer);
    }, [allShots, selectedPlayer]);

    // ─── Derived Metrics from Engine ───────────────────
    const derivedMetrics = useMemo(() => {
        const p1Shots = data.heatmaps?.player1 || [];
        return {
            serveSpeed: computeServeSpeed(p1Shots, 'player1'),
            servePercentages: computeServePercentages(p1Shots, 'player1'),
            servePercentagesFirstPct: computeServePercentages(p1Shots, 'player1').first.value,
            aces: computeAces(p1Shots, 'player1'),
            doubleFaultRate: computeDoubleFaultRate(p1Shots, 'player1'),
            servePlus1: computeServePlus1(allShots, 'player1'),
            returnAggression: computeReturnAggressionIndex(allShots, 'player1'),
            shotTolerance: computeShotToleranceIndex(p1Shots, 'player1'),
            baselineVsNet: computeBaselineVsNet(p1Shots, 'player1'),
            winnersErrors: computeWinnersErrorsByType(p1Shots, 'player1'),
            directionBias: computeDirectionBias(p1Shots, 'player1'),
            sprintCount: computeSprintCount(data.movementData?.player1),
            spinMetrics: computeSpinMetrics(p1Shots, 'player1'),
            rallyWinLoss: computeRallyWinLoss(allShots, 'player1'),
            responseDelay: computeResponseDelayIndex(allShots, 'player1'),
            baselineVsNetWinPct: computeBaselineVsNetWinPct(p1Shots, 'player1'),
            movementHeatmap: computeMovementHeatmap(p1Shots, 'player1'),
            explosiveBursts: computeExplosiveBursts(p1Shots, 'player1'),
            movementEfficiency: computeMovementEfficiency(p1Shots, data.movementData?.player1 || { playerId: 'player1', totalDistance: 0, avgSpeed: 0, maxSpeed: 0, courtCoverage: 0, sprintCount: 0 }, 'player1'),
        };
    }, [data.heatmaps, allShots, data.movementData]);

    // ─── Player 2 Metrics ──────────────────────────────
    const p2Metrics = useMemo(() => {
        const p2Shots = data.heatmaps?.player2 || [];
        return {
            serveSpeed: computeServeSpeed(p2Shots, 'player2'),
            servePercentages: computeServePercentages(p2Shots, 'player2'),
            aces: computeAces(p2Shots, 'player2'),
            doubleFaultRate: computeDoubleFaultRate(p2Shots, 'player2'),
            servePlus1: computeServePlus1(allShots, 'player2'),
            returnAggression: computeReturnAggressionIndex(allShots, 'player2'),
            shotTolerance: computeShotToleranceIndex(p2Shots, 'player2'),
            baselineVsNet: computeBaselineVsNet(p2Shots, 'player2'),
            winnersErrors: computeWinnersErrorsByType(p2Shots, 'player2'),
            directionBias: computeDirectionBias(p2Shots, 'player2'),
            sprintCount: computeSprintCount(data.movementData?.player2),
            spinMetrics: computeSpinMetrics(p2Shots, 'player2'),
            rallyWinLoss: computeRallyWinLoss(allShots, 'player2'),
            responseDelay: computeResponseDelayIndex(allShots, 'player2'),
            baselineVsNetWinPct: computeBaselineVsNetWinPct(p2Shots, 'player2'),
            movementHeatmap: computeMovementHeatmap(p2Shots, 'player2'),
            explosiveBursts: computeExplosiveBursts(p2Shots, 'player2'),
            movementEfficiency: computeMovementEfficiency(p2Shots, data.movementData?.player2 || { playerId: 'player2', totalDistance: 0, avgSpeed: 0, maxSpeed: 0, courtCoverage: 0, sprintCount: 0 }, 'player2'),
        };
    }, [data.heatmaps, allShots, data.movementData]);

    // ─── Composite Momentum ────────────────────────────
    const compositeMomentum = useMemo(() => {
        return computeCompositeMomentum(data.momentum, allShots);
    }, [data.momentum, allShots]);

    // ─── Advanced Match Intelligence ──────────────────
    const advancedIntelligence = useMemo(() => {
        return computeAdvancedIntelligence(data);
    }, [data]);

    // ─── Top-row stats for Tennis ──────────────────────
    const getSportConfig = (sport: string) => {
        switch (sport) {
            case 'cricket':
                return [
                    { key: 'maxSpeed', label: 'Strike Rate', sub: 'Runs/100 Balls', icon: Zap, color: 'text-[#fbbf24]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'aces', label: 'Sixes', sub: 'Maximums', icon: Trophy, color: 'text-[#06b6d4]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'unforcedErrors', label: 'Dot Balls', sub: 'Pressure', icon: AlertCircle, color: 'text-[#ef4444]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'winners', label: 'Boundaries', sub: 'Fours', icon: Activity, color: 'text-[#10b981]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'distanceCovered', label: 'Running', sub: 'Between Wickets', icon: Target, color: 'text-[#8b5cf6]', accuracy: 'ESTIMATED' as AccuracyLevel },
                ];
            case 'football':
                return [
                    { key: 'maxSpeed', label: 'Top Speed', sub: 'KM/H', icon: Zap, color: 'text-[#fbbf24]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'aces', label: 'Goals', sub: 'Scored', icon: Trophy, color: 'text-[#06b6d4]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'unforcedErrors', label: 'Turnovers', sub: 'Possession Lost', icon: AlertCircle, color: 'text-[#ef4444]', accuracy: 'MEDIUM' as AccuracyLevel },
                    { key: 'winners', label: 'Shots on Target', sub: 'Accuracy', icon: Activity, color: 'text-[#10b981]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'distanceCovered', label: 'Distance', sub: 'KM Covered', icon: Target, color: 'text-[#8b5cf6]', accuracy: 'HIGH' as AccuracyLevel },
                ];
            case 'pickleball':
                return [
                    { key: 'maxSpeed', label: 'Response Delay', sub: 'Reaction Index', icon: Zap, color: 'text-[#fbbf24]', accuracy: 'ESTIMATED' as AccuracyLevel },
                    { key: 'aces', label: 'Aces', sub: 'Serve Points', icon: Trophy, color: 'text-[#06b6d4]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'unforcedErrors', label: 'Kitchen Faults', sub: 'NVZ Violations', icon: AlertCircle, color: 'text-[#ef4444]', accuracy: 'HIGH' as AccuracyLevel },
                    { key: 'winners', label: 'Dink Winners', sub: 'Placement', icon: Activity, color: 'text-[#10b981]', accuracy: 'ESTIMATED' as AccuracyLevel },
                    { key: 'distanceCovered', label: 'Court Coverage', sub: 'Lateral Movement', icon: Target, color: 'text-[#8b5cf6]', accuracy: 'ESTIMATED' as AccuracyLevel },
                ];
            case 'tennis':
            default: {
                // Use active player's metrics based on selection
                const m = selectedPlayer === 'player2' ? p2Metrics : derivedMetrics;
                return [
                    {
                        key: '_derived_maxServe',
                        label: 'Max Serve',
                        sub: `Avg: ${m.serveSpeed.avg.value} KM/H`,
                        icon: Gauge,
                        color: 'text-[#fbbf24]',
                        accuracy: m.serveSpeed.max.meta.accuracy,
                        derivedValue: `${m.serveSpeed.max.value} KM/H`,
                    },
                    {
                        key: '_derived_aces',
                        label: 'Aces',
                        sub: `DF: ${m.doubleFaultRate.value}%`,
                        icon: Trophy,
                        color: 'text-[#06b6d4]',
                        accuracy: m.aces.meta.accuracy,
                        derivedValue: m.aces.value,
                    },
                    {
                        key: 'unforcedErrors',
                        label: 'Unforced Err',
                        sub: `Tolerance: ${m.shotTolerance.value}`,
                        icon: AlertCircle,
                        color: 'text-[#ef4444]',
                        accuracy: 'HIGH' as AccuracyLevel,
                    },
                    {
                        key: 'winners',
                        label: 'Winners',
                        sub: `Serve+1: ${m.servePlus1.value}%`,
                        icon: Activity,
                        color: 'text-[#10b981]',
                        accuracy: m.servePlus1.meta.accuracy,
                    },
                    {
                        key: 'distanceCovered',
                        label: 'Distance',
                        sub: `BL/Net: ${(m.baselineVsNet.value as any).baseline}%/${(m.baselineVsNet.value as any).net}%`,
                        icon: Target,
                        color: 'text-[#8b5cf6]',
                        accuracy: m.baselineVsNet.meta.accuracy,
                    },
                ];
            }
        }
    };

    const stats = getSportConfig(selectedSport);
    // Use selected player's data for stat cards
    const activePlayer = selectedPlayer === 'player2' ? data.players.player2 : data.players.player1;

    const getValue = (key: string, stat: any) => {
        if (stat.derivedValue !== undefined) return stat.derivedValue;
        return (activePlayer as any)[key] || 0;
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 relative">
            {/* Match Winner Banner */}
            <MatchWinnerBanner data={data} />

            {/* Enhanced Header */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row justify-between items-end mb-8 pb-6 relative"
            >
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <motion.span
                            whileHover={{ scale: 1.05 }}
                            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-black text-xs font-bold font-mono shadow-lg cursor-default"
                        >
                            {data.tournament.name}
                        </motion.span>
                        <motion.span
                            whileHover={{ scale: 1.05 }}
                            className="px-4 py-1.5 rounded-full glass-panel text-white/80 text-xs font-mono border border-white/20 cursor-default"
                        >
                            {selectedSport.toUpperCase()} • {data.tournament.round}
                        </motion.span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-display text-white uppercase leading-tight tracking-tight">
                        <span className="text-gradient">{data.players.player1.name}</span>
                        {' '}
                        <span className="text-white/20">VS</span>
                        {' '}
                        <span className="text-gradient">{data.players.player2.name}</span>
                    </h1>
                </div>
                <div className="text-right md:mt-0 mt-6">
                    <p className="text-white/40 font-mono text-sm mb-1 flex items-center gap-2 justify-end">
                        <Sparkles size={14} className="text-[#fbbf24]" />
                        MATCH DURATION
                    </p>
                    <p className="text-3xl font-black text-white font-display">{data.duration}</p>
                </div>
            </motion.div>

            {/* Player Selector */}
            <div className="flex gap-2 mb-6">
                {(['all', 'player1', 'player2'] as const).map(opt => (
                    <button
                        key={opt}
                        onClick={() => setSelectedPlayer(opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${selectedPlayer === opt
                            ? 'bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24]'
                            : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                            }`}
                    >
                        {opt === 'all' ? 'Both Players' : opt === 'player1' ? data.players.player1.name : data.players.player2.name}
                    </button>
                ))}
            </div>

            {/* Bento Grid: Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[minmax(200px,auto)]">

                {/* Row 1: Key Stats — COMMENTED OUT
                <StatCard index={0} title={stats[0].label} value={getValue(stats[0].key, stats[0])} subtext={stats[0].sub} icon={stats[0].icon} color={stats[0].color} accuracy={stats[0].accuracy} />
                <StatCard index={1} title={stats[1].label} value={getValue(stats[1].key, stats[1])} subtext={stats[1].sub} icon={stats[1].icon} color={stats[1].color} accuracy={stats[1].accuracy} />
                <StatCard index={2} title={stats[2].label} value={getValue(stats[2].key, stats[2])} subtext={stats[2].sub} icon={stats[2].icon} color={stats[2].color} accuracy={stats[2].accuracy} />
                <StatCard index={3} title={stats[3].label} value={getValue(stats[3].key, stats[3])} subtext={stats[3].sub} icon={stats[3].icon} color={stats[3].color} accuracy={stats[3].accuracy} />
                <div className="md:col-span-2 h-full">
                    <StatCard index={4} title={stats[4].label} value={selectedSport === 'football' ? `${getValue(stats[4].key, stats[4]) / 1000}km` : `${getValue(stats[4].key, stats[4])}m`} subtext={stats[4].sub} icon={stats[4].icon} color={stats[4].color} accuracy={stats[4].accuracy} />
                </div>
                */}

                {/* Row 2-3: 3D Court + Momentum */}
                <div className="md:col-span-3 md:row-span-2">
                    <div className="glass-panel p-0 rounded-3xl h-full overflow-hidden">
                        {/* Section title */}
                        <div className="px-5 pt-5 pb-3">
                            <h3 className="text-white font-display font-bold flex items-center gap-2">
                                <span className="text-gradient">3D COURT ANALYSIS</span>
                            </h3>
                        </div>
                        <div className="flex flex-col lg:flex-row h-[calc(100%-52px)]">
                            {/* Left sidebar — Player filter + Legend */}
                            <div className="w-full lg:w-[180px] flex-shrink-0 px-4 pb-4 lg:pb-4 lg:border-r border-white/[0.06] space-y-4">
                                {/* Player Filter */}
                                <div>
                                    <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2">Player Filter</p>
                                    <div className="space-y-1.5">
                                        {([
                                            { key: 'all' as const, label: 'All Players', color: '#fbbf24' },
                                            { key: 'player1' as const, label: data.players.player1.name, color: '#fbbf24' },
                                            { key: 'player2' as const, label: data.players.player2.name, color: '#06b6d4' },
                                        ]).map(opt => (
                                            <button key={opt.key} onClick={() => setSelectedPlayer(opt.key)}
                                                className={`w-full px-3 py-2 rounded-lg text-[12px] font-bold transition-all text-left flex items-center gap-2 ${selectedPlayer === opt.key
                                                    ? 'bg-white/15 text-white border border-white/20 shadow-inner'
                                                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                                                    }`}>
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color, boxShadow: `0 0 6px ${opt.color}50` }} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Shot Legend */}
                                <div>
                                    <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2">Shot Legend</p>
                                    <div className="space-y-1.5 text-[11px] font-bold text-white/60">
                                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] shadow-lg shadow-yellow-500/50" /> Winner</span>
                                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-lg shadow-red-500/50" /> Error</span>
                                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-lg shadow-green-500/50" /> In</span>
                                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316] shadow-lg shadow-orange-500/50" /> Out</span>
                                    </div>
                                </div>
                                {/* Visible Shots Count */}
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <p className="text-white/40 text-[10px] font-mono uppercase mb-1">Visible Shots</p>
                                    <p className="text-2xl font-black text-white">{visibleShots.length}</p>
                                </div>
                            </div>
                            {/* 3D Court */}
                            <div className="flex-1 relative h-[550px]">
                                <Court3D
                                    shots={visibleShots}
                                    sport={selectedSport}
                                    filters={shotFilters}
                                    selectedPlayer={selectedPlayer}
                                    player1Name={data.players.player1.name}
                                    player2Name={data.players.player2.name}
                                    onFilterChange={setShotFilters}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-3 md:row-span-2">
                    <MomentumChart
                        data={compositeMomentum.length > 0 ? compositeMomentum : data.momentum}
                        player1Name={data.players.player1.name}
                        player2Name={data.players.player2.name}
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                INTERACTIVE METRIC SECTIONS (Tennis)
               ═══════════════════════════════════════════════════════ */}
            {selectedSport === 'tennis' && (
                <>
                    {/* ═══ SERVE & RETURN — COMPREHENSIVE ENHANCED PANEL ═══ */}
                    <Hover3DCard className="mt-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#fbbf24]/20 to-[#f59e0b]/10">
                                <Zap size={20} className="text-[#fbbf24]" />
                            </div>
                            <h3 className="text-2xl font-black font-display uppercase tracking-wide text-white">Serve & Return Analytics</h3>
                        </div>

                        <div className={`grid grid-cols-1 ${selectedPlayer === 'all' ? 'md:grid-cols-2' : ''} gap-10 relative`}>
                            {/* ═══════════════ PLAYER 1 ═══════════════ */}
                            {selectedPlayer !== 'player2' && (
                                <div className="relative space-y-6">
                                    {/* Player Name */}
                                    <div className="mb-6">
                                        <p className="text-white font-display font-black text-lg leading-tight">{data.players.player1.name}</p>
                                        <div className="h-0.5 w-12 rounded-full mt-1" style={{ background: 'linear-gradient(90deg, #FACC15, transparent)' }} />
                                    </div>

                                    {/* ──── SERVE SECTION ──── */}
                                    <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 rounded-2xl p-5 space-y-4">
                                        <h4 className="text-amber-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                            <Zap size={14} />
                                            Serve Metrics
                                        </h4>

                                        {/* Speed Gauge (Avg + Max) */}
                                        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                                            <DualSpeedGauge
                                                avg={derivedMetrics.serveSpeed.avg.value}
                                                max={derivedMetrics.serveSpeed.max.value}
                                                label="SERVE SPEED (KM/H)"
                                                color="#fbbf24"
                                            />
                                        </motion.div>

                                        {/* 1st/2nd Serve % */}
                                        <ServePctBars
                                            first={derivedMetrics.servePercentages.first.value}
                                            second={derivedMetrics.servePercentages.second.value}
                                        />

                                        {/* Bottom Grid: Aces, DF%, Serve+1, Serve Type */}
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <AceSplit
                                                total={derivedMetrics.aces.value}
                                                first={Math.round(derivedMetrics.aces.value * 0.7)}
                                                second={Math.round(derivedMetrics.aces.value * 0.3)}
                                                color="#06b6d4"
                                            />
                                            <ReturnStatCard
                                                value={derivedMetrics.doubleFaultRate.value}
                                                label="Double Faults"
                                                sublabel="Percentage"
                                                color="#ef4444"
                                                isPercentage
                                            />
                                            <ReturnStatCard
                                                value={derivedMetrics.servePlus1.value}
                                                label="Serve+1"
                                                sublabel="Success Rate"
                                                color="#8b5cf6"
                                                isPercentage
                                            />
                                            <ServeTypePie
                                                flat={40}
                                                spin={35}
                                                slice={25}
                                            />
                                        </div>
                                    </div>

                                    {/* ──── RETURN SECTION ──── */}
                                    <div className="bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/10 rounded-2xl p-5 space-y-4">
                                        <h4 className="text-cyan-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                            <Target size={14} />
                                            Return Metrics
                                        </h4>

                                        <div className="grid grid-cols-2 gap-3">
                                            <ReturnStatCard
                                                value={75}
                                                label="Return Success"
                                                sublabel="In Play %"
                                                color="#10b981"
                                                isPercentage
                                            />
                                            <ReturnStatCard
                                                value={18}
                                                label="Return Errors"
                                                sublabel="Forced + UE"
                                                color="#ef4444"
                                                isPercentage
                                            />
                                        </div>

                                        <PlacementIndicator deep={45} short={30} wide={25} />
                                        <NetClearanceBar avgHeight={0.8} label="Avg Net Clearance" />

                                        {/* Aggression Index */}
                                        <motion.div
                                            className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10"
                                            whileHover={{ scale: 1.02, borderColor: 'rgba(250, 204, 21, 0.3)' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/70 text-xs font-mono font-semibold uppercase tracking-wide flex items-center gap-2">
                                                    <Gauge size={14} />
                                                    Return Aggression
                                                </span>
                                                <span className="text-amber-400 font-display font-black text-2xl">{derivedMetrics.returnAggression.value}</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            )}

                            {/* Visual Divider */}
                            {selectedPlayer === 'all' && (
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent hidden md:block" />
                            )}

                            {/* ═══════════════ PLAYER 2 ═══════════════ */}
                            {selectedPlayer !== 'player1' && (
                                <div className="relative space-y-6">
                                    {/* Player Name */}
                                    <div className="mb-6">
                                        <p className="text-white font-display font-black text-lg leading-tight">{data.players.player2.name}</p>
                                        <div className="h-0.5 w-12 rounded-full mt-1" style={{ background: 'linear-gradient(90deg, #22D3EE, transparent)' }} />
                                    </div>

                                    {/* ──── SERVE SECTION ──── */}
                                    <div className="bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/10 rounded-2xl p-5 space-y-4">
                                        <h4 className="text-cyan-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                            <Zap size={14} />
                                            Serve Metrics
                                        </h4>

                                        {/* Speed Gauge (Avg + Max) */}
                                        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                                            <DualSpeedGauge
                                                avg={p2Metrics.serveSpeed.avg.value}
                                                max={p2Metrics.serveSpeed.max.value}
                                                label="SERVE SPEED (KM/H)"
                                                color="#22D3EE"
                                            />
                                        </motion.div>

                                        {/* 1st/2nd Serve % */}
                                        <ServePctBars
                                            first={p2Metrics.servePercentages.first.value}
                                            second={p2Metrics.servePercentages.second.value}
                                        />

                                        {/* Bottom Grid: Aces, DF%, Serve+1, Serve Type */}
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <AceSplit
                                                total={p2Metrics.aces.value}
                                                first={Math.round(p2Metrics.aces.value * 0.65)}
                                                second={Math.round(p2Metrics.aces.value * 0.35)}
                                                color="#06b6d4"
                                            />
                                            <ReturnStatCard
                                                value={p2Metrics.doubleFaultRate.value}
                                                label="Double Faults"
                                                sublabel="Percentage"
                                                color="#ef4444"
                                                isPercentage
                                            />
                                            <ReturnStatCard
                                                value={p2Metrics.servePlus1.value}
                                                label="Serve+1"
                                                sublabel="Success Rate"
                                                color="#8b5cf6"
                                                isPercentage
                                            />
                                            <ServeTypePie
                                                flat={35}
                                                spin={40}
                                                slice={25}
                                            />
                                        </div>
                                    </div>

                                    {/* ──── RETURN SECTION ──── */}
                                    <div className="bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10 rounded-2xl p-5 space-y-4">
                                        <h4 className="text-purple-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                            <Target size={14} />
                                            Return Metrics
                                        </h4>

                                        <div className="grid grid-cols-2 gap-3">
                                            <ReturnStatCard
                                                value={72}
                                                label="Return Success"
                                                sublabel="In Play %"
                                                color="#10b981"
                                                isPercentage
                                            />
                                            <ReturnStatCard
                                                value={22}
                                                label="Return Errors"
                                                sublabel="Forced + UE"
                                                color="#ef4444"
                                                isPercentage
                                            />
                                        </div>

                                        <PlacementIndicator deep={40} short={35} wide={25} />
                                        <NetClearanceBar avgHeight={0.9} label="Avg Net Clearance" />

                                        {/* Aggression Index */}
                                        <motion.div
                                            className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10"
                                            whileHover={{ scale: 1.02, borderColor: 'rgba(34, 211, 238, 0.3)' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/70 text-xs font-mono font-semibold uppercase tracking-wide flex items-center gap-2">
                                                    <Gauge size={14} />
                                                    Return Aggression
                                                </span>
                                                <span className="text-cyan-400 font-display font-black text-2xl">{p2Metrics.returnAggression.value}</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Hover3DCard>

                    {/* ═══ RALLY & STROKE — Enhanced Panel ═══ */}
                    <Hover3DCard className="mt-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#059669]/10">
                                <Crosshair size={20} className="text-[#10b981]" />
                            </div>
                            <h3 className="text-2xl font-black font-display uppercase tracking-wide text-white">Rally & Stroke</h3>
                        </div>

                        <div className={`grid grid-cols-1 ${selectedPlayer === 'all' ? 'md:grid-cols-2' : ''} gap-12 relative`}>
                            {selectedPlayer !== 'player2' && (
                                <div className="relative">
                                    {/* Player Name */}
                                    <div className="mb-4">
                                        <p className="text-white font-display font-black text-base leading-tight">{data.players.player1.name}</p>
                                        <div className="h-0.5 w-10 rounded-full mt-1" style={{ background: 'linear-gradient(90deg, #FACC15, transparent)' }} />
                                    </div>

                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-4">
                                        <DualBar
                                            label="Winners"
                                            p1Value={derivedMetrics.winnersErrors.value?.forehand?.winners ?? 0}
                                            p2Value={derivedMetrics.winnersErrors.value?.backhand?.winners ?? 0}
                                            p1Label="FH"
                                            p2Label="BH"
                                            p1Color="#FACC15"
                                            p2Color="#06b6d4"
                                        />
                                    </motion.div>

                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-6">
                                        <DualBar
                                            label="Errors"
                                            p1Value={derivedMetrics.winnersErrors.value?.forehand?.errors ?? 0}
                                            p2Value={derivedMetrics.winnersErrors.value?.backhand?.errors ?? 0}
                                            p1Label="FH"
                                            p2Label="BH"
                                            p1Color="#ef4444"
                                            p2Color="#f97316"
                                        />
                                    </motion.div>

                                    {/* Volley / Drop / Lob Breakdown */}
                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-4">
                                        <DualBar
                                            label="Volley W/E"
                                            p1Value={derivedMetrics.winnersErrors.value?.volley?.winners ?? 0}
                                            p2Value={derivedMetrics.winnersErrors.value?.volley?.errors ?? 0}
                                            p1Label="Win"
                                            p2Label="Err"
                                            p1Color="#8b5cf6"
                                            p2Color="#ef4444"
                                        />
                                    </motion.div>

                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-6">
                                        <DualBar
                                            label="Drop/Lob W/E"
                                            p1Value={(derivedMetrics.winnersErrors.value?.drop?.winners ?? 0) + (derivedMetrics.winnersErrors.value?.lob?.winners ?? 0)}
                                            p2Value={(derivedMetrics.winnersErrors.value?.drop?.errors ?? 0) + (derivedMetrics.winnersErrors.value?.lob?.errors ?? 0)}
                                            p1Label="Win"
                                            p2Label="Err"
                                            p1Color="#10b981"
                                            p2Color="#f97316"
                                        />
                                    </motion.div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <motion.div
                                            className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                            whileHover={{ scale: 1.05, borderColor: 'rgba(250, 204, 21, 0.3)' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase block mb-3 tracking-wide">Direction Bias</span>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <span className="text-white/50 text-sm font-mono block mb-1">FH</span>
                                                    <span className="text-white font-display font-black text-3xl">{(derivedMetrics.directionBias.value as any).forehand}%</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-white/50 text-sm font-mono block mb-1">BH</span>
                                                    <span className="text-white font-display font-black text-3xl">{(derivedMetrics.directionBias.value as any).backhand}%</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                            whileHover={{ scale: 1.05, borderColor: 'rgba(250, 204, 21, 0.3)' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase block mb-3 tracking-wide">Shot Tolerance</span>
                                            <span className="text-white font-display font-black text-4xl block mt-2">{advancedIntelligence.shotToleranceIndex.player1.avgTolerance}</span>
                                        </motion.div>
                                    </div>

                                    {/* Rally Win/Loss — Donut Chart */}
                                    <motion.div
                                        className="mt-5 p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                        whileHover={{ scale: 1.02, borderColor: 'rgba(250, 204, 21, 0.3)' }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-white text-[16px] font-display font-bold uppercase tracking-wide">Rally Win/Loss</span>
                                            <span className="text-[#FACC15] font-display font-black text-xl">{(derivedMetrics.rallyWinLoss.value as any).winPct}% <span className="text-white/50 text-xs font-semibold">WIN</span></span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {/* Donut Chart */}
                                            <div className="relative flex-shrink-0">
                                                <svg width={130} height={130} viewBox="0 0 130 130">
                                                    {(() => {
                                                        const buckets = (derivedMetrics.rallyWinLoss.value as any).buckets;
                                                        const entries = Object.entries(buckets) as [string, any][];
                                                        const totalAll = entries.reduce((s, [, d]) => s + d.wins + d.losses, 0) || 1;
                                                        const r = 48, cx = 65, cy = 65, gap = 0.04;
                                                        const circumference = 2 * Math.PI * r;
                                                        const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'];
                                                        let offset = -0.25 * circumference;
                                                        return entries.map(([range, d], i) => {
                                                            const total = d.wins + d.losses;
                                                            const pct = total / totalAll;
                                                            const arcLen = Math.max(pct * circumference - gap * circumference, 0);
                                                            const el = (
                                                                <circle key={range} cx={cx} cy={cy} r={r} fill="none"
                                                                    stroke={colors[i]} strokeWidth={14} strokeLinecap="round"
                                                                    strokeDasharray={`${arcLen} ${circumference - arcLen}`}
                                                                    strokeDashoffset={-offset}
                                                                    style={{ filter: `drop-shadow(0 0 6px ${colors[i]}40)`, transition: 'all 0.8s ease' }} />
                                                            );
                                                            offset += pct * circumference;
                                                            return el;
                                                        });
                                                    })()}
                                                    <circle cx={65} cy={65} r={34} fill="rgba(15,15,30,0.8)" />
                                                    <text x={65} y={58} textAnchor="middle" fill="white" fontSize={22} fontWeight={900} fontFamily="var(--font-display)">
                                                        {(derivedMetrics.rallyWinLoss.value as any).winPct}%
                                                    </text>
                                                    <text x={65} y={76} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10} fontWeight={600} fontFamily="monospace">
                                                        WIN RATE
                                                    </text>
                                                </svg>
                                            </div>
                                            {/* Legend */}
                                            <div className="flex-1 space-y-2.5">
                                                {(() => {
                                                    const buckets = (derivedMetrics.rallyWinLoss.value as any).buckets;
                                                    const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'];
                                                    const labels = ['Short (1-3)', 'Medium (4-6)', 'Long (7-9)', 'Extended (10+)'];
                                                    return Object.entries(buckets).map(([range, d]: [string, any], i) => (
                                                        <div key={range} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-sm" style={{ background: colors[i] }} />
                                                                <span className="text-white/80 text-[13px] font-semibold">{labels[i]}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-emerald-400 text-[13px] font-display font-bold">{d.wins}W</span>
                                                                <span className="text-white/20">/</span>
                                                                <span className="text-red-400 text-[13px] font-display font-bold">{d.losses}L</span>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Spin Metrics — Radar Chart */}
                                    <motion.div
                                        className="mt-5 p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                        whileHover={{ scale: 1.02, borderColor: 'rgba(250, 204, 21, 0.3)' }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-white text-[16px] font-display font-bold uppercase tracking-wide">Spin Metrics</span>
                                            <span className="text-amber-400 text-[11px] font-mono font-semibold uppercase">⚡ Estimated</span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {/* Radar */}
                                            <div className="relative flex-shrink-0">
                                                <svg width={150} height={150} viewBox="0 0 150 150">
                                                    {(() => {
                                                        const types = ['forehand', 'backhand', 'serve', 'volley', 'smash'] as const;
                                                        const cx = 75, cy = 75, maxR = 55;
                                                        const n = types.length;
                                                        const angleStep = (2 * Math.PI) / n;
                                                        const spinData = (derivedMetrics.spinMetrics.value as any);
                                                        const maxSpin = Math.max(...types.map(t => spinData.byType[t]?.maxSpin || 0), 3000);
                                                        // Grid rings
                                                        const rings = [0.25, 0.5, 0.75, 1].map(s => {
                                                            const pts = types.map((_, i) => {
                                                                const a = -Math.PI / 2 + i * angleStep;
                                                                return `${cx + maxR * s * Math.cos(a)},${cy + maxR * s * Math.sin(a)}`;
                                                            }).join(' ');
                                                            return <polygon key={s} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />;
                                                        });
                                                        // Axes
                                                        const axes = types.map((_, i) => {
                                                            const a = -Math.PI / 2 + i * angleStep;
                                                            return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />;
                                                        });
                                                        // Data polygon
                                                        const dataPts = types.map((t, i) => {
                                                            const val = spinData.byType[t]?.avgSpin || 0;
                                                            const pct = Math.min(val / maxSpin, 1);
                                                            const a = -Math.PI / 2 + i * angleStep;
                                                            return `${cx + maxR * pct * Math.cos(a)},${cy + maxR * pct * Math.sin(a)}`;
                                                        }).join(' ');
                                                        // Labels
                                                        const labelNames = ['FH', 'BH', 'SRV', 'VOL', 'SMH'];
                                                        const labels = types.map((_, i) => {
                                                            const a = -Math.PI / 2 + i * angleStep;
                                                            const lx = cx + (maxR + 14) * Math.cos(a);
                                                            const ly = cy + (maxR + 14) * Math.sin(a);
                                                            return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.7)" fontSize={10} fontWeight={700} fontFamily="monospace">{labelNames[i]}</text>;
                                                        });
                                                        return (
                                                            <>
                                                                {rings}{axes}
                                                                <polygon points={dataPts} fill="rgba(250,204,21,0.15)" stroke="#FACC15" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.3))' }} />
                                                                {types.map((t, i) => {
                                                                    const val = spinData.byType[t]?.avgSpin || 0;
                                                                    const pct = Math.min(val / maxSpin, 1);
                                                                    const a = -Math.PI / 2 + i * angleStep;
                                                                    return <circle key={t} cx={cx + maxR * pct * Math.cos(a)} cy={cy + maxR * pct * Math.sin(a)} r={3.5} fill="#FACC15" stroke="white" strokeWidth={1.5} />;
                                                                })}
                                                                {labels}
                                                            </>
                                                        );
                                                    })()}
                                                </svg>
                                            </div>
                                            {/* Stats */}
                                            <div className="flex-1 space-y-2">
                                                <div className="text-center mb-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                                                    <p className="text-white/60 text-[11px] font-mono font-bold uppercase tracking-wider mb-1">Overall Avg</p>
                                                    <p className="text-white font-display font-black text-3xl">{(derivedMetrics.spinMetrics.value as any).overallAvg}<span className="text-white/50 text-sm font-semibold ml-1">RPM</span></p>
                                                </div>
                                                {['forehand', 'backhand', 'serve', 'volley'].map(type => {
                                                    const d = (derivedMetrics.spinMetrics.value as any).byType[type];
                                                    const fullNames: Record<string, string> = { forehand: 'Forehand', backhand: 'Backhand', serve: 'Serve', volley: 'Volley' };
                                                    return (
                                                        <div key={type} className="flex items-center justify-between py-1">
                                                            <span className="text-white/70 text-[13px] font-semibold">{fullNames[type]}</span>
                                                            <span className="text-white font-display font-bold text-[14px]">{d?.avgSpin || 0} <span className="text-white/40 text-[10px]">rpm</span></span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* Visual Divider */}
                            {selectedPlayer === 'all' && (
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent hidden md:block" />
                            )}

                            {selectedPlayer !== 'player1' && (
                                <div className="relative">
                                    {/* Player Name */}
                                    <div className="mb-4">
                                        <p className="text-white font-display font-black text-base leading-tight">{data.players.player2.name}</p>
                                        <div className="h-0.5 w-10 rounded-full mt-1" style={{ background: 'linear-gradient(90deg, #22D3EE, transparent)' }} />
                                    </div>

                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-4">
                                        <DualBar
                                            label="Winners"
                                            p1Value={p2Metrics.winnersErrors.value?.forehand?.winners ?? 0}
                                            p2Value={p2Metrics.winnersErrors.value?.backhand?.winners ?? 0}
                                            p1Label="FH"
                                            p2Label="BH"
                                            p1Color="#FACC15"
                                            p2Color="#06b6d4"
                                        />
                                    </motion.div>

                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-6">
                                        <DualBar
                                            label="Errors"
                                            p1Value={p2Metrics.winnersErrors.value?.forehand?.errors ?? 0}
                                            p2Value={p2Metrics.winnersErrors.value?.backhand?.errors ?? 0}
                                            p1Label="FH"
                                            p2Label="BH"
                                            p1Color="#ef4444"
                                            p2Color="#f97316"
                                        />
                                    </motion.div>

                                    {/* Volley / Drop / Lob Breakdown */}
                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-4">
                                        <DualBar
                                            label="Volley W/E"
                                            p1Value={p2Metrics.winnersErrors.value?.volley?.winners ?? 0}
                                            p2Value={p2Metrics.winnersErrors.value?.volley?.errors ?? 0}
                                            p1Label="Win"
                                            p2Label="Err"
                                            p1Color="#8b5cf6"
                                            p2Color="#ef4444"
                                        />
                                    </motion.div>

                                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="mb-6">
                                        <DualBar
                                            label="Drop/Lob W/E"
                                            p1Value={(p2Metrics.winnersErrors.value?.drop?.winners ?? 0) + (p2Metrics.winnersErrors.value?.lob?.winners ?? 0)}
                                            p2Value={(p2Metrics.winnersErrors.value?.drop?.errors ?? 0) + (p2Metrics.winnersErrors.value?.lob?.errors ?? 0)}
                                            p1Label="Win"
                                            p2Label="Err"
                                            p1Color="#10b981"
                                            p2Color="#f97316"
                                        />
                                    </motion.div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <motion.div
                                            className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                            whileHover={{ scale: 1.05, borderColor: 'rgba(34, 211, 238, 0.3)' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase block mb-3 tracking-wide">Direction Bias</span>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <span className="text-white/50 text-sm font-mono block mb-1">FH</span>
                                                    <span className="text-white font-display font-black text-3xl">{(p2Metrics.directionBias.value as any).forehand}%</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-white/50 text-sm font-mono block mb-1">BH</span>
                                                    <span className="text-white font-display font-black text-3xl">{(p2Metrics.directionBias.value as any).backhand}%</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                            whileHover={{ scale: 1.05, borderColor: 'rgba(34, 211, 238, 0.3)' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="text-white/70 text-[15px] font-mono font-semibold uppercase block mb-3 tracking-wide">Shot Tolerance</span>
                                            <span className="text-white font-display font-black text-4xl block mt-2">{advancedIntelligence.shotToleranceIndex.player2.avgTolerance}</span>
                                        </motion.div>
                                    </div>

                                    {/* Rally Win/Loss — Donut Chart */}
                                    <motion.div
                                        className="mt-5 p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                        whileHover={{ scale: 1.02, borderColor: 'rgba(34, 211, 238, 0.3)' }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-white text-[16px] font-display font-bold uppercase tracking-wide">Rally Win/Loss</span>
                                            <span className="text-[#22D3EE] font-display font-black text-xl">{(p2Metrics.rallyWinLoss.value as any).winPct}% <span className="text-white/50 text-xs font-semibold">WIN</span></span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {/* Donut Chart */}
                                            <div className="relative flex-shrink-0">
                                                <svg width={130} height={130} viewBox="0 0 130 130">
                                                    {(() => {
                                                        const buckets = (p2Metrics.rallyWinLoss.value as any).buckets;
                                                        const entries = Object.entries(buckets) as [string, any][];
                                                        const totalAll = entries.reduce((s, [, d]) => s + d.wins + d.losses, 0) || 1;
                                                        const r = 48, cx = 65, cy = 65, gap = 0.04;
                                                        const circumference = 2 * Math.PI * r;
                                                        const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'];
                                                        let offset = -0.25 * circumference;
                                                        return entries.map(([range, d], i) => {
                                                            const total = d.wins + d.losses;
                                                            const pct = total / totalAll;
                                                            const arcLen = Math.max(pct * circumference - gap * circumference, 0);
                                                            const el = (
                                                                <circle key={range} cx={cx} cy={cy} r={r} fill="none"
                                                                    stroke={colors[i]} strokeWidth={14} strokeLinecap="round"
                                                                    strokeDasharray={`${arcLen} ${circumference - arcLen}`}
                                                                    strokeDashoffset={-offset}
                                                                    style={{ filter: `drop-shadow(0 0 6px ${colors[i]}40)`, transition: 'all 0.8s ease' }} />
                                                            );
                                                            offset += pct * circumference;
                                                            return el;
                                                        });
                                                    })()}
                                                    <circle cx={65} cy={65} r={34} fill="rgba(15,15,30,0.8)" />
                                                    <text x={65} y={58} textAnchor="middle" fill="white" fontSize={22} fontWeight={900} fontFamily="var(--font-display)">
                                                        {(p2Metrics.rallyWinLoss.value as any).winPct}%
                                                    </text>
                                                    <text x={65} y={76} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10} fontWeight={600} fontFamily="monospace">
                                                        WIN RATE
                                                    </text>
                                                </svg>
                                            </div>
                                            {/* Legend */}
                                            <div className="flex-1 space-y-2.5">
                                                {(() => {
                                                    const buckets = (p2Metrics.rallyWinLoss.value as any).buckets;
                                                    const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'];
                                                    const labels = ['Short (1-3)', 'Medium (4-6)', 'Long (7-9)', 'Extended (10+)'];
                                                    return Object.entries(buckets).map(([range, d]: [string, any], i) => (
                                                        <div key={range} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-sm" style={{ background: colors[i] }} />
                                                                <span className="text-white/80 text-[13px] font-semibold">{labels[i]}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-emerald-400 text-[13px] font-display font-bold">{d.wins}W</span>
                                                                <span className="text-white/20">/</span>
                                                                <span className="text-red-400 text-[13px] font-display font-bold">{d.losses}L</span>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Spin Metrics — Radar Chart */}
                                    <motion.div
                                        className="mt-5 p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                                        whileHover={{ scale: 1.02, borderColor: 'rgba(34, 211, 238, 0.3)' }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-white text-[16px] font-display font-bold uppercase tracking-wide">Spin Metrics</span>
                                            <span className="text-amber-400 text-[11px] font-mono font-semibold uppercase">⚡ Estimated</span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {/* Radar */}
                                            <div className="relative flex-shrink-0">
                                                <svg width={150} height={150} viewBox="0 0 150 150">
                                                    {(() => {
                                                        const types = ['forehand', 'backhand', 'serve', 'volley', 'smash'] as const;
                                                        const cx = 75, cy = 75, maxR = 55;
                                                        const n = types.length;
                                                        const angleStep = (2 * Math.PI) / n;
                                                        const spinData = (p2Metrics.spinMetrics.value as any);
                                                        const maxSpin = Math.max(...types.map(t => spinData.byType[t]?.maxSpin || 0), 3000);
                                                        // Grid rings
                                                        const rings = [0.25, 0.5, 0.75, 1].map(s => {
                                                            const pts = types.map((_, i) => {
                                                                const a = -Math.PI / 2 + i * angleStep;
                                                                return `${cx + maxR * s * Math.cos(a)},${cy + maxR * s * Math.sin(a)}`;
                                                            }).join(' ');
                                                            return <polygon key={s} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />;
                                                        });
                                                        // Axes
                                                        const axes = types.map((_, i) => {
                                                            const a = -Math.PI / 2 + i * angleStep;
                                                            return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />;
                                                        });
                                                        // Data polygon
                                                        const dataPts = types.map((t, i) => {
                                                            const val = spinData.byType[t]?.avgSpin || 0;
                                                            const pct = Math.min(val / maxSpin, 1);
                                                            const a = -Math.PI / 2 + i * angleStep;
                                                            return `${cx + maxR * pct * Math.cos(a)},${cy + maxR * pct * Math.sin(a)}`;
                                                        }).join(' ');
                                                        // Labels
                                                        const labelNames = ['FH', 'BH', 'SRV', 'VOL', 'SMH'];
                                                        const labels = types.map((_, i) => {
                                                            const a = -Math.PI / 2 + i * angleStep;
                                                            const lx = cx + (maxR + 14) * Math.cos(a);
                                                            const ly = cy + (maxR + 14) * Math.sin(a);
                                                            return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.7)" fontSize={10} fontWeight={700} fontFamily="monospace">{labelNames[i]}</text>;
                                                        });
                                                        return (
                                                            <>
                                                                {rings}{axes}
                                                                <polygon points={dataPts} fill="rgba(34,211,238,0.15)" stroke="#22D3EE" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.3))' }} />
                                                                {types.map((t, i) => {
                                                                    const val = spinData.byType[t]?.avgSpin || 0;
                                                                    const pct = Math.min(val / maxSpin, 1);
                                                                    const a = -Math.PI / 2 + i * angleStep;
                                                                    return <circle key={t} cx={cx + maxR * pct * Math.cos(a)} cy={cy + maxR * pct * Math.sin(a)} r={3.5} fill="#22D3EE" stroke="white" strokeWidth={1.5} />;
                                                                })}
                                                                {labels}
                                                            </>
                                                        );
                                                    })()}
                                                </svg>
                                            </div>
                                            {/* Stats */}
                                            <div className="flex-1 space-y-2">
                                                <div className="text-center mb-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                                                    <p className="text-white/60 text-[11px] font-mono font-bold uppercase tracking-wider mb-1">Overall Avg</p>
                                                    <p className="text-white font-display font-black text-3xl">{(p2Metrics.spinMetrics.value as any).overallAvg}<span className="text-white/50 text-sm font-semibold ml-1">RPM</span></p>
                                                </div>
                                                {['forehand', 'backhand', 'serve', 'volley'].map(type => {
                                                    const d = (p2Metrics.spinMetrics.value as any).byType[type];
                                                    const fullNames: Record<string, string> = { forehand: 'Forehand', backhand: 'Backhand', serve: 'Serve', volley: 'Volley' };
                                                    return (
                                                        <div key={type} className="flex items-center justify-between py-1">
                                                            <span className="text-white/70 text-[13px] font-semibold">{fullNames[type]}</span>
                                                            <span className="text-white font-display font-bold text-[14px]">{d?.avgSpin || 0} <span className="text-white/40 text-[10px]">rpm</span></span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </Hover3DCard>


                    {/* ═══ ADVANCED MATCH INTELLIGENCE ═══ */}
                    <AdvancedMatchIntelligence
                        data={advancedIntelligence}
                        player1Name={data.players.player1.name}
                        player2Name={data.players.player2.name}
                        selectedPlayer={selectedPlayer}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════════════════
                VISUAL CHARTS (all sports)
               ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-6 auto-rows-[minmax(200px,auto)]">
                {/* Movement + Player Comparison */}
                <motion.div className="md:col-span-6" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <MovementAnalytics
                        player1={data.movementData?.player1 || { playerId: 'player1', totalDistance: 0, avgSpeed: 0, maxSpeed: 0, courtCoverage: 0, sprintCount: 0 }}
                        player2={data.movementData?.player2 || { playerId: 'player2', totalDistance: 0, avgSpeed: 0, maxSpeed: 0, courtCoverage: 0, sprintCount: 0 }}
                        player1Name={data.players.player1.name}
                        player2Name={data.players.player2.name}
                        selectedPlayer={selectedPlayer}
                        baselineVsNet={derivedMetrics.baselineVsNet.value as any}
                        p2BaselineVsNet={p2Metrics.baselineVsNet.value as any}
                        sprintCount={derivedMetrics.sprintCount.value as number}
                        p2SprintCount={p2Metrics.sprintCount.value as number}
                        responseDelay={derivedMetrics.responseDelay.value as any}
                        p2ResponseDelay={p2Metrics.responseDelay.value as any}
                        baselineVsNetWinPct={derivedMetrics.baselineVsNetWinPct.value as any}
                        p2BaselineVsNetWinPct={p2Metrics.baselineVsNetWinPct.value as any}
                        movementHeatmap={derivedMetrics.movementHeatmap?.value as any}
                        p2MovementHeatmap={p2Metrics.movementHeatmap?.value as any}
                        explosiveBursts={derivedMetrics.explosiveBursts?.value as any}
                        p2ExplosiveBursts={p2Metrics.explosiveBursts?.value as any}
                        movementEfficiency={derivedMetrics.movementEfficiency?.value as any}
                        p2MovementEfficiency={p2Metrics.movementEfficiency?.value as any}
                        shots={allShots}
                    />
                </motion.div>
                {/* PlayerComparison (Head to Head) — COMMENTED OUT
                {selectedPlayer === 'all' && (
                    <motion.div className="md:col-span-6" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <PlayerComparison
                            player1={data.players.player1}
                            player2={data.players.player2}
                        />
                    </motion.div>
                )}
                */}

                {/* Rally + Break Points + Serve */}
                <motion.div className="md:col-span-2" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}><RallyDistributionChart data={data.rallyDistribution} /></motion.div>
                <motion.div className="md:col-span-2" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                    <BreakPointAnalysis
                        player1={data.breakPoints.player1}
                        player2={data.breakPoints.player2}
                        player1Name={data.players.player1.name}
                        player2Name={data.players.player2.name}
                        selectedPlayer={selectedPlayer}
                    />
                </motion.div>
                <div className="md:col-span-2"><ServeAnalysis p1={data.players.player1} p2={data.players.player2} selectedPlayer={selectedPlayer} /></div>

                {/* Shot Type Distribution */}
                {selectedPlayer !== 'player2' && (
                    <motion.div className={selectedPlayer === 'all' ? 'md:col-span-3' : 'md:col-span-6'} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}><ShotTypeChart data={data.shotTypeDistribution.player1} playerName={data.players.player1.name} /></motion.div>
                )}
                {selectedPlayer !== 'player1' && (
                    <motion.div className={selectedPlayer === 'all' ? 'md:col-span-3' : 'md:col-span-6'} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}><ShotTypeChart data={data.shotTypeDistribution.player2} playerName={data.players.player2.name} /></motion.div>
                )}
            </div>
        </div>
    );
}
