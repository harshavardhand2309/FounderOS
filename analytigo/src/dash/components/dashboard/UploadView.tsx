
import { useState } from "react";
import { Upload, FileVideo, FileSpreadsheet, Film, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface UploadViewProps {
    onUploadComplete: (file: File | null, type: 'video' | 'excel') => void;
}

export default function UploadView({ onUploadComplete }: UploadViewProps) {
    const [dragActive, setDragActive] = useState<'video' | 'excel' | null>(null);

    const handleDrag = (e: React.DragEvent, type: 'video' | 'excel') => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(type);
        } else if (e.type === "dragleave") {
            setDragActive(null);
        }
    };

    const handleDrop = (e: React.DragEvent, type: 'video' | 'excel') => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(null);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onUploadComplete(e.dataTransfer.files[0], type);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'excel') => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            onUploadComplete(e.target.files[0], type);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl mx-auto p-6"
        >
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black font-display text-white mb-4 uppercase tracking-tight">
                    Upload Match Data
                </h2>
                <p className="text-white/60 font-mono text-sm md:text-base max-w-2xl mx-auto">
                    Initialize analysis via match footage or raw telemetry data.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* VIDEO UPLOAD ZONE */}
                <div
                    className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden
                    ${dragActive === 'video' ? 'border-[#FFD700] bg-[#FFD700]/5 scale-[1.02]' : 'border-white/10 hover:border-[#FFD700]/50 hover:bg-white/5'}
                    `}
                    onDragEnter={(e) => handleDrag(e, 'video')}
                    onDragLeave={(e) => handleDrag(e, 'video')}
                    onDragOver={(e) => handleDrag(e, 'video')}
                    onDrop={(e) => handleDrop(e, 'video')}
                    onClick={() => document.getElementById('video-upload')?.click()}
                >
                    <input
                        type="file"
                        id="video-upload"
                        className="hidden"
                        accept="video/*"
                        onChange={(e) => handleChange(e, 'video')}
                    />

                    <div className="absolute inset-0 bg-gradient-to-tr from-[#FFD700]/0 to-[#FFD700]/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Film className="w-8 h-8 text-[#FFD700]" />
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 font-display uppercase">Upload Footage</h3>
                    <p className="text-white/40 font-mono text-xs mb-6">.MP4 .MOV (MAX 4GB)</p>

                    <div className="px-4 py-2 rounded-full border border-white/10 bg-black/20 text-[#FFD700] font-mono text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                        AI VISION ANALYSIS
                    </div>
                </div>

                {/* EXCEL UPLOAD ZONE */}
                <div
                    className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden
                    ${dragActive === 'excel' ? 'border-accent-blue bg-accent-blue/5 scale-[1.02]' : 'border-white/10 hover:border-accent-blue/50 hover:bg-white/5'}
                    `}
                    style={{ borderColor: dragActive === 'excel' ? '#4AB3FF' : '' }}
                    onDragEnter={(e) => handleDrag(e, 'excel')}
                    onDragLeave={(e) => handleDrag(e, 'excel')}
                    onDragOver={(e) => handleDrag(e, 'excel')}
                    onDrop={(e) => handleDrop(e, 'excel')}
                    onClick={() => document.getElementById('excel-upload')?.click()}
                >
                    <input
                        type="file"
                        id="excel-upload"
                        className="hidden"
                        accept=".xlsx, .csv"
                        onChange={(e) => handleChange(e, 'excel')}
                    />

                    <div className="absolute inset-0 bg-gradient-to-bl from-[#4AB3FF]/0 to-[#4AB3FF]/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <FileSpreadsheet className="w-8 h-8 text-[#4AB3FF]" />
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 font-display uppercase">Upload Data Sheet</h3>
                    <p className="text-white/40 font-mono text-xs mb-6">.XLSX .CSV (Auto-Parse)</p>

                    <div className="px-4 py-2 rounded-full border border-white/10 bg-black/20 text-[#4AB3FF] font-mono text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4AB3FF] animate-pulse" />
                        TELEMETRY IMPORT
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
