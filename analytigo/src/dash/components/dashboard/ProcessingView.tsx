
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const LOADING_STEPS = [
    "INITIALIZING_NEURAL_NETWORKS...",
    "INGESTING_MATCH_TELEMETRY...",
    "CALCULATING_BALL_TRAJECTORY_VECTORS...",
    "MAPPING_PLAYER_HEATMAPS [GRID_SIZE: 1024x1024]...",
    "COMPUTING_MOMENTUM_INDEX...",
    "GENERATING_PREDICTIVE_INSIGHTS...",
    "FINALIZING_DASHBOARD_RENDER..."
];

interface ProcessingViewProps {
    onComplete: () => void;
}

export default function ProcessingView({ onComplete }: ProcessingViewProps) {
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const duration = 5000; // 5 seconds
        const stepInterval = duration / LOADING_STEPS.length;
        const progressIntervalTime = 50;

        // Progress Bar
        const progressTimer = setInterval(() => {
            setProgress(prev => {
                const next = prev + (100 / (duration / progressIntervalTime));
                return next >= 100 ? 100 : next;
            });
        }, progressIntervalTime);

        // Text Steps
        const stepTimer = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < LOADING_STEPS.length - 1) return prev + 1;
                return prev;
            });
        }, stepInterval);

        // Completion
        const completeTimer = setTimeout(() => {
            onComplete();
        }, duration + 500); // Slight buffer

        return () => {
            clearInterval(progressTimer);
            clearInterval(stepTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6">
            {/* Spinning Loader / Logo */}
            <div className="relative w-32 h-32 mb-12">
                <div className="absolute inset-0 rounded-full border-b-2 border-t-2 border-[#FFD700] animate-spin" />
                <div className="absolute inset-4 rounded-full border-l-2 border-r-2 border-[#4AB3FF] animate-spin-reverse opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-white text-xl animate-pulse">
                    AI
                </div>
            </div>

            {/* Terminal Lines */}
            <div className="w-full bg-black/40 rounded-xl p-6 border border-white/10 font-mono text-sm mb-8 h-48 overflow-hidden flex flex-col justify-end">
                {LOADING_STEPS.slice(0, currentStep + 1).map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`mb-2 ${i === currentStep ? 'text-[#FFD700]' : 'text-white/40'}`}
                    >
                        {`> ${step}`} {i === currentStep && <span className="animate-pulse">_</span>}
                    </motion.div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFED4A]"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="w-full flex justify-between mt-2 text-xs font-mono text-white/40">
                <span>PROCESSING_DATAPOINTS: {Math.floor(progress * 154)}</span>
                <span>{Math.floor(progress)}%</span>
            </div>
        </div>
    );
}
