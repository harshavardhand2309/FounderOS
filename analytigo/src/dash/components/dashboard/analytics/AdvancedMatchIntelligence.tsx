
import { AdvancedIntelligenceData } from "@/utils/advancedIntelligenceEngine";
import { motion, animate } from "framer-motion";
import { TrendingUp, Target, Activity, Crosshair, Shield, Waves, Info } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface AdvancedMatchIntelligenceProps {
    data: AdvancedIntelligenceData;
    player1Name: string;
    player2Name: string;
    selectedPlayer?: 'all' | 'player1' | 'player2';
}

const P1_COLOR = '#FACC15';
const P2_COLOR = '#22D3EE';
const P1_GRADIENT = ['#FACC15', '#F59E0B'];
const P2_GRADIENT = ['#22D3EE', '#06B6D4'];

// ── Animated Counter ──
const AnimatedCounter = ({ value, suffix = '', prefix = '', decimals = 0 }: {
    value: number; suffix?: string; prefix?: string; decimals?: number;
}) => {
    const [display, setDisplay] = useState('0');
    useEffect(() => {
        const control = animate(0, value, {
            duration: 1.2,
            ease: [0.25, 0.46, 0.45, 0.94],
            onUpdate: (v) => setDisplay(decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()),
        });
        return () => control.stop();
    }, [value, decimals]);
    return <span>{prefix}{display}{suffix}</span>;
};

// ── Accuracy Badge ──
const AccuracyBadge = ({ level }: { level: 'HIGH' | 'MEDIUM' | 'ESTIMATED' }) => {
    const config = {
        HIGH: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
        ESTIMATED: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    };
    const c = config[level];
    return (
        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${c.bg} ${c.text} ${c.border}`}>
            {level}
        </span>
    );
};

// ── Player Label (matching Head-to-Head) ──
const PlayerLabel = ({ name, color }: { name: string; color: string }) => (
    <div className="mb-1.5">
        <p className="text-white font-display font-black text-base leading-tight">{name}</p>
        <div className="h-0.5 w-10 rounded-full mt-1"
            style={{
                background: color === P1_COLOR
                    ? `linear-gradient(90deg, ${P1_COLOR}, transparent)`
                    : `linear-gradient(90deg, ${P2_COLOR}, transparent)`
            }} />
    </div>
);

// ── Intelligence Card Wrapper ──
const IntelCard = ({ icon: Icon, iconColor, glowColor, title, accuracy, delay = 0, children }: {
    icon: any; iconColor: string; glowColor: string; title: string;
    accuracy: 'HIGH' | 'MEDIUM' | 'ESTIMATED'; delay?: number; children: React.ReactNode;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02, y: -4, boxShadow: `0 8px 24px ${glowColor}` }}
        viewport={{ once: true }}
        transition={{ duration: 0.25, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="intel-card group"
    >
        <div className="intel-card-glow" style={{ background: `radial-gradient(circle, ${glowColor}, transparent)` }} />
        <AccuracyBadge level={accuracy} />
        <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg" style={{ background: `${glowColor}22` }}>
                <Icon className={iconColor} size={16} />
            </div>
            <span className="text-white/80 text-xs font-mono font-bold uppercase tracking-wider">{title}</span>
        </div>
        <div className="relative z-10">{children}</div>
    </motion.div>
);

/* ═══════════════════════════════════════════════════════
   CHART COMPONENTS
   ═══════════════════════════════════════════════════════ */

// ── Circular Progress Ring ──
const ProgressRing = ({ value, max = 100, color, size = 90, strokeWidth = 8, label }: {
    value: number; max?: number; color: string; size?: number; strokeWidth?: number; label?: string;
}) => {
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const pct = Math.min(value / max, 1);
        const timer = setTimeout(() => setOffset(circumference - pct * circumference), 100);
        return () => clearTimeout(timer);
    }, [value, max, circumference]);

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size} className="-rotate-90">
                <defs>
                    <linearGradient id={`ring-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="1" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.5" />
                    </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={`url(#ring-${color.replace('#', '')})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)', filter: `drop-shadow(0 0 6px ${color}60)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white font-display tabular-nums">
                    <AnimatedCounter value={value} />
                </span>
                {label && <span className="text-[9px] text-white/50 font-mono font-bold uppercase">{label}</span>}
            </div>
        </div>
    );
};

// ── Donut Chart for Error Pattern ──
const DonutChart = ({ segments, size = 100, strokeWidth = 14 }: {
    segments: { value: number; color: string; label: string }[];
    size?: number; strokeWidth?: number;
}) => {
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

    let cumulative = 0;
    const arcs = segments.map((seg) => {
        const pct = seg.value / total;
        const dashLen = pct * circumference;
        const dashGap = circumference - dashLen;
        const offset = -(cumulative / total) * circumference;
        cumulative += seg.value;
        return { ...seg, dashLen, dashGap, offset, pct };
    });

    const [hovered, setHovered] = useState<string | null>(null);

    return (
        <div className="relative flex items-center gap-3">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
                {arcs.map((arc, idx) => (
                    <motion.circle
                        key={arc.label}
                        cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke={arc.color}
                        strokeWidth={hovered === arc.label ? strokeWidth + 4 : strokeWidth}
                        strokeLinecap="butt"
                        strokeDasharray={`${arc.dashLen} ${arc.dashGap}`}
                        strokeDashoffset={arc.offset}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: idx * 0.15 }}
                        style={{ filter: `drop-shadow(0 0 4px ${arc.color}50)`, cursor: 'pointer' }}
                        onMouseEnter={() => setHovered(arc.label)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </svg>
            {/* Legend */}
            <div className="flex flex-col gap-1">
                {arcs.map(a => (
                    <motion.div
                        key={a.label}
                        className="flex items-center gap-1.5 cursor-pointer"
                        onMouseEnter={() => setHovered(a.label)}
                        onMouseLeave={() => setHovered(null)}
                        animate={{ scale: hovered === a.label ? 1.05 : 1, x: hovered === a.label ? 3 : 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: a.color, boxShadow: hovered === a.label ? `0 0 8px ${a.color}` : 'none' }} />
                        <span className="text-[11px] text-white/70 font-mono font-bold">{a.label}</span>
                        <span className="text-sm font-black font-display tabular-nums" style={{ color: a.color }}>
                            {a.value}%
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// ── Semi-Arc Gauge for Shot Tolerance ──
const ArcGauge = ({ value, max = 10, color, label }: { value: number; max?: number; color: string; label?: string }) => {
    const size = 110;
    const sw = 10;
    const r = (size - sw) / 2;
    const startAngle = -210;
    const endAngle = 30;
    const totalArc = endAngle - startAngle; // 240 degrees
    const circumference = (totalArc / 360) * 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const timer = setTimeout(() => setOffset(circumference - pct * circumference), 100);
        return () => clearTimeout(timer);
    }, [pct, circumference]);

    const dashArray = `${circumference} ${2 * Math.PI * r - circumference}`;
    const rotation = startAngle;

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.75}`}>
                <defs>
                    <linearGradient id={`arc-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="1" />
                    </linearGradient>
                </defs>
                {/* Track */}
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={sw} strokeLinecap="round"
                    strokeDasharray={dashArray}
                    transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                />
                {/* Fill */}
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={`url(#arc-${color.replace('#', '')})`}
                    strokeWidth={sw} strokeLinecap="round"
                    strokeDasharray={`${circumference - offset} ${2 * Math.PI * r - (circumference - offset)}`}
                    transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.25,0.46,0.45,0.94)', filter: `drop-shadow(0 0 6px ${color}50)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 6 }}>
                <span className="text-2xl font-black text-white font-display tabular-nums">
                    <AnimatedCounter value={value} decimals={1} />
                </span>
                {label && <span className="text-[9px] text-white/50 font-mono font-bold">{label}</span>}
            </div>
        </div>
    );
};

// ── Radar Chart for Direction Bias ──
const RadarChart = ({ data, color, size = 110 }: {
    data: { label: string; value: number }[];
    color: string; size?: number;
}) => {
    const cx = size / 2, cy = size / 2;
    const maxR = size / 2 - 16;
    const n = data.length;
    const angleStep = (2 * Math.PI) / n;

    // Grid rings
    const rings = [0.25, 0.5, 0.75, 1.0];

    // Points
    const points = data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = (d.value / 100) * maxR;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), label: d.label, value: d.value, angle };
    });
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    // Label positions — pushed out further to make room for value text
    const labelPoints = data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = maxR + 14;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), label: d.label, value: d.value, angle };
    });

    return (
        <svg width={size} height={size} className="overflow-visible">
            {/* Grid */}
            {rings.map((ring, i) => (
                <polygon
                    key={i}
                    points={Array.from({ length: n }, (_, j) => {
                        const angle = j * angleStep - Math.PI / 2;
                        const r = ring * maxR;
                        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                    }).join(' ')}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                />
            ))}
            {/* Axes */}
            {data.map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}
            {/* Filled area */}
            <motion.path
                d={pathD}
                fill={`${color}20`}
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ transformOrigin: `${cx}px ${cy}px`, filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
            {/* Data points */}
            {points.map((p, i) => (
                <motion.circle
                    key={i} cx={p.x} cy={p.y} r="4"
                    fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
            ))}
            {/* Labels with values */}
            {labelPoints.map((p, i) => {
                // Determine text-anchor based on position
                const isLeft = p.x < cx - 5;
                const isRight = p.x > cx + 5;
                const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
                return (
                    <g key={i}>
                        <text x={p.x} y={p.y - 5} textAnchor={anchor} dominantBaseline="middle"
                            className="fill-white/70 text-[9px] font-mono font-bold"
                        >
                            {p.label}
                        </text>
                        <text x={p.x} y={p.y + 6} textAnchor={anchor} dominantBaseline="middle"
                            fill={color} className="text-[10px] font-mono font-black"
                        >
                            {p.value}%
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// ── Vertical Gauge for Pressure Index ──
const PressureGauge = ({ value, color, trend }: { value: number; color: string; trend: string }) => {
    const isPositive = value >= 0;
    const gaugeColor = isPositive ? '#10B981' : '#EF4444';
    const clampedPct = Math.min(Math.abs(value), 100) / 100;

    return (
        <div className="flex items-end gap-3">
            {/* Gauge bar */}
            <div className="relative w-5 h-[80px] bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className="absolute bottom-0 left-0 right-0 rounded-full"
                    style={{
                        background: `linear-gradient(180deg, ${gaugeColor}, ${gaugeColor}80)`,
                        boxShadow: `0 0 12px ${gaugeColor}60`,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${clampedPct * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
                {/* Tick marks */}
                {[0.25, 0.5, 0.75].map(pct => (
                    <div key={pct} className="absolute left-0 right-0 h-px bg-white/10" style={{ bottom: `${pct * 100}%` }} />
                ))}
            </div>
            {/* Value + trend */}
            <div>
                <span
                    className="text-3xl font-black font-display tabular-nums block"
                    style={{ color: gaugeColor, textShadow: `0 0 20px ${gaugeColor}60` }}
                >
                    <AnimatedCounter value={value} prefix={value > 0 ? '+' : ''} suffix="%" />
                </span>
                <div className={`rounded-md px-2 py-0.5 inline-flex text-[10px] font-mono font-black mt-1 ${isPositive ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300'
                    : 'bg-red-500/15 border border-red-500/25 text-red-300'}`}>
                    {trend}
                </div>
            </div>
        </div>
    );
};

// ── Horizontal Bar Chart for Net Clearance ──
const HBarChart = ({ items, maxVal }: { items: { label: string; value: number; color: string }[]; maxVal: number }) => (
    <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
            <div key={item.label}>
                <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[11px] text-white/70 font-mono font-bold">{item.label}</span>
                    <span className="text-sm font-black font-display tabular-nums" style={{ color: item.color }}>{item.value}m</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: `linear-gradient(90deg, ${item.color}40, ${item.color})`,
                            boxShadow: `0 0 8px ${item.color}40`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((item.value / maxVal) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: idx * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                </div>
            </div>
        ))}
    </div>
);


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function AdvancedMatchIntelligence({
    data, player1Name, player2Name, selectedPlayer = 'all',
}: AdvancedMatchIntelligenceProps) {
    const showP1 = selectedPlayer !== 'player2';
    const showP2 = selectedPlayer !== 'player1';

    // Pre-compute max net clearance for bar scaling
    const maxClearance = useMemo(() => Math.max(
        data.netClearanceTrend.player1.overallClearance,
        data.netClearanceTrend.player1.pressureClearance,
        data.netClearanceTrend.player2.overallClearance,
        data.netClearanceTrend.player2.pressureClearance,
        1
    ) * 1.2, [data]);

    return (
        <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl p-5 backdrop-blur-xl mt-6"
            style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(51,65,85,0.5) 50%, rgba(71,85,105,0.4) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20"
                >
                    <Activity className="text-violet-400" size={18} />
                </motion.div>
                <h2 className="text-lg font-bold text-white font-display tracking-wide uppercase">
                    Advanced Match Intelligence
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-transparent" />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                {/* ─── MOMENTUM INDEX — Circular Rings ─── */}
                <IntelCard icon={TrendingUp} iconColor="text-[#fbbf24]" glowColor="rgba(251,191,36,0.4)" title="Momentum Index" accuracy="MEDIUM" delay={0}>
                    <div className={`flex ${showP1 && showP2 ? 'justify-around' : 'justify-center'} items-start gap-2`}>
                        {showP1 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player1Name} color={P1_COLOR} />
                                <ProgressRing value={data.momentumIndex.player1.score} color={P1_COLOR} />
                                <div className="bg-white/5 rounded-md px-2 py-0.5 mt-1 inline-flex items-center gap-1">
                                    <span className="text-[9px] font-mono text-white/50 font-bold uppercase">Phase:</span>
                                    <span className="text-[10px] font-mono text-cyan-300 font-black">{data.dominancePhase.player1.phase}</span>
                                </div>
                            </div>
                        )}
                        {showP1 && showP2 && <div className="w-px h-24 bg-white/5 mt-4" />}
                        {showP2 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player2Name} color={P2_COLOR} />
                                <ProgressRing value={data.momentumIndex.player2.score} color={P2_COLOR} />
                                <div className="bg-white/5 rounded-md px-2 py-0.5 mt-1 inline-flex items-center gap-1">
                                    <span className="text-[9px] font-mono text-white/50 font-bold uppercase">Phase:</span>
                                    <span className="text-[10px] font-mono text-cyan-300 font-black">{data.dominancePhase.player2.phase}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </IntelCard>

                {/* ─── ERROR PATTERN — Donut Charts (horizontal) ─── */}
                <IntelCard icon={Target} iconColor="text-[#EF4444]" glowColor="rgba(239,68,68,0.4)" title="Error Pattern" accuracy="HIGH" delay={0.05}>
                    <div className={`flex ${showP1 && showP2 ? 'justify-around' : 'justify-center'} items-start gap-2`}>
                        {showP1 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player1Name} color={P1_COLOR} />
                                <DonutChart size={80} strokeWidth={12} segments={[
                                    { value: data.unforcedErrorPattern.player1.netPercent, color: '#EF4444', label: 'Net' },
                                    { value: data.unforcedErrorPattern.player1.longPercent, color: '#F97316', label: 'Long' },
                                    { value: data.unforcedErrorPattern.player1.widePercent, color: '#FACC15', label: 'Wide' },
                                ]} />
                                <div className="bg-red-500/10 border border-red-500/20 rounded-md px-1.5 py-0.5 text-[10px] font-mono mt-1">
                                    <span className="text-white/60 font-bold">R{'>'} 6: </span>
                                    <span className="text-red-300 font-black"><AnimatedCounter value={data.unforcedErrorPattern.player1.highRallyErrorsPercent} suffix="%" /></span>
                                </div>
                            </div>
                        )}
                        {showP1 && showP2 && <div className="w-px h-24 bg-white/5 mt-4" />}
                        {showP2 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player2Name} color={P2_COLOR} />
                                <DonutChart size={80} strokeWidth={12} segments={[
                                    { value: data.unforcedErrorPattern.player2.netPercent, color: '#EF4444', label: 'Net' },
                                    { value: data.unforcedErrorPattern.player2.longPercent, color: '#F97316', label: 'Long' },
                                    { value: data.unforcedErrorPattern.player2.widePercent, color: '#FACC15', label: 'Wide' },
                                ]} />
                                <div className="bg-red-500/10 border border-red-500/20 rounded-md px-1.5 py-0.5 text-[10px] font-mono mt-1">
                                    <span className="text-white/60 font-bold">R{'>'} 6: </span>
                                    <span className="text-red-300 font-black"><AnimatedCounter value={data.unforcedErrorPattern.player2.highRallyErrorsPercent} suffix="%" /></span>
                                </div>
                            </div>
                        )}
                    </div>
                </IntelCard>

                {/* ─── SHOT TOLERANCE — Arc Gauge ─── */}
                <IntelCard icon={Activity} iconColor="text-[#10b981]" glowColor="rgba(16,185,129,0.4)" title="Shot Tolerance" accuracy="HIGH" delay={0.1}>
                    <div className={`flex ${showP1 && showP2 ? 'justify-around' : 'justify-center'} items-start gap-2`}>
                        {showP1 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player1Name} color={P1_COLOR} />
                                <ArcGauge value={data.shotToleranceIndex.player1.avgTolerance} color={P1_COLOR} label="SHOTS AVG" />
                                <p className="text-emerald-300 text-[10px] font-mono font-bold text-center max-w-[120px]">{data.shotToleranceIndex.player1.breakdown}</p>
                            </div>
                        )}
                        {showP1 && showP2 && <div className="w-px h-24 bg-white/5 mt-4" />}
                        {showP2 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player2Name} color={P2_COLOR} />
                                <ArcGauge value={data.shotToleranceIndex.player2.avgTolerance} color={P2_COLOR} label="SHOTS AVG" />
                                <p className="text-emerald-300 text-[10px] font-mono font-bold text-center max-w-[120px]">{data.shotToleranceIndex.player2.breakdown}</p>
                            </div>
                        )}
                    </div>
                </IntelCard>

                {/* ─── DIRECTION BIAS — Radar Charts + Info Tooltip ─── */}
                <IntelCard icon={Crosshair} iconColor="text-[#8b5cf6]" glowColor="rgba(139,92,246,0.4)" title="Direction Bias" accuracy="HIGH" delay={0.15}>
                    {/* Info tooltip */}
                    <div className="group/info absolute top-2.5 left-2.5 z-20 cursor-pointer">
                        <Info size={14} className="text-white/30 group-hover/info:text-white/70 transition-colors" />
                        <div className="absolute left-0 top-5 w-44 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-lg p-2 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 shadow-xl z-30">
                            <div className="text-[10px] font-mono text-white/80 space-y-1">
                                <p><span className="text-violet-400 font-black">FH</span> — Forehand</p>
                                <p><span className="text-violet-400 font-black">BH</span> — Backhand</p>
                                <p><span className="text-violet-400 font-black">X-Ct</span> — Cross Court</p>
                                <p><span className="text-violet-400 font-black">DTL</span> — Down The Line</p>
                            </div>
                        </div>
                    </div>
                    <div className={`flex ${showP1 && showP2 ? 'justify-around' : 'justify-center'} items-start gap-2`}>
                        {showP1 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player1Name} color={P1_COLOR} />
                                <RadarChart
                                    data={[
                                        { label: 'FH', value: data.directionBias.player1.fhPercent },
                                        { label: 'X-Ct', value: data.directionBias.player1.crossCourtPercent },
                                        { label: 'BH', value: data.directionBias.player1.bhPercent },
                                        { label: 'DTL', value: data.directionBias.player1.downTheLinePercent },
                                    ]}
                                    color={P1_COLOR}
                                />
                            </div>
                        )}
                        {showP1 && showP2 && <div className="w-px h-24 bg-white/5 mt-4" />}
                        {showP2 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player2Name} color={P2_COLOR} />
                                <RadarChart
                                    data={[
                                        { label: 'FH', value: data.directionBias.player2.fhPercent },
                                        { label: 'X-Ct', value: data.directionBias.player2.crossCourtPercent },
                                        { label: 'BH', value: data.directionBias.player2.bhPercent },
                                        { label: 'DTL', value: data.directionBias.player2.downTheLinePercent },
                                    ]}
                                    color={P2_COLOR}
                                />
                            </div>
                        )}
                    </div>
                </IntelCard>

                {/* ─── PRESSURE INDEX — Side-by-side Gauges ─── */}
                <IntelCard icon={Shield} iconColor="text-[#06b6d4]" glowColor="rgba(6,182,212,0.4)" title="Pressure Index" accuracy="MEDIUM" delay={0.2}>
                    <div className={`flex ${showP1 && showP2 ? 'justify-around' : 'justify-center'} items-start gap-2`}>
                        {showP1 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player1Name} color={P1_COLOR} />
                                <PressureGauge
                                    value={data.pressurePerformanceIndex.player1.pressureScore}
                                    color={P1_COLOR}
                                    trend={data.pressurePerformanceIndex.player1.pressureTrend}
                                />
                            </div>
                        )}
                        {showP1 && showP2 && <div className="w-px h-24 bg-white/5 mt-4" />}
                        {showP2 && (
                            <div className="flex flex-col items-center">
                                <PlayerLabel name={player2Name} color={P2_COLOR} />
                                <PressureGauge
                                    value={data.pressurePerformanceIndex.player2.pressureScore}
                                    color={P2_COLOR}
                                    trend={data.pressurePerformanceIndex.player2.pressureTrend}
                                />
                            </div>
                        )}
                    </div>
                </IntelCard>

                {/* ─── NET CLEARANCE — Side-by-side Bar Charts ─── */}
                <IntelCard icon={Waves} iconColor="text-[#f59e0b]" glowColor="rgba(245,158,11,0.4)" title="Net Clearance" accuracy="MEDIUM" delay={0.25}>
                    <div className={`flex ${showP1 && showP2 ? 'gap-3' : 'justify-center'} items-start`}>
                        {showP1 && (
                            <div className="flex-1 min-w-0">
                                <PlayerLabel name={player1Name} color={P1_COLOR} />
                                <HBarChart
                                    items={[
                                        { label: 'Overall', value: data.netClearanceTrend.player1.overallClearance, color: P1_COLOR },
                                        { label: 'Pressure', value: data.netClearanceTrend.player1.pressureClearance, color: '#F97316' },
                                    ]}
                                    maxVal={maxClearance}
                                />
                                <div className={`mt-1.5 rounded-md px-2 py-0.5 inline-flex text-[10px] font-mono font-black ${data.netClearanceTrend.player1.percentDrop < 0 ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'}`}>
                                    Δ {data.netClearanceTrend.player1.percentDrop > 0 ? '+' : ''}{data.netClearanceTrend.player1.percentDrop}%
                                </div>
                            </div>
                        )}
                        {showP1 && showP2 && <div className="w-px self-stretch bg-white/5" />}
                        {showP2 && (
                            <div className="flex-1 min-w-0">
                                <PlayerLabel name={player2Name} color={P2_COLOR} />
                                <HBarChart
                                    items={[
                                        { label: 'Overall', value: data.netClearanceTrend.player2.overallClearance, color: P2_COLOR },
                                        { label: 'Pressure', value: data.netClearanceTrend.player2.pressureClearance, color: '#F97316' },
                                    ]}
                                    maxVal={maxClearance}
                                />
                                <div className={`mt-1.5 rounded-md px-2 py-0.5 inline-flex text-[10px] font-mono font-black ${data.netClearanceTrend.player2.percentDrop < 0 ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'}`}>
                                    Δ {data.netClearanceTrend.player2.percentDrop > 0 ? '+' : ''}{data.netClearanceTrend.player2.percentDrop}%
                                </div>
                            </div>
                        )}
                    </div>
                </IntelCard>
            </div>
        </motion.section>
    );
}
