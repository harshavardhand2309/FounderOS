
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MovementData, ShotData } from '@/types/analytics';
import { Footprints, Zap, Gauge, Maximize2, MapPin, Activity, BarChart3, Eye, Filter, Layers } from 'lucide-react';

interface Props {
    player1: MovementData;
    player2: MovementData;
    player1Name: string;
    player2Name: string;
    selectedPlayer: 'all' | 'player1' | 'player2';
    baselineVsNet?: { baseline: number; net: number };
    p2BaselineVsNet?: { baseline: number; net: number };
    sprintCount?: number;
    p2SprintCount?: number;
    responseDelay?: { avgDelay: number; category: string };
    p2ResponseDelay?: { avgDelay: number; category: string };
    baselineVsNetWinPct?: { baseline: { wins: number; errors: number; total: number; winPct: number; errPct: number }; net: { wins: number; errors: number; total: number; winPct: number; errPct: number } };
    p2BaselineVsNetWinPct?: { baseline: { wins: number; errors: number; total: number; winPct: number; errPct: number }; net: { wins: number; errors: number; total: number; winPct: number; errPct: number } };
    // NEW: Unique movement metrics
    movementHeatmap?: { zones: number[][]; maxValue: number; totalShots: number };
    p2MovementHeatmap?: { zones: number[][]; maxValue: number; totalShots: number };
    explosiveBursts?: { count: number; avgPerPoint: string | number };
    p2ExplosiveBursts?: { count: number; avgPerPoint: string | number };
    movementEfficiency?: { distancePerPoint: number; pointsWon: number; efficiencyRating: string };
    p2MovementEfficiency?: { distancePerPoint: number; pointsWon: number; efficiencyRating: string };
    // NEW: Raw shots for dynamic heatmap filtering
    shots?: ShotData[];
}

/* ═══════════════════════════════════════════
   SVG SPEEDOMETER GAUGE
   ═══════════════════════════════════════════ */
const SpeedGauge = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => {
    const pct = Math.min(value / max, 1);
    const r = 38;
    const cx = 50, cy = 50;
    // 180° arc from left to right
    const circumference = Math.PI * r;
    const fill = pct * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg width={100} height={60} viewBox="0 0 100 62">
                {/* Tick marks */}
                {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                    const angle = Math.PI - t * Math.PI;
                    const x1 = cx + (r + 2) * Math.cos(angle);
                    const y1 = cy + (r + 2) * Math.sin(angle) * -1;
                    const x2 = cx + (r - 4) * Math.cos(angle);
                    const y2 = cy + (r - 4) * Math.sin(angle) * -1;
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={1.2} />;
                })}
                {/* Track */}
                <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} strokeLinecap="round" />
                {/* Glow */}
                <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
                    strokeDasharray={`${fill} ${circumference}`} filter="url(#gaugeGlow)"
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
                {/* Fill */}
                <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round"
                    strokeDasharray={`${fill} ${circumference}`}
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
                {/* Needle */}
                {(() => {
                    const needleAngle = Math.PI - pct * Math.PI;
                    const nx = cx + (r - 12) * Math.cos(needleAngle);
                    const ny = cy - (r - 12) * Math.sin(needleAngle);
                    return <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={1.5} strokeLinecap="round"
                        style={{ transition: 'all 1.2s cubic-bezier(0.4,0,0.2,1)' }} />;
                })()}
                <circle cx={cx} cy={cy} r={3} fill="white" />
                <defs>
                    <filter id="gaugeGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
            </svg>
            <span className="text-white font-display font-black text-xl mt-0.5">{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}</span>
            <span className="text-white/70 text-[15px] font-mono font-bold uppercase tracking-[0.15em] mt-1">{label}</span>
        </div>
    );
};

/* ═══════════════════════════════════════════
   CIRCULAR RADIAL PROGRESS
   ═══════════════════════════════════════════ */
const RadialProgress = ({ value, color, label, unit = '%' }: { value: number; color: string; label: string; unit?: string }) => {
    const r = 30;
    const circumference = 2 * Math.PI * r;
    const fill = (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width={76} height={76} viewBox="0 0 76 76">
                    <circle cx={38} cy={38} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
                    <circle cx={38} cy={38} r={r} fill="none" stroke={color} strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray={`${fill} ${circumference - fill}`}
                        strokeDashoffset={circumference * 0.25}
                        filter="url(#radialGlow)"
                        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
                    <defs>
                        <filter id="radialGlow">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white font-display font-black text-xl">{value}{unit}</span>
                </div>
            </div>
            <span className="text-white/70 text-[14px] font-mono font-bold uppercase tracking-wider mt-1.5">{label}</span>
        </div>
    );
};

/* ═══════════════════════════════════════════
   COURT POSITIONING VISUAL
   ═══════════════════════════════════════════ */
const CourtPositioning = ({ baselineP1, netP1, baselineP2, netP2, showBoth, selectedPlayer, p1Name, p2Name }: any) => {
    const showP1 = selectedPlayer !== 'player2';
    const showP2 = selectedPlayer !== 'player1';

    const ZoneBar = ({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) => (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: `0 0 12px ${color}30` }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay, ease: [0.4, 0, 0.2, 1] }}
                />
            </div>
            <span className="text-white font-display font-black text-sm tabular-nums w-12 text-right">{value}%</span>
        </div>
    );

    return (
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.04) 0%, rgba(30,27,75,0.8) 50%, rgba(139,92,246,0.04) 100%)' }}>

            {/* SVG Court Background */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="none">
                {/* Court surface */}
                <rect x={10} y={10} width={380} height={200} rx={6} fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                {/* Net line (horizontal center) */}
                <line x1={10} y1={110} x2={390} y2={110} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
                {/* Net posts */}
                <circle cx={10} cy={110} r={2.5} fill="rgba(255,255,255,0.15)" />
                <circle cx={390} cy={110} r={2.5} fill="rgba(255,255,255,0.15)" />
                {/* Service lines */}
                <line x1={80} y1={10} x2={80} y2={210} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                <line x1={320} y1={10} x2={320} y2={210} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                {/* Center service line */}
                <line x1={200} y1={10} x2={200} y2={210} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
                {/* Baseline zone label */}
                <text x={200} y={55} textAnchor="middle" fill="rgba(255,255,255,0.07)" fontSize={11} fontFamily="monospace" letterSpacing={4}>BASELINE ZONE</text>
                {/* Net zone label */}
                <text x={200} y={175} textAnchor="middle" fill="rgba(255,255,255,0.07)" fontSize={11} fontFamily="monospace" letterSpacing={4}>NET ZONE</text>
            </svg>

            <div className="relative z-10 p-4">
                {/* Baseline Zone */}
                <div className="mb-2">
                    <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-1 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #10b981, #059669)' }} />
                        <span className="text-[11px] font-mono font-semibold text-white/55 uppercase tracking-[0.15em]">Baseline</span>
                    </div>
                    <div className="space-y-2 pl-3">
                        {showP1 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-semibold text-[#FACC15]/65 uppercase w-10 shrink-0">{p1Name?.split(' ').pop()?.slice(0, 3) ?? 'P1'}</span>
                                <ZoneBar value={baselineP1} color="#FACC15" delay={0.2} />
                            </div>
                        )}
                        {showP2 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-semibold text-[#22D3EE]/65 uppercase w-10 shrink-0">{p2Name?.split(' ').pop()?.slice(0, 3) ?? 'P2'}</span>
                                <ZoneBar value={baselineP2} color="#22D3EE" delay={0.3} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Divider styled as net */}
                <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
                    <span className="text-[9px] font-mono font-semibold text-white/30 uppercase tracking-wider">Net</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
                </div>

                {/* Net Zone */}
                <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-1 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)' }} />
                        <span className="text-[11px] font-mono font-semibold text-white/55 uppercase tracking-[0.15em]">Net Approach</span>
                    </div>
                    <div className="space-y-2 pl-3">
                        {showP1 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-semibold text-[#FACC15]/65 uppercase w-10 shrink-0">{p1Name?.split(' ').pop()?.slice(0, 3) ?? 'P1'}</span>
                                <ZoneBar value={netP1} color="#FACC15" delay={0.4} />
                            </div>
                        )}
                        {showP2 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-semibold text-[#22D3EE]/65 uppercase w-10 shrink-0">{p2Name?.split(' ').pop()?.slice(0, 3) ?? 'P2'}</span>
                                <ZoneBar value={netP2} color="#22D3EE" delay={0.5} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════
   PROFESSIONAL COURT MOVEMENT HEATMAP
   Broadcast-quality tennis court with canvas-based density rendering
   ═══════════════════════════════════════════ */

interface HeatmapFilter {
    shotTypes: string[];
    results: string[];
    tacticalDirections: string[];
    pointOutcome: 'all' | 'won' | 'lost';
    rallyRange: [number, number]; // [min, max]
    movementContext: 'all' | 'serve' | 'rally';
}

const DEFAULT_HEATMAP_FILTERS: HeatmapFilter = {
    shotTypes: [],
    results: [],
    tacticalDirections: [],
    pointOutcome: 'all',
    rallyRange: [0, 50],
    movementContext: 'all',
};

const MovementHeatmap = ({ data, playerColor, playerName, shots, playerId }: {
    data?: { zones: number[][]; maxValue: number; totalShots: number };
    playerColor: string;
    playerName: string;
    shots?: ShotData[];
    playerId?: string;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredZone, setHoveredZone] = React.useState<{ x: number; y: number; count: number; percent: number; position: string } | null>(null);
    const [showZoneOverlay, setShowZoneOverlay] = useState(false);
    const [heatmapFilters, setHeatmapFilters] = useState<HeatmapFilter>(DEFAULT_HEATMAP_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    // Court dimensions (proper tennis ratio ≈ 2.167:1 for singles)
    const courtWidth = 520;
    const courtHeight = 340;
    const GRID_SIZE = 12;

    // Compute filtered heatmap data dynamically from raw shots
    const computedData = useMemo(() => {
        if (!shots || !playerId) return data;

        let filtered = shots.filter(s => s.playerId === playerId && s.playerPosition);

        // Apply shot type filter
        if (heatmapFilters.shotTypes.length > 0) {
            filtered = filtered.filter(s => heatmapFilters.shotTypes.includes(s.type));
        }
        // Apply result filter
        if (heatmapFilters.results.length > 0) {
            filtered = filtered.filter(s => {
                if (heatmapFilters.results.includes('winner') && s.isWinner) return true;
                if (heatmapFilters.results.includes('error') && s.isError) return true;
                if (heatmapFilters.results.includes('in') && s.isIn) return true;
                if (heatmapFilters.results.includes('out') && s.isOut) return true;
                return false;
            });
        }
        // Apply tactical direction filter
        if (heatmapFilters.tacticalDirections.length > 0) {
            filtered = filtered.filter(s =>
                s.tacticalDirection?.some(d => heatmapFilters.tacticalDirections.includes(d))
            );
        }
        // Apply point outcome filter
        if (heatmapFilters.pointOutcome !== 'all') {
            filtered = filtered.filter(s => {
                if (heatmapFilters.pointOutcome === 'won') return s.pointWon === true;
                if (heatmapFilters.pointOutcome === 'lost') return s.pointWon === false;
                return true;
            });
        }
        // Apply rally length filter
        if (heatmapFilters.rallyRange[0] > 0 || heatmapFilters.rallyRange[1] < 50) {
            filtered = filtered.filter(s =>
                s.rallyLength >= heatmapFilters.rallyRange[0] && s.rallyLength <= heatmapFilters.rallyRange[1]
            );
        }
        // Apply serve vs rally context
        if (heatmapFilters.movementContext === 'serve') {
            filtered = filtered.filter(s => s.type === 'serve' || s.type === 'return');
        } else if (heatmapFilters.movementContext === 'rally') {
            filtered = filtered.filter(s => s.type !== 'serve' && s.type !== 'return');
        }

        const zones: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
        filtered.forEach(s => {
            if (!s.playerPosition) return;
            const zx = Math.min(Math.floor(s.playerPosition.x / (100 / GRID_SIZE)), GRID_SIZE - 1);
            const zy = Math.min(Math.floor(s.playerPosition.y / (100 / GRID_SIZE)), GRID_SIZE - 1);
            zones[zy][zx]++;
        });
        const maxValue = Math.max(...zones.flat(), 1);
        return { zones, maxValue, totalShots: filtered.length };
    }, [shots, playerId, data, heatmapFilters]);

    if (!computedData || !computedData.zones || computedData.zones.length === 0) return null;

    const gridSize = computedData.zones.length;
    const cellWidth = courtWidth / gridSize;
    const cellHeight = courtHeight / gridSize;

    // Zone analysis
    const zoneStats = computedData.zones.flatMap((row, y) =>
        row.map((count, x) => ({
            x, y, count,
            intensity: count / (computedData.maxValue || 1),
            percent: ((count / Math.max(computedData.totalShots, 1)) * 100).toFixed(1),
            cx: x * cellWidth + cellWidth / 2,
            cy: y * cellHeight + cellHeight / 2,
            position: y < gridSize / 3 ? 'Baseline' : y > (2 * gridSize) / 3 ? 'Net' : 'Mid-Court',
            side: x < gridSize / 2 ? 'Deuce' : 'Ad'
        }))
    );

    const activeZones = zoneStats.filter(z => z.count > 0);
    const peakZones = activeZones.filter(z => z.intensity > 0.6).sort((a, b) => b.count - a.count).slice(0, 5);
    const courtCoveragePercent = ((activeZones.length / (gridSize * gridSize)) * 100).toFixed(1);

    // Position breakdown
    const positionBreakdown = {
        baseline: zoneStats.filter(z => z.position === 'Baseline').reduce((sum, z) => sum + z.count, 0),
        midCourt: zoneStats.filter(z => z.position === 'Mid-Court').reduce((sum, z) => sum + z.count, 0),
        net: zoneStats.filter(z => z.position === 'Net').reduce((sum, z) => sum + z.count, 0),
    };

    // Side breakdown
    const sideBreakdown = {
        deuce: zoneStats.filter(z => z.side === 'Deuce').reduce((sum, z) => sum + z.count, 0),
        ad: zoneStats.filter(z => z.side === 'Ad').reduce((sum, z) => sum + z.count, 0),
    };

    // Heat spots for canvas rendering
    const heatSpots = zoneStats.filter(z => z.count > 0);

    // Filter chip options
    const shotTypeOptions = ['serve', 'forehand', 'backhand', 'volley', 'return', 'smash', 'drop', 'lob'];
    const resultOptions = [
        { key: 'winner', label: 'Winners', color: '#FFD700' },
        { key: 'error', label: 'Errors', color: '#EF4444' },
        { key: 'in', label: 'In', color: '#22C55E' },
        { key: 'out', label: 'Out', color: '#F97316' },
    ];
    const tacticalOptions = ['cross-court', 'down-the-line', 'inside-out', 'inside-in'];

    const toggleFilter = (category: keyof HeatmapFilter, value: string) => {
        setHeatmapFilters(prev => {
            const arr = prev[category] as string[];
            return {
                ...prev,
                [category]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
            };
        });
    };

    const activeFilterCount = heatmapFilters.shotTypes.length + heatmapFilters.results.length + heatmapFilters.tacticalDirections.length
        + (heatmapFilters.pointOutcome !== 'all' ? 1 : 0)
        + (heatmapFilters.rallyRange[0] > 0 || heatmapFilters.rallyRange[1] < 50 ? 1 : 0)
        + (heatmapFilters.movementContext !== 'all' ? 1 : 0);

    // ── Court line coordinates (proportional) ──
    const courtPad = 8;
    const playW = courtWidth - courtPad * 2;
    const playH = courtHeight - courtPad * 2;
    const px = courtPad;
    const py = courtPad;
    // Service box: service line is ~6.4m from net (total court = 23.77m, so ~27% from center)
    const netY = py + playH / 2;
    const serviceLineTop = netY - playH * 0.27;
    const serviceLineBot = netY + playH * 0.27;
    // Singles sidelines: full court = 10.97m doubles, singles = 8.23m → ~75% of doubles width
    const singlesInset = playW * 0.125;
    const singleLeft = px + singlesInset;
    const singleRight = px + playW - singlesInset;
    const centerX = px + playW / 2;

    return (
        <div className="space-y-3">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-display font-bold text-white uppercase tracking-wider">
                        Movement Heatmap
                    </h3>
                    <p className="text-[11px] font-mono text-white/50 mt-0.5">
                        {gridSize}×{gridSize} grid • {computedData.totalShots} shots tracked
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${showFilters ? 'bg-white/15 text-white border border-white/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'}`}
                    >
                        <Filter size={11} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-black flex items-center justify-center text-black">{activeFilterCount}</span>
                        )}
                    </button>
                    {/* Zone overlay toggle */}
                    <button
                        onClick={() => setShowZoneOverlay(!showZoneOverlay)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${showZoneOverlay ? 'bg-white/15 text-white border border-white/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'}`}
                    >
                        <Layers size={11} />
                        Zones
                    </button>
                    {/* Coverage stat */}
                    <div className="text-right">
                        <p className="text-[13px] font-mono font-bold text-amber-400">{courtCoveragePercent}%</p>
                        <p className="text-[10px] font-mono text-white/50">Coverage</p>
                    </div>
                </div>
            </div>

            {/* ── Filter Panel (collapsible) ── */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                            {/* Shot Types */}
                            <div>
                                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Shot Type</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {shotTypeOptions.map(type => (
                                        <button key={type} onClick={() => toggleFilter('shotTypes', type)}
                                            className={`px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${heatmapFilters.shotTypes.includes(type) ? 'bg-white/20 text-white border border-white/30' : 'text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Results */}
                            <div>
                                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Result</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {resultOptions.map(opt => (
                                        <button key={opt.key} onClick={() => toggleFilter('results', opt.key)}
                                            className={`px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${heatmapFilters.results.includes(opt.key)
                                                ? 'bg-white/20 text-white border border-white/30'
                                                : 'text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15'}`}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: opt.color }} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Tactical */}
                            <div>
                                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Tactical Direction</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {tacticalOptions.map(dir => (
                                        <button key={dir} onClick={() => toggleFilter('tacticalDirections', dir)}
                                            className={`px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${heatmapFilters.tacticalDirections.includes(dir) ? 'bg-white/20 text-white border border-white/30' : 'text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15'}`}>
                                            {dir}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Reset */}
                            {activeFilterCount > 0 && (
                                <button onClick={() => setHeatmapFilters(DEFAULT_HEATMAP_FILTERS)}
                                    className="text-[9px] font-mono text-amber-400 hover:text-amber-300 underline underline-offset-2">
                                    Reset all filters
                                </button>
                            )}
                            {/* Rally Length */}
                            <div>
                                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Rally Length</p>
                                <div className="flex items-center gap-2">
                                    <input type="range" min={0} max={50} value={heatmapFilters.rallyRange[0]}
                                        onChange={e => setHeatmapFilters(prev => ({ ...prev, rallyRange: [parseInt(e.target.value), prev.rallyRange[1]] }))}
                                        className="w-20 h-1 accent-amber-400" />
                                    <span className="text-[9px] font-mono text-white/50">{heatmapFilters.rallyRange[0]} – {heatmapFilters.rallyRange[1]}</span>
                                    <input type="range" min={0} max={50} value={heatmapFilters.rallyRange[1]}
                                        onChange={e => setHeatmapFilters(prev => ({ ...prev, rallyRange: [prev.rallyRange[0], parseInt(e.target.value)] }))}
                                        className="w-20 h-1 accent-amber-400" />
                                </div>
                            </div>
                            {/* Serve vs Rally */}
                            <div>
                                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Movement Context</p>
                                <div className="flex gap-1.5">
                                    {(['all', 'serve', 'rally'] as const).map(ctx => (
                                        <button key={ctx} onClick={() => setHeatmapFilters(prev => ({ ...prev, movementContext: ctx }))}
                                            className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${heatmapFilters.movementContext === ctx
                                                    ? 'bg-white/20 text-white border border-white/30'
                                                    : 'text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15'
                                                }`}>
                                            {ctx === 'all' ? 'All' : ctx === 'serve' ? 'Serve/Return' : 'Rally'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Point Outcome */}
                            <div>
                                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Point Outcome</p>
                                <div className="flex gap-1.5">
                                    {(['all', 'won', 'lost'] as const).map(outcome => (
                                        <button key={outcome} onClick={() => setHeatmapFilters(prev => ({ ...prev, pointOutcome: outcome }))}
                                            className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${heatmapFilters.pointOutcome === outcome
                                                    ? 'bg-white/20 text-white border border-white/30'
                                                    : 'text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15'
                                                }`}>
                                            {outcome === 'all' && '●'}
                                            {outcome === 'won' && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                                            {outcome === 'lost' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                                            {outcome === 'all' ? 'All' : outcome === 'won' ? 'Won' : 'Lost'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Baseline', value: positionBreakdown.baseline, color: '#22C55E' },
                    { label: 'Mid-Court', value: positionBreakdown.midCourt, color: '#3B82F6' },
                    { label: 'Net', value: positionBreakdown.net, color: '#A855F7' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                            <p className="text-[9px] font-mono text-white/50 uppercase">{label}</p>
                        </div>
                        <p className="text-[15px] font-display font-black text-white">{value}</p>
                        <p className="text-[8px] font-mono text-white/35">{computedData.totalShots > 0 ? ((value / computedData.totalShots) * 100).toFixed(1) : '0.0'}%</p>
                    </div>
                ))}
            </div>

            {/* ═══ REALISTIC COURT SVG + HEATMAP ═══ */}
            <div className="relative rounded-xl overflow-hidden border border-white/[0.12]" style={{ background: '#1B5E28' }}>

                {/* Court SVG — realistic green tennis court */}
                {/* height belongs in CSS — the SVG `height` attribute only takes a
                    length, so height="auto" was rejected with a console error. The
                    viewBox already fixes the aspect ratio. */}
                <svg width="100%" viewBox={`0 0 ${courtWidth} ${courtHeight}`} className="w-full" style={{ display: 'block', height: 'auto' }}>
                    <defs>
                        {/* Court surface texture gradient */}
                        <linearGradient id={`courtBg-${playerName}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2D8A3E" />
                            <stop offset="50%" stopColor="#267A35" />
                            <stop offset="100%" stopColor="#2D8A3E" />
                        </linearGradient>
                        {/* Subtle grain filter */}
                        <filter id={`grain-${playerName}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise" />
                            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
                            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
                            <feComponentTransfer in="blended">
                                <feFuncA type="linear" slope="1" />
                            </feComponentTransfer>
                        </filter>
                        {/* Heatmap blur for blobs */}
                        <filter id={`heatBlur-${playerName}`}>
                            <feGaussianBlur in="SourceGraphic" stdDeviation="14" />
                        </filter>
                        <filter id={`peakGlow-${playerName}`}>
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        {/* Heat spot gradients — Green → Yellow → Orange → Red */}
                        {heatSpots.map((spot, i) => {
                            // Interpolate color based on intensity: green(low) → yellow → orange → red(high)
                            const t = spot.intensity;
                            let coreColor: string;
                            let midColor: string;
                            if (t < 0.33) {
                                coreColor = '#4CAF50'; midColor = '#8BC34A';
                            } else if (t < 0.66) {
                                coreColor = '#FFC107'; midColor = '#FF9800';
                            } else {
                                coreColor = '#FF5722'; midColor = '#FF9800';
                            }
                            return (
                                <radialGradient key={`hg-${i}`} id={`heatG-${playerName}-${i}`} cx="50%" cy="50%">
                                    <stop offset="0%" stopColor={coreColor} stopOpacity={Math.min(t * 0.85 + 0.15, 0.82)} />
                                    <stop offset="30%" stopColor={midColor} stopOpacity={t * 0.55} />
                                    <stop offset="65%" stopColor="#8BC34A" stopOpacity={t * 0.2} />
                                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
                                </radialGradient>
                            );
                        })}
                    </defs>

                    {/* ── Outer "fence" area ── */}
                    <rect x={0} y={0} width={courtWidth} height={courtHeight} fill="#1B5E28" />

                    {/* ── Playing surface ── */}
                    <rect x={px} y={py} width={playW} height={playH} rx={2} fill={`url(#courtBg-${playerName})`} filter={`url(#grain-${playerName})`} />

                    {/* ═══ HEATMAP LAYER (below court lines & net) ═══ */}
                    <g style={{ mixBlendMode: 'multiply' as any }} filter={`url(#heatBlur-${playerName})`} opacity={0.75}>
                        {heatSpots.map((spot, i) => {
                            const rw = cellWidth * 1.6;
                            const rh = cellHeight * 1.6;
                            return (
                                <motion.rect
                                    key={`hs-${i}`}
                                    x={px + spot.cx - rw / 2}
                                    y={py + spot.cy - rh / 2}
                                    width={rw}
                                    height={rh}
                                    rx={rw * 0.35}
                                    ry={rh * 0.35}
                                    fill={`url(#heatG-${playerName}-${i})`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: i * 0.006 }}
                                />
                            );
                        })}
                    </g>

                    {/* ── Court Lines (white) — DRAWN ABOVE heatmap so always visible ── */}
                    {/* Baselines */}
                    <line x1={singleLeft} y1={py} x2={singleRight} y2={py} stroke="white" strokeWidth={2.5} opacity={0.92} />
                    <line x1={singleLeft} y1={py + playH} x2={singleRight} y2={py + playH} stroke="white" strokeWidth={2.5} opacity={0.92} />
                    {/* Singles sidelines */}
                    <line x1={singleLeft} y1={py} x2={singleLeft} y2={py + playH} stroke="white" strokeWidth={2} opacity={0.88} />
                    <line x1={singleRight} y1={py} x2={singleRight} y2={py + playH} stroke="white" strokeWidth={2} opacity={0.88} />
                    {/* Doubles sidelines */}
                    <line x1={px} y1={py} x2={px} y2={py + playH} stroke="white" strokeWidth={1.5} opacity={0.55} />
                    <line x1={px + playW} y1={py} x2={px + playW} y2={py + playH} stroke="white" strokeWidth={1.5} opacity={0.55} />
                    {/* Doubles baselines */}
                    <line x1={px} y1={py} x2={singleLeft} y2={py} stroke="white" strokeWidth={1.5} opacity={0.55} />
                    <line x1={singleRight} y1={py} x2={px + playW} y2={py} stroke="white" strokeWidth={1.5} opacity={0.55} />
                    <line x1={px} y1={py + playH} x2={singleLeft} y2={py + playH} stroke="white" strokeWidth={1.5} opacity={0.55} />
                    <line x1={singleRight} y1={py + playH} x2={px + playW} y2={py + playH} stroke="white" strokeWidth={1.5} opacity={0.55} />
                    {/* Service lines */}
                    <line x1={singleLeft} y1={serviceLineTop} x2={singleRight} y2={serviceLineTop} stroke="white" strokeWidth={1.5} opacity={0.78} />
                    <line x1={singleLeft} y1={serviceLineBot} x2={singleRight} y2={serviceLineBot} stroke="white" strokeWidth={1.5} opacity={0.78} />
                    {/* Center service line */}
                    <line x1={centerX} y1={serviceLineTop} x2={centerX} y2={serviceLineBot} stroke="white" strokeWidth={1.5} opacity={0.78} />
                    {/* Center marks */}
                    <line x1={centerX} y1={py} x2={centerX} y2={py + 6} stroke="white" strokeWidth={1.5} opacity={0.72} />
                    <line x1={centerX} y1={py + playH - 6} x2={centerX} y2={py + playH} stroke="white" strokeWidth={1.5} opacity={0.72} />

                    {/* Peak zone markers */}
                    {peakZones.map((peak, i) => (
                        <g key={`pk-${i}`} filter={`url(#peakGlow-${playerName})`}>
                            <circle cx={px + peak.cx} cy={py + peak.cy} r={5} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.7} />
                            <circle cx={px + peak.cx} cy={py + peak.cy} r={2.5} fill="#FF4444" opacity={0.9} />
                        </g>
                    ))}

                    {/* ═══ NET (always above heatmap) ═══ */}
                    {/* Net shadow */}
                    <rect x={px - 4} y={netY + 1} width={playW + 8} height={3} rx={1} fill="rgba(0,0,0,0.25)" />
                    {/* Net band */}
                    <rect x={px - 4} y={netY - 2} width={playW + 8} height={5} rx={1.5} fill="white" opacity={0.85} />
                    {/* Net mesh pattern */}
                    <line x1={px - 4} y1={netY} x2={px + playW + 4} y2={netY} stroke="rgba(200,200,200,0.6)" strokeWidth={0.5} />
                    {/* Net posts */}
                    <circle cx={px - 4} cy={netY} r={4} fill="#D4D4D4" stroke="#999" strokeWidth={1} />
                    <circle cx={px + playW + 4} cy={netY} r={4} fill="#D4D4D4" stroke="#999" strokeWidth={1} />
                    {/* Net center strap */}
                    <rect x={centerX - 1.5} y={netY - 3} width={3} height={7} rx={1} fill="white" opacity={0.6} />

                    {/* ═══ TACTICAL ZONE OVERLAY (optional) ═══ */}
                    {showZoneOverlay && (
                        <g>
                            {/* Deuce/Ad divider */}
                            <line x1={centerX} y1={py} x2={centerX} y2={py + playH} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="6,4" />
                            {/* Zone labels */}
                            {/* Baseline zones */}
                            <rect x={singleLeft + 2} y={py + 2} width={(singleRight - singleLeft) / 2 - 4} height={serviceLineTop - py - 4} rx={3} fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.3)" strokeWidth={1} />
                            <rect x={centerX + 2} y={py + 2} width={(singleRight - singleLeft) / 2 - 4} height={serviceLineTop - py - 4} rx={3} fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.25)" strokeWidth={1} />
                            {/* Mid-court zones */}
                            <rect x={singleLeft + 2} y={serviceLineTop + 2} width={(singleRight - singleLeft) / 2 - 4} height={netY - serviceLineTop - 4} rx={3} fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.25)" strokeWidth={1} />
                            <rect x={centerX + 2} y={serviceLineTop + 2} width={(singleRight - singleLeft) / 2 - 4} height={netY - serviceLineTop - 4} rx={3} fill="rgba(59,130,246,0.07)" stroke="rgba(59,130,246,0.2)" strokeWidth={1} />
                            {/* Net zones (opponent side) */}
                            <rect x={singleLeft + 2} y={netY + 4} width={(singleRight - singleLeft) / 2 - 4} height={serviceLineBot - netY - 6} rx={3} fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.25)" strokeWidth={1} />
                            <rect x={centerX + 2} y={netY + 4} width={(singleRight - singleLeft) / 2 - 4} height={serviceLineBot - netY - 6} rx={3} fill="rgba(168,85,247,0.07)" stroke="rgba(168,85,247,0.2)" strokeWidth={1} />

                            {/* Zone text labels */}
                            <text x={singleLeft + (centerX - singleLeft) / 2} y={py + (serviceLineTop - py) / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize={9} fontFamily="monospace" fontWeight="bold">DEUCE BL</text>
                            <text x={centerX + (singleRight - centerX) / 2} y={py + (serviceLineTop - py) / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.45)" fontSize={9} fontFamily="monospace" fontWeight="bold">AD BL</text>
                            <text x={singleLeft + (centerX - singleLeft) / 2} y={serviceLineTop + (netY - serviceLineTop) / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.45)" fontSize={9} fontFamily="monospace" fontWeight="bold">DEUCE MID</text>
                            <text x={centerX + (singleRight - centerX) / 2} y={serviceLineTop + (netY - serviceLineTop) / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="monospace" fontWeight="bold">AD MID</text>
                            <text x={singleLeft + (centerX - singleLeft) / 2} y={netY + (serviceLineBot - netY) / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="monospace" fontWeight="bold">DEUCE NET</text>
                            <text x={centerX + (singleRight - centerX) / 2} y={netY + (serviceLineBot - netY) / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="monospace" fontWeight="bold">AD NET</text>
                        </g>
                    )}

                    {/* ── Interactive hover zones ── */}
                    {zoneStats.map(zone => zone.count > 0 && (
                        <rect
                            key={`hz-${zone.x}-${zone.y}`}
                            x={px + zone.x * cellWidth}
                            y={py + zone.y * cellHeight}
                            width={cellWidth}
                            height={cellHeight}
                            fill="transparent"
                            stroke={hoveredZone?.x === zone.x && hoveredZone?.y === zone.y ? 'rgba(255,255,255,0.5)' : 'transparent'}
                            strokeWidth={1.5}
                            rx={2}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredZone({ x: zone.x, y: zone.y, count: zone.count, percent: parseFloat(zone.percent), position: `${zone.side} ${zone.position}` })}
                            onMouseLeave={() => setHoveredZone(null)}
                        />
                    ))}
                </svg>

                {/* ── Court edge labels ── */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 text-[9px] font-mono font-bold">
                    <div className="flex justify-between text-white/60">
                        <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">BASELINE</span>
                        <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">DEUCE</span>
                        <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">AD</span>
                    </div>
                    <div className="flex justify-between items-end text-white/60">
                        <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">BASELINE</span>
                        <span className="bg-black/50 px-2 py-1 rounded backdrop-blur-sm text-[10px]">NET</span>
                        <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm opacity-0">.</span>
                    </div>
                </div>

                {/* ── Hover tooltip ── */}
                {hoveredZone && (
                    <motion.div
                        className="absolute top-3 right-3 bg-black/90 border border-white/25 rounded-lg px-3 py-2 backdrop-blur-md shadow-xl"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.12 }}
                    >
                        <p className="text-[10px] font-mono font-bold text-white/70">{hoveredZone.position}</p>
                        <p className="text-[15px] font-display font-black text-white mt-1">{hoveredZone.count} <span className="text-[10px] font-mono font-normal text-white/50">shots</span></p>
                        <p className="text-[10px] font-mono text-amber-400 font-bold">{hoveredZone.percent}% of total</p>
                    </motion.div>
                )}
            </div>

            {/* ── Intensity Legend ── */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <span className="text-[10px] font-mono font-semibold text-white/50">Low</span>
                <div className="flex-1 h-2.5 rounded-full relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #4CAF50, #8BC34A, #CDDC39, #FFC107, #FF9800, #FF5722, #D32F2F)' }}>
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }} />
                </div>
                <span className="text-[10px] font-mono font-semibold text-white/50">High</span>
            </div>

            {/* ── Side Breakdown (Deuce vs Ad) ── */}
            <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-[9px] font-mono text-white/40 uppercase mb-0.5">Deuce Side</p>
                    <p className="text-[15px] font-display font-black text-white">{sideBreakdown.deuce}</p>
                    <p className="text-[8px] font-mono text-white/35">{computedData.totalShots > 0 ? ((sideBreakdown.deuce / computedData.totalShots) * 100).toFixed(1) : '0.0'}%</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-[9px] font-mono text-white/40 uppercase mb-0.5">Ad Side</p>
                    <p className="text-[15px] font-display font-black text-white">{sideBreakdown.ad}</p>
                    <p className="text-[8px] font-mono text-white/35">{computedData.totalShots > 0 ? ((sideBreakdown.ad / computedData.totalShots) * 100).toFixed(1) : '0.0'}%</p>
                </div>
            </div>

            {/* ── Peak Zones ── */}
            {peakZones.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-white/60 uppercase">Top {peakZones.length} Peak Zones</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 8px #ff0000' }} />
                            <span className="text-[9px] font-mono text-white/40">Hottest Areas</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                        {peakZones.map((peak, i) => (
                            <div key={i} className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                                <p className="text-[8px] font-mono text-white/35 uppercase">#{i + 1}</p>
                                <p className="text-[13px] font-display font-black text-white">{peak.count}</p>
                                <p className="text-[7px] font-mono text-white/40">{peak.position}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};



/* ═══════════════════════════════════════════
   ANIMATED VERTICAL BAR
   ═══════════════════════════════════════════ */
const VerticalBar = ({ value, max, color, label, unit, delay = 0 }: { value: number; max: number; color: string; label: string; unit: string; delay?: number }) => {
    const pct = Math.min((value / (max || 1)) * 100, 100);
    return (
        <motion.div className="flex flex-col items-center gap-1.5 group/bar cursor-default"
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay }}>
            {/* Value label */}
            <span className="text-white font-display font-black text-xs tabular-nums opacity-80 group-hover/bar:opacity-100 transition-opacity">
                {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
                <span className="text-white/30 text-[8px] ml-0.5">{unit}</span>
            </span>
            {/* Bar */}
            <div className="w-5 h-[60px] rounded-full bg-white/[0.04] relative overflow-hidden">
                <motion.div
                    className="absolute bottom-0 left-0 right-0 rounded-full"
                    style={{ background: `linear-gradient(0deg, ${color}88, ${color})`, boxShadow: `0 0 10px ${color}40` }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: delay + 0.2, ease: [0.4, 0, 0.2, 1] }}
                />
            </div>
            <span className="text-white/25 text-[7px] font-mono uppercase tracking-wider leading-tight text-center">{label}</span>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const MovementAnalytics = ({
    player1, player2, player1Name, player2Name, selectedPlayer,
    baselineVsNet, p2BaselineVsNet, sprintCount, p2SprintCount,
    responseDelay, p2ResponseDelay, baselineVsNetWinPct, p2BaselineVsNetWinPct,
    movementHeatmap, p2MovementHeatmap, explosiveBursts, p2ExplosiveBursts,
    movementEfficiency, p2MovementEfficiency, shots,
}: Props) => {

    const [viewMode, setViewMode] = useState<'visual' | 'bars'>('visual');
    const showBoth = selectedPlayer === 'all';

    const p1Sprint = sprintCount ?? player1?.sprintCount ?? 0;
    const p2Sprint = p2SprintCount ?? player2?.sprintCount ?? 0;
    const maxDist = Math.max(player1?.totalDistance || 0, player2?.totalDistance || 0, 1);
    const maxSpeed = Math.max(player1?.avgSpeed || 0, player2?.avgSpeed || 0, 1) * 1.3;
    const maxSprint = Math.max(p1Sprint, p2Sprint, 1);

    return (
        <motion.div
            className="relative overflow-hidden flex flex-col min-h-[600px]"
            style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 40px rgba(139,92,246,0.06), 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
        >
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Neon edge glow */}
            <div className="absolute -inset-px rounded-[24px] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), transparent 40%, transparent 60%, rgba(6,182,212,0.15))', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor', WebkitMaskComposite: 'xor', padding: 1 }} />

            <div className="relative z-10 p-5">

                {/* ── HEADER ── */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.15)' }}>
                            <Footprints size={16} className="text-[#a78bfa]" />
                        </div>
                        <div>
                            <h3 className="text-white font-display font-bold text-sm tracking-wide">MOVEMENT & POSITIONING</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400/70 text-[8px] font-mono uppercase tracking-widest">Live Tracking</span>
                            </div>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <button onClick={() => setViewMode('visual')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'visual' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
                            <Eye size={12} />
                        </button>
                        <button onClick={() => setViewMode('bars')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'bars' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
                            <BarChart3 size={12} />
                        </button>
                    </div>
                </div>

                {/* ── PLAYER BADGES ── */}
                <div className="flex items-center justify-between mb-5">
                    {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black font-display"
                                style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)', color: '#000' }}>
                                {player1Name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-white font-display font-bold text-xs leading-tight">{player1Name}</p>
                                <div className="h-0.5 w-10 rounded-full mt-1" style={{ background: 'linear-gradient(90deg, #FACC15, transparent)' }} />
                            </div>
                        </div>
                    )}
                    {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                        <div className="flex items-center gap-2 flex-row-reverse">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black font-display"
                                style={{ background: 'linear-gradient(135deg, #22D3EE, #0891B2)', color: '#000' }}>
                                {player2Name.charAt(0)}
                            </div>
                            <div className="text-right">
                                <p className="text-white font-display font-bold text-xs leading-tight">{player2Name}</p>
                                <div className="h-0.5 w-10 rounded-full mt-1 ml-auto" style={{ background: 'linear-gradient(270deg, #22D3EE, transparent)' }} />
                            </div>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'visual' ? (
                        <motion.div key="visual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

                            {/* ── GAUGES ROW ── */}
                            <div className={`grid ${showBoth ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>

                                {/* Player 1 gauges */}
                                {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                                    <div className="rounded-xl p-3 transition-all hover:bg-white/[0.02]"
                                        style={{ background: 'rgba(250,204,21,0.02)', border: '1px solid rgba(250,204,21,0.06)' }}>
                                        <div className="flex items-center justify-around">
                                            <SpeedGauge value={player1?.avgSpeed || 0} max={maxSpeed} label="km/h" color="#FACC15" />
                                            <RadialProgress value={player1?.courtCoverage || 0} color="#FACC15" label="Coverage" />
                                        </div>
                                        <div className="flex items-center justify-center gap-6 mt-3">
                                            <div className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <Activity size={10} style={{ color: '#FACC15' }} />
                                                    <span className="text-white font-display font-black text-sm">{player1?.totalDistance || 0}</span>
                                                    <span className="text-white/25 text-[8px] font-mono">m</span>
                                                </div>
                                                <p className="text-white/50 text-[10px] font-mono font-semibold uppercase mt-0.5">Distance</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                                        <Zap size={10} style={{ color: '#FACC15' }} />
                                                    </motion.div>
                                                    <span className="text-white font-display font-black text-sm">{p1Sprint}</span>
                                                </div>
                                                <p className="text-white/50 text-[10px] font-mono font-semibold uppercase mt-0.5">Sprints</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Player 2 gauges */}
                                {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                                    <div className="rounded-xl p-3 transition-all hover:bg-white/[0.02]"
                                        style={{ background: 'rgba(34,211,238,0.02)', border: '1px solid rgba(34,211,238,0.06)' }}>
                                        <div className="flex items-center justify-around">
                                            <SpeedGauge value={player2?.avgSpeed || 0} max={maxSpeed} label="km/h" color="#22D3EE" />
                                            <RadialProgress value={player2?.courtCoverage || 0} color="#22D3EE" label="Coverage" />
                                        </div>
                                        <div className="flex items-center justify-center gap-6 mt-3">
                                            <div className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <Activity size={10} style={{ color: '#22D3EE' }} />
                                                    <span className="text-white font-display font-black text-sm">{player2?.totalDistance || 0}</span>
                                                    <span className="text-white/25 text-[8px] font-mono">m</span>
                                                </div>
                                                <p className="text-white/50 text-[10px] font-mono font-semibold uppercase mt-0.5">Distance</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}>
                                                        <Zap size={10} style={{ color: '#22D3EE' }} />
                                                    </motion.div>
                                                    <span className="text-white font-display font-black text-sm">{p2Sprint}</span>
                                                </div>
                                                <p className="text-white/50 text-[10px] font-mono font-semibold uppercase mt-0.5">Sprints</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── COURT POSITIONING ── */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={12} className="text-white/25" />
                                    <span className="text-[11px] font-mono font-semibold text-white/50 uppercase tracking-wider">Court Positioning</span>
                                </div>
                                <CourtPositioning
                                    baselineP1={baselineVsNet?.baseline ?? 0}
                                    netP1={baselineVsNet?.net ?? 0}
                                    baselineP2={p2BaselineVsNet?.baseline ?? 0}
                                    netP2={p2BaselineVsNet?.net ?? 0}
                                    showBoth={showBoth}
                                    selectedPlayer={selectedPlayer}
                                    p1Name={player1Name}
                                    p2Name={player2Name}
                                />
                            </div>

                            {/* ── MOVEMENT HEATMAP & ADVANCED METRICS ── */}
                            <div className="space-y-5 mt-6">

                                {/* SECTION 1: Movement Heatmap */}
                                <div className={`grid ${showBoth ? 'grid-cols-2' : 'grid-cols-1'} gap-5`}>
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                                        <motion.div className="rounded-xl p-4 border border-white/[0.08]"
                                            style={{ background: 'rgba(250,204,21,0.03)' }}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5 }}>
                                            <MovementHeatmap data={movementHeatmap} playerColor="#FACC15" playerName={player1Name} shots={shots} playerId="player1" />
                                        </motion.div>
                                    )}
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                                        <motion.div className="rounded-xl p-4 border border-white/[0.08]"
                                            style={{ background: 'rgba(34,211,238,0.03)' }}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.1 }}>
                                            <MovementHeatmap data={p2MovementHeatmap} playerColor="#22D3EE" playerName={player2Name} shots={shots} playerId="player2" />
                                        </motion.div>
                                    )}
                                </div>

                                {/* SECTION 2: Unique Movement Metrics */}
                                <div className={`grid ${showBoth ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>

                                    {/* Player 1 Unique Metrics */}
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                                        <div className="space-y-3">
                                            {/* Explosive Bursts */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(250,204,21,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(250,204,21,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap size={14} className="text-amber-400" />
                                                    <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider">Explosive Bursts</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-white font-display font-black text-2xl">{explosiveBursts?.count ?? 0}</span>
                                                    <span className="text-white/50 text-[11px] font-semibold">rapid movements</span>
                                                </div>
                                            </motion.div>

                                            {/* Movement Efficiency */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(250,204,21,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(250,204,21,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider block mb-2">Movement Efficiency</span>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-white font-display font-black text-2xl">{movementEfficiency?.distancePerPoint ?? 0}<span className="text-white/50 text-sm font-semibold ml-1">m</span></p>
                                                        <p className="text-white/50 text-[11px] font-semibold mt-1">per point won</p>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${movementEfficiency?.efficiencyRating === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        movementEfficiency?.efficiencyRating === 'Good' ? 'bg-blue-500/20 text-blue-400' :
                                                            movementEfficiency?.efficiencyRating === 'Average' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-red-500/20 text-red-400'
                                                        }`}>{movementEfficiency?.efficiencyRating ?? 'N/A'}</span>
                                                </div>
                                            </motion.div>

                                            {/* Response Delay */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(250,204,21,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(250,204,21,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider">Response Delay</span>
                                                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full font-bold ${responseDelay?.category === 'Fast' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        responseDelay?.category === 'Moderate' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>{responseDelay?.category || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-white font-display font-black text-2xl">{responseDelay?.avgDelay ? (responseDelay.avgDelay / 1000).toFixed(2) : '—'}</span>
                                                    <span className="text-white/50 text-[11px] font-semibold">sec</span>
                                                </div>
                                            </motion.div>

                                            {/* Zone Win/Err % */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(250,204,21,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(250,204,21,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider block mb-3">Zone Win/Err %</span>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                                                        <p className="text-white/60 text-[10px] font-mono font-bold uppercase mb-1.5">Baseline</p>
                                                        <p className="text-emerald-400 font-display font-bold text-sm">{baselineVsNetWinPct?.baseline.winPct ?? 0}%<span className="text-white/30 text-[10px]"> W</span></p>
                                                        <p className="text-red-400 font-display font-bold text-sm">{baselineVsNetWinPct?.baseline.errPct ?? 0}%<span className="text-white/30 text-[10px]"> E</span></p>
                                                    </div>
                                                    <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                                                        <p className="text-white/60 text-[10px] font-mono font-bold uppercase mb-1.5">Net</p>
                                                        <p className="text-emerald-400 font-display font-bold text-sm">{baselineVsNetWinPct?.net.winPct ?? 0}%<span className="text-white/30 text-[10px]"> W</span></p>
                                                        <p className="text-red-400 font-display font-bold text-sm">{baselineVsNetWinPct?.net.errPct ?? 0}%<span className="text-white/30 text-[10px]"> E</span></p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}

                                    {/* Player 2 Unique Metrics */}
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                                        <div className="space-y-3">
                                            {/* Explosive Bursts */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(34,211,238,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(34,211,238,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap size={14} className="text-cyan-400" />
                                                    <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider">Explosive Bursts</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-white font-display font-black text-2xl">{p2ExplosiveBursts?.count ?? 0}</span>
                                                    <span className="text-white/50 text-[11px] font-semibold">rapid movements</span>
                                                </div>
                                            </motion.div>

                                            {/* Movement Efficiency */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(34,211,238,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(34,211,238,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider block mb-2">Movement Efficiency</span>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-white font-display font-black text-2xl">{p2MovementEfficiency?.distancePerPoint ?? 0}<span className="text-white/50 text-sm font-semibold ml-1">m</span></p>
                                                        <p className="text-white/50 text-[11px] font-semibold mt-1">per point won</p>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${p2MovementEfficiency?.efficiencyRating === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        p2MovementEfficiency?.efficiencyRating === 'Good' ? 'bg-blue-500/20 text-blue-400' :
                                                            p2MovementEfficiency?.efficiencyRating === 'Average' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-red-500/20 text-red-400'
                                                        }`}>{p2MovementEfficiency?.efficiencyRating ?? 'N/A'}</span>
                                                </div>
                                            </motion.div>

                                            {/* Response Delay */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(34,211,238,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(34,211,238,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider">Response Delay</span>
                                                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full font-bold ${p2ResponseDelay?.category === 'Fast' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        p2ResponseDelay?.category === 'Moderate' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>{p2ResponseDelay?.category || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-white font-display font-black text-2xl">{p2ResponseDelay?.avgDelay ? (p2ResponseDelay.avgDelay / 1000).toFixed(2) : '—'}</span>
                                                    <span className="text-white/50 text-[11px] font-semibold">sec</span>
                                                </div>
                                            </motion.div>

                                            {/* Zone Win/Err % */}
                                            <motion.div className="rounded-xl p-4 border border-white/[0.06]"
                                                style={{ background: 'rgba(34,211,238,0.02)' }}
                                                whileHover={{ scale: 1.02, borderColor: 'rgba(34,211,238,0.15)' }}
                                                transition={{ duration: 0.2 }}>
                                                <span className="text-[12px] font-mono font-bold text-white/70 uppercase tracking-wider block mb-3">Zone Win/Err %</span>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                                                        <p className="text-white/60 text-[10px] font-mono font-bold uppercase mb-1.5">Baseline</p>
                                                        <p className="text-emerald-400 font-display font-bold text-sm">{p2BaselineVsNetWinPct?.baseline.winPct ?? 0}%<span className="text-white/30 text-[10px]"> W</span></p>
                                                        <p className="text-red-400 font-display font-bold text-sm">{p2BaselineVsNetWinPct?.baseline.errPct ?? 0}%<span className="text-white/30 text-[10px]"> E</span></p>
                                                    </div>
                                                    <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                                                        <p className="text-white/60 text-[10px] font-mono font-bold uppercase mb-1.5">Net</p>
                                                        <p className="text-emerald-400 font-display font-bold text-sm">{p2BaselineVsNetWinPct?.net.winPct ?? 0}%<span className="text-white/30 text-[10px]"> W</span></p>
                                                        <p className="text-red-400 font-display font-bold text-sm">{p2BaselineVsNetWinPct?.net.errPct ?? 0}%<span className="text-white/30 text-[10px]"> E</span></p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* ── BAR VIEW ── */
                        <motion.div key="bars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                            <div className={`grid ${showBoth ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
                                {/* P1 bars */}
                                {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                                    <div>
                                        <p className="text-[#FACC15]/60 text-[9px] font-mono uppercase tracking-widest text-center mb-3">{player1Name}</p>
                                        <div className="flex items-end justify-center gap-4">
                                            <VerticalBar value={player1?.totalDistance || 0} max={maxDist} color="#FACC15" label="Dist" unit="m" delay={0} />
                                            <VerticalBar value={player1?.avgSpeed || 0} max={maxSpeed} color="#FACC15" label="Speed" unit="km/h" delay={0.08} />
                                            <VerticalBar value={player1?.courtCoverage || 0} max={100} color="#FACC15" label="Cover" unit="%" delay={0.16} />
                                            <VerticalBar value={p1Sprint} max={maxSprint} color="#FACC15" label="Sprint" unit="" delay={0.24} />
                                        </div>
                                    </div>
                                )}
                                {/* P2 bars */}
                                {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                                    <div>
                                        <p className="text-[#22D3EE]/60 text-[9px] font-mono uppercase tracking-widest text-center mb-3">{player2Name}</p>
                                        <div className="flex items-end justify-center gap-4">
                                            <VerticalBar value={player2?.totalDistance || 0} max={maxDist} color="#22D3EE" label="Dist" unit="m" delay={0} />
                                            <VerticalBar value={player2?.avgSpeed || 0} max={maxSpeed} color="#22D3EE" label="Speed" unit="km/h" delay={0.08} />
                                            <VerticalBar value={player2?.courtCoverage || 0} max={100} color="#22D3EE" label="Cover" unit="%" delay={0.16} />
                                            <VerticalBar value={p2Sprint} max={maxSprint} color="#22D3EE" label="Sprint" unit="" delay={0.24} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Positioning bars in bar mode */}
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2">Baseline</p>
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                <motion.div className="h-full rounded-full" style={{ background: '#FACC15' }}
                                                    initial={{ width: 0 }} whileInView={{ width: `${baselineVsNet?.baseline ?? 0}%` }}
                                                    viewport={{ once: true }} transition={{ duration: 0.8 }} />
                                            </div>
                                            <span className="text-white/60 text-[10px] font-display font-bold tabular-nums w-8 text-right">{baselineVsNet?.baseline ?? 0}%</span>
                                        </div>
                                    )}
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                <motion.div className="h-full rounded-full" style={{ background: '#22D3EE' }}
                                                    initial={{ width: 0 }} whileInView={{ width: `${p2BaselineVsNet?.baseline ?? 0}%` }}
                                                    viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }} />
                                            </div>
                                            <span className="text-white/60 text-[10px] font-display font-bold tabular-nums w-8 text-right">{p2BaselineVsNet?.baseline ?? 0}%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2">Net Zone</p>
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player1') && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                <motion.div className="h-full rounded-full" style={{ background: '#FACC15' }}
                                                    initial={{ width: 0 }} whileInView={{ width: `${baselineVsNet?.net ?? 0}%` }}
                                                    viewport={{ once: true }} transition={{ duration: 0.8 }} />
                                            </div>
                                            <span className="text-white/60 text-[10px] font-display font-bold tabular-nums w-8 text-right">{baselineVsNet?.net ?? 0}%</span>
                                        </div>
                                    )}
                                    {(selectedPlayer === 'all' || selectedPlayer === 'player2') && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                <motion.div className="h-full rounded-full" style={{ background: '#22D3EE' }}
                                                    initial={{ width: 0 }} whileInView={{ width: `${p2BaselineVsNet?.net ?? 0}%` }}
                                                    viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }} />
                                            </div>
                                            <span className="text-white/60 text-[10px] font-display font-bold tabular-nums w-8 text-right">{p2BaselineVsNet?.net ?? 0}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default MovementAnalytics;
