import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated Particles - Subtle background ambiance for broadcast theme
 * Deep blue particles that drift slowly across the background
 *
 * The field is generated once. This used to call Math.random() during render,
 * which reshuffled all 30 particles on every re-render and jittered visibly
 * under StrictMode's double-render in dev.
 */
export default function AnimatedParticles() {
    const particles = useMemo(
        () =>
            Array.from({ length: 30 }, () => ({
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                dx: Math.random() * 50 - 25,
                dy: Math.random() * 50 - 25,
                duration: 8 + Math.random() * 6,
                delay: Math.random() * 3,
            })),
        [],
    );

    return (
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[0.5px]"
                    style={{
                        left: p.left,
                        top: p.top,
                    }}
                    animate={{
                        x: [0, p.dx],
                        y: [0, p.dy],
                        opacity: [0.1, 0.4, 0.1],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: p.delay,
                    }}
                />
            ))}
        </div>
    );
}
