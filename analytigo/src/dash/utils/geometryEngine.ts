import { ShotData, TacticalDirection } from '../types/analytics';

/**
 * Geometry-Driven Tennis Analytics Engine
 * 
 * This module computes shot properties (result, direction) from physical coordinates.
 * NO manual tagging - everything derived from geometry.
 */

// Court bounds, expressed in the SAME 0-100 coordinate space the rest of this
// module and the Excel parser use (50 = centre). These were previously in
// metres (4.115 / 11.885), which meant `Math.abs(x) <= 4.115` was false for
// virtually every shot and the geometry fallback classified almost everything
// as 'out'. The half-extents below reproduce the parser's own in/out rule
// (out when x < 5 || x > 95 || y < 2 || y > 98).
const COURT_BOUNDS = {
    CENTRE: 50,
    SINGLES_WIDTH: 45,         // Half-width  → x within [5, 95]
    BASELINE_DEPTH: 48,        // Half-depth  → y within [2, 98]
    NET_Y: 50,                 // Net sits at the centre line in this space
};

/**
 * Compute shot result from landing position OR existing flags
 * 
 * Priority (MIGRATION STRATEGY):
 * 1. Use existing boolean flags if available (backward compatibility)
 * 2. Fall back to geometry computation for new data
 */
export function computeResult(shot: ShotData): 'winner' | 'error' | 'in' | 'out' {
    // ─────────────────────────────────────────────────────
    // MIGRATION: Use existing flags if available
    // ─────────────────────────────────────────────────────
    if (shot.isWinner === true) return 'winner';
    if (shot.isError === true) return 'error';
    if (shot.isOut === true) return 'out';
    if (shot.isIn === true) return 'in';

    // ─────────────────────────────────────────────────────
    // FALLBACK: Compute from geometry if no flags exist
    // ─────────────────────────────────────────────────────
    if (!shot.end) {
        // No coordinates - default to 'in' for safety
        return 'in';
    }

    const { x, y } = shot.end;

    // Check if inside singles court boundaries (0-100 space, centred on 50)
    const insideSingles =
        Math.abs(x - COURT_BOUNDS.CENTRE) <= COURT_BOUNDS.SINGLES_WIDTH &&
        Math.abs(y - COURT_BOUNDS.CENTRE) <= COURT_BOUNDS.BASELINE_DEPTH;

    // If outside bounds → 'out'
    if (!insideSingles) {
        return 'out';
    }

    // Inside bounds - check point outcome
    if (shot.pointWon === true) {
        return 'winner';
    }

    return 'in';
}

/**
 * Compute advanced tactical directions (multiple tags supported)
 * 
 * Returns array of applicable tactical directions:
 * - base: 'cross-court' OR 'down-the-line'
 * - modifiers: 'angle', 'deep', 'inside-out', 'inside-in', 'approach', 'pass'
 */
export function computeTacticalDirections(shot: ShotData): TacticalDirection[] {
    const directions: TacticalDirection[] = [];

    // Get coordinates - both in 0-100 range where 50 = center
    const startX = shot.start?.x ?? shot.playerX ?? 50;
    const endX = shot.end?.x ?? shot.x ?? 50;
    const startY = shot.start?.y ?? shot.playerY ?? 50;
    const endY = shot.end?.y ?? shot.y ?? 50;

    // Convert to left/right: values < 50 = left, > 50 = right
    const startIsLeft = startX < 50;
    const startIsRight = startX > 50;
    const endIsLeft = endX < 50;
    const endIsRight = endX > 50;

    // ═══════════════════════════════════════════════════
    // 1. BASE DIRECTION (Cross-court or Down-the-line)
    // ═══════════════════════════════════════════════════
    const isCrossCourt = (startIsLeft && endIsRight) || (startIsRight && endIsLeft);
    const isDTL = (startIsLeft && endIsLeft) || (startIsRight && endIsRight);

    if (isCrossCourt) {
        directions.push('cross-court');
    } else if (isDTL) {
        directions.push('down-the-line');
    }

    // ═══════════════════════════════════════════════════
    // 2. ANGLE (Sharp cross-court, wide near sideline)
    // ═══════════════════════════════════════════════════
    if (isCrossCourt && Math.abs(endX - 50) > 25) {
        directions.push('angle');
    }

    // ═══════════════════════════════════════════════════
    // 3. DEEP (Ball lands deep on far baseline)
    // ═══════════════════════════════════════════════════
    if (endY > 75) {
        directions.push('deep');
    }

    // ═══════════════════════════════════════════════════
    // 4. INSIDE-OUT / INSIDE-IN (requires handedness)
    // ═══════════════════════════════════════════════════
    const isRightHanded = !shot.handedness || shot.handedness === 'Right';
    const shotType = (shot.type || shot.shotType || '').toLowerCase();
    const isForehand = shotType.includes('forehand');

    if (isRightHanded && isForehand) {
        // Right-hander forehand from left side → Inside-Out
        if (startX < 35 && endIsRight) {
            directions.push('inside-out');
        }
        // Right-hander forehand from right side → Inside-In
        else if (startX > 65 && endIsRight) {
            directions.push('inside-in');
        }
    } else if (!isRightHanded && isForehand) {
        // Left-hander logic (mirror of right-hander)
        if (startX > 65 && endIsLeft) {
            directions.push('inside-out');
        } else if (startX < 35 && endIsLeft) {
            directions.push('inside-in');
        }
    }

    // ═══════════════════════════════════════════════════
    // 5. APPROACH (Moving forward to net)
    // ═══════════════════════════════════════════════════
    if (startY > 60 && endY < 40) {
        // Player moving from baseline toward net
        directions.push('approach');
    }

    // ═══════════════════════════════════════════════════
    // 6. PASS (Ball goes past opponent at net)
    // ═══════════════════════════════════════════════════
    // Simplified: if shot speed > 120 and ends deep
    if (shot.speed > 120 && endY > 70) {
        directions.push('pass');
    }

    return directions.length > 0 ? directions : ['down-the-line']; // Default fallback
}

/**
 * Strict geometry tactical classifier with tighter thresholds for filtering.
 * Coordinates are expected in 0-100 normalized court space.
 */
export function computeStrictTacticalDirections(shot: ShotData): TacticalDirection[] {
    const dirs: TacticalDirection[] = [];
    const sx = shot.start?.x ?? shot.playerX ?? shot.playerPosition?.x ?? 50;
    const sy = shot.start?.y ?? shot.playerY ?? shot.playerPosition?.y ?? 50;
    const ex = shot.end?.x ?? shot.x ?? 50;
    const ey = shot.end?.y ?? shot.y ?? 50;

    const sameSide = (sx < 50 && ex < 50) || (sx > 50 && ex > 50);
    const crossSide = (sx < 50 && ex > 50) || (sx > 50 && ex < 50);
    const lateralDelta = Math.abs(ex - sx);
    const endWide = Math.abs(ex - 50) >= 28;

    // DTL strict: same lateral lane with low cross-lateral drift.
    if (sameSide && lateralDelta <= 14 && Math.abs(ex - 50) >= 8) {
        dirs.push('down-the-line');
    }

    // Cross-court strict: clear side switch with meaningful lateral displacement.
    if (crossSide && lateralDelta >= 16) {
        dirs.push('cross-court');
    }

    // Deep strict by opponent baseline proximity.
    const deepByDepth = Math.abs(ey - 50) >= 25;
    if (deepByDepth) {
        dirs.push('deep');
    }

    // Angle strict: cross-court + short-ish depth + wide endpoint.
    const shortZone = Math.abs(ey - 50) <= 14;
    if (crossSide && endWide && shortZone) {
        dirs.push('angle');
    }

    const shotType = (shot.type || shot.shotType || '').toLowerCase();
    const isForehand = shotType.includes('forehand');
    const isRightHanded = !shot.handedness || shot.handedness === 'Right';

    // Inside-Out / Inside-In strict.
    if (isForehand) {
        if (isRightHanded) {
            if (sx <= 40 && ex > 50) dirs.push('inside-out');
            if (sx >= 60 && ex > 50 && sameSide) dirs.push('inside-in');
        } else {
            if (sx >= 60 && ex < 50) dirs.push('inside-out');
            if (sx <= 40 && ex < 50 && sameSide) dirs.push('inside-in');
        }
    }

    // Approach strict: baseline-origin attacking shot toward deep opponent court.
    const fromBaseline = Math.abs(sy - 50) >= 30;
    if (fromBaseline && deepByDepth && shot.speed >= 90 && !['lob', 'drop'].includes(shotType)) {
        dirs.push('approach');
    }

    // Pass strict (still heuristic without opponent-net positional telemetry).
    if (shot.speed >= 105 && endWide && (crossSide || sameSide) && deepByDepth) {
        dirs.push('pass');
    }

    return Array.from(new Set(dirs));
}

/**
 * Normalize and enhance shot data
 * 
 * This is the SINGLE SOURCE OF TRUTH for shot properties.
 * All computed fields are derived here.
 */
export function normalizeShot(rawShot: any): ShotData {
    // Ensure required fields exist
    const shot: ShotData = {
        ...rawShot,
        start: rawShot.start || { x: rawShot.playerX || 0, y: rawShot.playerY || 0, z: 0 },
        end: rawShot.end || { x: rawShot.x || 0, y: rawShot.y || 0, z: rawShot.z || 0 },
    };

    // Compute result from geometry (single source of truth)
    shot.result = computeResult(shot);

    // Preserve tactical direction from source data if available; otherwise compute from geometry.
    if (rawShot.tacticalDirection && Array.isArray(rawShot.tacticalDirection) && rawShot.tacticalDirection.length > 0) {
        shot.tacticalDirection = rawShot.tacticalDirection;
        shot.tacticalSource = 'excel';
    } else if (rawShot.tacticalDirection && !Array.isArray(rawShot.tacticalDirection)) {
        shot.tacticalDirection = [rawShot.tacticalDirection];
        shot.tacticalSource = 'excel';
    } else {
        shot.tacticalDirection = computeTacticalDirections(shot);
        shot.tacticalSource = 'geometry';
    }

    // Always compute strict tactical directions for high-precision filtering mode.
    shot.tacticalDirectionStrict = computeStrictTacticalDirections(shot);

    // Tactical confidence for UI/reporting.
    if (shot.tacticalSource === 'excel') {
        shot.tacticalConfidence = 'HIGH';
    } else if ((shot.tacticalDirectionStrict?.length || 0) > 0) {
        shot.tacticalConfidence = 'MEDIUM';
    } else {
        shot.tacticalConfidence = 'LOW';
    }

    // Keep the boolean flags in sync with the computed result rather than
    // deleting them. `result` is the single source of truth for filtering, but
    // 17 call sites across metricEngine and advancedIntelligenceEngine still
    // read isWinner/isError — deleting them made every one of those metrics
    // (aces, double-fault rate, winners/errors by type, rally win/loss,
    // momentum, movement efficiency…) silently return 0 for parsed Excel data.
    shot.isWinner = shot.result === 'winner';
    shot.isError = shot.result === 'error';
    shot.isIn = shot.result === 'in' || shot.result === 'winner';
    shot.isOut = shot.result === 'out';

    return shot;
}

/**
 * Migrate legacy shot data (backward compatibility)
 * 
 * Converts old boolean flags to new computed model
 */
export function migrateLegacyShot(shot: any): ShotData {
    // If using old boolean flags, preserve them temporarily for computation
    const tempShot = { ...shot };

    // Preserve error flag if it exists (can't be computed from geometry)
    if (shot.isError === true) {
        tempShot.isError = true;
    }

    // Preserve winner/pointWon for result computation
    if (shot.isWinner === true) {
        tempShot.isWinner = true;
    }

    if (shot.pointWon !== undefined) {
        tempShot.pointWon = shot.pointWon;
    }

    // Normalize will compute result and clean up old fields
    return normalizeShot(tempShot);
}

/**
 * Adjust out shot position for visual accuracy
 * 
 * Ensures 'out' shots visually land outside court boundaries
 */
export function adjustOutShotPosition(shot: ShotData): { x: number; y: number; z: number } {
    const end = shot.end ?? { x: shot.x, y: shot.y, z: 0 };

    if (shot.result === 'out') {
        const { x, y, z } = end;

        // Push slightly further outside if near boundary
        const absX = Math.abs(x);
        const absY = Math.abs(y);

        const multiplierX =
            Math.abs(x - COURT_BOUNDS.CENTRE) > COURT_BOUNDS.SINGLES_WIDTH * 0.95 ? 1.08 : 1.0;
        const multiplierY =
            Math.abs(y - COURT_BOUNDS.CENTRE) > COURT_BOUNDS.BASELINE_DEPTH * 0.95 ? 1.08 : 1.0;

        return {
            x: x * multiplierX,
            y: y * multiplierY,
            z: z || 0
        };
    }

    return { x: end.x, y: end.y, z: end.z || 0 };
}

/**
 * Validate shot has required geometric properties
 */
export function isValidShot(shot: any): boolean {
    return !!(
        shot &&
        shot.end &&
        typeof shot.end.x === 'number' &&
        typeof shot.end.y === 'number'
    );
}
