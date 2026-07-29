import { ShotData, ShotFilterState } from '../types/analytics';

/**
 * Strict Filter Engine
 * 
 * Centralized filtering logic with deterministic behavior.
 * ALL filter combinations must work correctly.
 */

/**
 * Apply strict AND/OR filtering to shots
 * 
 * Logic:
 * - OR within same category (e.g., Serve OR Forehand)
 * - AND across categories (e.g., Serve AND Cross-Court AND Winner)
 * - STRICT result mode: no results selected = no shots shown
 */
export function applyStrictFilters(
    shots: ShotData[],
    filters: ShotFilterState
): ShotData[] {
    const tacticalMode = filters.tacticalMode || 'tag';

    return shots.filter(shot => {
        // ────────────────────────────────────────────
        // 1. Shot Type Filter (OR within category)
        // ────────────────────────────────────────────
        const shotTypeStr = (shot.type || shot.shotType || '').toString().toLowerCase();
        const typeMatch =
            filters.shotTypes.length === 0 ||
            filters.shotTypes.some(type =>
                shotTypeStr.includes(type.toLowerCase())
            );

        if (!typeMatch) return false;

        // ────────────────────────────────────────────
        // 2. Tactical Direction Filter (OR within category, ARRAY matching)
        // ────────────────────────────────────────────
        let directionMatch = true;
        if (filters.tacticalDirections && filters.tacticalDirections.length > 0) {
            const sourceDirections = tacticalMode === 'strict' ? shot.tacticalDirectionStrict : shot.tacticalDirection;
            const shotDirections = Array.isArray(sourceDirections)
                ? sourceDirections
                : sourceDirections
                    ? [sourceDirections]
                    : [];

            // Match if shot has ANY of the filtered directions
            directionMatch = filters.tacticalDirections.some(filterDir =>
                shotDirections.some(shotDir => shotDir.toLowerCase() === filterDir.toLowerCase())
            );
        }

        if (!directionMatch) return false;

        // ────────────────────────────────────────────
        // 3. Result Filter (OR within category, STRICT mode)
        // ────────────────────────────────────────────
        // CRITICAL: No results selected = NO shots shown
        if (filters.results.length === 0) {
            return false;
        }

        // Use the computed result field (single source of truth). Fall back to
        // the boolean flags for any shot that predates the `result` field, so
        // legacy data still renders instead of being silently filtered away.
        const effectiveResult: ShotData['result'] =
            shot.result ??
            (shot.isWinner ? 'winner'
                : shot.isError ? 'error'
                    : shot.isOut ? 'out'
                        : 'in');

        if (!filters.results.includes(effectiveResult)) return false;

        // ────────────────────────────────────────────
        // ALL filters passed (AND logic across categories)
        // ────────────────────────────────────────────
        return true;
    });
}

/**
 * Calculate breakdown statistics from filtered shots
 * 
 * NO priority hierarchy needed - result field is mutually exclusive
 */
export function calculateBreakdown(shots: ShotData[]) {
    return {
        total: shots.length,
        winners: shots.filter(s => s.result === 'winner').length,
        errors: shots.filter(s => s.result === 'error').length,
        in: shots.filter(s => s.result === 'in').length,
        out: shots.filter(s => s.result === 'out').length,
    };
}

/**
 * Validate filter consistency
 * 
 * Ensures rendered count matches filtered count
 */
export function validateFilterConsistency(
    filteredCount: number,
    renderedCount: number,
    filters: ShotFilterState
): boolean {
    if (filteredCount !== renderedCount) {
        console.error('❌ FILTER MISMATCH:', {
            filtered: filteredCount,
            rendered: renderedCount,
            difference: Math.abs(filteredCount - renderedCount),
            filters
        });
        return false;
    }

    console.log(`✅ Filter Valid: ${filteredCount} shots filtered & rendered`);
    return true;
}
