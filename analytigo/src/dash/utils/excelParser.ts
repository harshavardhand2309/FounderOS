import * as XLSX from 'xlsx';
import { MatchAnalytics, TournamentInfo, PlayerStats, ShotData, RallyDistribution, BreakPointStats, ShotTypeDistribution, PerformanceBySet } from '../types/analytics';
import { classifyAllShots, calculateBallDistance } from './tacticalClassifier';
import { validateAllShotsGeometry } from './geometricValidator';
import { normalizeShot } from './geometryEngine';


export const parseExcelFile = async (file: File, sport: string = 'tennis'): Promise<MatchAnalytics | null> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Helper to parse horizontal table data (Header Row + Data Row)
        const parseHorizontalSheet = (sheetName: string, workbook: XLSX.WorkBook) => {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) return null;
            const json = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
            if (json.length < 2) return null;

            const headers = json[0] as string[];
            const values = json[1] as any[];
            const result: Record<string, any> = {};

            headers.forEach((header, index) => {
                if (header) {
                    result[header] = values[index];
                }
            });
            return result;
        };

        console.log("Available Sheets:", workbook.SheetNames);

        // Parse Match Info sheet
        // Parse Metadata or Match Info sheet
        const matchInfoSheet = workbook.Sheets['Match Info'] || workbook.Sheets['Metadata'];
        // if (!matchInfoSheet) throw new Error('Match Info sheet not found'); 

        // if (!matchInfoSheet) throw new Error('Match Info sheet not found');

        let matchInfo: Record<string, string> = {};
        let p1Stats: Record<string, number> = {};
        let p2Stats: Record<string, number> = {};
        // Check if it's vertical (Tennis) or Horizontal (Cricket Metadata)
        const data = XLSX.utils.sheet_to_json<any>(matchInfoSheet, { header: 1 });

        // Heuristic: If row 0 has "Player Name" it's likely horizontal metadata
        if (data[0] && Array.isArray(data[0]) && data[0].includes && (data[0].includes('Player Name') || data[0].includes('Player 1') || data[0].includes('Match ID'))) {
            console.log("Detected Horizontal Metadata Table");
            const metadata = parseHorizontalSheet('Match Info', workbook) || parseHorizontalSheet('Metadata', workbook);
            if (metadata) Object.entries(metadata).forEach(([k, v]) => matchInfo[k] = String(v));
        } else {
            // Vertical Key-Value
            console.log("Detected Vertical Match Info");
            data.forEach((row: any[]) => {
                if (row && row[0] && row[1]) matchInfo[row[0]] = row[1];
            });
        }

        console.log("Parsed Match Info Keys:", Object.keys(matchInfo));

        const tournament: TournamentInfo = {
            name: matchInfo['Tournament'] || matchInfo['Format'] || 'Unknown Tournament',
            round: matchInfo['Round'] || 'Unknown Round',
            surface: (matchInfo['Surface'] as any) || (matchInfo['Venue'] as any) || 'Hard',
            date: matchInfo['Date'] || new Date().toISOString().split('T')[0]
        };

        const player1Name = matchInfo['Player 1 Name'] || matchInfo['Player 1'] || matchInfo['Player Name'] || 'Player 1';
        const player2Name = matchInfo['Player 2 Name'] || matchInfo['Player 2'] || 'Player 2';
        console.log('Resolved player names:', { player1Name, player2Name });

        // 2. PLAYER STATS PARSING
        // A. Try Standard Tennis Vertical Sheet
        const playerStatsSheet = workbook.Sheets['Player Stats'];
        if (playerStatsSheet) {
            console.log("Parsing Vertical Player Stats...");
            const data = XLSX.utils.sheet_to_json<any>(playerStatsSheet, { header: 1 });
            const getVerticalVal = (metric: string, idx: number) => {
                const row = data.find(r => r[0] === metric);
                return row ? Number(row[idx]) || 0 : 0;
            };
            p1Stats['Aces'] = getVerticalVal('Aces', 1);
            p1Stats['Double Faults'] = getVerticalVal('Double Faults', 1);
            p1Stats['Winners'] = getVerticalVal('Winners', 1);
            p1Stats['Unforced Errors'] = getVerticalVal('Unforced Errors', 1);
            p1Stats['1st Serve %'] = getVerticalVal('1st Serve %', 1);
            p1Stats['Win % on 1st Serve'] = getVerticalVal('Win % on 1st Serve', 1);
            p1Stats['Win % on 2nd Serve'] = getVerticalVal('Win % on 2nd Serve', 1);
            p1Stats['Total Points Won'] = getVerticalVal('Total Points Won', 1);
            p1Stats['Net Points Won'] = getVerticalVal('Net Points Won', 1);
            p1Stats['Net Points Played'] = getVerticalVal('Net Points Played', 1);
            p1Stats['Max Speed'] = getVerticalVal('Max Speed (km/h)', 1);
            p1Stats['Avg Speed'] = getVerticalVal('Avg Speed (km/h)', 1);
            p1Stats['Break Points Won'] = getVerticalVal('Break Points Won', 1);
            p1Stats['Break Points Faced'] = getVerticalVal('Break Points Faced', 1);
            p1Stats['Distance Covered'] = getVerticalVal('Distance Covered (m)', 1);
            p1Stats['Court Coverage'] = getVerticalVal('Court Coverage %', 1);
            p1Stats['Sprint Count'] = getVerticalVal('Sprint Count', 1);
            p1Stats['Avg Movement Speed'] = getVerticalVal('Avg Movement Speed (km/h)', 1);
            p1Stats['Max Movement Speed'] = getVerticalVal('Max Movement Speed (km/h)', 1);

            // ─── PLAYER 2 STATS from column index 2 ───
            p2Stats['Aces'] = getVerticalVal('Aces', 2);
            p2Stats['Double Faults'] = getVerticalVal('Double Faults', 2);
            p2Stats['Winners'] = getVerticalVal('Winners', 2);
            p2Stats['Unforced Errors'] = getVerticalVal('Unforced Errors', 2);
            p2Stats['1st Serve %'] = getVerticalVal('1st Serve %', 2);
            p2Stats['Win % on 1st Serve'] = getVerticalVal('Win % on 1st Serve', 2);
            p2Stats['Win % on 2nd Serve'] = getVerticalVal('Win % on 2nd Serve', 2);
            p2Stats['Total Points Won'] = getVerticalVal('Total Points Won', 2);
            p2Stats['Net Points Won'] = getVerticalVal('Net Points Won', 2);
            p2Stats['Net Points Played'] = getVerticalVal('Net Points Played', 2);
            p2Stats['Max Speed'] = getVerticalVal('Max Speed (km/h)', 2);
            p2Stats['Avg Speed'] = getVerticalVal('Avg Speed (km/h)', 2);
            p2Stats['Break Points Won'] = getVerticalVal('Break Points Won', 2);
            p2Stats['Break Points Faced'] = getVerticalVal('Break Points Faced', 2);
            p2Stats['Distance Covered'] = getVerticalVal('Distance Covered (m)', 2);
            p2Stats['Court Coverage'] = getVerticalVal('Court Coverage %', 2);
            p2Stats['Sprint Count'] = getVerticalVal('Sprint Count', 2);
            p2Stats['Avg Movement Speed'] = getVerticalVal('Avg Movement Speed (km/h)', 2);
            p2Stats['Max Movement Speed'] = getVerticalVal('Max Movement Speed (km/h)', 2);

            console.log('Parsed P1 Stats:', p1Stats);
            console.log('Parsed P2 Stats:', p2Stats);
        }

        // B. Try Cricket Horizontal Sheets (Batting/Bowling)
        // Initialize player1 with basic defaults first
        const player1: PlayerStats = {
            id: 'player1',
            name: player1Name,
            role: (matchInfo['Role'] as any) || 'Batsman', // Default to Batsman if missing
            aces: p1Stats['Aces'] || 0,
            doubleFaults: p1Stats['Double Faults'] || 0,
            winners: p1Stats['Winners'] || 0,
            unforcedErrors: p1Stats['Unforced Errors'] || 0,
            firstServePercentage: p1Stats['1st Serve %'] || 0,
            winPercentageFirstServe: p1Stats['Win % on 1st Serve'] || 0,
            winPercentageSecondServe: p1Stats['Win % on 2nd Serve'] || 0,
            netPointsWon: p1Stats['Net Points Won'] || 0,
            netPointsPlayed: p1Stats['Net Points Played'] || 0,
            totalPointsWon: p1Stats['Total Points Won'] || 0,
            maxSpeed: p1Stats['Max Speed'] || 0,
            avgSpeed: p1Stats['Avg Speed'] || 0,
            breakPointsWon: p1Stats['Break Points Won'] || 0,
            breakPointsFaced: p1Stats['Break Points Faced'] || 0,
            distanceCovered: p1Stats['Distance Covered'] || 0,
            avgShotSpeed: 0,
            topSpinRate: 0,
            courtCoveragePercentage: p1Stats['Court Coverage'] || 0
        };


        const battingStats = parseHorizontalSheet('Batting Stats', workbook);
        const bowlingStats = parseHorizontalSheet('Bowling Stats', workbook);

        // Parse Wagon Wheel (Table Format)
        const wagonSheet = workbook.Sheets['Wagon Wheel'];
        if (wagonSheet) {
            const rawWagon = XLSX.utils.sheet_to_json<any>(wagonSheet);
            player1.wagonWheel = rawWagon.map(row => ({
                zone: row['Zone'] || 'Unknown',
                runs: Number(row['Runs']) || 0,
                percentage: Number(row['Percentage']) || 0
            }));
            console.log("Parsed Wagon Wheel:", player1.wagonWheel);
        }

        // Parse Impact Metrics (Horizontal Key-Value)
        const impactSheet = parseHorizontalSheet('Impact Metrics', workbook);
        if (impactSheet) {
            console.log("Found Impact Metrics:", impactSheet);
            player1.impactMetrics = Object.entries(impactSheet).map(([key, value]) => ({
                metric: key,
                value: Number(value) || 0
            }));
        }

        // C. Try Football Horizontal Sheets
        const footballStats = parseHorizontalSheet('Football Stats', workbook);
        if (footballStats) {
            console.log("Found Football Stats:", footballStats);
            player1.goals = footballStats['Goals'] || 0;
            player1.assists = footballStats['Assists'] || 0;
            player1.passesCompleted = footballStats['Passes Completed'] || 0;
            player1.passesAttempted = footballStats['Passes Attempted'] || 0;
            player1.passAccuracy = footballStats['Pass Accuracy'] ||
                (player1.passesAttempted ? ((player1.passesCompleted || 0) / player1.passesAttempted * 100) : 0);
            player1.tacklesWon = footballStats['Tackles Won'] || 0;
            player1.interceptions = footballStats['Interceptions'] || 0;
            player1.possession = footballStats['Possession'] || 0;
            player1.xG = footballStats['xG'] || 0;
            player1.xA = footballStats['xA'] || 0;
            player1.distanceCovered = footballStats['Distance (km)'] ? footballStats['Distance (km)'] * 1000 : player1.distanceCovered;
            player1.maxSpeed = footballStats['Top Speed (km/h)'] || player1.maxSpeed;

            // New Extended Stats
            player1.chancesCreated = footballStats['Chances Created'] || 0;
            player1.fouls = footballStats['Fouls'] || 0;
            player1.offsides = footballStats['Offsides'] || 0;
            player1.crosses = footballStats['Crosses'] || 0;
            player1.minutesPlayed = footballStats['Minutes Played'] || 90;
        }

        // D. Try Pickleball Stats (supports both horizontal single-player and vertical 2-player format)
        const pickleballSheet = workbook.Sheets['Pickleball Stats'];
        if (pickleballSheet) {
            const pbData = XLSX.utils.sheet_to_json<any>(pickleballSheet, { header: 1 });
            const pbHeader = pbData[0] as string[];

            // Detect vertical 2-player format: first column is "Metric", columns 1 & 2 are player names
            const isVertical = pbHeader && pbHeader[0] === 'Metric' && pbData.length > 2;

            if (isVertical) {
                console.log("Detected Vertical 2-Player Pickleball Stats");
                const getVal = (metric: string, col: number) => {
                    const row = pbData.find((r: any[]) => r[0] === metric);
                    return row ? Number(row[col]) || 0 : 0;
                };

                // Player 1 name override from sheet header
                if (pbHeader[1]) player1.name = pbHeader[1];

                // Helper to populate a player object with all pickleball fields
                const populatePickleball = (player: PlayerStats, col: number) => {
                    // Core existing fields
                    player.dinks = getVal('Dinks', col);
                    player.dinkAccuracy = getVal('Dink Accuracy %', col);
                    player.thirdShotDrops = getVal('3rd Shot Drops', col);
                    player.thirdShotDropSuccess = getVal('3rd Shot Drop Success %', col);
                    player.kitchenViolations = getVal('Kitchen Violations', col);
                    player.handspeed = getVal('Handspeed (ms)', col);
                    player.drivePercentage = getVal('Drive %', col);
                    player.lobPercentage = getVal('Lob %', col);
                    player.smashPercentage = getVal('Smash %', col);
                    player.dropPercentage = getVal('Drop %', col);

                    // Serve Metrics
                    player.serveAvgSpeed = getVal('Serve Avg Speed', col);
                    player.serveMaxSpeed = getVal('Serve Max Speed', col);
                    player.serveInPct = getVal('Serve In %', col);
                    player.serveDepthPct = getVal('Serve Depth %', col);
                    player.serviceWinners = getVal('Service Winners', col);
                    player.serviceErrors = getVal('Service Errors', col);

                    // Return Metrics
                    player.returnSuccessPct = getVal('Return Success %', col);
                    player.returnDepthPct = getVal('Return Depth %', col);
                    player.returnErrors = getVal('Return Errors', col);
                    player.returnAggression = getVal('Return Aggression', col);

                    // 3rd Shot Analytics (extended)
                    player.thirdShotDropPct = getVal('3rd Shot Drop %', col);
                    player.thirdShotDrivePct = getVal('3rd Shot Drive %', col);
                    player.thirdShotLobPct = getVal('3rd Shot Lob %', col);
                    player.thirdShotSuccessPct = getVal('3rd Shot Success %', col);
                    player.thirdShotErrors = getVal('3rd Shot Errors', col);
                    player.thirdShotWinnerPct = getVal('3rd Shot Winner %', col);
                    player.thirdShotForcedErrors = getVal('3rd Shot Forced Errors', col);
                    player.pointsWonAfter3rdShot = getVal('Points Won After 3rd Shot', col);
                    player.kitchenEntrySuccessPct = getVal('Kitchen Entry Success %', col);

                    // Rally Structure
                    player.rallyWinLoss = [
                        { bucket: '0-2', won: getVal('Rally 0-2 Won', col), lost: getVal('Rally 0-2 Lost', col) },
                        { bucket: '3-6', won: getVal('Rally 3-6 Won', col), lost: getVal('Rally 3-6 Lost', col) },
                        { bucket: '7-10', won: getVal('Rally 7-10 Won', col), lost: getVal('Rally 7-10 Lost', col) },
                        { bucket: '10+', won: getVal('Rally 10+ Won', col), lost: getVal('Rally 10+ Lost', col) },
                    ];

                    // Point Outcomes
                    player.winners = getVal('Winners', col) || player.winners;
                    player.forcedErrors = getVal('Forced Errors', col);
                    player.unforcedErrors = getVal('Unforced Errors', col) || player.unforcedErrors;

                    // Movement
                    player.distanceCovered = getVal('Distance Covered', col) || getVal('Distance Covered (m)', col) || player.distanceCovered;
                    player.lateralSpeed = getVal('Lateral Speed', col);
                    player.sprints = getVal('Sprints', col);

                    // Error Intelligence
                    player.ueNet = getVal('UE Net', col);
                    player.ueLong = getVal('UE Long', col);
                    player.ueWide = getVal('UE Wide', col);
                    player.errDink = getVal('Err Dink', col);
                    player.errVolley = getVal('Err Volley', col);
                    player.errFH = getVal('Err FH', col);
                    player.errKitchen = getVal('Err Kitchen', col);
                    player.errMid = getVal('Err Mid', col);

                    // Baseline vs Net
                    player.netPointsWonPct = getVal('Net Points Won %', col);
                    player.baselinePointsWonPct = getVal('Baseline Points Won %', col);
                    player.netErrorsPct = getVal('Net Errors %', col);

                    // Kitchen (NVZ) Presence
                    player.timeInKitchenPct = getVal('Time in Kitchen %', col);
                    player.pointsWonKitchen = getVal('Points Won Kitchen', col);
                    player.kitchenErrors = getVal('Kitchen Errors', col);

                    // General overrides
                    player.totalPointsWon = getVal('Total Points Won', col) || player.totalPointsWon;
                    player.aces = getVal('Aces', col) || player.aces;
                    player.doubleFaults = getVal('Double Faults', col) || player.doubleFaults;
                    player.maxSpeed = getVal('Max Speed (km/h)', col) || player.maxSpeed;
                    player.avgSpeed = getVal('Avg Speed (km/h)', col) || player.avgSpeed;
                    player.courtCoveragePercentage = getVal('Court Coverage %', col) || player.courtCoveragePercentage;
                };

                populatePickleball(player1, 1);

                // Store P2 name for later use
                if (pbHeader[2]) {
                    p2Stats['__pbName'] = pbHeader[2] as any;
                    // We'll populate player2 after it's created below
                }
                // Save P2 column data for later
                (player1 as any).__pbVerticalData = pbData;
            } else {
                // Legacy: Horizontal single-player format
                const pickleballStats = parseHorizontalSheet('Pickleball Stats', workbook);
                if (pickleballStats) {
                    console.log("Found Pickleball Stats (horizontal):", pickleballStats);
                    player1.dinks = pickleballStats['Dinks'] || 0;
                    player1.dinkAccuracy = pickleballStats['Dink Accuracy %'] || 0;
                    player1.thirdShotDrops = pickleballStats['3rd Shot Drops'] || 0;
                    player1.thirdShotDropSuccess = pickleballStats['3rd Shot Drop Success %'] || 0;
                    player1.kitchenViolations = pickleballStats['Kitchen Violations'] || 0;
                    player1.handspeed = pickleballStats['Handspeed (ms)'] || 0;
                    player1.drivePercentage = pickleballStats['Drive %'] || 0;
                    player1.lobPercentage = pickleballStats['Lob %'] || 0;
                    player1.smashPercentage = pickleballStats['Smash %'] || 0;
                    player1.winners = (player1.dinks || 0) > 50 ? 25 : 10;
                }
            }
        }

        // D2. Parse Stroke Performance sheet (pickleball)
        const strokeSheet = workbook.Sheets['Stroke Performance'];
        if (strokeSheet) {
            const strokeData = XLSX.utils.sheet_to_json<any>(strokeSheet);
            // Group by player
            const p1Name = player1.name;
            const p1Strokes = strokeData.filter((r: any) => r['Player'] === p1Name);
            if (p1Strokes.length > 0) {
                player1.strokePerformance = p1Strokes.map((r: any) => ({
                    type: r['Shot Type'] || 'Unknown',
                    winners: Number(r['Winners']) || 0,
                    forcedErrors: Number(r['Forced Errors']) || 0,
                    unforcedErrors: Number(r['Unforced Errors']) || 0,
                }));
            }
            // P2 stroke data will be assigned after player2 is created
        }

        if (battingStats) {
            console.log("Found Batting Stats:", battingStats);
            // Standard generic mappings for compatibility
            player1.totalPointsWon = battingStats['Runs'] || 0;

            // Dedicated Cricket Mappings
            player1.balls = battingStats['Balls'] || 0;
            player1.strikeRate = battingStats['SR'] || 0;
            player1.fours = battingStats['4s'] || 0;
            player1.sixes = battingStats['6s'] || 0;
            player1.dots = battingStats['Dots'] || 0;
            // Map control to first serve for generic compatibility if needed, else ignore
            player1.firstServePercentage = battingStats['Control %'] || 0;
        }

        if (bowlingStats) {
            console.log("Found Bowling Stats:", bowlingStats);

            // Dedicated Cricket Mappings
            player1.wickets = bowlingStats['Wickets'] || 0;
            player1.economy = bowlingStats['Economy'] || 0;
            player1.dots = bowlingStats['Dots'] || 0;
            player1.maidens = bowlingStats['Maidens'] || 0;
            player1.overs = bowlingStats['Overs'] || 0;
            player1.runsConceded = bowlingStats['Runs'] || 0;

            // Overlapping generics (optional fallback)
            player1.breakPointsWon = bowlingStats['Yorkers'] || 0;
            // If it's pure bowling, runs conceded is key
            if (!player1.totalPointsWon) player1.totalPointsWon = bowlingStats['Runs'] || 0;
        }

        // Apply Generic Tennis Mappings (if Cricket stats didn't overwrite them) because we initialized defaults above, 
        // we mainly need to ensure key score metrics are set if they were missing or zero
        if (battingStats || bowlingStats) {
            // Ensure generic scores needed for basic display are set from cricket data if available
            if (!player1.totalPointsWon) player1.totalPointsWon = (battingStats ? battingStats['Runs'] : 0) || 0;
        }

        const player2: PlayerStats = {
            id: 'player2',
            name: player2Name,
            aces: p2Stats['Aces'] || 0,
            doubleFaults: p2Stats['Double Faults'] || 0,
            winners: p2Stats['Winners'] || 0,
            unforcedErrors: p2Stats['Unforced Errors'] || 0,
            firstServePercentage: p2Stats['1st Serve %'] || 0,
            winPercentageFirstServe: p2Stats['Win % on 1st Serve'] || 0,
            winPercentageSecondServe: p2Stats['Win % on 2nd Serve'] || 0,
            netPointsWon: p2Stats['Net Points Won'] || 0,
            netPointsPlayed: p2Stats['Net Points Played'] || 0,
            totalPointsWon: p2Stats['Total Points Won'] || 0,
            maxSpeed: p2Stats['Max Speed'] || 0,
            avgSpeed: p2Stats['Avg Speed'] || 0,
            breakPointsWon: p2Stats['Break Points Won'] || 0,
            breakPointsFaced: p2Stats['Break Points Faced'] || 0,
            distanceCovered: p2Stats['Distance Covered'] || 0,
            avgShotSpeed: 0,
            topSpinRate: 0,
            courtCoveragePercentage: p2Stats['Court Coverage'] || 0
        };

        // ─── Populate Player 2 with Pickleball data (if vertical format was detected) ───
        if ((player1 as any).__pbVerticalData) {
            const pbData = (player1 as any).__pbVerticalData;
            const pbHeader = pbData[0] as string[];
            delete (player1 as any).__pbVerticalData;

            if (pbHeader[2]) {
                player2.name = pbHeader[2];

                const getVal = (metric: string, col: number) => {
                    const row = pbData.find((r: any[]) => r[0] === metric);
                    return row ? Number(row[col]) || 0 : 0;
                };

                // Populate P2 with all pickleball fields (same as P1)
                player2.dinks = getVal('Dinks', 2);
                player2.dinkAccuracy = getVal('Dink Accuracy %', 2);
                player2.thirdShotDrops = getVal('3rd Shot Drops', 2);
                player2.thirdShotDropSuccess = getVal('3rd Shot Drop Success %', 2);
                player2.kitchenViolations = getVal('Kitchen Violations', 2);
                player2.handspeed = getVal('Handspeed (ms)', 2);
                player2.drivePercentage = getVal('Drive %', 2);
                player2.lobPercentage = getVal('Lob %', 2);
                player2.smashPercentage = getVal('Smash %', 2);
                player2.dropPercentage = getVal('Drop %', 2);
                player2.serveAvgSpeed = getVal('Serve Avg Speed', 2);
                player2.serveMaxSpeed = getVal('Serve Max Speed', 2);
                player2.serveInPct = getVal('Serve In %', 2);
                player2.serveDepthPct = getVal('Serve Depth %', 2);
                player2.serviceWinners = getVal('Service Winners', 2);
                player2.serviceErrors = getVal('Service Errors', 2);
                player2.returnSuccessPct = getVal('Return Success %', 2);
                player2.returnDepthPct = getVal('Return Depth %', 2);
                player2.returnErrors = getVal('Return Errors', 2);
                player2.returnAggression = getVal('Return Aggression', 2);
                player2.thirdShotDropPct = getVal('3rd Shot Drop %', 2);
                player2.thirdShotDrivePct = getVal('3rd Shot Drive %', 2);
                player2.thirdShotLobPct = getVal('3rd Shot Lob %', 2);
                player2.thirdShotSuccessPct = getVal('3rd Shot Success %', 2);
                player2.thirdShotErrors = getVal('3rd Shot Errors', 2);
                player2.thirdShotWinnerPct = getVal('3rd Shot Winner %', 2);
                player2.thirdShotForcedErrors = getVal('3rd Shot Forced Errors', 2);
                player2.pointsWonAfter3rdShot = getVal('Points Won After 3rd Shot', 2);
                player2.kitchenEntrySuccessPct = getVal('Kitchen Entry Success %', 2);
                player2.rallyWinLoss = [
                    { bucket: '0-2', won: getVal('Rally 0-2 Won', 2), lost: getVal('Rally 0-2 Lost', 2) },
                    { bucket: '3-6', won: getVal('Rally 3-6 Won', 2), lost: getVal('Rally 3-6 Lost', 2) },
                    { bucket: '7-10', won: getVal('Rally 7-10 Won', 2), lost: getVal('Rally 7-10 Lost', 2) },
                    { bucket: '10+', won: getVal('Rally 10+ Won', 2), lost: getVal('Rally 10+ Lost', 2) },
                ];
                player2.winners = getVal('Winners', 2) || player2.winners;
                player2.forcedErrors = getVal('Forced Errors', 2);
                player2.unforcedErrors = getVal('Unforced Errors', 2) || player2.unforcedErrors;
                player2.distanceCovered = getVal('Distance Covered', 2) || getVal('Distance Covered (m)', 2) || player2.distanceCovered;
                player2.lateralSpeed = getVal('Lateral Speed', 2);
                player2.sprints = getVal('Sprints', 2);
                player2.ueNet = getVal('UE Net', 2);
                player2.ueLong = getVal('UE Long', 2);
                player2.ueWide = getVal('UE Wide', 2);
                player2.errDink = getVal('Err Dink', 2);
                player2.errVolley = getVal('Err Volley', 2);
                player2.errFH = getVal('Err FH', 2);
                player2.errKitchen = getVal('Err Kitchen', 2);
                player2.errMid = getVal('Err Mid', 2);
                player2.netPointsWonPct = getVal('Net Points Won %', 2);
                player2.baselinePointsWonPct = getVal('Baseline Points Won %', 2);
                player2.netErrorsPct = getVal('Net Errors %', 2);
                player2.timeInKitchenPct = getVal('Time in Kitchen %', 2);
                player2.pointsWonKitchen = getVal('Points Won Kitchen', 2);
                player2.kitchenErrors = getVal('Kitchen Errors', 2);
                player2.totalPointsWon = getVal('Total Points Won', 2) || player2.totalPointsWon;
                player2.aces = getVal('Aces', 2) || player2.aces;
                player2.doubleFaults = getVal('Double Faults', 2) || player2.doubleFaults;
                player2.maxSpeed = getVal('Max Speed (km/h)', 2) || player2.maxSpeed;
                player2.avgSpeed = getVal('Avg Speed (km/h)', 2) || player2.avgSpeed;
                player2.courtCoveragePercentage = getVal('Court Coverage %', 2) || player2.courtCoveragePercentage;
            }
        }

        // ─── Populate Player 2 Stroke Performance ───
        const strokeSheetP2 = workbook.Sheets['Stroke Performance'];
        if (strokeSheetP2) {
            const strokeData = XLSX.utils.sheet_to_json<any>(strokeSheetP2);
            const p2Name = player2.name;
            const p2Strokes = strokeData.filter((r: any) => r['Player'] === p2Name);
            if (p2Strokes.length > 0) {
                player2.strokePerformance = p2Strokes.map((r: any) => ({
                    type: r['Shot Type'] || 'Unknown',
                    winners: Number(r['Winners']) || 0,
                    forcedErrors: Number(r['Forced Errors']) || 0,
                    unforcedErrors: Number(r['Unforced Errors']) || 0,
                }));
            }
        }

        // Parse Point Data sheet (Safe Check)
        const pointDataSheet = workbook.Sheets['Point Data'];
        const pointDataRows = pointDataSheet ? XLSX.utils.sheet_to_json<any>(pointDataSheet) : [];

        const shots: ShotData[] = pointDataRows.map((row, index) => {
            // CRICKET SPECIFIC MAPPING
            if (row['Pitch_X'] !== undefined) {
                return {
                    id: `del-${index}`,
                    pointNumber: row['Delivery #'] || index,
                    x: Number(row['Pitch_X']) || 0, // Real meters left/right of center
                    y: Number(row['Pitch_Y']) || 0, // Real meters from bowling crease
                    height: Number(row['Bounce_Height']) || 0, // New optional field
                    type: (row['Type'] || 'Delivery').toLowerCase() as any,
                    speed: Number(row['Speed (kmph)']) || 135,
                    spin: 0,
                    rallyLength: 0,
                    isWinner: row['Outcome'] === 'Wicket',
                    isError: row['Outcome'] === 'Wide',
                    isBreakPoint: false,
                    playerId: 'bowler'
                };
            }

            // STANDARD TENNIS MAPPING
            const xCoord = row['X Coord'] ?? 50;
            const yCoord = row['Y Coord'] ?? 50;
            const shotSpeed = row['Speed (km/h)'] || 120;
            const shotSpin = row['Spin (rpm)'] ?? Math.random() * 2000 + 1500;

            // Infer outcome if missing: out-of-bounds heuristic
            let outcome: 'in' | 'out' | undefined = undefined;
            if (row['In/Out']) {
                outcome = row['In/Out'].toLowerCase() === 'out' ? 'out' : 'in';
            } else if (xCoord < 5 || xCoord > 95 || yCoord < 2 || yCoord > 98) {
                outcome = 'out';
            } else {
                outcome = 'in';
            }

            // Infer net clearance if missing: speed/height heuristic
            const hasRawNetClearance = row['Net Clearance'] != null;
            let netClearance: number | undefined = hasRawNetClearance
                ? Number(row['Net Clearance'])
                : undefined;
            if (netClearance == null) {
                // Estimate: higher speed = lower clearance, lobs = high clearance
                const shotType = (row['Shot Type'] || 'forehand').toLowerCase();
                if (shotType === 'lob') netClearance = 1.5 + Math.random() * 2;
                else if (shotType === 'drop') netClearance = 0.05 + Math.random() * 0.2;
                else netClearance = 0.1 + Math.random() * 1.2;
                netClearance = Math.round(netClearance * 100) / 100;
            }

            // Serve type: direct from Excel or ESTIMATED
            let serveType: 'flat' | 'slice' | 'kick' | undefined = undefined;
            const hasRawServeType = !!row['Serve Type'];
            if (row['Serve Type']) {
                serveType = row['Serve Type'].toLowerCase() as any;
            } else if ((row['Shot Type'] || '').toLowerCase() === 'serve') {
                // Estimate from speed + spin
                if (shotSpin > 2500) serveType = 'kick';
                else if (shotSpeed < 170 && shotSpin > 1500) serveType = 'slice';
                else serveType = 'flat';
            }

            // Timestamp: direct or undefined
            const timestamp = row['Timestamp'] != null ? Number(row['Timestamp']) : undefined;

            // Player position: direct or estimated from shot context
            let playerPosition: { x: number; y: number } | undefined = undefined;
            if (row['Player X'] != null && row['Player Y'] != null) {
                playerPosition = { x: Number(row['Player X']), y: Number(row['Player Y']) };
            }

            // Normalize shot type
            const shotType = (row['Shot Type'] || 'forehand').toLowerCase().trim();

            // Derive winner / error / in / out booleans
            const isWinner = row['Winner'] === 'Yes' || (row['Result'] || '').toUpperCase() === 'WINNER';
            const isError = row['Error'] === 'Yes' || (row['Result'] || '').toUpperCase() === 'ERROR';
            const isIn = outcome === 'in';
            const isOut = outcome === 'out';

            // ── BROADCAST-LEVEL TACTICAL FIELDS ──
            // Tactical Direction: Excel column or auto-classify
            let tacticalDirection: any = undefined;
            const hasRawTacticalDirection = !!row['Tactical Direction'];
            if (row['Tactical Direction']) {
                tacticalDirection = row['Tactical Direction']
                    .toString()
                    .split(/[,|+]/)
                    .map((d: string) => d.trim().toLowerCase().replace(/\s+/g, '-'))
                    .filter(Boolean);
            }
            // Auto-classification happens after all shots are parsed

            // Apex Height: Excel column or estimate
            let apexHeight: number | undefined = row['Apex Height'] != null
                ? Number(row['Apex Height'])
                : undefined;

            // Distance Travelled: Excel column (will be calculated later if missing)
            let distanceTravelled: number | undefined = row['Distance Travelled'] != null
                ? Number(row['Distance Travelled'])
                : undefined;

            return {
                id: `shot-${index}`,
                pointNumber: row['Point #'] || index,
                x: xCoord,
                y: yCoord,
                type: shotType as any,
                speed: shotSpeed,
                spin: shotSpin,
                rallyLength: row['Rally Length'] || 3,
                isWinner,
                isError,
                isIn,
                isOut,
                isBreakPoint: row['Break Point'] === 'Yes',
                playerId: (() => {
                    const hitter = row['Server'] || row['Player'] || row['Hitter'] || '';
                    if (hitter === player1Name || hitter === 'Player 1') return 'player1' as const;
                    if (hitter === player2Name || hitter === 'Player 2') return 'player2' as const;
                    return 'player2' as const; // fallback
                })(),
                playerName: row['Server'] || row['Player'] || row['Hitter'] || undefined,
                outcome,
                netClearance,
                netClearanceSource: hasRawNetClearance ? 'excel' : 'inferred',
                serveType,
                serveTypeSource: serveType ? (hasRawServeType ? 'excel' : 'inferred') : 'n/a',
                timestamp,
                playerPosition,
                set: Number(row['Set']) || undefined,
                game: Number(row['Game']) || undefined,
                // New broadcast-level fields
                tacticalDirection,
                tacticalSource: hasRawTacticalDirection ? 'excel' : 'geometry',
                apexHeight,
                distanceTravelled,
                // ✅ NEW: Handedness for Inside-Out/Inside-In detection
                handedness: row['Handedness'] === 'Left' ? 'Left' as const :
                    row['Handedness'] === 'Right' ? 'Right' as const : undefined,
                // ── SERVE FAULT FIELDS ──
                serveFaultType: (['long', 'wide', 'net'].includes(row['Fault Type']?.toString()?.toLowerCase()))
                    ? row['Fault Type'].toString().toLowerCase() as 'long' | 'wide' | 'net'
                    : undefined,
                isDoubleFault: row['Double Fault']?.toString()?.toLowerCase() === 'yes',
            };
        });

        // ──────────────────────────────────────────────────────────────────
        // POST-PROCESSING: Auto-classify tactical direction and calculate distances
        // ──────────────────────────────────────────────────────────────────
        // ===========================================
        // ✅ GEOMETRY ENGINE: Compute result & direction
        // ===========================================

        // Apply geometry-based computation to all shots
        const normalizedShots = shots.map(shot => {
            // Ensure start/end coordinates exist
            const shotWithCoords = {
                ...shot,
                end: shot.end || { x: shot.x || 0, y: shot.y || 0, z: shot.height || 0 },
                start: shot.start || {
                    x: shot.playerPosition?.x || shot.playerX || 0,
                    y: shot.playerPosition?.y || shot.playerY || 0,
                    z: 0
                }
            };

            // Normalize: computes result and tacticalDirection from geometry
            return normalizeShot(shotWithCoords);
        });

        // Use normalized shots with computed properties
        const enhancedShots = normalizedShots;
        enhancedShots.forEach(shot => {
            if (!shot.distanceTravelled && shot.playerPosition) {
                shot.distanceTravelled = calculateBallDistance(shot);
            }
        });

        // Calculate rally distribution
        const rallyLengthCounts: Record<number, number> = {};
        enhancedShots.forEach(shot => {
            rallyLengthCounts[shot.rallyLength] = (rallyLengthCounts[shot.rallyLength] || 0) + 1;
        });

        const totalShots = enhancedShots.length;
        const rallyDistribution: RallyDistribution[] = Object.entries(rallyLengthCounts).map(([length, count]) => ({
            length: parseInt(length),
            count,
            percentage: (count / totalShots) * 100
        }));

        // Calculate break point stats
        const p1BreakPoints = enhancedShots.filter(s => s.isBreakPoint && s.playerId === 'player2');
        const p2BreakPoints = enhancedShots.filter(s => s.isBreakPoint && s.playerId === 'player1');

        const breakPoints = {
            player1: {
                opportunities: player1.breakPointsFaced,
                converted: player1.breakPointsWon,
                conversionRate: player1.breakPointsFaced > 0 ? (player1.breakPointsWon / player1.breakPointsFaced) * 100 : 0,
                saved: player1.breakPointsFaced - player1.breakPointsWon,
                saveRate: player1.breakPointsFaced > 0 ? ((player1.breakPointsFaced - player1.breakPointsWon) / player1.breakPointsFaced) * 100 : 0
            },
            player2: {
                opportunities: player2.breakPointsFaced,
                converted: player2.breakPointsWon,
                conversionRate: player2.breakPointsFaced > 0 ? (player2.breakPointsWon / player2.breakPointsFaced) * 100 : 0,
                saved: player2.breakPointsFaced - player2.breakPointsWon,
                saveRate: player2.breakPointsFaced > 0 ? ((player2.breakPointsFaced - player2.breakPointsWon) / player2.breakPointsFaced) * 100 : 0
            }
        };

        // Calculate shot type distribution
        const p1Shots = enhancedShots.filter(s => s.playerId === 'player1');
        const p2Shots = enhancedShots.filter(s => s.playerId === 'player2');

        const getShotTypeDistribution = (playerShots: ShotData[]): ShotTypeDistribution => {
            const total = playerShots.length;
            return {
                forehand: (playerShots.filter(s => s.type === 'forehand').length / total) * 100,
                backhand: (playerShots.filter(s => s.type === 'backhand').length / total) * 100,
                volley: (playerShots.filter(s => s.type === 'volley').length / total) * 100,
                smash: (playerShots.filter(s => s.type === 'smash').length / total) * 100,
                serve: (playerShots.filter(s => s.type === 'serve').length / total) * 100
            };
        };

        // ─── Build Sets Data from Point Data ───────────
        const setsMap = new Map<number, Map<number, { p1Points: number; p2Points: number }>>();
        shots.forEach(shot => {
            const row = pointDataRows.find((r: any) => (r['Point #'] || 0) === shot.pointNumber);
            if (!row) return;
            const setNum = row['Set'] || 1;
            const gameNum = row['Game'] || 1;
            if (!setsMap.has(setNum)) setsMap.set(setNum, new Map());
            const setGames = setsMap.get(setNum)!;
            if (!setGames.has(gameNum)) setGames.set(gameNum, { p1Points: 0, p2Points: 0 });
        });

        // Determine game winners from last shot in each point
        const pointsBySetGame = new Map<string, ShotData[]>();
        shots.forEach(shot => {
            const row = pointDataRows.find((r: any) => (r['Point #'] || 0) === shot.pointNumber);
            if (!row) return;
            const key = `${row['Set']}-${row['Game']}`;
            if (!pointsBySetGame.has(key)) pointsBySetGame.set(key, []);
            pointsBySetGame.get(key)!.push(shot);
        });

        // Build sets with game-level scoring
        const setScores = new Map<number, { p1Games: number; p2Games: number }>();
        pointsBySetGame.forEach((gameShots, key) => {
            const [setStr, gameStr] = key.split('-');
            const setNum = parseInt(setStr);
            if (!setScores.has(setNum)) setScores.set(setNum, { p1Games: 0, p2Games: 0 });
            // Winner of a game = player who hit more winners / last winner in the game
            const p1Winners = gameShots.filter(s => s.playerId === 'player1' && s.isWinner).length;
            const p2Winners = gameShots.filter(s => s.playerId === 'player2' && s.isWinner).length;
            const scores = setScores.get(setNum)!;
            if (p1Winners >= p2Winners) scores.p1Games++;
            else scores.p2Games++;
        });

        const setsData = Array.from(setScores.entries())
            .sort(([a], [b]) => a - b)
            .map(([setNum, scores]) => ({
                setNumber: setNum,
                player1Score: scores.p1Games,
                player2Score: scores.p2Games,
                games: [] as any[],
            }));

        // ─── Build Momentum Data from shots ──────────────
        const pointNumbers = [...new Set(shots.map(s => s.pointNumber))].sort((a, b) => a - b);
        let p1RunningScore = 0;
        let p2RunningScore = 0;
        const momentumData = pointNumbers.map((pn, idx) => {
            const pointShots = shots.filter(s => s.pointNumber === pn);
            const lastShot = pointShots[pointShots.length - 1];
            const wasP1Winner = lastShot?.playerId === 'player1' && lastShot?.isWinner;
            const wasP2Error = lastShot?.playerId === 'player2' && lastShot?.isError;
            const p1WonPoint = wasP1Winner || wasP2Error;
            if (p1WonPoint) p1RunningScore++;
            else p2RunningScore++;
            return {
                pointIndex: idx,
                scorer: (p1WonPoint ? 'player1' : 'player2') as 'player1' | 'player2',
                scoreString: `${p1RunningScore}-${p2RunningScore}`,
                dominanceIndex: p1WonPoint ? 10 : -10,
            };
        });

        // Build complete analytics object
        const analytics: MatchAnalytics = {
            matchId: `${player1Name.replace(/\s/g, '-')}-vs-${player2Name.replace(/\s/g, '-')}`,
            duration: matchInfo['Match Duration'] || '2h 30m',
            tournament,
            players: { player1, player2 },
            sets: setsData,
            momentum: momentumData,
            heatmaps: {
                player1: p1Shots,
                player2: p2Shots
            },
            shotQuality: {
                avgSpeed: (player1.avgSpeed + player2.avgSpeed) / 2 || 140,
                avgSpin: 2400,
                netClearanceAvg: 45
            },
            serveMap: [],
            rallyDistribution,
            breakPoints,
            shotTypeDistribution: {
                player1: getShotTypeDistribution(p1Shots),
                player2: getShotTypeDistribution(p2Shots)
            },
            performanceBySet: {
                player1: [],
                player2: []
            },
            movementData: {
                player1: {
                    playerId: 'player1',
                    totalDistance: player1.distanceCovered || 0,
                    avgSpeed: p1Stats['Avg Movement Speed'] || 14,
                    maxSpeed: p1Stats['Max Movement Speed'] || 30,
                    courtCoverage: player1.courtCoveragePercentage || 75,
                    sprintCount: p1Stats['Sprint Count'] || 50
                },
                player2: {
                    playerId: 'player2',
                    totalDistance: player2.distanceCovered || 0,
                    avgSpeed: p2Stats['Avg Movement Speed'] || 13,
                    maxSpeed: p2Stats['Max Movement Speed'] || 28,
                    courtCoverage: player2.courtCoveragePercentage || 72,
                    sprintCount: p2Stats['Sprint Count'] || 45
                }
            }
        };

        return analytics;

    } catch (error) {
        console.error('Error parsing Excel file:', error);
        return null;
    }
};
