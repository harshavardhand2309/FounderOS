import { ShotData, ShotFilterState } from '../types/analytics';

/**
 * Filter Debug Logger
 * Comprehensive logging to diagnose filter issues
 */

export function logFilterState(filters: ShotFilterState, label: string = 'Filter State') {
    console.group(`🔍 ${label}`);
    console.log('Shot Types Selected:', filters.shotTypes);
    console.log('Tactical Directions:', filters.tacticalDirections);
    console.log('Results Array:', filters.results);
    console.log('Show Flags:', {
        showWinners: filters.showWinners,
        showErrors: filters.showErrors,
        showIn: filters.showIn,
        showOut: filters.showOut,
        showNetClearance: filters.showNetClearance
    });
    console.groupEnd();
}

export function logShotFilterResult(
    shot: ShotData,
    index: number,
    passed: boolean,
    reason: string
) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} Shot #${index + 1} [${shot.type}]: ${reason}`, {
        type: shot.type,
        tactical: shot.tacticalDirection,
        isWinner: shot.isWinner,
        isError: shot.isError,
        isIn: shot.isIn,
        isOut: shot.isOut
    });
}

export function validateFilterConsistency(
    filterPanelCount: number,
    court3DCount: number,
    filters: ShotFilterState
) {
    console.group('⚖️ FILTER CONSISTENCY CHECK');
    console.log(`Filter Panel Count: ${filterPanelCount}`);
    console.log(`Court3D Render Count: ${court3DCount}`);

    if (filterPanelCount === court3DCount) {
        console.log('✅ COUNTS MATCH - Filtering is consistent!');
    } else {
        console.error('❌ COUNT MISMATCH DETECTED!');
        console.error(`Difference: ${Math.abs(filterPanelCount - court3DCount)} shots`);
        console.error('This indicates filter logic differs between components.');
        logFilterState(filters, 'Current Filter State');
    }
    console.groupEnd();
}

export function debugFilterLogic(
    allShots: ShotData[],
    filters: ShotFilterState,
    componentName: string
): ShotData[] {
    console.group(`🧪 DEBUG: ${componentName} Filter Logic`);
    logFilterState(filters, `${componentName} Filters`);

    const filtered = allShots.filter((shot, idx) => {
        // Check shot type
        const shotTypeStr = (shot.type || '').toString().toLowerCase();
        const typeMatch = filters.shotTypes.length === 0 || filters.shotTypes.some(type =>
            shotTypeStr.includes(type.toLowerCase())
        );

        if (!typeMatch) {
            if (idx < 5) logShotFilterResult(shot, idx, false, 'Type mismatch');
            return false;
        }

        // Check tactical direction
        let tacticalMatch = true;
        if (filters.tacticalDirections && filters.tacticalDirections.length > 0) {
            const shotDirections = Array.isArray(shot.tacticalDirection)
                ? shot.tacticalDirection
                : shot.tacticalDirection ? [shot.tacticalDirection] : [];
            tacticalMatch = filters.tacticalDirections.some(filterDir =>
                shotDirections.some(d => d.toLowerCase() === filterDir.toLowerCase())
            );

            if (!tacticalMatch) {
                if (idx < 5) logShotFilterResult(shot, idx, false, `Tactical mismatch (shot: ${shotDirections.join(', ')})`);
                return false;
            }
        }

        // Check result - STRICT enforcement
        if (filters.results.length === 0) {
            if (idx < 5) logShotFilterResult(shot, idx, false, 'No results selected');
            return false;
        }

        const resultMatch = filters.results.some(result => {
            if (result === 'winner') return shot.isWinner === true;
            if (result === 'error') return shot.isError === true;
            if (result === 'in') return shot.isIn === true;
            if (result === 'out') return shot.isOut === true;
            return false;
        });

        if (!resultMatch) {
            if (idx < 5) logShotFilterResult(shot, idx, false, `Result mismatch (selected: ${filters.results.join(', ')})`);
            return false;
        }

        if (idx < 5) logShotFilterResult(shot, idx, true, 'All filters passed');
        return true;
    });

    console.log(`📊 ${componentName} Filtered Result: ${filtered.length} / ${allShots.length} shots`);
    console.groupEnd();

    return filtered;
}
