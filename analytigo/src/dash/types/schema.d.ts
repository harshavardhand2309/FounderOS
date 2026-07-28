
// Skeletal Data Types
export interface Point3D {
    x: number;
    y: number;
    z: number;
    confidence: number;
}

export interface SkeletalFrame {
    timestamp: number; // in milliseconds
    joints: {
        [key in JointName]: Point3D;
    };
}

export type JointName =
    | "head" | "neck" | "chest" | "pelvis"
    | "l_shoulder" | "l_elbow" | "l_wrist" | "l_hand"
    | "r_shoulder" | "r_elbow" | "r_wrist" | "r_hand"
    | "l_hip" | "l_knee" | "l_ankle" | "l_foot"
    | "r_hip" | "r_knee" | "r_ankle" | "r_foot";

// Analytics Types
export interface ShotAnalysis {
    id: string;
    type: "serve" | "forehand" | "backhand" | "smash" | "volley";
    speedKmph: number;
    spinRateRpm: number;
    impactHeightCm: number;
    skeletalEfficiencyScore: number; // 0-100
    videoTimestamp: number;
}

export interface HeatmapPoint {
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
    intensity: number; // 0-1
}

export interface AnalysisSession {
    id: string;
    athleteName: string;
    date: string;
    durationSeconds: number;
    shots: ShotAnalysis[];
    heatmap: HeatmapPoint[];
    metrics: {
        averageSpeed: number;
        consistencyScore: number;
        fatigueIndex: number; // 0-100 (100 is tired)
        clutchScore: number; // 0-100
        injuryRisk: "low" | "moderate" | "high";
    };
}
