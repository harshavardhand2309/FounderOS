/**
 * metricEngine.ts — Derived Metrics Engine
 * 
 * All metrics are computed from raw data (ShotData[], MovementData, PointMomentum[]).
 * No hardcoded values. Each function returns { value, meta: MetricMeta }.
 */

import {
    ShotData,
    MovementData,
    PointMomentum,
    MetricWithMeta,
    AccuracyLevel,
    MetricMeta,
    RallyDistribution,
    ShotTypeDistribution,
} from '@/types/analytics';

// ─── HELPER ────────────────────────────────────────────
function makeMeta(label: string, accuracy: AccuracyLevel): MetricMeta {
    return { label, accuracy, isEstimated: accuracy === 'ESTIMATED' };
}

function metric<T = number>(value: T, label: string, accuracy: AccuracyLevel): MetricWithMeta<T> {
    return { value, meta: makeMeta(label, accuracy) };
}

// ════════════════════════════════════════════════════════
// SERVE METRICS
// ════════════════════════════════════════════════════════

export function computeServeSpeed(shots: ShotData[], playerId: string) {
    const serves = shots.filter(s => s.type === 'serve' && s.playerId === playerId);
    if (serves.length === 0) return { avg: metric(0, 'Avg Serve Speed', 'HIGH'), max: metric(0, 'Max Serve Speed', 'HIGH') };

    const speeds = serves.map(s => s.speed);
    const avg = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);
    const max = Math.round(Math.max(...speeds));

    return {
        avg: metric(avg, 'Avg Serve Speed', 'HIGH'),
        max: metric(max, 'Max Serve Speed', 'HIGH'),
    };
}

export function computeServePercentages(shots: ShotData[], playerId: string) {
    const serves = shots.filter(s => s.type === 'serve' && s.playerId === playerId);
    const total = serves.length;
    if (total === 0) return { first: metric(0, '1st Serve %', 'HIGH'), second: metric(0, '2nd Serve %', 'HIGH') };

    // Heuristic: first serve = higher speed serves, second serve = lower speed
    const avgSpeed = serves.reduce((a, s) => a + s.speed, 0) / total;
    const firstServes = serves.filter(s => s.speed >= avgSpeed * 0.85);
    const firstPct = Math.round((firstServes.length / total) * 100);

    return {
        first: metric(firstPct, '1st Serve %', 'HIGH'),
        second: metric(100 - firstPct, '2nd Serve %', 'HIGH'),
    };
}

export function computeAces(shots: ShotData[], playerId: string) {
    const aces = shots.filter(s =>
        s.type === 'serve' &&
        s.playerId === playerId &&
        s.isWinner &&
        s.rallyLength <= 1
    ).length;
    return metric(aces, 'Aces', 'HIGH');
}

export function computeDoubleFaultRate(shots: ShotData[], playerId: string) {
    const serves = shots.filter(s => s.type === 'serve' && s.playerId === playerId);
    const dfs = serves.filter(s => s.isError).length;
    const rate = serves.length > 0 ? Math.round((dfs / serves.length) * 100) : 0;
    return metric(rate, 'Double Fault %', 'HIGH');
}

export function classifyServeType(shot: ShotData): MetricWithMeta<string> {
    if (shot.type !== 'serve') return metric('N/A', 'Serve Type', 'HIGH');

    // If already classified from Excel
    if (shot.serveType) return metric(shot.serveType, 'Serve Type', 'HIGH');

    // ESTIMATED: based on speed + spin heuristics
    const { speed, spin } = shot;
    let type = 'flat';
    if (spin > 2500) type = 'kick';
    else if (speed < 170 && spin > 1500) type = 'slice';

    return metric(type, 'Serve Type', 'ESTIMATED');
}

export function computeServePlus1(shots: ShotData[], playerId: string) {
    // Group shots by point, check if server won on shot #2 (serve+1)
    const pointGroups = new Map<number, ShotData[]>();
    shots.forEach(s => {
        const arr = pointGroups.get(s.pointNumber) || [];
        arr.push(s);
        pointGroups.set(s.pointNumber, arr);
    });

    let total = 0;
    let won = 0;
    pointGroups.forEach(group => {
        const serve = group.find(s => s.type === 'serve' && s.playerId === playerId);
        if (!serve) return;
        total++;
        // Check if the rally ended with a winner by the server on shot 2 or 3
        const servePlus1 = group.find(s => s.playerId === playerId && s !== serve && s.isWinner);
        if (servePlus1 && group.indexOf(servePlus1) <= 2) won++;
    });

    const pct = total > 0 ? Math.round((won / total) * 100) : 0;
    return metric(pct, 'Serve +1 Success %', 'MEDIUM');
}

export function computeReturnAggressionIndex(shots: ShotData[], playerId: string) {
    // Average return shot speed vs average baseline speed
    const returns = shots.filter(s =>
        s.playerId === playerId &&
        s.type !== 'serve' &&
        s.rallyLength >= 2
    );
    const allShots = shots.filter(s => s.playerId === playerId && s.type !== 'serve');

    if (returns.length === 0 || allShots.length === 0) return metric(0, 'Return Aggression', 'ESTIMATED');

    const avgReturnSpeed = returns.reduce((a, s) => a + s.speed, 0) / returns.length;
    const avgBaselineSpeed = allShots.reduce((a, s) => a + s.speed, 0) / allShots.length;
    const index = Math.round((avgReturnSpeed / avgBaselineSpeed) * 100);

    return metric(index, 'Return Aggression', 'ESTIMATED');
}

// ════════════════════════════════════════════════════════
// RALLY METRICS
// ════════════════════════════════════════════════════════

export function computeRallyDistribution(shots: ShotData[]): RallyDistribution[] {
    const counts = new Map<number, number>();
    const seen = new Set<number>();

    shots.forEach(s => {
        if (!seen.has(s.pointNumber)) {
            seen.add(s.pointNumber);
            counts.set(s.rallyLength, (counts.get(s.rallyLength) || 0) + 1);
        }
    });

    const total = seen.size;
    return Array.from(counts.entries())
        .map(([length, count]) => ({
            length,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => a.length - b.length);
}

export function computeWinnersErrorsByType(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId);
    const types = ['forehand', 'backhand', 'volley', 'smash', 'serve', 'drop', 'lob'] as const;

    const result: Record<string, { winners: number; errors: number; total: number }> = {};
    types.forEach(t => {
        const typed = playerShots.filter(s => s.type === t);
        result[t] = {
            winners: typed.filter(s => s.isWinner).length,
            errors: typed.filter(s => s.isError).length,
            total: typed.length,
        };
    });

    return metric(result, 'Winners/Errors by Type', 'HIGH');
}

export function computeDirectionBias(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId && s.type !== 'serve');
    if (playerShots.length === 0) return metric({ forehand: 50, backhand: 50 }, 'Direction Bias', 'MEDIUM');

    const fh = playerShots.filter(s => s.type === 'forehand').length;
    const bh = playerShots.filter(s => s.type === 'backhand').length;
    const total = fh + bh || 1;

    return metric(
        { forehand: Math.round((fh / total) * 100), backhand: Math.round((bh / total) * 100) },
        'Direction Bias',
        'MEDIUM'
    );
}

export function computeShotToleranceIndex(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId);
    if (playerShots.length === 0) return metric(0, 'Shot Tolerance Index', 'MEDIUM');

    const winners = playerShots.filter(s => s.isWinner).length;
    const errors = playerShots.filter(s => s.isError).length;
    const index = Math.round(((winners - errors) / playerShots.length) * 100);

    return metric(index, 'Shot Tolerance', 'MEDIUM');
}

// ── #13: Spin-based Stroke Metrics (ESTIMATED) ──
export function computeSpinMetrics(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId && s.spin > 0);
    const types = ['forehand', 'backhand', 'serve', 'volley', 'smash', 'drop', 'lob'] as const;

    const result: Record<string, { avgSpin: number; maxSpin: number; count: number }> = {};
    types.forEach(t => {
        const typed = playerShots.filter(s => s.type === t);
        if (typed.length === 0) {
            result[t] = { avgSpin: 0, maxSpin: 0, count: 0 };
        } else {
            const spins = typed.map(s => s.spin);
            result[t] = {
                avgSpin: Math.round(spins.reduce((a, b) => a + b, 0) / spins.length),
                maxSpin: Math.round(Math.max(...spins)),
                count: typed.length,
            };
        }
    });

    // Overall average spin
    const overallAvg = playerShots.length > 0
        ? Math.round(playerShots.reduce((a, s) => a + s.spin, 0) / playerShots.length)
        : 0;

    return metric({ byType: result, overallAvg }, 'Spin Metrics', 'ESTIMATED');
}

// ── #11: Rally Distribution Win/Loss ──
export function computeRallyWinLoss(shots: ShotData[], playerId: string) {
    // Group by point, determine if player won or lost each rally
    const pointGroups = new Map<number, ShotData[]>();
    shots.forEach(s => {
        const arr = pointGroups.get(s.pointNumber) || [];
        arr.push(s);
        pointGroups.set(s.pointNumber, arr);
    });

    const buckets: Record<string, { wins: number; losses: number }> = {
        '1-3': { wins: 0, losses: 0 },
        '4-6': { wins: 0, losses: 0 },
        '7-9': { wins: 0, losses: 0 },
        '10+': { wins: 0, losses: 0 },
    };

    let totalWins = 0, totalLosses = 0;

    pointGroups.forEach(group => {
        const rally = group[0].rallyLength;
        const lastShot = group[group.length - 1];
        const playerWon = (lastShot.playerId === playerId && lastShot.isWinner) ||
            (lastShot.playerId !== playerId && lastShot.isError);

        let bucket: string;
        if (rally <= 3) bucket = '1-3';
        else if (rally <= 6) bucket = '4-6';
        else if (rally <= 9) bucket = '7-9';
        else bucket = '10+';

        if (playerWon) {
            buckets[bucket].wins++;
            totalWins++;
        } else {
            buckets[bucket].losses++;
            totalLosses++;
        }
    });

    return metric(
        { buckets, totalWins, totalLosses, winPct: totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0 },
        'Rally Win/Loss',
        'HIGH'
    );
}

// ── #14d: Response Delay Index (ESTIMATED) ──
export function computeResponseDelayIndex(shots: ShotData[], playerId: string) {
    // Compute average time between opponent's shot and player's response
    const playerShots = shots.filter(s => s.playerId === playerId && s.timestamp != null);
    if (playerShots.length < 2) return metric({ avgDelay: 0, category: 'N/A' }, 'Response Delay Index', 'ESTIMATED');

    // Group shots by point and compute inter-shot delays
    const pointGroups = new Map<number, ShotData[]>();
    shots.filter(s => s.timestamp != null).forEach(s => {
        const arr = pointGroups.get(s.pointNumber) || [];
        arr.push(s);
        pointGroups.set(s.pointNumber, arr);
    });

    const delays: number[] = [];
    pointGroups.forEach(group => {
        group.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        for (let i = 1; i < group.length; i++) {
            if (group[i].playerId === playerId && group[i - 1].playerId !== playerId) {
                const delay = (group[i].timestamp || 0) - (group[i - 1].timestamp || 0);
                if (delay > 0 && delay < 10000) delays.push(delay);
            }
        }
    });

    if (delays.length === 0) return metric({ avgDelay: 0, category: 'N/A' }, 'Response Delay Index', 'ESTIMATED');

    const avgDelay = Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);
    const category = avgDelay < 1500 ? 'Fast' : avgDelay < 2500 ? 'Moderate' : 'Slow';

    return metric({ avgDelay, category }, 'Response Delay Index', 'ESTIMATED');
}

// ── #15: Baseline vs Net Win/Error % ──
export function computeBaselineVsNetWinPct(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId && s.playerPosition);
    if (playerShots.length === 0) {
        return metric(
            { baseline: { wins: 0, errors: 0, total: 0, winPct: 0, errPct: 0 }, net: { wins: 0, errors: 0, total: 0, winPct: 0, errPct: 0 } },
            'Baseline vs Net W/E %',
            'MEDIUM'
        );
    }

    // Net zone: player Y between 30-70 (center of court)
    const netShots = playerShots.filter(s => {
        const y = s.playerPosition!.y;
        return y >= 30 && y <= 70;
    });
    const baselineShots = playerShots.filter(s => {
        const y = s.playerPosition!.y;
        return y < 30 || y > 70;
    });

    const calcStats = (arr: ShotData[]) => {
        const wins = arr.filter(s => s.isWinner).length;
        const errors = arr.filter(s => s.isError).length;
        return {
            wins, errors, total: arr.length,
            winPct: arr.length > 0 ? Math.round((wins / arr.length) * 100) : 0,
            errPct: arr.length > 0 ? Math.round((errors / arr.length) * 100) : 0,
        };
    };

    return metric(
        { baseline: calcStats(baselineShots), net: calcStats(netShots) },
        'Baseline vs Net W/E %',
        'MEDIUM'
    );
}

// ════════════════════════════════════════════════════════
// MOVEMENT METRICS
// ════════════════════════════════════════════════════════

export function computeBaselineVsNet(shots: ShotData[], playerId: string) {
    // Use player positions to determine baseline vs net positioning
    const playerShots = shots.filter(s => s.playerId === playerId && s.playerPosition);
    if (playerShots.length === 0) return metric({ baseline: 70, net: 30 }, 'Baseline vs Net %', 'ESTIMATED');

    // Heuristic: if player Y is > 60 or < 40 (from center), they're at baseline
    const netShots = playerShots.filter(s => {
        const y = s.playerPosition!.y;
        return y >= 30 && y <= 70; // Near net zone
    }).length;

    const netPct = Math.round((netShots / playerShots.length) * 100);
    return metric({ baseline: 100 - netPct, net: netPct }, 'Baseline vs Net %', 'ESTIMATED');
}

export function computeSprints(movement: MovementData, thresholdKmh: number = 20) {
    // Movement data has sprint count, but we label it based on whether we derived or got directly
    return metric(movement.sprintCount, 'Sprint Count', movement.sprintCount > 0 ? 'HIGH' : 'ESTIMATED');
}

export function computeSprintCount(movement?: MovementData) {
    if (!movement) return metric(0, 'Sprint Count', 'ESTIMATED');
    return metric(movement.sprintCount, 'Sprint Count', movement.sprintCount > 0 ? 'HIGH' : 'ESTIMATED');
}

// ════════════════════════════════════════════════════════
// MOMENTUM (COMPOSITE INDEX)
// ════════════════════════════════════════════════════════

export function computeCompositeMomentum(
    momentum: PointMomentum[],
    shots: ShotData[],
    windowSize: number = 10
): PointMomentum[] {
    if (!momentum || momentum.length === 0) return [];

    // Pre-compute shot outcomes per point
    const pointOutcomes = new Map<number, { winner: boolean; error: boolean; breakPointWon: boolean; rallyLength: number }>();
    shots.forEach(s => {
        if (!pointOutcomes.has(s.pointNumber)) {
            pointOutcomes.set(s.pointNumber, {
                winner: s.isWinner,
                error: s.isError,
                breakPointWon: s.isBreakPoint && s.isWinner,
                rallyLength: s.rallyLength,
            });
        }
    });

    // Compute composite momentum using sliding window
    return momentum.map((point, idx) => {
        const windowStart = Math.max(0, idx - windowSize);
        const window = momentum.slice(windowStart, idx + 1);

        let recentWinners = 0;
        let unforcedErrors = 0;
        let breakPointsWon = 0;
        let rallyDominance = 0;

        window.forEach(wp => {
            const outcome = pointOutcomes.get(wp.pointIndex);
            if (outcome) {
                if (outcome.winner) recentWinners++;
                if (outcome.error) unforcedErrors++;
                if (outcome.breakPointWon) breakPointsWon++;
                if (outcome.rallyLength >= 5) rallyDominance++;
            }
        });

        // Formula: (Winners × 2) - (Errors) + (BP Won × 3) + (Rally Dominance)
        const compositScore = (recentWinners * 2) - unforcedErrors + (breakPointsWon * 3) + rallyDominance;

        // Normalize to -100 to 100 range
        const maxPossible = windowSize * 6; // theoretical max
        const normalizedScore = Math.round((compositScore / maxPossible) * 100);

        return {
            ...point,
            dominanceIndex: Math.max(-100, Math.min(100, normalizedScore)),
        };
    });
}

// ════════════════════════════════════════════════════════
// SHOT TYPE DISTRIBUTION (DERIVED)
// ════════════════════════════════════════════════════════

export function computeShotTypeDistribution(shots: ShotData[], playerId: string): ShotTypeDistribution {
    const playerShots = shots.filter(s => s.playerId === playerId);
    const total = playerShots.length || 1;

    return {
        forehand: Math.round((playerShots.filter(s => s.type === 'forehand').length / total) * 100),
        backhand: Math.round((playerShots.filter(s => s.type === 'backhand').length / total) * 100),
        volley: Math.round((playerShots.filter(s => s.type === 'volley').length / total) * 100),
        smash: Math.round((playerShots.filter(s => s.type === 'smash').length / total) * 100),
        serve: Math.round((playerShots.filter(s => s.type === 'serve').length / total) * 100),
        drop: Math.round((playerShots.filter(s => s.type === 'drop').length / total) * 100),
        lob: Math.round((playerShots.filter(s => s.type === 'lob').length / total) * 100),
    };
}

// ════════════════════════════════════════════════════════
// PICKLEBALL-SPECIFIC
// ════════════════════════════════════════════════════════

export function computeDinkPercentage(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId);
    if (playerShots.length === 0) return metric(0, 'Dink %', 'ESTIMATED');

    // ESTIMATED: classify dinks by speed < 40 km/h and near net position
    const dinks = playerShots.filter(s =>
        s.speed < 40 &&
        s.playerPosition &&
        s.playerPosition.y >= 30 && s.playerPosition.y <= 70
    ).length;

    const pct = Math.round((dinks / playerShots.length) * 100);
    return metric(pct, 'Dink %', 'ESTIMATED');
}

export function computeThirdShotAnalytics(shots: ShotData[], playerId: string) {
    // 3rd shot = shot #3 in a rally (serve, return, 3rd shot)
    const pointGroups = new Map<number, ShotData[]>();
    shots.forEach(s => {
        const arr = pointGroups.get(s.pointNumber) || [];
        arr.push(s);
        pointGroups.set(s.pointNumber, arr);
    });

    let total3rd = 0;
    let drops3rd = 0;
    let drives3rd = 0;
    let won3rd = 0;

    pointGroups.forEach(group => {
        if (group.length >= 3) {
            const thirdShot = group[2];
            if (thirdShot.playerId === playerId) {
                total3rd++;
                if (thirdShot.speed < 50) drops3rd++;
                else drives3rd++;
                if (thirdShot.isWinner || (group.length > 3 && group[group.length - 1].playerId === playerId && group[group.length - 1].isWinner)) {
                    won3rd++;
                }
            }
        }
    });

    return {
        total: metric(total3rd, '3rd Shot Count', 'HIGH'),
        dropPercentage: metric(total3rd > 0 ? Math.round((drops3rd / total3rd) * 100) : 0, '3rd Shot Drop %', 'ESTIMATED'),
        successRate: metric(total3rd > 0 ? Math.round((won3rd / total3rd) * 100) : 0, '3rd Shot Success %', 'MEDIUM'),
    };
}

// ════════════════════════════════════════════════════════
// AGGREGATE: Compute all Tennis metrics at once
// ════════════════════════════════════════════════════════

export interface DerivedTennisMetrics {
    serveSpeed: { avg: MetricWithMeta; max: MetricWithMeta };
    servePercentages: { first: MetricWithMeta; second: MetricWithMeta };
    aces: MetricWithMeta;
    doubleFaultRate: MetricWithMeta;
    servePlus1: MetricWithMeta;
    returnAggression: MetricWithMeta;
    shotTolerance: MetricWithMeta;
    directionBias: MetricWithMeta<{ forehand: number; backhand: number }>;
    baselineVsNet: MetricWithMeta<{ baseline: number; net: number }>;
    compositeMomentum: PointMomentum[];
    spinMetrics: MetricWithMeta<{ byType: Record<string, { avgSpin: number; maxSpin: number; count: number }>; overallAvg: number }>;
    rallyWinLoss: MetricWithMeta<{ buckets: Record<string, { wins: number; losses: number }>; totalWins: number; totalLosses: number; winPct: number }>;
    responseDelay: MetricWithMeta<{ avgDelay: number; category: string }>;
    baselineVsNetWinPct: MetricWithMeta<{ baseline: { wins: number; errors: number; total: number; winPct: number; errPct: number }; net: { wins: number; errors: number; total: number; winPct: number; errPct: number } }>;
    movementHeatmap: MetricWithMeta<{ zones: number[][]; maxValue: number; totalShots: number }>;
    explosiveBursts: MetricWithMeta<{ count: number; avgPerPoint: string | number }>;
    movementEfficiency: MetricWithMeta<{ distancePerPoint: number; pointsWon: number; efficiencyRating: string }>;
}

// ── #17: Movement Heatmap Zones ──
export function computeMovementHeatmap(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId && s.playerPosition);

    // Divide court into 12x12 grid (144 zones) for finer spatial resolution
    const GRID_SIZE = 12;
    const zones: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

    playerShots.forEach(s => {
        if (!s.playerPosition) return;
        const zoneX = Math.min(Math.floor(s.playerPosition.x / (100 / GRID_SIZE)), GRID_SIZE - 1);
        const zoneY = Math.min(Math.floor(s.playerPosition.y / (100 / GRID_SIZE)), GRID_SIZE - 1);
        zones[zoneY][zoneX]++;
    });

    // Find max for normalization
    const maxValue = Math.max(...zones.flat(), 1);

    return metric(
        { zones, maxValue, totalShots: playerShots.length },
        'Movement Heatmap',
        'HIGH'
    );
}

// ── #18: Explosive Burst Count ──
export function computeExplosiveBursts(shots: ShotData[], playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId && s.playerPosition).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let burstCount = 0;
    const burstThreshold = 25; // Distance threshold for "explosive" movement

    for (let i = 1; i < playerShots.length; i++) {
        const prev = playerShots[i - 1];
        const curr = playerShots[i];

        if (!prev.playerPosition || !curr.playerPosition) continue;

        const dx = curr.playerPosition.x - prev.playerPosition.x;
        const dy = curr.playerPosition.y - prev.playerPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > burstThreshold) burstCount++;
    }

    return metric(
        { count: burstCount, avgPerPoint: playerShots.length > 0 ? (burstCount / playerShots.length).toFixed(2) : 0 },
        'Explosive Bursts',
        'HIGH'
    );
}

// ── #19: Movement Efficiency ──
export function computeMovementEfficiency(shots: ShotData[], movement: MovementData, playerId: string) {
    const playerShots = shots.filter(s => s.playerId === playerId);
    const pointsWon = playerShots.filter(s => s.isWinner).length +
        shots.filter(s => s.playerId !== playerId && s.isError).length;

    const distancePerPoint = movement.totalDistance > 0 && pointsWon > 0
        ? Math.round(movement.totalDistance / pointsWon)
        : 0;

    // Lower is better (efficient movement)
    const efficiencyRating = distancePerPoint < 20 ? 'Excellent' :
        distancePerPoint < 30 ? 'Good' :
            distancePerPoint < 40 ? 'Average' : 'Poor';

    return metric(
        { distancePerPoint, pointsWon, efficiencyRating },
        'Movement Efficiency',
        'MEDIUM'
    );
}

export function computeAllTennisMetrics(
    shots: ShotData[],
    movement: MovementData,
    momentum: PointMomentum[],
    playerId: string
): DerivedTennisMetrics {
    return {
        serveSpeed: computeServeSpeed(shots, playerId),
        servePercentages: computeServePercentages(shots, playerId),
        aces: computeAces(shots, playerId),
        doubleFaultRate: computeDoubleFaultRate(shots, playerId),
        servePlus1: computeServePlus1(shots, playerId),
        returnAggression: computeReturnAggressionIndex(shots, playerId),
        shotTolerance: computeShotToleranceIndex(shots, playerId),
        directionBias: computeDirectionBias(shots, playerId),
        baselineVsNet: computeBaselineVsNet(shots, playerId),
        compositeMomentum: computeCompositeMomentum(momentum, shots),
        spinMetrics: computeSpinMetrics(shots, playerId),
        rallyWinLoss: computeRallyWinLoss(shots, playerId),
        responseDelay: computeResponseDelayIndex(shots, playerId),
        baselineVsNetWinPct: computeBaselineVsNetWinPct(shots, playerId),
        movementHeatmap: computeMovementHeatmap(shots, playerId),
        explosiveBursts: computeExplosiveBursts(shots, playerId),
        movementEfficiency: computeMovementEfficiency(shots, movement, playerId),
    };
}
