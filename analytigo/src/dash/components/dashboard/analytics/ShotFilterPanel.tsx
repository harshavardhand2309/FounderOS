
import { ShotFilterState } from '@/types/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useEffect } from 'react';
import { applyStrictFilters, calculateBreakdown } from '@/utils/filterEngine';

export const DEFAULT_FILTERS: ShotFilterState = {
    shotTypes: ['serve', 'return', 'forehand', 'backhand', 'volley', 'smash', 'drop', 'lob', 'dink', 'drive'],
    tacticalDirections: [],  // NEW: Start with no tactical filters
    tacticalMode: 'strict',
    results: ['winner', 'error', 'in', 'out'],
    showWinners: true,
    showErrors: true,
    showIn: true,
    showOut: true,
    showNetClearance: false
};

interface ShotFilterPanelProps {
    filters: ShotFilterState;
    onChange: (filters: ShotFilterState) => void;
    sport: string;
    shots?: any[]; // For dynamic counting
    canonicalFilteredCount?: number;
    renderedCount?: number;
    shotTypeBreakdown?: Record<string, number>;
}

export default function ShotFilterPanel({
    filters,
    onChange,
    sport,
    shots = [],
    canonicalFilteredCount,
    renderedCount,
    shotTypeBreakdown,
}: ShotFilterPanelProps) {
    // ✅ Use centralized filter engine (single source of truth)
    const shotStats = useMemo(() => {
        if (!shots || shots.length === 0) {
            return { total: 0, winners: 0, errors: 0, in: 0, out: 0 };
        }

        // Apply strict filters using centralized engine
        const filtered = applyStrictFilters(shots, filters);

        // Calculate breakdown using computed result field (no priority hierarchy needed)
        return calculateBreakdown(filtered);
    }, [shots, filters]);

    // 🧪 DEBUG: Log filter state and results whenever they change
    useEffect(() => {
        console.group('📊 SHOT FILTER PANEL - Filter Update');
        console.log('Current Filters:', filters);
        console.log('Shot Stats:', shotStats);
        console.log('Results Array:', filters.results);
        console.log('Show Flags:', {
            showWinners: filters.showWinners,
            showErrors: filters.showErrors,
            showIn: filters.showIn,
            showOut: filters.showOut
        });

        // 🔍 DATA INTEGRITY CHECK: Look for overlapping result flags
        if (shots && shots.length > 0) {
            const overlaps = shots.filter(s => {
                const flags = [s.isWinner, s.isError, s.isIn, s.isOut].filter(Boolean);
                return flags.length > 1; // Shot has multiple result flags set
            });

            if (overlaps.length > 0) {
                console.warn(`⚠️ DATA INTEGRITY ISSUE: ${overlaps.length} shots have multiple result flags set`);
                console.table(overlaps.slice(0, 10).map(s => ({
                    type: s.type,
                    isWinner: s.isWinner || false,
                    isError: s.isError || false,
                    isIn: s.isIn || false,
                    isOut: s.isOut || false
                })));
            }
        }

        console.groupEnd();
    }, [filters, shotStats, shots]);

    const toggleShotType = (type: string) => {
        const newTypes = filters.shotTypes.includes(type)
            ? filters.shotTypes.filter(t => t !== type)
            : [...filters.shotTypes, type];
        onChange({ ...filters, shotTypes: newTypes });
    };

    const toggleResult = (result: string) => {
        const newResults = filters.results.includes(result)
            ? filters.results.filter(r => r !== result)
            : [...filters.results, result];
        onChange({ ...filters, results: newResults });
    };

    const toggleTacticalDirection = (direction: any) => {
        const currentDirections = filters.tacticalDirections || [];
        const newDirections = currentDirections.includes(direction)
            ? currentDirections.filter(d => d !== direction)
            : [...currentDirections, direction];
        onChange({ ...filters, tacticalDirections: newDirections });
    };

    const shotTypeOptions = sport === 'pickleball' ? [
        { value: 'serve', label: 'Serve', icon: '🏓' },
        { value: 'return', label: 'Return', icon: '↩️' },
        { value: 'dink', label: 'Dink', icon: '🎯' },
        { value: 'drive', label: 'Drive', icon: '💨' },
        { value: 'drop', label: 'Drop', icon: '🪂' },
        { value: 'lob', label: 'Lob', icon: '🌙' },
        { value: 'volley', label: 'Volley', icon: '⚡' },
        { value: 'smash', label: 'Smash', icon: '💥' },
    ] : [
        { value: 'serve', label: 'Serve', icon: '🎾' },
        { value: 'return', label: 'Return', icon: '↩️' },
        { value: 'forehand', label: 'FH', icon: '👉' },
        { value: 'backhand', label: 'BH', icon: '👈' },
        { value: 'volley', label: 'Volley', icon: '⚡' },
        { value: 'smash', label: 'Smash', icon: '💥' },
        { value: 'drop', label: 'Drop', icon: '🪂' },
        { value: 'lob', label: 'Lob', icon: '🌙' }
    ];

    const tacticalDirectionOptions = [
        { value: 'down-the-line', label: 'DTL', icon: '↕️' },
        { value: 'cross-court', label: 'Cross', icon: '↗️' },
        { value: 'inside-out', label: 'Ins-Out', icon: '↩️' },
        { value: 'inside-in', label: 'Ins-In', icon: '⤵️' },
        { value: 'angle', label: 'Angle', icon: '↪️' },
        { value: 'deep', label: 'Deep', icon: '🎯' },
        { value: 'approach', label: 'Approach', icon: '⬆️' },
        { value: 'pass', label: 'Pass', icon: '⚡' },
    ];

    const resultOptions = [
        { value: 'winner', label: 'Winners', icon: '✓', color: 'from-green-500 to-emerald-500' },
        { value: 'error', label: 'Errors', icon: '✗', color: 'from-red-500 to-rose-500' },
        { value: 'in', label: 'In', icon: '●', color: 'from-lime-500 to-green-500' },
        { value: 'out', label: 'Out', icon: '○', color: 'from-orange-500 to-amber-500' }
    ];


    const activeTotal = typeof canonicalFilteredCount === 'number' ? canonicalFilteredCount : shotStats.total;
    const parityOk = typeof renderedCount === 'number' ? renderedCount === activeTotal : true;

    return (
        <div className="space-y-3 h-full flex flex-col">
            {/* Live Shot Summary Bar */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={shotStats.total}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                    className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-xl p-3"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Active Shots</span>
                        <motion.span
                            key={activeTotal}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-lg font-black text-white"
                        >
                            {activeTotal}
                        </motion.span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        <div className="bg-green-500/10 border border-green-500/30 rounded px-1.5 py-1 text-center">
                            <div className="text-[10px] text-green-400 font-semibold">✓ Win</div>
                            <motion.div
                                key={shotStats.winners}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-black text-green-300"
                            >
                                {shotStats.winners}
                            </motion.div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded px-1.5 py-1 text-center">
                            <div className="text-[10px] text-red-400 font-semibold">✗ Err</div>
                            <motion.div
                                key={shotStats.errors}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-black text-red-300"
                            >
                                {shotStats.errors}
                            </motion.div>
                        </div>
                        <div className="bg-lime-500/10 border border-lime-500/30 rounded px-1.5 py-1 text-center">
                            <div className="text-[10px] text-lime-400 font-semibold">● In</div>
                            <motion.div
                                key={shotStats.in}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-black text-lime-300"
                            >
                                {shotStats.in}
                            </motion.div>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded px-1.5 py-1 text-center">
                            <div className="text-[10px] text-orange-400 font-semibold">○ Out</div>
                            <motion.div
                                key={shotStats.out}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-black text-orange-300"
                            >
                                {shotStats.out}
                            </motion.div>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-white/55">
                            Rendered: <span className="text-white/80">{typeof renderedCount === 'number' ? renderedCount : activeTotal}</span>
                        </span>
                        <span className={`${parityOk ? 'text-emerald-300' : 'text-red-300'}`}>
                            {parityOk ? 'Parity: OK' : 'Parity: Mismatch'}
                        </span>
                    </div>
                    {shotTypeBreakdown && (
                        <div className="mt-1 text-[10px] font-mono text-white/50">
                            Drop: {shotTypeBreakdown.drop || 0} • Lob: {shotTypeBreakdown.lob || 0}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Shot Types Section - 3 Column Grid */}
            <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <span className="text-blue-400">●</span>
                    Shot Types
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                    {shotTypeOptions.map((option) => {
                        const isActive = filters.shotTypes.includes(option.value);
                        return (
                            <motion.button
                                key={option.value}
                                whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(30, 144, 255, 0.4)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => toggleShotType(option.value)}
                                className={`
                                    px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200
                                    flex items-center justify-center gap-1 border
                                    ${isActive
                                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-400/50 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-blue-500/30'
                                    }
                                `}
                            >
                                <span className="text-xs">{option.icon}</span>
                                <span>{option.label}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Tactical Direction Section - NEW BROADCAST FEATURE */}
            <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <span className="text-cyan-400">●</span>
                    📍 Tactical Direction
                </h4>
                <div className="flex gap-2 mb-2">
                    {(['strict', 'tag'] as const).map(mode => {
                        const active = (filters.tacticalMode || 'tag') === mode;
                        return (
                            <button
                                key={mode}
                                onClick={() => onChange({ ...filters, tacticalMode: mode })}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all ${active
                                    ? 'bg-cyan-500/80 text-white border-cyan-300/60'
                                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}
                            >
                                {mode === 'strict' ? 'Strict' : 'Tag'}
                            </button>
                        );
                    })}
                    <span className="text-[10px] text-white/40 font-mono self-center">
                        {(filters.tacticalMode || 'tag') === 'strict' ? 'Geometry-validated' : 'Label match'}
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    {tacticalDirectionOptions.map((option) => {
                        const isActive = filters.tacticalDirections?.includes(option.value as any) || false;
                        return (
                            <motion.button
                                key={option.value}
                                whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(0, 207, 255, 0.4)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => toggleTacticalDirection(option.value)}
                                className={`
                                    px-1.5 py-1.5 rounded-lg text-[9px] font-bold transition-all duration-200
                                    flex flex-col items-center justify-center gap-0.5 border
                                    ${isActive
                                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/30'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-cyan-500/30'
                                    }
                                `}
                            >
                                <span className="text-sm">{option.icon}</span>
                                <span className="leading-none">{option.label}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Results Section - 2x2 Grid */}
            <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <span className="text-purple-400">●</span>
                    Result
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                    {resultOptions.map((option) => {
                        const isActive = filters.results.includes(option.value);
                        return (
                            <motion.button
                                key={option.value}
                                whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => toggleResult(option.value)}
                                className={`
                                    px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200
                                    flex items-center justify-center gap-1.5 border
                                    ${isActive
                                        ? `bg-gradient-to-br ${option.color} border-white/30 text-white shadow-lg`
                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                    }
                                `}
                            >
                                <span>{option.icon}</span>
                                <span>{option.label}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Net Analysis Toggle */}
            {sport === 'tennis' && (
                <div>
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                        <span className="text-yellow-400">●</span>
                        Net Analysis
                    </h4>
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(234, 179, 8, 0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onChange({ ...filters, showNetClearance: !filters.showNetClearance })}
                        className={`
                            w-full px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200
                            flex items-center justify-between border
                            ${filters.showNetClearance
                                ? 'bg-gradient-to-br from-yellow-500 to-amber-500 border-yellow-400/50 text-white shadow-lg shadow-yellow-500/30'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-yellow-500/30'
                            }
                        `}
                    >
                        <span>Net Clearance</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/20">
                            {filters.showNetClearance ? 'ON' : 'OFF'}
                        </span>
                    </motion.button>
                </div>
            )}
        </div>
    );
}
