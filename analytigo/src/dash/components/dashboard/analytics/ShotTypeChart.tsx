import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShotTypeDistribution } from '@/types/analytics';
import { Activity } from 'lucide-react';

interface Props {
    data: ShotTypeDistribution;
    playerName: string;
}

const COLORS: Record<string, string> = {
    Forehand: '#fbbf24',
    Backhand: '#f59e0b',
    Volley: '#10b981',
    Smash: '#ef4444',
    Serve: '#06b6d4',
    Drop: '#8b5cf6',
    Lob: '#ec4899',
};

const ShotTypeChart = ({ data, playerName }: Props) => {
    const chartData = [
        { name: 'Forehand', value: data.forehand },
        { name: 'Backhand', value: data.backhand },
        { name: 'Volley', value: data.volley },
        { name: 'Smash', value: data.smash },
        { name: 'Serve', value: data.serve },
        { name: 'Drop', value: data.drop || 0 },
        { name: 'Lob', value: data.lob || 0 },
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
        if (percent < 0.06) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
                {(percent * 100).toFixed(0)}%
            </text>
        );
    };

    return (
        <motion.div
            className="glass-panel glass-panel-hover p-6 rounded-3xl h-full relative overflow-hidden group hover-glow-gold"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <h3 className="text-white font-display font-bold mb-2 flex items-center gap-2 relative z-10">
                <Activity className="text-[#fbbf24]" size={20} />
                <span className="text-gradient-gold">SHOT DISTRIBUTION</span>
                <span className="text-white/30 text-xs font-mono ml-auto">{playerName}</span>
            </h3>

            <div className="h-[280px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            labelLine={false}
                            label={renderCustomLabel}
                            animationDuration={1000}
                            animationBegin={200}
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={COLORS[entry.name] || '#666'} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                                    return (
                                        <div className="bg-black/90 backdrop-blur-xl border border-amber-500/30 rounded-xl p-3 shadow-xl">
                                            <p className="text-xs font-mono font-bold" style={{ color: COLORS[d.name] }}>{d.name}</p>
                                            <p className="text-white font-bold text-lg">{Math.round(d.value)} Shots</p>
                                            <p className="text-white/40 text-[10px] font-mono">{pct}% of total</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1 relative z-10">
                {chartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-[10px] font-mono text-white/60">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[entry.name] }} />
                        {entry.name}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default ShotTypeChart;
