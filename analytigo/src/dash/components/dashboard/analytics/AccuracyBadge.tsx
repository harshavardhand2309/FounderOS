
import { AccuracyLevel } from "@/types/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

interface AccuracyBadgeProps {
    accuracy: AccuracyLevel;
    showTooltip?: boolean;
    className?: string;
}

const badgeConfig: Record<AccuracyLevel, { bg: string; text: string; border: string; label: string }> = {
    HIGH: {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'HIGH',
    },
    MEDIUM: {
        bg: 'bg-blue-500/15',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        label: 'MEDIUM',
    },
    ESTIMATED: {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        label: 'EST.',
    },
    ADVANCED: {
        bg: 'bg-purple-500/15',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        label: 'ADV.',
    },
};

export default function AccuracyBadge({ accuracy, showTooltip = true, className = '' }: AccuracyBadgeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const config = badgeConfig[accuracy];

    return (
        <div
            className={`relative inline-flex ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.span
                whileHover={{ scale: 1.05 }}
                className={`
                    inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase
                    ${config.bg} ${config.text} border ${config.border}
                    transition-colors duration-200 cursor-default select-none
                `}
            >
                {accuracy === 'ESTIMATED' && <AlertTriangle size={9} />}
                {accuracy === 'ADVANCED' && <Info size={9} />}
                {config.label}
            </motion.span>

            {/* Tooltip for ESTIMATED */}
            <AnimatePresence>
                {showTooltip && accuracy === 'ESTIMATED' && isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                    >
                        <div className="bg-neutral-900/95 backdrop-blur-xl border border-amber-500/20 rounded-lg px-3 py-2 shadow-xl shadow-black/40 max-w-[220px]">
                            <p className="text-amber-400 text-[9px] font-mono font-bold mb-0.5 flex items-center gap-1">
                                <AlertTriangle size={10} /> AI-ESTIMATED
                            </p>
                            <p className="text-white/60 text-[9px] font-mono leading-relaxed">
                                Based on trajectory modeling and probabilistic classification.
                            </p>
                        </div>
                        {/* Arrow */}
                        <div className="w-2 h-2 bg-neutral-900/95 border-r border-b border-amber-500/20 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
