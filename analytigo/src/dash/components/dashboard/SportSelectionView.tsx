
import { motion } from "framer-motion";
import { Activity, Trophy, Target, Zap, CircleDot } from "lucide-react";

interface SportSelectionViewProps {
    onSelect: (sport: string) => void;
}

const sports = [
    {
        id: "tennis",
        name: "Tennis",
        icon: Activity,
        description: "Serve biomechanics, shot placement, and match momentum analysis.",
        color: "from-yellow-400 to-orange-500",
        glow: "shadow-yellow-500/20",
        border: "group-hover:border-yellow-500/50"
    },
    {
        id: "cricket",
        name: "Cricket",
        icon: Trophy,
        description: "Delivery kinematics, pitch maps, and wagon wheel visualization.",
        color: "from-blue-400 to-cyan-500",
        glow: "shadow-cyan-500/20",
        border: "group-hover:border-blue-500/50"
    },
    {
        id: "football",
        name: "Football",
        icon: Target,
        description: "Heat maps, passing networks, and xG performance tracking.",
        color: "from-emerald-400 to-green-600",
        glow: "shadow-emerald-500/20",
        border: "group-hover:border-emerald-500/50"
    },
    {
        id: "pickleball",
        name: "Pickleball",
        icon: Zap,
        description: "Reaction time, dink patterns, and kitchen zone analysis.",
        color: "from-purple-400 to-pink-500",
        glow: "shadow-purple-500/20",
        border: "group-hover:border-purple-500/50"
    }
];

export default function SportSelectionView({ onSelect }: SportSelectionViewProps) {
    return (
        <div className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
            >
                <div className="flex items-center justify-center gap-2 mb-4">
                    <CircleDot className="text-white/40 animate-pulse" size={16} />
                    <span className="text-xs font-mono font-bold text-white/40 tracking-[0.3em] uppercase">System Ready</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black font-display text-white tracking-tight mb-4">
                    SELECT <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">SPORT</span> MODE
                </h2>
                <p className="text-lg text-white/50 max-w-xl mx-auto font-light leading-relaxed">
                    Choose a sport to initialize the specific analytics engine and 3D environment.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                {sports.map((sport, index) => (
                    <motion.button
                        key={sport.id}
                        onClick={() => onSelect(sport.id)}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-left flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl ${sport.glow} ${sport.border}`}
                    >
                        {/* Hover Gradient Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${sport.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        <div className="relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sport.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                <sport.icon className="text-white" size={28} strokeWidth={2} />
                            </div>

                            <h3 className="text-2xl font-bold text-white font-display mb-2">{sport.name}</h3>
                            <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                                {sport.description}
                            </p>
                        </div>

                        <div className="relative z-10 mt-8 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
                            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${sport.color}`}>Initialize</span>
                            <span className="text-white/40">→</span>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
