
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerStats } from '@/types/analytics';
import { Swords, Crown, Flame, Zap, Brain, Target, BarChart3, TrendingUp, ChevronRight } from 'lucide-react';

interface Props {
    player1: PlayerStats;
    player2: PlayerStats;
}

interface CompareMetric {
    label: string;
    p1: number;
    p2: number;
    unit?: string;
    highIsGood: boolean;
    category: 'serving' | 'aggression' | 'errors' | 'efficiency';
}

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
const AnimatedValue = ({ value, unit = '', color }: { value: number; unit?: string; color: string }) => (
    <motion.span
        className="font-display font-black text-base tabular-nums"
        style={{ color }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
    >
        {value}{unit}
    </motion.span>
);

/* ═══════════════════════════════════════════
   DUAL COMPARISON BAR
   ═══════════════════════════════════════════ */
const ComparisonBar = ({ m, idx }: { m: CompareMetric; idx: number }) => {
    const [hovered, setHovered] = useState(false);
    const total = m.p1 + m.p2 || 1;
    const p1Pct = (m.p1 / total) * 100;
    const p2Pct = (m.p2 / total) * 100;
    const p1Better = m.highIsGood ? m.p1 > m.p2 : m.p1 < m.p2;
    const p2Better = m.highIsGood ? m.p2 > m.p1 : m.p2 < m.p1;
    const diff = Math.abs(m.p1 - m.p2);
    const diffPct = total > 0 ? ((diff / Math.max(m.p1, m.p2)) * 100).toFixed(0) : '0';

    return (
        <motion.div
            className="relative group/row cursor-default"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.04 }}
        >
            <div className="flex items-center px-4 py-2.5 rounded-xl transition-all duration-300"
                style={{ background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent' }}>

                {/* P1 Value */}
                <div className="w-14 text-right shrink-0">
                    <AnimatedValue value={m.p1} unit={m.unit} color={p1Better ? '#FACC15' : 'rgba(255,255,255,0.35)'} />
                </div>

                {/* Bar container */}
                <div className="flex-1 mx-3">
                    {/* Label */}
                    <div className="text-center mb-1">
                        <span className="text-[10px] font-mono font-semibold text-white/60 uppercase tracking-[0.15em]">{m.label}</span>
                    </div>

                    {/* Dual bar */}
                    <div className="flex h-2 gap-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {/* P1 bar - grows right */}
                        <div className="flex-1 flex justify-end overflow-hidden rounded-l-full">
                            <motion.div
                                className="h-full rounded-l-full"
                                style={{
                                    background: p1Better
                                        ? 'linear-gradient(90deg, transparent, #FACC15)'
                                        : 'linear-gradient(90deg, transparent, rgba(250,204,21,0.3))',
                                    boxShadow: p1Better ? '0 0 12px rgba(250,204,21,0.3)' : 'none',
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${p1Pct}%` }}
                                transition={{ duration: 1, delay: idx * 0.05 + 0.2, ease: [0.4, 0, 0.2, 1] }}
                            />
                        </div>
                        {/* Center divider */}
                        <div className="w-0.5 h-full bg-white/10 shrink-0" />
                        {/* P2 bar - grows left */}
                        <div className="flex-1 overflow-hidden rounded-r-full">
                            <motion.div
                                className="h-full rounded-r-full"
                                style={{
                                    background: p2Better
                                        ? 'linear-gradient(270deg, transparent, #22D3EE)'
                                        : 'linear-gradient(270deg, transparent, rgba(34,211,238,0.3))',
                                    boxShadow: p2Better ? '0 0 12px rgba(34,211,238,0.3)' : 'none',
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${p2Pct}%` }}
                                transition={{ duration: 1, delay: idx * 0.05 + 0.3, ease: [0.4, 0, 0.2, 1] }}
                            />
                        </div>
                    </div>
                </div>

                {/* P2 Value */}
                <div className="w-14 shrink-0">
                    <AnimatedValue value={m.p2} unit={m.unit} color={p2Better ? '#22D3EE' : 'rgba(255,255,255,0.35)'} />
                </div>
            </div>

            {/* Hover tooltip */}
            <AnimatePresence>
                {hovered && diff > 0 && (
                    <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="px-3 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap"
                            style={{
                                background: 'rgba(0,0,0,0.9)',
                                border: `1px solid ${p1Better ? 'rgba(250,204,21,0.3)' : 'rgba(34,211,238,0.3)'}`,
                                boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
                                color: p1Better ? '#FACC15' : '#22D3EE',
                            }}>
                            <span className="text-white/50">+{diff}{m.unit || ''}</span>{' '}
                            <span className="font-bold">{p1Better ? '◀' : '▶'} {diffPct}% advantage</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════
   PERFORMANCE INDEX RING
   ═══════════════════════════════════════════ */
const PerfRing = ({ value, color, label }: { value: number; color: string; label: string }) => {
    const r = 22;
    const circumference = 2 * Math.PI * r;
    const fill = (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width={54} height={54} viewBox="0 0 54 54">
                    <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={3.5} />
                    <motion.circle
                        cx={27} cy={27} r={r} fill="none" stroke={color} strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeDasharray={`${fill} ${circumference - fill}`}
                        strokeDashoffset={circumference * 0.25}
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${fill} ${circumference - fill}` }}
                        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                        style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-display font-black text-xs">{value}</span>
                </div>
            </div>
            <span className="text-white/50 text-[8px] font-mono font-semibold uppercase tracking-wider mt-1">{label}</span>
        </div>
    );
};

/* ═══════════════════════════════════════════
   CATEGORY TABS
   ═══════════════════════════════════════════ */
const categories = [
    { key: 'all', label: 'All', icon: BarChart3 },
    { key: 'serving', label: 'Serve', icon: Flame },
    { key: 'aggression', label: 'Attack', icon: Zap },
    { key: 'errors', label: 'Errors', icon: Brain },
    { key: 'efficiency', label: 'Clutch', icon: Target },
] as const;
type CategoryKey = typeof categories[number]['key'];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const PlayerComparison = ({ player1, player2 }: Props) => {
    const [activeTab, setActiveTab] = useState<CategoryKey>('all');

    const metrics: CompareMetric[] = useMemo(() => [
        { label: 'Aces', p1: player1.aces, p2: player2.aces, highIsGood: true, category: 'serving' },
        { label: '1st Serve %', p1: player1.firstServePercentage, p2: player2.firstServePercentage, unit: '%', highIsGood: true, category: 'serving' },
        { label: 'Win % 1st', p1: player1.winPercentageFirstServe, p2: player2.winPercentageFirstServe, unit: '%', highIsGood: true, category: 'efficiency' },
        { label: 'Double Faults', p1: player1.doubleFaults, p2: player2.doubleFaults, highIsGood: false, category: 'errors' },
        { label: 'Winners', p1: player1.winners, p2: player2.winners, highIsGood: true, category: 'aggression' },
        { label: 'Unforced Err', p1: player1.unforcedErrors, p2: player2.unforcedErrors, highIsGood: false, category: 'errors' },
        { label: 'Net Points', p1: player1.netPointsWon, p2: player2.netPointsWon, highIsGood: true, category: 'aggression' },
        { label: 'Break Pts', p1: player1.breakPointsWon, p2: player2.breakPointsWon, highIsGood: true, category: 'efficiency' },
    ], [player1, player2]);

    const filteredMetrics = activeTab === 'all' ? metrics : metrics.filter(m => m.category === activeTab);

    // Overall score
    let p1Wins = 0, p2Wins = 0;
    metrics.forEach(m => {
        if (m.highIsGood ? m.p1 > m.p2 : m.p1 < m.p2) p1Wins++;
        if (m.highIsGood ? m.p2 > m.p1 : m.p2 < m.p1) p2Wins++;
    });
    const overallWinner = p1Wins > p2Wins ? 'p1' : p2Wins > p1Wins ? 'p2' : null;

    // Performance Index (simple composite)
    const p1Perf = Math.min(99, Math.round(
        (player1.firstServePercentage * 0.3 + player1.winPercentageFirstServe * 0.3 +
            (player1.winners / Math.max(player1.winners + player1.unforcedErrors, 1)) * 100 * 0.2 +
            (player1.aces / Math.max(player1.aces + player1.doubleFaults, 1)) * 100 * 0.2)
    ));
    const p2Perf = Math.min(99, Math.round(
        (player2.firstServePercentage * 0.3 + player2.winPercentageFirstServe * 0.3 +
            (player2.winners / Math.max(player2.winners + player2.unforcedErrors, 1)) * 100 * 0.2 +
            (player2.aces / Math.max(player2.aces + player2.doubleFaults, 1)) * 100 * 0.2)
    ));

    return (
        <motion.div
            className="relative overflow-hidden flex flex-col min-h-[600px]"
            style={{
                background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 50px rgba(99,102,241,0.06), 0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
        >
            {/* Grid background */}
            <div className="absolute inset-0 opacity-[0.02]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {/* Center glowing divider */}
            <motion.div
                className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 z-0"
                style={{ background: 'linear-gradient(180deg, transparent, rgba(139,92,246,0.3), rgba(139,92,246,0.5), rgba(139,92,246,0.3), transparent)' }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Neon edges */}
            <div className="absolute -inset-px rounded-[24px] pointer-events-none"
                style={{ background: 'linear-gradient(160deg, rgba(250,204,21,0.12), transparent 30%, transparent 70%, rgba(34,211,238,0.12))', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor', WebkitMaskComposite: 'xor', padding: 1 }} />

            <div className="relative z-10">

                {/* ── HEADER WITH TITLE ── */}
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.15)' }}>
                            <Swords size={14} className="text-purple-400" />
                        </div>
                        <h3 className="text-white font-display font-bold text-sm tracking-wide">HEAD TO HEAD</h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-transparent" />
                    </div>

                    {/* ── PLAYER PANELS ── */}
                    <div className="flex items-center justify-between">
                        {/* P1 */}
                        <motion.div className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                            {/* Avatar ring */}
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black font-display"
                                    style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)', color: '#000' }}>
                                    {player1.name.charAt(0)}
                                </div>
                                {/* Glow ring */}
                                <div className="absolute -inset-[3px] rounded-full pointer-events-none"
                                    style={{
                                        border: overallWinner === 'p1' ? '2px solid rgba(250,204,21,0.5)' : '2px solid rgba(250,204,21,0.15)',
                                        boxShadow: overallWinner === 'p1' ? '0 0 15px rgba(250,204,21,0.3)' : 'none',
                                    }} />
                                {overallWinner === 'p1' && (
                                    <motion.div className="absolute -top-1 -right-1"
                                        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                        <Crown size={14} style={{ color: '#FACC15', filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.5))' }} />
                                    </motion.div>
                                )}
                            </div>
                            <div>
                                <p className="text-white font-display font-bold text-sm leading-tight">{player1.name}</p>
                                <div className="h-0.5 w-10 rounded-full mt-1" style={{ background: 'linear-gradient(90deg, #FACC15, transparent)' }} />
                                {overallWinner === 'p1' && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <Flame size={9} style={{ color: '#FACC15' }} />
                                        <span className="text-[8px] font-mono text-[#FACC15]/70">{p1Wins}/{metrics.length} WINS</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* VS + Performance rings */}
                        <div className="flex flex-col items-center gap-1 mx-2">
                            <div className="flex items-center gap-3">
                                <PerfRing value={p1Perf} color="#FACC15" label="PIX" />
                                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)' }}>
                                    <span className="text-[10px] font-display font-black text-white/20">VS</span>
                                </div>
                                <PerfRing value={p2Perf} color="#22D3EE" label="PIX" />
                            </div>
                        </div>

                        {/* P2 */}
                        <motion.div className="flex items-center gap-3 flex-row-reverse"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black font-display"
                                    style={{ background: 'linear-gradient(135deg, #22D3EE, #06B6D4)', color: '#000' }}>
                                    {player2.name.charAt(0)}
                                </div>
                                <div className="absolute -inset-[3px] rounded-full pointer-events-none"
                                    style={{
                                        border: overallWinner === 'p2' ? '2px solid rgba(34,211,238,0.5)' : '2px solid rgba(34,211,238,0.15)',
                                        boxShadow: overallWinner === 'p2' ? '0 0 15px rgba(34,211,238,0.3)' : 'none',
                                    }} />
                                {overallWinner === 'p2' && (
                                    <motion.div className="absolute -top-1 -right-1"
                                        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                        <Crown size={14} style={{ color: '#22D3EE', filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.5))' }} />
                                    </motion.div>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-white font-display font-bold text-sm leading-tight">{player2.name}</p>
                                <div className="h-0.5 w-10 rounded-full mt-1 ml-auto" style={{ background: 'linear-gradient(270deg, #22D3EE, transparent)' }} />
                                {overallWinner === 'p2' && (
                                    <div className="flex items-center gap-1 mt-1 justify-end">
                                        <Flame size={9} style={{ color: '#22D3EE' }} />
                                        <span className="text-[8px] font-mono text-[#22D3EE]/70">{p2Wins}/{metrics.length} WINS</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ── CATEGORY TABS ── */}
                <div className="px-5 py-2">
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {categories.map(cat => {
                            const Icon = cat.icon;
                            const isActive = activeTab === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => setActiveTab(cat.key)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-300"
                                    style={{
                                        background: isActive ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.2))' : 'transparent',
                                        color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.50)',
                                        boxShadow: isActive ? '0 0 16px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                                        border: isActive ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                                    }}
                                >
                                    <Icon size={13} />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── COMPARISON BARS ── */}
                <div className="flex-1 flex flex-col px-1 py-1" style={{ minHeight: '320px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            className="flex-1 flex flex-col justify-evenly"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        >
                            {filteredMetrics.map((m, idx) => (
                                <ComparisonBar key={m.label} m={m} idx={idx} />
                            ))}
                            {filteredMetrics.length === 0 && (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center py-8 text-white/20 text-xs font-mono">No metrics in this category</div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── SCORE STRIP FOOTER ── */}
                <div className="px-5 py-4">
                    {/* Dominance bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <motion.div
                                className="rounded-l-full"
                                style={{ background: 'linear-gradient(90deg, #FACC15, #F59E0B)', boxShadow: '0 0 10px rgba(250,204,21,0.3)' }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${(p1Wins / metrics.length) * 100}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                            />
                            <div className="w-px bg-white/10 shrink-0" />
                            <motion.div
                                className="rounded-r-full ml-auto"
                                style={{ background: 'linear-gradient(270deg, #22D3EE, #06B6D4)', boxShadow: '0 0 10px rgba(34,211,238,0.3)' }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${(p2Wins / metrics.length) * 100}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[#FACC15] font-display font-black text-sm">{p1Wins}</span>
                            <span className="text-white/10 text-xs">·</span>
                            <span className="text-[#22D3EE] font-display font-black text-sm">{p2Wins}</span>
                        </div>
                    </div>

                    {/* Stat summary micro-strip */}
                    <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                            <TrendingUp size={10} className="text-white/30" />
                            <span className="text-[9px] font-mono font-semibold text-white/45">
                                {overallWinner === 'p1' ? player1.name.split(' ').pop() : overallWinner === 'p2' ? player2.name.split(' ').pop() : 'Tied'} leads
                            </span>
                        </div>
                        <div className="w-px h-2.5 bg-white/12" />
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono font-semibold text-white/45">PIX {p1Perf} vs {p2Perf}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PlayerComparison;
