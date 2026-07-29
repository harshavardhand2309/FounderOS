import { ShotData } from '../types/analytics';

/**
 * Geometric Cross-Court Detection
 * Uses actual court coordinates to determine if shot crosses court diagonally
 */

interface CourtBounds {
    centerX: number;      // X-coordinate of court center
    centerY: number;      // Y-coordinate of net line
    singlesWidth: number; // Singles court width (8.23m for tennis)
    courtLength: number;  // Full court length (23.77m for tennis)
}

const TENNIS_COURT: CourtBounds = {
    centerX: 50,
    centerY: 50,
    singlesWidth: 8.23,
    courtLength: 23.77
};

/**
 * Detect if shot is cross-court based on geometry
 * Cross-court = shot crosses the center line horizontally
 */
export function isGeometricCrossCourt(shot: ShotData): boolean {
    if (!shot.playerPosition) return false;

    const startX = shot.playerPosition.x;
    const endX = shot.x;
    const centerX = TENNIS_COURT.centerX;

    // Determine which half player started in
    const startedLeft = startX < centerX;
    const landedLeft = endX < centerX;

    // Cross-court if started left and landed right, OR started right and landed left
    return startedLeft !== landedLeft;
}

/**
 * Detect if shot is down-the-line based on geometry
 * DTL = shot stays on same side of court
 */
export function isGeometricDownTheLine(shot: ShotData): boolean {
    if (!shot.playerPosition) return false;

    const startX = shot.playerPosition.x;
    const endX = shot.x;
    const centerX = TENNIS_COURT.centerX;

    const startedLeft = startX < centerX;
    const landedLeft = endX < centerX;

    // DTL if both on same side AND minimal lateral movement
    if (startedLeft === landedLeft) {
        const lateralMovement = Math.abs(endX - startX);
        return lateralMovement < 20; // Less than 20% lateral movement
    }

    return false;
}

/**
 * Validate if shot is a proper volley
 * Volleying occurs near net, not at baseline
 */
export function isValidVolley(shot: ShotData): boolean {
    if (!shot.playerPosition) return true; // If no position data, trust the type

    const playerY = shot.playerPosition.y;
    const centerY = TENNIS_COURT.centerY;

    // Volley player position should be close to net (within service box area)
    // Service line is approximately 21 feet = 6.4m from baseline
    // In 0-100 scale, service line is about 13.4 units from baseline
    const distanceFromNet = Math.abs(playerY - centerY);

    return distanceFromNet < 30; // Within 30% of court from net
}

/**
 * Validate if landing position is inside singles court bounds
 */
export function isInsideSinglesCourt(shot: ShotData): boolean {
    const x = shot.x;
    const y = shot.y;

    // Singles court boundaries in 0-100 scale
    const singlesWidthPercent = (TENNIS_COURT.singlesWidth / (TENNIS_COURT.singlesWidth * 2)) * 100;
    const leftBound = 50 - singlesWidthPercent / 2;
    const rightBound = 50 + singlesWidthPercent / 2;

    // Check horizontal bounds (singles sidelines)
    if (x < leftBound || x > rightBound) return false;

    // Check depth bounds (baselines)
    if (y < 0 || y > 100) return false;

    return true;
}

/**
 * Apply geometric validation and update tactical direction
 * This ensures tactical direction matches actual geometry
 */
export function applyGeometricValidation(shot: ShotData): ShotData {
    // Skip if no player position data
    if (!shot.playerPosition) return shot;

    // Validate court bounds
    const inBounds = isInsideSinglesCourt(shot);
    if (!inBounds && shot.isIn) {
        console.warn(`Shot ${shot.id} marked as 'in' but lands outside singles court`);
    }

    // Validate volley position if shot type is volley
    if (shot.type === 'volley') {
        const validVolleyPosition = isValidVolley(shot);
        if (!validVolleyPosition) {
            console.warn(`Shot ${shot.id} marked as 'volley' but player not near net`);
        }
    }

    // Override tactical direction with geometric detection
    let geometricDirection = shot.tacticalDirection;

    if (isGeometricCrossCourt(shot)) {
        geometricDirection = ['cross-court'];
    } else if (isGeometricDownTheLine(shot)) {
        geometricDirection = ['down-the-line'];
    }

    return {
        ...shot,
        tacticalDirection: geometricDirection
    };
}

/**
 * Batch apply geometric validation to all shots
 */
export function validateAllShotsGeometry(shots: ShotData[]): ShotData[] {
    return shots.map(shot => applyGeometricValidation(shot));
}
