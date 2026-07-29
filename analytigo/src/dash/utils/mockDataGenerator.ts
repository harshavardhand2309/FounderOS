import { MatchAnalytics, PlayerStats, ShotData, PointMomentum, ServeStats, SetData, GameData, RallyDistribution, BreakPointStats, ShotTypeDistribution, PerformanceBySet, MovementData } from '../types/analytics';
import { computeTacticalDirections, computeStrictTacticalDirections } from './geometryEngine';

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(randomRange(min, max));
const randomChoice = <T>(arr: T[]): T => arr[randomInt(0, arr.length)];

export const generateMockTennisData = (sport: string = 'tennis'): MatchAnalytics => {
    // Customize players based on sport
    let p1Name = 'Carlos Alcaraz';
    let p2Name = 'Novak Djokovic';
    let matchId = 'alcaraz-vs-djokovic-ao2024';
    let tournamentName = 'Australian Open 2024';

    if (sport === 'cricket') {
        p1Name = 'Virat Kohli';
        p2Name = 'Pat Cummins';
        matchId = 'ind-vs-aus-wc2023';
        tournamentName = 'ICC World Cup 2023';
    } else if (sport === 'football') {
        p1Name = 'Lionel Messi';
        p2Name = 'Kylian Mbappe';
        matchId = 'arg-vs-fra-wc2022';
        tournamentName = 'FIFA World Cup 2022';
    } else if (sport === 'pickleball') {
        p1Name = 'Ben Johns';
        p2Name = 'Tyson McGuffin';
        matchId = 'johns-vs-mcguffin-usopen';
        tournamentName = 'US Open Pickleball 2024';
    }
    const p1BreakPointsWon = randomInt(5, 10);
    const p1BreakPointsFaced = randomInt(8, 15);
    const p2BreakPointsWon = randomInt(4, 9);
    const p2BreakPointsFaced = randomInt(7, 14);

    // Generate Stats based on sport (Mapping fields)
    let p1Stats = {
        aces: sport === 'cricket' ? randomInt(0, 8) : sport === 'football' ? randomInt(0, 3) : randomInt(12, 22), // Sixes / Goals
        unforcedErrors: sport === 'cricket' ? randomInt(30, 60) : sport === 'football' ? randomInt(5, 15) : randomInt(18, 32), // Dot Balls / Turnovers
        winners: sport === 'cricket' ? randomInt(4, 12) : sport === 'football' ? randomInt(2, 8) : randomInt(45, 65), // Fours / Shots on Target
        maxSpeed: sport === 'cricket' ? randomInt(100, 150) : sport === 'football' ? randomInt(28, 35) : 218, // Strike Rate / Top Speed
        distance: sport === 'cricket' ? randomInt(20, 60) : sport === 'football' ? randomInt(9000, 12000) : randomInt(3800, 4500) // Running / Distance
    };

    const players = {
        player1: {
            id: 'player1' as const,
            name: p1Name,
            aces: p1Stats.aces,
            doubleFaults: randomInt(2, 6),
            winners: p1Stats.winners,
            unforcedErrors: p1Stats.unforcedErrors,
            firstServePercentage: randomInt(65, 75),
            winPercentageFirstServe: randomInt(75, 85),
            winPercentageSecondServe: randomInt(50, 62),
            netPointsWon: randomInt(18, 28),
            netPointsPlayed: randomInt(30, 45),
            totalPointsWon: 0,
            maxSpeed: p1Stats.maxSpeed,
            avgSpeed: 142,
            breakPointsWon: p1BreakPointsWon,
            breakPointsFaced: p1BreakPointsFaced,
            distanceCovered: p1Stats.distance,
            avgShotSpeed: 142,
            topSpinRate: randomInt(2200, 2800),
            courtCoveragePercentage: randomInt(72, 85)
        },
        player2: {
            id: 'player2' as const,
            name: p2Name,
            aces: sport === 'cricket' ? randomInt(0, 6) : randomInt(8, 18),
            doubleFaults: randomInt(1, 5),
            winners: randomInt(38, 58),
            unforcedErrors: randomInt(15, 28),
            firstServePercentage: randomInt(68, 78),
            winPercentageFirstServe: randomInt(72, 82),
            winPercentageSecondServe: randomInt(52, 64),
            netPointsWon: randomInt(15, 25),
            netPointsPlayed: randomInt(25, 40),
            totalPointsWon: 0,
            maxSpeed: 205,
            avgSpeed: 138,
            breakPointsWon: p2BreakPointsWon,
            breakPointsFaced: p2BreakPointsFaced,
            distanceCovered: randomInt(3600, 4300),
            avgShotSpeed: 138,
            topSpinRate: randomInt(2100, 2700),
            courtCoveragePercentage: randomInt(70, 82)
        }
    };

    // ─── Pickleball Mock Data ───────────────────────────
    if (sport === 'pickleball') {
        const pbp1 = players.player1 as any;
        const pbp2 = players.player2 as any;

        // Core
        pbp1.dinks = 110; pbp2.dinks = 95;
        pbp1.dinkAccuracy = 96.2; pbp2.dinkAccuracy = 92.5;
        pbp1.thirdShotDrops = 38; pbp2.thirdShotDrops = 42;
        pbp1.thirdShotDropSuccess = 88.5; pbp2.thirdShotDropSuccess = 85.0;
        pbp1.kitchenViolations = 1; pbp2.kitchenViolations = 2;
        pbp1.handspeed = 195; pbp2.handspeed = 180;
        pbp1.drivePercentage = 55; pbp2.drivePercentage = 60;
        pbp1.lobPercentage = 8; pbp2.lobPercentage = 6;
        pbp1.smashPercentage = 37; pbp2.smashPercentage = 34;
        pbp1.dropPercentage = 22; pbp2.dropPercentage = 18;
        // Serve
        pbp1.serveAvgSpeed = 58; pbp2.serveAvgSpeed = 65;
        pbp1.serveMaxSpeed = 72; pbp2.serveMaxSpeed = 78;
        pbp1.serveInPct = 91; pbp2.serveInPct = 88;
        pbp1.serveDepthPct = 68; pbp2.serveDepthPct = 72;
        pbp1.serviceWinners = 5; pbp2.serviceWinners = 8;
        pbp1.serviceErrors = 3; pbp2.serviceErrors = 4;
        // Return
        pbp1.returnSuccessPct = 85; pbp2.returnSuccessPct = 82;
        pbp1.returnDepthPct = 62; pbp2.returnDepthPct = 58;
        pbp1.returnErrors = 7; pbp2.returnErrors = 9;
        pbp1.returnAggression = 6.8; pbp2.returnAggression = 7.5;
        // 3rd Shot Analytics
        pbp1.thirdShotDropPct = 55; pbp2.thirdShotDropPct = 48;
        pbp1.thirdShotDrivePct = 35; pbp2.thirdShotDrivePct = 42;
        pbp1.thirdShotLobPct = 10; pbp2.thirdShotLobPct = 10;
        pbp1.thirdShotSuccessPct = 82; pbp2.thirdShotSuccessPct = 78;
        pbp1.thirdShotErrors = 4; pbp2.thirdShotErrors = 6;
        pbp1.thirdShotWinnerPct = 12; pbp2.thirdShotWinnerPct = 15;
        pbp1.thirdShotForcedErrors = 8; pbp2.thirdShotForcedErrors = 11;
        pbp1.pointsWonAfter3rdShot = 65; pbp2.pointsWonAfter3rdShot = 62;
        pbp1.kitchenEntrySuccessPct = 78; pbp2.kitchenEntrySuccessPct = 72;
        // Rally
        pbp1.rallyWinLoss = [
            { bucket: '0-2', won: 15, lost: 8 }, { bucket: '3-6', won: 22, lost: 14 },
            { bucket: '7-10', won: 18, lost: 12 }, { bucket: '10+', won: 10, lost: 6 },
        ];
        pbp2.rallyWinLoss = [
            { bucket: '0-2', won: 12, lost: 10 }, { bucket: '3-6', won: 20, lost: 16 },
            { bucket: '7-10', won: 15, lost: 14 }, { bucket: '10+', won: 8, lost: 9 },
        ];
        // Point outcomes
        pbp1.forcedErrors = 18; pbp2.forcedErrors = 22;
        // Stroke Performance
        pbp1.strokePerformance = [
            { type: 'Forehand', winners: 12, forcedErrors: 4, unforcedErrors: 3 },
            { type: 'Backhand', winners: 8, forcedErrors: 3, unforcedErrors: 4 },
            { type: 'Volley', winners: 10, forcedErrors: 5, unforcedErrors: 2 },
            { type: 'Smash', winners: 6, forcedErrors: 2, unforcedErrors: 1 },
            { type: 'Lob', winners: 2, forcedErrors: 1, unforcedErrors: 2 },
            { type: 'Drop', winners: 3, forcedErrors: 2, unforcedErrors: 1 },
            { type: 'Dink', winners: 1, forcedErrors: 1, unforcedErrors: 1 },
        ];
        pbp2.strokePerformance = [
            { type: 'Forehand', winners: 10, forcedErrors: 6, unforcedErrors: 4 },
            { type: 'Backhand', winners: 7, forcedErrors: 4, unforcedErrors: 3 },
            { type: 'Volley', winners: 9, forcedErrors: 5, unforcedErrors: 3 },
            { type: 'Smash', winners: 8, forcedErrors: 3, unforcedErrors: 2 },
            { type: 'Lob', winners: 1, forcedErrors: 1, unforcedErrors: 1 },
            { type: 'Drop', winners: 2, forcedErrors: 2, unforcedErrors: 2 },
            { type: 'Dink', winners: 1, forcedErrors: 1, unforcedErrors: 1 },
        ];
        // Movement
        pbp1.lateralSpeed = 8.2; pbp2.lateralSpeed = 9.1;
        pbp1.sprints = 28; pbp2.sprints = 35;
        // Error Intelligence
        pbp1.ueNet = 5; pbp2.ueNet = 6;
        pbp1.ueLong = 4; pbp2.ueLong = 5;
        pbp1.ueWide = 5; pbp2.ueWide = 5;
        pbp1.errDink = 3; pbp2.errDink = 4;
        pbp1.errVolley = 4; pbp2.errVolley = 5;
        pbp1.errFH = 7; pbp2.errFH = 7;
        pbp1.errKitchen = 6; pbp2.errKitchen = 8;
        pbp1.errMid = 8; pbp2.errMid = 8;
        // Baseline vs Net
        pbp1.netPointsWonPct = 72; pbp2.netPointsWonPct = 68;
        pbp1.baselinePointsWonPct = 58; pbp2.baselinePointsWonPct = 62;
        pbp1.netErrorsPct = 12; pbp2.netErrorsPct = 15;
        // Kitchen NVZ
        pbp1.timeInKitchenPct = 45; pbp2.timeInKitchenPct = 38;
        pbp1.pointsWonKitchen = 35; pbp2.pointsWonKitchen = 28;
        pbp1.kitchenErrors = 4; pbp2.kitchenErrors = 6;
    }

    const sets: SetData[] = [];
    const momentum: PointMomentum[] = [];
    let p1TotalPoints = 0;
    let p2TotalPoints = 0;

    for (let s = 1; s <= 3; s++) {
        const p1SetScore = randomInt(4, 7);
        const p2SetScore = p1SetScore >= 6 ? randomInt(4, 5) : 6;
        const games: GameData[] = [];
        const totalGames = p1SetScore + p2SetScore;

        for (let g = 1; g <= totalGames; g++) {
            const points: PointMomentum[] = [];
            const pointsInGame = randomInt(4, 10);
            let dominance = 0;
            const scorer = Math.random() > 0.5 ? 'player1' : 'player2';

            for (let p = 0; p < pointsInGame; p++) {
                const pointWinner = Math.random() > 0.45 ? scorer : (scorer === 'player1' ? 'player2' : 'player1');
                if (pointWinner === 'player1') {
                    p1TotalPoints++;
                    dominance = Math.min(100, dominance + randomInt(10, 25));
                } else {
                    p2TotalPoints++;
                    dominance = Math.max(-100, dominance - randomInt(10, 25));
                }

                const pointData: PointMomentum = {
                    pointIndex: p1TotalPoints + p2TotalPoints,
                    scorer: pointWinner,
                    scoreString: 'Game',
                    dominanceIndex: dominance
                };
                points.push(pointData);
                momentum.push(pointData);
            }

            games.push({ gameNumber: g, winner: scorer, points });
        }

        sets.push({ setNumber: s, player1Score: p1SetScore, player2Score: p2SetScore, games });
    }

    players.player1.totalPointsWon = p1TotalPoints;
    players.player2.totalPointsWon = p2TotalPoints;

    const rallyLengths = [1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 7, 8, 9, 11, 13];
    const shotTypes = sport === 'pickleball'
        ? ['serve', 'return', 'dink', 'drive', 'drop', 'lob', 'volley', 'smash']
        : ['forehand', 'backhand', 'volley', 'smash', 'serve'];

    // Sample shots carry the full geometry/telemetry surface, not just the
    // legacy boolean flags. `result` in particular is required: the 3D court
    // filters on `shot.result`, so shots without it are all filtered out and
    // the court renders empty. playerPosition / timestamp / netClearance feed
    // the movement, response-delay and net-clearance panels — without them
    // those panels render as zeros.
    const generateShots = (count: number, playerId: 'player1' | 'player2'): ShotData[] => {
        const ownHalf = (): number =>
            playerId === 'player1' ? randomRange(55, 95) : randomRange(5, 45);

        return Array.from({ length: count }).map((_, i) => {
            const rallyLength = randomChoice(rallyLengths);
            const roll = Math.random();
            const isWinner = roll > 0.85;
            const isError = !isWinner && roll > 0.75;
            const isOut = isError && Math.random() > 0.5;
            const result: ShotData['result'] = isWinner
                ? 'winner'
                : isOut
                    ? 'out'
                    : isError
                        ? 'error'
                        : 'in';

            const type = randomChoice(shotTypes) as ShotData['type'];
            const x = randomRange(10, 90);
            const y = ownHalf();
            // The striker stands on the opposite side of the net to the target.
            const px = randomRange(15, 85);
            const py = playerId === 'player1' ? randomRange(5, 45) : randomRange(55, 95);

            const netClearance =
                type === 'lob' ? randomRange(1.5, 3.5)
                    : type === 'drop' ? randomRange(0.05, 0.25)
                        : randomRange(0.1, 1.3);

            return {
                id: `${playerId}-shot-${i}`,
                pointNumber: i,
                x,
                y,
                type,
                speed: randomInt(80, 180),
                spin: randomInt(1000, 3500),
                rallyLength,
                // `result` is mutually exclusive, so the booleans mirror it
                // exactly — the same taxonomy normalizeShot enforces.
                isWinner,
                isError: result === 'error',
                isIn: result === 'in' || result === 'winner',
                isOut,
                result,
                isBreakPoint: Math.random() > 0.93,
                playerId,
                outcome: isOut ? 'out' : 'in',
                netClearance: Number(netClearance.toFixed(2)),
                netClearanceSource: 'inferred',
                // Monotonic clock so response-delay/burst metrics have a timeline.
                timestamp: i * randomInt(4000, 9000),
                playerPosition: { x: px, y: py },
                playerX: px,
                playerY: py,
                start: { x: px, y: py, z: 0 },
                end: { x, y, z: 0 },
                // Derived with the same geometry the Excel path uses, so the
                // tactical-direction filters work on sample data too.
                tacticalDirection: computeTacticalDirections({ start: { x: px, y: py, z: 0 }, end: { x, y, z: 0 }, type } as ShotData),
                tacticalDirectionStrict: computeStrictTacticalDirections({ start: { x: px, y: py, z: 0 }, end: { x, y, z: 0 }, type } as ShotData),
                tacticalSource: 'geometry',
                tacticalConfidence: 'MEDIUM',
            } satisfies ShotData;
        });
    };

    const heatmaps = {
        player1: generateShots(200, 'player1'),
        player2: generateShots(190, 'player2')
    };

    const allShots = [...heatmaps.player1, ...heatmaps.player2];
    const rallyLengthCounts: Record<number, number> = {};
    allShots.forEach(shot => {
        rallyLengthCounts[shot.rallyLength] = (rallyLengthCounts[shot.rallyLength] || 0) + 1;
    });

    const totalShots = allShots.length;
    const rallyDistribution: RallyDistribution[] = Object.entries(rallyLengthCounts).map(([length, count]) => ({
        length: parseInt(length),
        count,
        percentage: (count / totalShots) * 100
    }));

    const breakPoints = {
        player1: {
            opportunities: p1BreakPointsFaced,
            converted: p1BreakPointsWon,
            conversionRate: (p1BreakPointsWon / p1BreakPointsFaced) * 100,
            saved: p1BreakPointsFaced - p1BreakPointsWon,
            saveRate: ((p1BreakPointsFaced - p1BreakPointsWon) / p1BreakPointsFaced) * 100
        },
        player2: {
            opportunities: p2BreakPointsFaced,
            converted: p2BreakPointsWon,
            conversionRate: (p2BreakPointsWon / p2BreakPointsFaced) * 100,
            saved: p2BreakPointsFaced - p2BreakPointsWon,
            saveRate: ((p2BreakPointsFaced - p2BreakPointsWon) / p2BreakPointsFaced) * 100
        }
    };

    const getShotTypeDistribution = (shots: ShotData[]): ShotTypeDistribution => {
        const total = shots.length;
        return {
            forehand: (shots.filter(s => s.type === 'forehand').length / total) * 100,
            backhand: (shots.filter(s => s.type === 'backhand').length / total) * 100,
            volley: (shots.filter(s => s.type === 'volley').length / total) * 100,
            smash: (shots.filter(s => s.type === 'smash').length / total) * 100,
            serve: (shots.filter(s => s.type === 'serve').length / total) * 100
        };
    };

    return {
        matchId: matchId,
        duration: '3h 42m',
        tournament: {
            name: tournamentName,
            round: 'Final',
            surface: 'Hard',
            date: '2024-01-28'
        },
        players,
        sets,
        momentum,
        heatmaps,
        shotQuality: {
            avgSpeed: 140,
            avgSpin: 2450,
            netClearanceAvg: 48
        },
        serveMap: [],
        rallyDistribution,
        breakPoints,
        shotTypeDistribution: {
            player1: getShotTypeDistribution(heatmaps.player1),
            player2: getShotTypeDistribution(heatmaps.player2)
        },
        performanceBySet: {
            player1: [],
            player2: []
        },
        movementData: {
            player1: {
                playerId: 'player1',
                totalDistance: players.player1.distanceCovered,
                avgSpeed: randomInt(12, 16),
                maxSpeed: randomInt(28, 32),
                courtCoverage: players.player1.courtCoveragePercentage,
                sprintCount: randomInt(45, 65)
            },
            player2: {
                playerId: 'player2',
                totalDistance: players.player2.distanceCovered,
                avgSpeed: randomInt(11, 15),
                maxSpeed: randomInt(26, 30),
                courtCoverage: players.player2.courtCoveragePercentage,
                sprintCount: randomInt(40, 60)
            }
        }
    };
};
