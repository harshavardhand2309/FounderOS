
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShotData } from "@/types/analytics";
import { Flame, Target, Activity } from "lucide-react";

/* ═══════════════ COLORS ═══════════════ */
const PB = {
    green: '#22c55e', orange: '#f97316', cyan: '#06b6d4',
    amber: '#fbbf24', red: '#ef4444', purple: '#a855f7',
    p1: '#22c55e', p2: '#f97316',
};

/* ═══════════════ TYPES ═══════════════ */
interface HeatmapData {
    zones: number[][];
    maxValue: number;
    totalShots: number;
}

interface PickleballHeatmapProps {
    player1Shots: ShotData[];
    player2Shots: ShotData[];
    player1Name: string;
    player2Name: string;
    /** Driven by the parent PlayerToggle — 'both' | 'p1' | 'p2' */
    view: 'both' | 'p1' | 'p2';
}

/* ═══════════════ COMPUTE HEATMAP FROM SHOTS ═══════════════ */
function computePickleballHeatmap(shots: ShotData[], gridSize = 8): HeatmapData {
    const zones: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    let counted = 0;

    shots.forEach(s => {
        const px = s.playerPosition?.x ?? s.x;
        const py = s.playerPosition?.y ?? s.y;
        if (px == null || py == null) return;

        const nx = Math.max(0, Math.min(99.9, px));
        const ny = Math.max(0, Math.min(99.9, py));
        const zoneX = Math.min(Math.floor(nx / (100 / gridSize)), gridSize - 1);
        const zoneY = Math.min(Math.floor(ny / (100 / gridSize)), gridSize - 1);
        zones[zoneY][zoneX]++;
        counted++;
    });

    const maxValue = Math.max(...zones.flat(), 1);
    return { zones, maxValue, totalShots: counted };
}

/* ═══════════════ PICKLEBALL ZONE LABEL ═══════════════ */
function getPickleballZone(y: number, gridSize: number): string {
    const frac = y / gridSize;
    if (frac < 0.25) return 'Baseline';
    if (frac < 0.42) return 'Transition';
    if (frac < 0.58) return 'Kitchen (NVZ)';
    if (frac < 0.75) return 'Transition';
    return 'Baseline';
}

/* ═══════════════ SINGLE PLAYER HEATMAP ═══════════════ */
const SingleHeatmap = ({
    data, playerName, playerColor, id, wide
}: {
    data: HeatmapData; playerName: string; playerColor: string; id: string; wide?: boolean;
}) => {
    const [hoveredZone, setHoveredZone] = useState<{
        x: number; y: number; count: number; percent: number; zone: string;
    } | null>(null);

    // Compact landscape proportions for viewport fit
    const courtW = wide ? 480 : 340;
    const courtH = wide ? 320 : 240;
    const gridSize = data.zones.length || 8;
    const cellW = courtW / gridSize;
    const cellH = courtH / gridSize;

    const zoneStats = useMemo(() => data.zones.flatMap((row, y) =>
        row.map((count, x) => ({
            x, y, count,
            intensity: count / (data.maxValue || 1),
            percent: data.totalShots > 0 ? ((count / data.totalShots) * 100) : 0,
            cx: x * cellW + cellW / 2,
            cy: y * cellH + cellH / 2,
            zone: getPickleballZone(y, gridSize)
        }))
    ), [data, cellW, cellH, gridSize]);

    const activeZones = zoneStats.filter(z => z.count > 0);
    const peakZones = activeZones.filter(z => z.intensity > 0.5).sort((a, b) => b.count - a.count).slice(0, 4);
    const coveragePct = ((activeZones.length / (gridSize * gridSize)) * 100).toFixed(0);

    const breakdown = useMemo(() => {
        const kitchen = zoneStats.filter(z => z.zone === 'Kitchen (NVZ)').reduce((s, z) => s + z.count, 0);
        const transition = zoneStats.filter(z => z.zone === 'Transition').reduce((s, z) => s + z.count, 0);
        const baseline = zoneStats.filter(z => z.zone === 'Baseline').reduce((s, z) => s + z.count, 0);
        const total = kitchen + transition + baseline || 1;
        return { kitchen, transition, baseline, total };
    }, [zoneStats]);

    const thermal = {
        cold: 'rgba(0,20,60,0.8)',
        warm: playerColor + 'AA',
        hot: playerColor,
        peak: '#ffffff',
    };

    const kitchenTopY = courtH * 0.35;
    const kitchenBottomY = courtH * 0.65;

    return (
        <div className="flex-1 min-w-0 space-y-2">
            {/* Player header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: playerColor, boxShadow: `0 0 8px ${playerColor}60` }} />
                    <span className="text-[13px] font-bold text-white">{playerName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold" style={{ color: playerColor }}>{coveragePct}%</span>
                    <span className="text-[9px] text-white/40 font-bold">COV</span>
                </div>
            </div>

            {/* Zone breakdown — compact inline */}
            <div className="flex gap-1">
                {[
                    { label: 'Kitchen', value: breakdown.kitchen, pct: ((breakdown.kitchen / breakdown.total) * 100).toFixed(0), color: PB.cyan },
                    { label: 'Trans.', value: breakdown.transition, pct: ((breakdown.transition / breakdown.total) * 100).toFixed(0), color: PB.amber },
                    { label: 'Base', value: breakdown.baseline, pct: ((breakdown.baseline / breakdown.total) * 100).toFixed(0), color: PB.purple },
                ].map((z, i) => (
                    <div key={i} className="flex-1 px-1.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-center">
                        <p className="text-[8px] font-bold text-white/40 uppercase leading-none">{z.label}</p>
                        <p className="text-[14px] font-black text-white leading-tight">{z.value}</p>
                        <p className="text-[8px] font-bold leading-none" style={{ color: z.color }}>{z.pct}%</p>
                    </div>
                ))}
            </div>

            {/* Heatmap SVG — compact */}
            <div className="relative rounded-lg overflow-hidden border border-white/10"
                style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3e 100%)' }}>
                <svg width="100%" viewBox={`0 0 ${courtW} ${courtH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {zoneStats.filter(z => z.count > 0).map((zone) => (
                            <radialGradient key={`${id}-g-${zone.x}-${zone.y}`} id={`${id}-grad-${zone.x}-${zone.y}`} cx="50%" cy="50%">
                                <stop offset="0%" stopColor={thermal.hot} stopOpacity={Math.min(zone.intensity * 1.3, 1)} />
                                <stop offset="35%" stopColor={thermal.warm} stopOpacity={zone.intensity * 0.7} />
                                <stop offset="75%" stopColor={thermal.cold} stopOpacity={zone.intensity * 0.2} />
                                <stop offset="100%" stopColor={thermal.cold} stopOpacity={0} />
                            </radialGradient>
                        ))}
                        <filter id={`${id}-blur`}><feGaussianBlur in="SourceGraphic" stdDeviation="10" /></filter>
                        <filter id={`${id}-glow`}>
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Court bg */}
                    <rect width={courtW} height={courtH} rx={6} fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />

                    {/* Pickleball court lines */}
                    <line x1={0} y1={courtH / 2} x2={courtW} y2={courtH / 2} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                    <line x1={0} y1={kitchenTopY} x2={courtW} y2={kitchenTopY} stroke={PB.cyan + '50'} strokeWidth={1.5} strokeDasharray="5,3" />
                    <line x1={0} y1={kitchenBottomY} x2={courtW} y2={kitchenBottomY} stroke={PB.cyan + '50'} strokeWidth={1.5} strokeDasharray="5,3" />
                    <rect x={0} y={kitchenTopY} width={courtW} height={kitchenBottomY - kitchenTopY} fill={PB.cyan + '06'} />
                    <line x1={courtW / 2} y1={0} x2={courtW / 2} y2={kitchenTopY} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3,3" />
                    <line x1={courtW / 2} y1={kitchenBottomY} x2={courtW / 2} y2={courtH} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3,3" />

                    {/* Heat spots */}
                    <g filter={`url(#${id}-blur)`}>
                        {zoneStats.filter(z => z.count > 0).map((zone, i) => {
                            const r = Math.max(cellW, cellH) * 0.9;
                            return (
                                <motion.circle
                                    key={`${id}-s-${i}`}
                                    cx={zone.cx} cy={zone.cy} r={r}
                                    fill={`url(#${id}-grad-${zone.x}-${zone.y})`}
                                    initial={{ opacity: 0, r: 0 }}
                                    animate={{ opacity: 1, r }}
                                    transition={{ duration: 0.5, delay: i * 0.015 }}
                                />
                            );
                        })}
                    </g>

                    {/* Interactive hover zones */}
                    {zoneStats.map(zone => zone.count > 0 && (
                        <rect
                            key={`${id}-h-${zone.x}-${zone.y}`}
                            x={zone.x * cellW} y={zone.y * cellH}
                            width={cellW} height={cellH}
                            fill="transparent"
                            stroke={hoveredZone?.x === zone.x && hoveredZone?.y === zone.y ? playerColor : 'transparent'}
                            strokeWidth={1.5}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredZone({ x: zone.x, y: zone.y, count: zone.count, percent: parseFloat(zone.percent.toFixed(1)), zone: zone.zone })}
                            onMouseLeave={() => setHoveredZone(null)}
                        />
                    ))}

                    {/* Peak markers */}
                    {peakZones.map((peak, i) => (
                        <g key={`${id}-p-${i}`} filter={`url(#${id}-glow)`}>
                            <circle cx={peak.cx} cy={peak.cy} r={5} fill="none" stroke={thermal.peak} strokeWidth={1.5} opacity={0.6} />
                            <circle cx={peak.cx} cy={peak.cy} r={2.5} fill={playerColor} opacity={0.9} />
                        </g>
                    ))}
                </svg>

                {/* Zone labels (overlay) */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-1 px-2">
                    <span className="self-start bg-black/40 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/25">BASELINE</span>
                    <span className="self-center bg-black/40 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ color: PB.cyan + '70' }}>NVZ</span>
                    <span className="self-center bg-black/40 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/20">NET</span>
                    <span className="self-center bg-black/40 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ color: PB.cyan + '70' }}>NVZ</span>
                    <span className="self-start bg-black/40 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/25">BASELINE</span>
                </div>

                {/* Hover tooltip */}
                {hoveredZone && (
                    <motion.div
                        className="absolute top-1.5 right-1.5 bg-black/90 border rounded-lg px-2.5 py-1.5 backdrop-blur-sm z-10"
                        style={{ borderColor: playerColor + '50' }}
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.12 }}
                    >
                        <p className="text-[9px] font-bold text-white/50 uppercase">{hoveredZone.zone}</p>
                        <p className="text-[13px] font-black text-white">{hoveredZone.count} <span className="text-[10px] font-normal text-white/40">shots</span></p>
                        <p className="text-[9px] font-bold" style={{ color: playerColor }}>{hoveredZone.percent}%</p>
                    </motion.div>
                )}
            </div>

            {/* Intensity legend — tight */}
            <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-white/30">LOW</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{
                    background: `linear-gradient(90deg, ${thermal.cold}, ${thermal.warm}, ${thermal.hot})`
                }} />
                <span className="text-[8px] font-bold text-white/30">HIGH</span>
            </div>
        </div>
    );
};

/* ═══════════════ MAIN EXPORT ═══════════════ */
export default function PickleballHeatmap({
    player1Shots, player2Shots, player1Name, player2Name, view
}: PickleballHeatmapProps) {
    const p1Data = useMemo(() => computePickleballHeatmap(player1Shots, 8), [player1Shots]);
    const p2Data = useMemo(() => computePickleballHeatmap(player2Shots, 8), [player2Shots]);

    // Show one or both based on parent's view toggle
    const showP1 = view === 'both' || view === 'p1';
    const showP2 = view === 'both' || view === 'p2';
    const showSingle = view !== 'both';

    // Shot distribution by type for summary
    const shotTypeSummary = useMemo(() => {
        const types = ['dink', 'drive', 'drop', 'lob', 'serve', 'return', 'volley', 'smash'];
        return types.map(t => ({
            type: t.charAt(0).toUpperCase() + t.slice(1),
            p1: player1Shots.filter(s => s.type === t).length,
            p2: player2Shots.filter(s => s.type === t).length,
        })).filter(t => t.p1 > 0 || t.p2 > 0);
    }, [player1Shots, player2Shots]);

    return (
        <div className="space-y-4">
            {/* Section Header — no toggle here, uses parent's */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${PB.red}20`, border: `1px solid ${PB.red}40` }}>
                    <Flame size={20} style={{ color: PB.red }} />
                </div>
                <div>
                    <h2 className="text-lg font-extrabold text-white tracking-wide">Player Heatmaps</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Court positioning & shot density</p>
                </div>
            </motion.div>

            {/* Heatmap(s) */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4"
            >
                <div className={`flex gap-5 ${showSingle ? 'justify-center max-w-lg mx-auto' : ''}`}>
                    {showP1 && (
                        <SingleHeatmap data={p1Data} playerName={player1Name} playerColor={PB.p1} id="p1hm" wide={showSingle} />
                    )}
                    {!showSingle && (
                        <div className="flex flex-col items-center justify-center px-1">
                            <span className="text-white/15 text-[10px] font-bold">VS</span>
                        </div>
                    )}
                    {showP2 && (
                        <SingleHeatmap data={p2Data} playerName={player2Name} playerColor={PB.p2} id="p2hm" wide={showSingle} />
                    )}
                </div>
            </motion.div>

            {/* Shot Type Distribution — compact */}
            {shotTypeSummary.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.08 }}
                    className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Target size={14} className="text-white/40" />
                        <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Shot Distribution by Type</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {shotTypeSummary.map((st, i) => {
                            const total = st.p1 + st.p2 || 1;
                            const p1Pct = (st.p1 / total) * 100;
                            return (
                                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 hover:bg-white/[0.06] transition-all">
                                    <p className="text-[10px] font-bold text-white/50 uppercase mb-1">{st.type}</p>
                                    <div className="flex justify-between text-[12px] font-bold mb-1">
                                        {showP1 && <span style={{ color: PB.p1 }}>{st.p1}</span>}
                                        {showP2 && <span style={{ color: PB.p2 }}>{st.p2}</span>}
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/5 flex overflow-hidden">
                                        <div className="h-full rounded-l-full" style={{ width: `${p1Pct}%`, background: PB.p1 }} />
                                        <div className="h-full rounded-r-full" style={{ width: `${100 - p1Pct}%`, background: PB.p2 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center gap-5 mt-2">
                        {showP1 && <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: PB.p1 }} />
                            <span className="text-[10px] font-bold text-white/40">{player1Name}</span>
                        </div>}
                        {showP2 && <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: PB.p2 }} />
                            <span className="text-[10px] font-bold text-white/40">{player2Name}</span>
                        </div>}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
