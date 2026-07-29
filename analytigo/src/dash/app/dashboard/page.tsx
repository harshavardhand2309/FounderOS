import { useCallback, useState } from 'react';
import '@/dash.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Upload, X, AlertTriangle } from 'lucide-react';
import UploadView from '@/components/dashboard/UploadView';
import ProcessingView from '@/components/dashboard/ProcessingView';
import AnalyticsView from '@/components/dashboard/AnalyticsView';
import CricketAnalyticsView from '@/components/dashboard/CricketAnalyticsView';
import FootballAnalyticsView from '@/components/dashboard/FootballAnalyticsView';
import PickleballAnalyticsView from '@/components/dashboard/PickleballAnalyticsView';
import { generateMockTennisData } from '@/utils/mockDataGenerator';
import { parseExcelFile } from '@/utils/excelParser';
import { MatchAnalytics } from '@/types/analytics';

import SportSelectionView from '@/components/dashboard/SportSelectionView';

/**
 * Ported from Sportsanalytics `src/app/dashboard/page.tsx` (pravin-on-cloud),
 * kept at the same path under src/dash so `diff` against upstream stays a
 * one-liner and the file can be re-synced.
 *
 * Everything that differs from upstream is marked ADAPTED (it cannot work here
 * as written) or HARDENED (upstream would break in front of a real user). The
 * view structure, class names, copy and animation timings are untouched.
 */

interface Props {
    /** ADAPTED: upstream is a page on its own host; here it opens over the
     *  Tennis page and has to be able to hand control back. */
    onExit: () => void;
    /** ADAPTED: reached from the Tennis card, so the sport is already known and
     *  we skip straight past selection. Omit it to start on the sport picker,
     *  which is upstream's own entry state. */
    initialSport?: string;
}

export default function DashboardPage({ onExit, initialSport }: Props) {
    const [viewState, setViewState] = useState<'selection' | 'upload' | 'processing' | 'analytics'>(
        initialSport ? 'upload' : 'selection',
    );
    const [selectedSport, setSelectedSport] = useState<string>(initialSport || 'tennis');
    const [analyticsData, setAnalyticsData] = useState<MatchAnalytics | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    // HARDENED: upstream silently substitutes a sample match when a file cannot
    // be parsed, so someone who uploads a video sees invented numbers presented
    // as their own. Tracked here so we can say so on screen.
    const [fellBack, setFellBack] = useState(false);

    const handleSportSelect = (sport: string) => {
        setSelectedSport(sport);
        setViewState('upload');
    };

    const handleUploadComplete = (file: File | null, _type: 'video' | 'excel') => {
        setUploadedFile(file);
        setFellBack(false);
        setViewState('processing');
    };

    // HARDENED (useCallback): ProcessingView keys its 5.5s completion timer on
    // [onComplete]. Upstream re-creates this function every render, so any
    // re-render during processing restarts the timer. Stable identity here.
    const handleProcessingComplete = useCallback(async () => {
        let data: MatchAnalytics | null = null;

        // HARDENED: upstream tests only `.endsWith('.xlsx')` although the input
        // accepts .csv, and calls parseExcelFile with no try/catch — a throw
        // leaves the user on the processing screen forever.
        if (uploadedFile && /\.(xlsx|xlsm|csv)$/i.test(uploadedFile.name)) {
            try {
                data = await parseExcelFile(uploadedFile, selectedSport);
            } catch {
                data = null;
            }
            // HARDENED: the parser reads shots from a sheet named "Point Data"
            // and returns a fully-formed but empty match for any workbook laid
            // out differently — the repo's own sample_tennis_match.xlsx uses
            // "Match Data" and lands here. Upstream accepts that as a success
            // and renders "PLAYER 1 vs PLAYER 2", 0 shots and an empty court.
            // Treat a workbook we understood nothing from as unreadable.
            if (data && !data.heatmaps.player1.length && !data.heatmaps.player2.length) {
                data = null;
            }
        }

        // Fallback to mock data if parsing failed or no file
        if (!data) {
            if (uploadedFile) setFellBack(true);
            data = generateMockTennisData(selectedSport);
        }

        setAnalyticsData(data);
        setViewState('analytics');
    }, [uploadedFile, selectedSport]);

    return (
        // ADAPTED: `lv-dash` scopes the Tailwind reset. Without it the reset is
        // global and flattens the site's legal pages.
        <main className="lv-dash min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0c0a1f] text-white relative overflow-x-hidden">

            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#06b6d4] rounded-full blur-[150px] opacity-[0.12]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#8b5cf6] rounded-full blur-[150px] opacity-[0.15]" />
                <div className="absolute top-[40%] left-[50%] w-[40vw] h-[40vw] bg-[#ec4899] rounded-full blur-[180px] opacity-[0.08]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
            </div>

            {/* CONTENT */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Navbar Placeholder */}
                <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        {viewState !== 'selection' && (
                            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/60">
                                {selectedSport} MODE
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {viewState !== 'selection' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setAnalyticsData(null);
                                        // HARDENED: upstream keeps uploadedFile, so
                                        // uploading a video after a sheet re-parses the
                                        // old sheet and shows the previous match.
                                        setUploadedFile(null);
                                        setFellBack(false);
                                        setViewState('upload');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                                >
                                    <Upload size={14} className="text-white/60 group-hover:text-white" />
                                    <span className="text-xs font-bold font-mono uppercase text-white/60 group-hover:text-white">Upload New</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setAnalyticsData(null);
                                        setUploadedFile(null);
                                        setFellBack(false);
                                        setViewState('selection');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-colors group"
                                >
                                    <Home size={14} className="text-blue-400 group-hover:text-blue-300" />
                                    <span className="text-xs font-bold font-mono uppercase text-blue-400 group-hover:text-blue-300">Change Sport</span>
                                </button>
                            </div>
                        )}

                        {/* ADAPTED: replaces upstream's <PillToggle />, which routes to
                            "/" and "/dashboard" on the Sportsanalytics host. Upstream
                            only renders it on the selection screen; here it is always
                            present, because once a sport is picked this would otherwise
                            be a screen with no way out. */}
                        <button
                            onClick={onExit}
                            aria-label="Close analytics"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0fb6a4]/15 hover:bg-[#0fb6a4]/25 border border-[#0fb6a4]/40 transition-colors group"
                        >
                            <X size={14} className="text-[#34e6d2]" />
                            <span className="text-xs font-bold font-mono uppercase text-[#34e6d2]">Close</span>
                        </button>
                    </div>
                </header>

                {/* HARDENED: see `fellBack` above. */}
                {fellBack && viewState === 'analytics' && (
                    <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm text-amber-100/90 leading-relaxed font-mono">
                            We could not read match data from that file, so this is a sample match — not your numbers.
                            Video analysis is not available on the website yet; upload a match sheet (.xlsx) or scan your
                            court QR in the app.
                        </p>
                    </div>
                )}

                <div className="flex-1 flex items-center justify-center p-4">
                    <AnimatePresence mode="wait">
                        {viewState === 'selection' && (
                            <motion.div
                                key="selection"
                                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                                transition={{ duration: 0.5 }}
                                className="w-full"
                            >
                                <SportSelectionView onSelect={handleSportSelect} />
                            </motion.div>
                        )}

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
                                {selectedSport === 'cricket' ? (
                                    <CricketAnalyticsView data={analyticsData} />
                                ) : selectedSport === 'football' ? (
                                    <FootballAnalyticsView data={analyticsData} />
                                ) : selectedSport === 'pickleball' ? (
                                    <PickleballAnalyticsView data={analyticsData} />
                                ) : (
                                    <AnalyticsView data={analyticsData} selectedSport={selectedSport} />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
