
import { useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface PreviewChip {
    label: string;
    value: string | number;
    color?: string;
}

interface InteractivePanelProps {
    title: string;
    icon: any;
    iconColor: string;
    glowColor: string; // e.g. "rgba(251,191,36,0.4)"
    previewChips: PreviewChip[];
    children: React.ReactNode;
    defaultOpen?: boolean;
}

// ── Animated Number Counter ──
const AnimatedValue = ({ value }: { value: string | number }) => (
    <motion.span
        key={String(value)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="font-bold"
    >
        {value}
    </motion.span>
);

export default function InteractivePanel({
    title,
    icon: Icon,
    iconColor,
    glowColor,
    previewChips,
    children,
    defaultOpen = false,
}: InteractivePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    // 3D tilt derived from mouse position
    const rotateX = useTransform(mouseY, [0, 1], [3, -3]);
    const rotateY = useTransform(mouseX, [0, 1], [-3, 3]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current || isOpen) return;
        const rect = cardRef.current.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
    };

    const handleMouseLeave = () => {
        mouseX.set(0.5);
        mouseY.set(0.5);
    };

    // Stagger children animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06,
                delayChildren: 0.1,
            },
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.2 },
        },
    };

    const itemVariants: import('framer-motion').Variants = {
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
        },
    };

    return (
        <motion.div
            ref={cardRef}
            className="interactive-panel-root mt-6"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            layout
        >
            {/* ── COLLAPSED: Preview Card ── */}
            <motion.div
                onClick={() => setIsOpen(!isOpen)}
                className={`interactive-panel cursor-pointer relative overflow-hidden rounded-2xl transition-all duration-500 ${isOpen ? 'interactive-panel-expanded' : ''}`}
                style={{
                    perspective: 1200,
                    // @ts-ignore - CSS custom property for dynamic glow
                    '--panel-glow': glowColor,
                } as any}
                whileHover={!isOpen ? {
                    translateY: -6,
                    transition: { duration: 0.3, ease: "easeOut" },
                } : undefined}
                layout
            >
                {/* Animated gradient border */}
                <div className="interactive-panel-border" />

                {/* Background glow */}
                <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                        background: `radial-gradient(800px circle at ${mouseX.get() * 100}% ${mouseY.get() * 100}%, ${glowColor.replace('0.4', '0.06')}, transparent 50%)`,
                    }}
                />

                {/* Content */}
                <motion.div
                    className="relative z-10 p-5"
                    style={!isOpen ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
                >
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 rounded-xl"
                            style={{ background: glowColor.replace('0.4', '0.15') }}
                            animate={isOpen ? { scale: [1, 1.1, 1] } : undefined}
                            transition={{ duration: 0.4 }}
                        >
                            <Icon className={iconColor} size={20} />
                        </motion.div>

                        <div className="flex-1">
                            <h3 className="text-white font-display font-bold text-sm uppercase tracking-wider">
                                {title}
                            </h3>
                        </div>

                        <motion.div
                            animate={{ rotate: isOpen ? 90 : 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <ChevronRight className="text-white/30" size={18} />
                        </motion.div>
                    </div>

                    {/* Preview Chips (collapsed only) */}
                    <AnimatePresence>
                        {!isOpen && previewChips.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-wrap gap-2 mt-3"
                            >
                                {previewChips.map((chip, i) => (
                                    <motion.div
                                        key={chip.label}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="preview-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8"
                                    >
                                        <span className="text-[10px] font-mono text-white/40 uppercase">{chip.label}</span>
                                        <span
                                            className="text-xs font-mono font-bold"
                                            style={{ color: chip.color || '#fff' }}
                                        >
                                            <AnimatedValue value={chip.value} />
                                        </span>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Expanded Content */}
                    <AnimatePresence initial={false}>
                        {isOpen && (
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="mt-5 pt-5 border-t border-white/8"
                            >
                                <motion.div variants={itemVariants}>
                                    {children}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
