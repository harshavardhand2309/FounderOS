
import type { AnalysisSession, ShotAnalysis, HeatmapPoint, Point3D } from "@/types/schema";

const generateRandomID = () => Math.random().toString(36).substring(7);

const MOCK_NAMES = ["Carlos Alcaraz", "Jannik Sinner", "Novak Djokovic", "Iga Swiatek"];
const SHOT_TYPES = ["serve", "forehand", "backhand", "smash", "volley"] as const;

export const generateMockSession = (): AnalysisSession => {
    return {
        id: generateRandomID(),
        athleteName: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
        date: new Date().toISOString(),
        durationSeconds: 3600,
        shots: Array.from({ length: 20 }).map(() => ({
            id: generateRandomID(),
            type: SHOT_TYPES[Math.floor(Math.random() * SHOT_TYPES.length)],
            speedKmph: Math.floor(140 + Math.random() * 80), // 140-220 kmph
            spinRateRpm: Math.floor(2000 + Math.random() * 2000), // 2000-4000 rpm
            impactHeightCm: Math.floor(50 + Math.random() * 150),
            skeletalEfficiencyScore: Math.floor(70 + Math.random() * 30),
            videoTimestamp: Math.floor(Math.random() * 300),
        })),
        heatmap: Array.from({ length: 50 }).map(() => ({
            x: 0.2 + Math.random() * 0.6, // Center court bias
            y: 0.2 + Math.random() * 0.6,
            intensity: Math.random(),
        })),
        metrics: {
            averageSpeed: 168,
            consistencyScore: 89,
            fatigueIndex: 42,
            clutchScore: 94,
            injuryRisk: "low",
        },
    };
};

export const MOCK_SESSION = generateMockSession();
