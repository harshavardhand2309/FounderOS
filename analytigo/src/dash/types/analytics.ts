export type PlayerId = 'player1' | 'player2';

// ── Accuracy Labeling System ──
export type AccuracyLevel = 'HIGH' | 'MEDIUM' | 'ESTIMATED' | 'ADVANCED';

export interface MetricMeta {
    label: string;
    accuracy: AccuracyLevel;
    isEstimated?: boolean;
}

export interface MetricWithMeta<T = number> {
    value: T;
    meta: MetricMeta;
}

// ── Tactical Shot Direction Types ──
export type TacticalDirection =
    | 'down-the-line'
    | 'cross-court'
    | 'inside-out'
    | 'inside-in'
    | 'angle'
    | 'deep'
    | 'approach'
    | 'pass';

// ── Shot Filter State (for 3D Court toggles) ──
export interface ShotFilterState {
    shotTypes: string[];
    tacticalDirections: TacticalDirection[]; // NEW: Tactical position filters
    tacticalMode?: 'tag' | 'strict'; // tactical filter matching mode
    results: string[]; // winner, error, in, out
    showWinners: boolean;
    showErrors: boolean;
    showIn: boolean;
    showOut: boolean;
    showNetClearance: boolean;
}

export interface TournamentInfo {
    name: string;
    round: string;
    surface: 'Hard' | 'Clay' | 'Grass' | 'Indoor Hard';
    date: string;
}

export interface PlayerStats {
    id: PlayerId;
    name: string;
    aces: number;
    doubleFaults: number;
    winners: number;
    unforcedErrors: number;
    firstServePercentage: number;
    winPercentageFirstServe: number;
    winPercentageSecondServe: number;
    netPointsWon: number;
    netPointsPlayed: number;
    totalPointsWon: number;
    maxSpeed: number;
    avgSpeed: number;
    breakPointsWon: number;
    breakPointsFaced: number;
    distanceCovered: number; // in meters
    avgShotSpeed: number;
    topSpinRate: number;
    courtCoveragePercentage: number;
    role?: 'Batsman' | 'Bowler' | 'All-Rounder';
    // Cricket Specific Optional Fields
    wagonWheel?: { zone: string; runs: number; percentage: number }[];
    impactMetrics?: { metric: string; value: number }[];
    wickets?: number;
    maidens?: number;
    overs?: number;
    runsConceded?: number;
    balls?: number;
    strikeRate?: number;
    fours?: number;
    sixes?: number;
    economy?: number;
    dots?: number;

    // Football Specific Optional Fields
    goals?: number;
    assists?: number;
    passesCompleted?: number;
    passesAttempted?: number;
    passAccuracy?: number;
    tacklesWon?: number;
    interceptions?: number;
    possession?: number;
    xG?: number; // Expected Goals
    xA?: number; // Expected Assists
    heatmap?: { x: number; y: number; intensity: number }[];
    chancesCreated?: number;
    fouls?: number;
    offsides?: number;
    crosses?: number;
    minutesPlayed?: number;

    // Pickleball Specific Optional Fields
    dinks?: number;
    dinkAccuracy?: number;
    thirdShotDrops?: number;
    thirdShotDropSuccess?: number;
    kitchenViolations?: number; // Faults
    handspeed?: number; // Reaction time in ms
    drivePercentage?: number;
    lobPercentage?: number;
    smashPercentage?: number;
    dropPercentage?: number;

    // Pickleball Serve Metrics
    serveAvgSpeed?: number;
    serveMaxSpeed?: number;
    serveInPct?: number;
    serveDepthPct?: number;
    serviceWinners?: number;
    serviceErrors?: number;

    // Pickleball Return Metrics
    returnSuccessPct?: number;
    returnDepthPct?: number;
    returnErrors?: number;
    returnAggression?: number;

    // 3rd Shot Analytics (extended)
    thirdShotDropPct?: number;
    thirdShotDrivePct?: number;
    thirdShotLobPct?: number;
    thirdShotSuccessPct?: number;
    thirdShotErrors?: number;
    thirdShotWinnerPct?: number;
    thirdShotForcedErrors?: number;
    pointsWonAfter3rdShot?: number;
    kitchenEntrySuccessPct?: number;

    // Rally Structure
    rallyWinLoss?: { bucket: string; won: number; lost: number }[];

    // Stroke Performance
    strokePerformance?: { type: string; winners: number; forcedErrors: number; unforcedErrors: number }[];

    // Movement
    lateralSpeed?: number;
    sprints?: number;

    // Error Intelligence
    ueNet?: number;
    ueLong?: number;
    ueWide?: number;
    errDink?: number;
    errVolley?: number;
    errFH?: number;
    errKitchen?: number;
    errMid?: number;

    // Baseline vs Net
    netPointsWonPct?: number;
    baselinePointsWonPct?: number;
    netErrorsPct?: number;

    // Kitchen (NVZ) Presence
    timeInKitchenPct?: number;
    pointsWonKitchen?: number;
    kitchenErrors?: number;

    // Point Outcomes
    forcedErrors?: number;
}

export interface ShotData {
    id: string;
    pointNumber: number;
    x: number;
    y: number;
    type: 'serve' | 'forehand' | 'backhand' | 'volley' | 'smash' | 'drop' | 'lob' | 'return' | 'dink' | 'drive';
    shotType?: string; // Alias for backward compatibility
    speed: number;
    spin: number;
    rallyLength: number;
    isWinner: boolean;
    isError: boolean;
    isIn?: boolean;
    isOut?: boolean;

    // ✅ NEW: Single source of truth for shot result (computed from geometry)
    result?: 'winner' | 'error' | 'in' | 'out';
    isBreakPoint: boolean;
    playerId: PlayerId | 'bowler';
    height?: number;
    // New fields for advanced analytics
    outcome?: 'in' | 'out';
    netClearance?: number;       // meters above/below net (negative = net error)
    serveType?: 'flat' | 'slice' | 'kick';
    timestamp?: number;          // ms from match start
    playerPosition?: { x: number; y: number };
    playerX?: number; // Backward compatibility
    playerY?: number; // Backward compatibility

    // ── BROADCAST-LEVEL TACTICAL FIELDS ──
    tacticalDirection?: TacticalDirection[];  // ✅ NEW: Array for combinations (e.g., ["cross-court", "deep", "angle"])
    tacticalDirectionStrict?: TacticalDirection[]; // strict geometry-validated tactical labels
    tacticalConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    handedness?: 'Right' | 'Left';            // ✅ NEW: For Inside-Out/Inside-In detection
    apexHeight?: number;                       // Maximum trajectory height (meters)
    distanceTravelled?: number;                // Total ball travel distance (meters)

    // ✅ NEW: Geometry fields for computation
    start?: { x: number; y: number; z: number };
    end?: { x: number; y: number; z: number };
    pointWon?: boolean; // Used to determine winner vs in

    // ── SERVE FAULT FIELDS ──
    serveFaultType?: 'long' | 'wide' | 'net';  // Type of serve fault
    isDoubleFault?: boolean;                     // True if point lost on double fault

    // Tooltip/context enrichment fields
    set?: number;
    game?: number;
    playerName?: string;

    // Field provenance for UI confidence display
    netClearanceSource?: 'excel' | 'inferred';
    tacticalSource?: 'excel' | 'geometry';
    serveTypeSource?: 'excel' | 'inferred' | 'n/a';
}

export interface PointMomentum {
    pointIndex: number;
    scorer: PlayerId;
    scoreString: string;
    dominanceIndex: number;
}

export interface SetData {
    setNumber: number;
    player1Score: number;
    player2Score: number;
    games: GameData[];
}

export interface GameData {
    gameNumber: number;
    winner: PlayerId;
    points: PointMomentum[];
}

export interface ServeStats {
    type: 'first' | 'second';
    direction: 'T' | 'Body' | 'Wide';
    speed: number;
    isAce: boolean;
    isFault: boolean;
    server: PlayerId;
}

export interface RallyDistribution {
    length: number;
    count: number;
    percentage: number;
}

export interface BreakPointStats {
    opportunities: number;
    converted: number;
    conversionRate: number;
    saved: number;
    saveRate: number;
}

export interface ShotTypeDistribution {
    forehand: number;
    backhand: number;
    volley: number;
    smash: number;
    serve: number;
    drop?: number;
    lob?: number;
}

export interface PerformanceBySet {
    setNumber: number;
    pointsWon: number;
    winnersHit: number;
    errorsCommitted: number;
    avgSpeed: number;
    distanceCovered: number;
}

export interface MovementData {
    playerId: PlayerId;
    totalDistance: number;
    avgSpeed: number;
    maxSpeed: number;
    courtCoverage: number;
    sprintCount: number;
}

export interface MatchAnalytics {
    matchId: string;
    duration: string;
    tournament: TournamentInfo;
    players: {
        player1: PlayerStats;
        player2: PlayerStats;
    };
    sets: SetData[];
    momentum: PointMomentum[];
    heatmaps: {
        player1: ShotData[];
        player2: ShotData[];
    };
    shotQuality: {
        avgSpeed: number;
        avgSpin: number;
        netClearanceAvg: number;
    };
    serveMap: ServeStats[];
    rallyDistribution: RallyDistribution[];
    breakPoints: {
        player1: BreakPointStats;
        player2: BreakPointStats;
    };
    shotTypeDistribution: {
        player1: ShotTypeDistribution;
        player2: ShotTypeDistribution;
    };
    performanceBySet: {
        player1: PerformanceBySet[];
        player2: PerformanceBySet[];
    };
    movementData: {
        player1: MovementData;
        player2: MovementData;
    };
}
