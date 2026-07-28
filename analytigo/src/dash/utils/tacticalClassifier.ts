import { ShotData, TacticalDirection } from '../types/analytics';

/**
 * Tactical Shot Classification Engine
 * Automatic geometric analysis to classify shot direction based on coordinates
 */

interface CourtBounds {
    width: number;    // 0-100 scale
    length: number;   // 0-100 scale
    netLine: number;  // Y-position of net (default: 50)
}

const TENNIS_BOUNDS: CourtBounds = {
    width: 100,
    length: 100,
    netLine: 50
};

/**
 * Calculate angle of shot trajectory
 * @returns angle in degrees (0-180)
 */
function calculateShotAngle(start: { x: number; y: number }, end: { x: number; y: number }): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
    return angle;
}

/**
 * Calculate Euclidean distance between two points
 */
function calculateDistance(start: { x: number; y: number }, end: { x: number; y: number }): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Determine which side of the court a position is on
 */
function getCourtSide(x: number, netLine: number = 50): 'left' | 'right' | 'center' {
    if (x < 40) return 'left';
    if (x > 60) return 'right';
    return 'center';
}

/**
 * Main tactical classification function
 * Uses geometric vector analysis to determine shot direction
 */
export function classifyShotDirection(shot: ShotData, bounds: CourtBounds = TENNIS_BOUNDS): TacticalDirection {
    const { x: endX, y: endY, playerPosition, type, height } = shot;

    // If no player position data, use default heuristics
    if (!playerPosition) {
        return classifyWithoutPlayerPosition(shot, bounds);
    }

    const { x: startX, y: startY } = playerPosition;

    // Determine sides
    const startSide = getCourtSide(startX, bounds.netLine);
    const endSide = getCourtSide(endX, bounds.netLine);

    // Calculate metrics
    const lateralDisplacement = endX - startX;
    const depth = Math.abs(endY - startY);
    const angle = calculateShotAngle(playerPosition, { x: endX, y: endY });
    const distance = calculateDistance(playerPosition, { x: endX, y: endY });

    // Classification logic

    // 1. LOB: High trajectory shots - check height first
    if (height && height > 2.5) {
        return 'approach'; // High lobs are often defensive/approach
    }

    // 2. DROP SHOT: Short depth + low arc
    if (type === 'drop' || (depth < 30 && height && height < 0.5)) {
        return 'angle';
    }

    // 3. DOWN THE LINE: Same side, minimal lateral movement
    if (startSide === endSide && Math.abs(lateralDisplacement) < 20) {
        // Check if it's deep (approach shot)
        if (depth > 60) {
            return 'down-the-line';
        }
        return 'down-the-line';
    }

    // 4. CROSS COURT: Crosses center significantly
    if (startSide !== endSide && startSide !== 'center') {
        // Wide cross court = regular cross court
        if (Math.abs(lateralDisplacement) > 30) {
            return 'cross-court';
        }
        // Narrow cross = passing shot if player is at net
        if (startY < 30 || startY > 70) {
            return 'pass';
        }
        return 'cross-court';
    }

    // 5. INSIDE-OUT: From center/inside position, goes wide to same side
    if (startX > 35 && startX < 65) {
        // Hits to the outside
        if ((startSide === 'center' || startSide === 'right') && endX > 70) {
            return 'inside-out';
        }
        if ((startSide === 'center' || startSide === 'left') && endX < 30) {
            return 'inside-out';
        }
    }

    // 6. INSIDE-IN: From center position, stays in center or goes to opposite center
    if (startX > 35 && startX < 65 && endX > 35 && endX < 65) {
        return 'inside-in';
    }

    // 7. SHORT ANGLE: Sharp cross-court angle with short depth
    if (Math.abs(lateralDisplacement) > 25 && depth < 40 && angle > 35) {
        return 'angle';
    }

    // 8. DEEP MIDDLE: Targeted to center, deep
    if (endX > 40 && endX < 60 && depth > 60) {
        return 'deep';
    }

    // 9. APPROACH SHOT: Deep ball while moving forward
    if (depth > 65 && (type === 'forehand' || type === 'backhand' || type === 'volley')) {
        return 'approach';
    }

    // 10. PASSING SHOT: Wide angle while opponent at net (inferred)
    if (Math.abs(lateralDisplacement) > 35 && angle > 30) {
        return 'pass';
    }

    // Default: Cross Court (most common rally shot)
    return 'cross-court';
}

/**
 * Fallback classification when player position is not available
 * Uses shot type, landing position, and height heuristics
 */
function classifyWithoutPlayerPosition(shot: ShotData, bounds: CourtBounds): TacticalDirection {
    const { x: endX, y: endY, type, height } = shot;

    // Type-based classification
    if (type === 'drop') return 'angle';
    if (type === 'lob' || (height && height > 2.5)) return 'approach';

    // Position-based classification
    const endSide = getCourtSide(endX, bounds.netLine);
    const depthFromBaseline = Math.abs(endY - 100); // Distance from far baseline

    // Central shots
    if (endX > 40 && endX < 60) {
        if (depthFromBaseline < 20) return 'deep';
        return 'cross-court';
    }

    // Wide shots
    if (endX < 30 || endX > 70) {
        if (depthFromBaseline < 30) return 'angle';
        return 'down-the-line';
    }

    // Default
    return 'cross-court';
}

/**
 * Batch classify all shots in an array
 */
export function classifyAllShots(shots: ShotData[]): ShotData[] {
    return shots.map(shot => ({
        ...shot,
        tacticalDirection: shot.tacticalDirection || [classifyShotDirection(shot)]
    }));
}

/**
 * Format tactical direction for display
 */
export function formatTacticalDirection(direction?: TacticalDirection): string {
    if (!direction) return 'N/A';

    const map: Record<TacticalDirection, string> = {
        'down-the-line': 'Down the Line',
        'cross-court': 'Cross Court',
        'inside-out': 'Inside-Out',
        'inside-in': 'Inside-In',
        'angle': 'Short Angle',
        'deep': 'Deep Middle',
        'approach': 'Approach Shot',
        'pass': 'Passing Shot'
    };

    return map[direction] || direction;
}

/**
 * Get icon for tactical direction
 */
export function getTacticalIcon(direction: TacticalDirection): string {
    const iconMap: Record<TacticalDirection, string> = {
        'down-the-line': '↕️',
        'cross-court': '↗️',
        'inside-out': '↩️',
        'inside-in': '⤵️',
        'angle': '↪️',
        'deep': '🎯',
        'approach': '⬆️',
        'pass': '⚡'
    };

    return iconMap[direction] || '🎾';
}

/**
 * Calculate distance travelled by the ball (approximation)
 * Uses Pythagorean theorem on court coordinates scaled to meters
 */
export function calculateBallDistance(shot: ShotData): number {
    if (!shot.playerPosition) return 0;

    // Tennis court dimensions: 23.77m x 10.97m
    const courtLength = 23.77;
    const courtWidth = 10.97;

    const { x: startX, y: startY } = shot.playerPosition;
    const { x: endX, y: endY } = shot;

    // Convert percentage coordinates to meters
    const startXMeters = (startX / 100) * courtWidth;
    const startYMeters = (startY / 100) * courtLength;
    const endXMeters = (endX / 100) * courtWidth;
    const endYMeters = (endY / 100) * courtLength;

    // Calculate 2D distance
    const dx = endXMeters - startXMeters;
    const dy = endYMeters - startYMeters;
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

    // Add arc component if height is available
    if (shot.apexHeight) {
        // Approximate arc length using simple parabolic model
        const arcFactor = 1 + (shot.apexHeight / horizontalDistance) * 0.5;
        return horizontalDistance * arcFactor;
    }

    return horizontalDistance;
}
