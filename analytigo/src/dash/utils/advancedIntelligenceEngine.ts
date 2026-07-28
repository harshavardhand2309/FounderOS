import { MatchAnalytics, ShotData, PlayerId } from '@/types/analytics';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface MomentumResult {
    score: number;
    explanation: string;
}

export interface DominancePhaseResult {
    phase: 'Early Phase Control' | 'Mid-Set Surge' | 'Late Match Domination';
    differential: number;
}

export interface ErrorPatternResult {
    netPercent: number;
    longPercent: number;
    widePercent: number;
    highRallyErrorsPercent: number;
    totalErrors: number;
}

export interface ShotToleranceResult {
    avgTolerance: number;
    breakdown: string;
}

export interface DirectionBiasResult {
    fhPercent: number;
    bhPercent: number;
    crossCourtPercent: number;
    downTheLinePercent: number;
}

export interface PressurePerformanceResult {
    pressureScore: number;
    pressureTrend: 'Improves Under Pressure' | 'Drops Under Pressure' | 'Neutral Under Pressure';
}

export interface NetClearanceTrendResult {
    overallClearance: number;
    pressureClearance: number;
    percentDrop: number;
}

export interface AdvancedIntelligenceData {
    momentumIndex: { player1: MomentumResult; player2: MomentumResult };
    dominancePhase: { player1: DominancePhaseResult; player2: DominancePhaseResult };
    unforcedErrorPattern: { player1: ErrorPatternResult; player2: ErrorPatternResult };
    shotToleranceIndex: { player1: ShotToleranceResult; player2: ShotToleranceResult };
    directionBias: { player1: DirectionBiasResult; player2: DirectionBiasResult };
    pressurePerformanceIndex: { player1: PressurePerformanceResult; player2: PressurePerformanceResult };
    netClearanceTrend: { player1: NetClearanceTrendResult; player2: NetClearanceTrendResult };
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function allShots(match: MatchAnalytics): ShotData[] {
    return [...(match.heatmaps?.player1 || []), ...(match.heatmaps?.player2 || [])];
}

function playerShots(match: MatchAnalytics, pid: PlayerId): ShotData[] {
    return pid === 'player1' ? (match.heatmaps?.player1 || []) : (match.heatmaps?.player2 || []);
}

// ═══════════════════════════════════════════════════════
// 1. MATCH MOMENTUM INDEX
// ═══════════════════════════════════════════════════════

function computeMomentum(match: MatchAnalytics, pid: PlayerId): MomentumResult {
    const p = pid === 'player1' ? match.players.player1 : match.players.player2;
    const shots = playerShots(match, pid);

    const winners = p.winners || 0;
    const ue = p.unforcedErrors || 0;
    const bpWon = p.breakPointsWon || 0;

    // Rally dominance: points won on longer rallies (>4 shots)
    const longRallyWins = shots.filter(s => s.isWinner && s.rallyLength > 4).length;
    const totalLongRallies = shots.filter(s => s.rallyLength > 4).length;
    const rallyDominanceWeight = totalLongRallies > 0
        ? (longRallyWins / totalLongRallies) * 20
        : 0;

    const raw = (winners * 2) - ue + (bpWon * 3) + rallyDominanceWeight;

    // Normalize to 0-100 based on a reasonable match range (-50 to 100)
    const score = clamp(Math.round(((raw + 50) / 150) * 100), 0, 100);

    let explanation: string;
    if (score >= 75) explanation = 'Dominant performance with high winning efficiency';
    else if (score >= 55) explanation = 'Solid momentum with controlled aggression';
    else if (score >= 40) explanation = 'Balanced momentum, needs improvement in key moments';
    else explanation = 'Low momentum — frequent errors outweigh winners';

    return { score, explanation };
}

// ═══════════════════════════════════════════════════════
// 2. DOMINANCE PHASE
// ═══════════════════════════════════════════════════════

function computeDominancePhase(match: MatchAnalytics, pid: PlayerId): DominancePhaseResult {
    const momentum = match.momentum || [];
    if (momentum.length === 0) {
        return { phase: 'Mid-Set Surge', differential: 0 };
    }

    const third = Math.ceil(momentum.length / 3);
    const phases = [
        momentum.slice(0, third),
        momentum.slice(third, third * 2),
        momentum.slice(third * 2),
    ];

    const phaseScores = phases.map(phasePoints => {
        const wins = phasePoints.filter(p => p.scorer === pid).length;
        const losses = phasePoints.length - wins;
        return wins - losses;
    });

    const maxIdx = phaseScores.indexOf(Math.max(...phaseScores));
    const labels = ['Early Phase Control', 'Mid-Set Surge', 'Late Match Domination'] as const;

    return {
        phase: labels[maxIdx],
        differential: phaseScores[maxIdx],
    };
}

// ═══════════════════════════════════════════════════════
// 3. UNFORCED ERROR PATTERN
// ═══════════════════════════════════════════════════════

function computeErrorPattern(match: MatchAnalytics, pid: PlayerId): ErrorPatternResult {
    const shots = playerShots(match, pid);
    const errors = shots.filter(s => s.isError);
    const total = errors.length || 1; // avoid divide by zero

    // Classify errors by their landing position
    // Net errors: shots with negative netClearance or very low y (near net)
    const netErrors = errors.filter(s => (s.netClearance !== undefined && s.netClearance < 0) || (s.y !== undefined && s.y > 40 && s.y < 60));
    // Long errors: shots that went out with high y (past baseline)
    const longErrors = errors.filter(s => s.outcome === 'out' && (s.y > 80 || s.y < 20) && !netErrors.includes(s));
    // Wide errors: everything else that's an error
    const wideErrors = errors.filter(s => !netErrors.includes(s) && !longErrors.includes(s));

    // High rally errors: errors in rallies > 6 shots
    const highRallyErrors = errors.filter(s => s.rallyLength > 6);

    return {
        netPercent: Math.round((netErrors.length / total) * 100),
        longPercent: Math.round((longErrors.length / total) * 100),
        widePercent: Math.round((wideErrors.length / total) * 100),
        highRallyErrorsPercent: Math.round((highRallyErrors.length / total) * 100),
        totalErrors: errors.length,
    };
}

// ═══════════════════════════════════════════════════════
// 4. SHOT TOLERANCE INDEX
// ═══════════════════════════════════════════════════════

function computeShotTolerance(match: MatchAnalytics, pid: PlayerId): ShotToleranceResult {
    const shots = playerShots(match, pid);
    const errors = shots.filter(s => s.isError && s.rallyLength > 0);

    if (errors.length === 0) {
        return { avgTolerance: 0, breakdown: 'No errors recorded' };
    }

    const totalRally = errors.reduce((sum, s) => sum + s.rallyLength, 0);
    const avg = Math.round((totalRally / errors.length) * 10) / 10;

    const rounded = Math.round(avg);
    const breakdown = `Breakdown typically after ${rounded}-shot exchanges`;

    return { avgTolerance: avg, breakdown };
}

// ═══════════════════════════════════════════════════════
// 5. DIRECTION BIAS
// ═══════════════════════════════════════════════════════

function computeDirectionBias(match: MatchAnalytics, pid: PlayerId): DirectionBiasResult {
    const shots = playerShots(match, pid);
    const groundstrokes = shots.filter(s => s.type === 'forehand' || s.type === 'backhand');
    const total = groundstrokes.length || 1;

    const fh = groundstrokes.filter(s => s.type === 'forehand').length;
    const bh = groundstrokes.filter(s => s.type === 'backhand').length;

    // Cross-court vs down-the-line based on shot X coordinate
    // Cross-court: shots going to the opposite side of the court (x < 35 or x > 65)
    // Down-the-line: shots going straight (35 <= x <= 65)
    const crossCourt = groundstrokes.filter(s => s.x < 35 || s.x > 65).length;
    const downTheLine = groundstrokes.length - crossCourt;

    return {
        fhPercent: Math.round((fh / total) * 100),
        bhPercent: Math.round((bh / total) * 100),
        crossCourtPercent: Math.round((crossCourt / total) * 100),
        downTheLinePercent: Math.round((downTheLine / total) * 100),
    };
}

// ═══════════════════════════════════════════════════════
// 6. PRESSURE PERFORMANCE INDEX
// ═══════════════════════════════════════════════════════

function computePressurePerformance(match: MatchAnalytics, pid: PlayerId): PressurePerformanceResult {
    const shots = playerShots(match, pid);

    // Pressure = break points or deuce-like situations (approximated by breakPoint flag)
    const pressureShots = shots.filter(s => s.isBreakPoint);
    const nonPressureShots = shots.filter(s => !s.isBreakPoint);

    const pressureWinners = pressureShots.filter(s => s.isWinner).length;
    const pressureErrors = pressureShots.filter(s => s.isError).length;
    const pressureTotal = pressureShots.length || 1;

    const nonPressureWinners = nonPressureShots.filter(s => s.isWinner).length;
    const nonPressureErrors = nonPressureShots.filter(s => s.isError).length;
    const nonPressureTotal = nonPressureShots.length || 1;

    // Performance ratio: (winners - errors) / total
    const pressureRatio = (pressureWinners - pressureErrors) / pressureTotal;
    const nonPressureRatio = (nonPressureWinners - nonPressureErrors) / nonPressureTotal;

    // Difference as percentage
    const diff = nonPressureRatio !== 0
        ? Math.round(((pressureRatio - nonPressureRatio) / Math.abs(nonPressureRatio)) * 100)
        : Math.round(pressureRatio * 100);

    const pressureScore = clamp(diff, -100, 100);

    let pressureTrend: PressurePerformanceResult['pressureTrend'];
    if (pressureScore > 5) pressureTrend = 'Improves Under Pressure';
    else if (pressureScore < -5) pressureTrend = 'Drops Under Pressure';
    else pressureTrend = 'Neutral Under Pressure';

    return { pressureScore, pressureTrend };
}

// ═══════════════════════════════════════════════════════
// 7. NET CLEARANCE TREND
// ═══════════════════════════════════════════════════════

function computeNetClearanceTrend(match: MatchAnalytics, pid: PlayerId): NetClearanceTrendResult {
    const shots = playerShots(match, pid);
    const withClearance = shots.filter(s => s.netClearance !== undefined && s.netClearance !== null);

    if (withClearance.length === 0) {
        return { overallClearance: 0, pressureClearance: 0, percentDrop: 0 };
    }

    const overallSum = withClearance.reduce((s, shot) => s + (shot.netClearance || 0), 0);
    const overallClearance = Math.round((overallSum / withClearance.length) * 100) / 100;

    const pressureShots = withClearance.filter(s => s.isBreakPoint);
    const pressureClearance = pressureShots.length > 0
        ? Math.round((pressureShots.reduce((s, shot) => s + (shot.netClearance || 0), 0) / pressureShots.length) * 100) / 100
        : overallClearance;

    const percentDrop = overallClearance !== 0
        ? Math.round(((pressureClearance - overallClearance) / Math.abs(overallClearance)) * 100)
        : 0;

    return { overallClearance, pressureClearance, percentDrop };
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════

export function computeAdvancedIntelligence(match: MatchAnalytics): AdvancedIntelligenceData {
    return {
        momentumIndex: {
            player1: computeMomentum(match, 'player1'),
            player2: computeMomentum(match, 'player2'),
        },
        dominancePhase: {
            player1: computeDominancePhase(match, 'player1'),
            player2: computeDominancePhase(match, 'player2'),
        },
        unforcedErrorPattern: {
            player1: computeErrorPattern(match, 'player1'),
            player2: computeErrorPattern(match, 'player2'),
        },
        shotToleranceIndex: {
            player1: computeShotTolerance(match, 'player1'),
            player2: computeShotTolerance(match, 'player2'),
        },
        directionBias: {
            player1: computeDirectionBias(match, 'player1'),
            player2: computeDirectionBias(match, 'player2'),
        },
        pressurePerformanceIndex: {
            player1: computePressurePerformance(match, 'player1'),
            player2: computePressurePerformance(match, 'player2'),
        },
        netClearanceTrend: {
            player1: computeNetClearanceTrend(match, 'player1'),
            player2: computeNetClearanceTrend(match, 'player2'),
        },
    };
}
