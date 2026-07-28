import React from 'react';
import { motion } from 'framer-motion';
import { BreakPointStats } from '@/types/analytics';
import { AlertCircle, Shield, Target } from 'lucide-react';

interface Props {
    player1: BreakPointStats;
    player2: BreakPointStats;
    player1Name: string;
    player2Name: string;
    selectedPlayer: 'all' | 'player1' | 'player2';
}

/* ── Compact Arc Gauge ── */
const ArcGauge = ({ value, max, rate, color, size = 64 }: { value: number; max: number; rate: number; color: string; size?: number }) => {
    const r = (size - 8) / 2;
    const c = size / 2;
    const circumference = Math.PI * r; // semicircle
    const fillLen = (rate / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size / 2 + 6} viewBox={`0 0 ${size} ${size / 2 + 6}`}>
                {/* Track */}
                <path
                    d={`M 4 ${c} A ${r} ${r} 0 0 1 ${size - 4} ${c}`}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} strokeLinecap="round"
                />
                {/* Fill */}
                <path
                    d={`M 4 ${c} A ${r} ${r} 0 0 1 ${size - 4} ${c}`}
                    fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
                    strokeDasharray={`${fillLen} ${circumference}`}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
            </svg>
            <span className="text-white font-display font-black text-lg -mt-3">{Math.round(rate)}%</span>
        </div>
    );
};

const BreakPointAnalysis = ({ player1, player2, player1Name, player2Name, selectedPlayer }: Props) => {

    const renderPlayer = (stats: BreakPointStats, name: string, accentColor: string, isP1: boolean) => (
        <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: isP1 ? 0 : 0.1 }}
        >
            {/* Player label */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded-full" style={{ background: accentColor }} />
                <span className="text-white font-display font-bold text-xs truncate">{name}</span>
            </div>

            {/* Conversion gauge */}
            <div className="flex flex-col items-center mb-3">
                <ArcGauge value={stats.converted} max={stats.opportunities} rate={stats.conversionRate} color="#10b981" size={72} />
                <div className="flex items-center gap-1.5 mt-1">
                    <Target size={10} style={{ color: '#10b981' }} />
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Converted</span>
                </div>
                <span className="text-white/60 text-xs font-mono font-bold mt-0.5">{stats.converted}/{stats.opportunities}</span>
            </div>

            {/* Save rate */}
            <div className="flex flex-col items-center">
                <ArcGauge value={stats.saved} max={stats.opportunities} rate={stats.saveRate} color="#06b6d4" size={72} />
                <div className="flex items-center gap-1.5 mt-1">
                    <Shield size={10} style={{ color: '#06b6d4' }} />
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Saved</span>
                </div>
                <span className="text-white/60 text-xs font-mono font-bold mt-0.5">{stats.saved}</span>
            </div>
        </motion.div>
    );

    return (
        <motion.div
            className="glass-panel glass-panel-hover p-5 rounded-3xl h-full relative overflow-hidden group hover-glow-red"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <h3 className="text-white font-display font-bold mb-4 flex items-center gap-2 relative z-10 text-sm">
                <AlertCircle className="text-[#ef4444] shrink-0" size={18} />
                <span className="text-gradient-red">BREAK POINT ANALYSIS</span>
            </h3>

            <div className="flex gap-4 relative z-10">
                {selectedPlayer !== 'player2' && renderPlayer(player1, player1Name, '#fbbf24', true)}

                {selectedPlayer === 'all' && (
                    <div className="w-px bg-white/8 self-stretch shrink-0" />
                )}

                {selectedPlayer !== 'player1' && renderPlayer(player2, player2Name, '#06b6d4', false)}
            </div>
        </motion.div>
    );
};

export default BreakPointAnalysis;
