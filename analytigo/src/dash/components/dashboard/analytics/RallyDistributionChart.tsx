import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RallyDistribution } from '@/types/analytics';
import { Sidebar } from 'lucide-react';

interface Props {
    data: RallyDistribution[];
}

const RallyDistributionChart = ({ data }: Props) => {
    return (
        <motion.div
            className="glass-panel glass-panel-hover p-6 rounded-3xl h-full relative overflow-hidden group hover-glow-emerald"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <h3 className="text-white font-display font-bold mb-4 flex items-center gap-2 relative z-10">
                <Sidebar className="text-[#10b981] rotate-90" size={20} />
                <span className="text-gradient-emerald">RALLY LENGTH</span>
            </h3>

            <div className="h-[200px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="rallyBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="length"
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            hide
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-3 shadow-xl">
                                            <p className="text-emerald-400 text-xs font-mono font-bold">{label} SHOTS</p>
                                            <p className="text-white font-bold text-lg">{data.count} Rallies</p>
                                            <p className="text-white/40 text-[10px] font-mono">{data.percentage}% of total</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1000}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="url(#rallyBarGradient)" />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-between mt-2 text-[10px] font-mono text-white/30 relative z-10">
                <span>SHORT (0-4)</span>
                <span>MEDIUM (5-8)</span>
                <span>LONG (9+)</span>
            </div>
        </motion.div>
    );
};

export default RallyDistributionChart;
