import { useCallback, useState } from 'react';
import './dash.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Sparkles, AlertTriangle } from 'lucide-react';
import UploadView from '@/components/dashboard/UploadView';
import ProcessingView from '@/components/dashboard/ProcessingView';
import AnalyticsView from '@/components/dashboard/AnalyticsView';
import { generateMockTennisData } from '@/utils/mockDataGenerator';
import { parseExcelFile } from '@/utils/excelParser';
import type { MatchAnalytics } from '@/types/analytics';

type ViewState = 'upload' | 'processing' | 'analytics';
type Source = 'file' | 'sample';

interface Props {
    /** Return to the Tennis page. */
    onExit: () => void;
}

const SPORT = 'tennis';

/**
 * Tennis analytics, rendered inside the Lvl-Up site rather than on a separate
 * host. Ported from the Sportsanalytics dashboard route.
 *
 * The sport selector is gone: this is reached from the Tennis page, so the
 * sport is known. The upload step stays because the website keeps manual
 * upload; the mobile app's QR flow will hand a match in directly, which is the
 * same code path as "sample match" below — state goes straight to 'processing'
 * with data already resolved.
 */
export default function TennisAnalyticsApp({ onExit }: Props) {
    const [viewState, setViewState] = useState<ViewState>('upload');
    const [analyticsData, setAnalyticsData] = useState<MatchAnalytics | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [source, setSource] = useState<Source>('sample');
    const [fellBack, setFellBack] = useState(false);

    const handleUploadComplete = useCallback((file: File | null) => {
        setUploadedFile(file);
        setSource('file');
        setFellBack(false);
        setViewState('processing');
    }, []);

    const handleUseSample = useCallback(() => {
        setUploadedFile(null);
        setSource('sample');
        setFellBack(false);
        setViewState('processing');
    }, []);

    // Memoised: ProcessingView keys its 5.5s timer effect on this callback, so
    // an unstable identity would restart the timer and it would never fire.
    const handleProcessingComplete = useCallback(async () => {
        let data: MatchAnalytics | null = null;

        if (uploadedFile && /\.(xlsx|xlsm|csv)$/i.test(uploadedFile.name)) {
            try {
                data = await parseExcelFile(uploadedFile, SPORT);
            } catch {
                data = null;
            }
        }

        // Anything we could not read — a video, an unreadable sheet, or no file
        // at all — falls back to a sample match. Say so rather than passing
        // sample numbers off as the user's own.
        if (!data) {
            if (source === 'file') setFellBack(true);
            data = generateMockTennisData(SPORT);
        }

        setAnalyticsData(data);
        setViewState('analytics');
    }, [uploadedFile, source]);

    const backToUpload = useCallback(() => {
        setAnalyticsData(null);
        setUploadedFile(null);   // otherwise a later video re-parses the old sheet
        setFellBack(false);
        setViewState('upload');
    }, []);

    return (
        <div className="lv-dash min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0c0a1f] text-white relative overflow-x-hidden">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#06b6d4] rounded-full blur-[150px] opacity-[0.12]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#8b5cf6] rounded-full blur-[150px] opacity-[0.15]" />
                <div className="absolute top-[40%] left-[50%] w-[40vw] h-[40vw] bg-[#ec4899] rounded-full blur-[180px] opacity-[0.08]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col">
                <header className="px-4 md:px-6 py-4 flex justify-between items-center gap-3 border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/60 whitespace-nowrap">
                            Tennis Mode
                        </span>
                        {viewState === 'analytics' && (
                            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-white/40 truncate">
                                {source === 'file' && !fellBack ? uploadedFile?.name : 'Sample match'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {viewState !== 'upload' && (
                            <button
                                onClick={backToUpload}
                                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                            >
                                <Upload size={14} className="text-white/60 group-hover:text-white" />
                                <span className="hidden sm:inline text-xs font-bold font-mono uppercase text-white/60 group-hover:text-white">New Match</span>
                            </button>
                        )}
                        <button
                            onClick={onExit}
                            aria-label="Close analytics"
                            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-[#0fb6a4]/15 hover:bg-[#0fb6a4]/25 border border-[#0fb6a4]/40 transition-colors group"
                        >
                            <X size={14} className="text-[#34e6d2]" />
                            <span className="hidden sm:inline text-xs font-bold font-mono uppercase text-[#34e6d2]">Close</span>
                        </button>
                    </div>
                </header>

                {fellBack && viewState === 'analytics' && (
                    <div className="mx-4 md:mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm text-amber-100/90 leading-relaxed">
                            We could not read match data from that file, so this is a sample match — not your numbers.
                            Video analysis is not available on the website yet; upload a match sheet (.xlsx) or scan your
                            court QR in the app.
                        </p>
                    </div>
                )}

                <div className="flex-1 flex items-center justify-center p-4">
                    <AnimatePresence mode="wait">
                        {viewState === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                                transition={{ duration: 0.5 }}
                                className="w-full"
                            >
                                <UploadView onUploadComplete={handleUploadComplete} />
                                <div className="flex flex-col items-center gap-3 mt-2">
                                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest">or</p>
                                    <button
                                        onClick={handleUseSample}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#4AB3FF]/50 transition-colors"
                                    >
                                        <Sparkles size={16} className="text-[#4AB3FF]" />
                                        <span className="text-sm font-bold font-mono uppercase tracking-wide text-white/80">
                                            Explore a sample match
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {viewState === 'processing' && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                                className="w-full"
                            >
                                <ProcessingView onComplete={handleProcessingComplete} />
                            </motion.div>
                        )}

                        {viewState === 'analytics' && analyticsData && (
                            <motion.div
                                key="analytics"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="w-full"
                            >
                                <AnalyticsView data={analyticsData} selectedSport={SPORT} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
