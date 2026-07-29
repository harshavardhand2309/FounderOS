
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Cylinder, Html } from '@react-three/drei';
import { useMemo, useRef, Suspense, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { ShotData, ShotFilterState } from '@/types/analytics';
import { Maximize2, X } from 'lucide-react';
import ShotFilterPanel from './analytics/ShotFilterPanel';
import AnimatedParticles from './AnimatedParticles';
import { applyStrictFilters } from '@/utils/filterEngine';

interface Court3DProps {
    shots: ShotData[];
    sport: string;
    overlayStats?: any;
    filters?: ShotFilterState;
    selectedPlayer?: 'player1' | 'player2' | 'all';
    player1Name?: string;
    player2Name?: string;
    onFilterChange?: (filters: ShotFilterState) => void;
}

type CameraPreset = 'broadcast' | 'top' | 'baseline';

function CameraPresetController({
    preset,
    selectedPlayer,
}: {
    preset: CameraPreset;
    selectedPlayer: 'player1' | 'player2' | 'all';
}) {
    const { camera } = useThree();

    useEffect(() => {
        let position: [number, number, number];
        let lookAt: [number, number, number];

        if (selectedPlayer === 'all') {
            if (preset === 'top') {
                position = [0, 16, 0.1];
                lookAt = [0, 0, 0];
            } else if (preset === 'baseline') {
                position = [0, 4.5, 30];
                lookAt = [0, 0, 0];
            } else {
                position = [0, 8, 26];
                lookAt = [0, 0, 0];
            }
        } else {
            if (preset === 'top') {
                position = [0, 15, 0.1];
                lookAt = [0, 0, 0];
            } else if (preset === 'baseline') {
                position = [0, 4, 18];
                lookAt = [0, 0, 0];
            } else {
                position = [0, 8, 18];
                lookAt = [0, 0, 0];
            }
        }

        camera.position.set(...position);
        camera.lookAt(...lookAt);
        camera.updateProjectionMatrix();
    }, [camera, preset, selectedPlayer]);

    return null;
}

// ═══════════════════════════════════════════════════════
// ANIMATED BEZIER TRAJECTORY
// ═══════════════════════════════════════════════════════

function AnimatedTrajectory({
    start,
    control,
    end,
    color,
    isWinner,
    opacity,
    delay,
    netClearance,
    showNetClearance,
    shotData,
    player1Name,
    player2Name,
    tacticalMode = 'tag',
}: {
    start: THREE.Vector3;
    control: THREE.Vector3;
    end: THREE.Vector3;
    color: string;
    isWinner: boolean;
    opacity: number;
    delay: number;
    netClearance?: number;
    showNetClearance: boolean;
    shotData?: ShotData;
    player1Name?: string;
    player2Name?: string;
    tacticalMode?: 'tag' | 'strict';
}) {
    const lineRef = useRef<any>(null);
    const progressRef = useRef(0);
    const [hovered, setHovered] = useState(false);
    const MAX_POINTS = 40;

    const curvePoints = useMemo(() => {
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        return curve.getPoints(MAX_POINTS);
    }, [start, control, end]);

    // Create tube geometry for better hover detection
    const tubeGeometry = useMemo(() => {
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        return new THREE.TubeGeometry(curve, 30, 0.04, 8, false);
    }, [start, control, end]);

    // Animate draw-in
    useFrame((_, delta) => {
        if (progressRef.current < MAX_POINTS && lineRef.current) {
            progressRef.current = Math.min(progressRef.current + delta * 30, MAX_POINTS);
            const geo = lineRef.current.geometry;
            if (geo && geo.setDrawRange) {
                geo.setDrawRange(0, Math.floor(progressRef.current));
            }
        }
    });

    // Net position (center of court, z ≈ 0)
    const netClearanceLabel = showNetClearance && netClearance != null;

    // Tooltip position (midpoint of trajectory)
    const tooltipPos = useMemo(() => {
        const mid = new THREE.Vector3();
        mid.lerpVectors(start, end, 0.5);
        mid.y = control.y + 0.3; // Above the arc peak
        return mid;
    }, [start, control, end]);

    // Format tactical direction array for display
    const tacticalLabel = useMemo(() => {
        const source = tacticalMode === 'strict' ? shotData?.tacticalDirectionStrict : shotData?.tacticalDirection;
        if (!source) return 'N/A';
        const dirs = Array.isArray(source) ? source : [source];
        return dirs.map(d => d.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')).join(' + ');
    }, [shotData?.tacticalDirection, shotData?.tacticalDirectionStrict, tacticalMode]);

    const displayPlayerName = useMemo(() => {
        if (!shotData) return 'Unknown';
        if (shotData.playerName) return shotData.playerName;
        if (shotData.playerId === 'player1') return player1Name || 'Player 1';
        if (shotData.playerId === 'player2') return player2Name || 'Player 2';
        return shotData.playerId || 'Unknown';
    }, [shotData, player1Name, player2Name]);

    return (
        <group>
            {/* Invisible tube mesh for hover hit detection */}
            <mesh
                geometry={tubeGeometry}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHovered(false);
                    document.body.style.cursor = 'auto';
                }}
            >
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Trajectory arc - highlighted on hover */}
            <Line
                ref={lineRef}
                points={curvePoints}
                color={hovered ? '#ffffff' : color}
                lineWidth={hovered ? 4 : isWinner ? 2.5 : 1.5}
                opacity={hovered ? 1 : opacity}
                transparent
            />

            {/* Glow effect for winners OR hovered */}
            {(isWinner || hovered) && (
                <Line
                    points={curvePoints}
                    color={hovered ? '#38bdf8' : color}
                    lineWidth={hovered ? 8 : 5}
                    opacity={hovered ? 0.35 : opacity * 0.2}
                    transparent
                />
            )}

            {/* Impact dot at bounce point */}
            <Sphere args={[hovered ? 0.08 : 0.05, 12, 12]} position={end}>
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : color}
                    emissive={hovered ? '#38bdf8' : color}
                    emissiveIntensity={hovered ? 1.5 : isWinner ? 1.0 : 0.4}
                    metalness={0.6}
                    roughness={0.2}
                    transparent
                    opacity={hovered ? 1 : opacity}
                />
            </Sphere>

            {/* ═══ SHOT DATA TOOLTIP (on hover) ═══ */}
            {hovered && shotData && (
                <Html
                    position={tooltipPos}
                    center
                    style={{ pointerEvents: 'none', zIndex: 1000 }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.95))',
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        minWidth: '220px',
                        maxWidth: '280px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.15)',
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        color: '#e2e8f0',
                        fontSize: '11px',
                        lineHeight: '1.5',
                        backdropFilter: 'blur(12px)',
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            paddingBottom: '6px',
                            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                        }}>
                            <span style={{
                                fontWeight: 700,
                                fontSize: '13px',
                                color: '#38bdf8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}>
                                {(shotData.type || shotData.shotType || 'Shot').toString().charAt(0).toUpperCase() + (shotData.type || shotData.shotType || 'Shot').toString().slice(1)}
                            </span>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                background: shotData.result === 'winner' ? 'rgba(30, 144, 255, 0.3)' :
                                    shotData.result === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                                        shotData.result === 'out' ? 'rgba(249, 115, 22, 0.3)' :
                                            'rgba(34, 197, 94, 0.3)',
                                color: shotData.result === 'winner' ? '#60a5fa' :
                                    shotData.result === 'error' ? '#f87171' :
                                        shotData.result === 'out' ? '#fb923c' :
                                            '#4ade80',
                                border: `1px solid ${shotData.result === 'winner' ? 'rgba(30, 144, 255, 0.4)' :
                                    shotData.result === 'error' ? 'rgba(239, 68, 68, 0.4)' :
                                        shotData.result === 'out' ? 'rgba(249, 115, 22, 0.4)' :
                                            'rgba(34, 197, 94, 0.4)'
                                    }`,
                            }}>
                                {shotData.result || 'in'}
                            </span>
                        </div>

                        {/* Player */}
                        <div style={{ marginBottom: '6px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '10px' }}>Player: </span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                {displayPlayerName}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '4px 12px',
                            marginBottom: '8px',
                        }}>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Speed</span>
                                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '13px' }}>
                                    {shotData.speed} <span style={{ fontSize: '9px', color: '#94a3b8' }}>km/h</span>
                                </div>
                            </div>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Spin</span>
                                <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: '13px' }}>
                                    {shotData.spin || 'N/A'} <span style={{ fontSize: '9px', color: '#94a3b8' }}>rpm</span>
                                </div>
                            </div>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Rally</span>
                                <div style={{ fontWeight: 600, fontSize: '12px' }}>
                                    {shotData.rallyLength} shots
                                </div>
                            </div>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Net Clear</span>
                                <div style={{ fontWeight: 600, fontSize: '12px', color: netClearance && netClearance > 0 ? '#4ade80' : '#f87171' }}>
                                    {netClearance != null ? `${netClearance > 0 ? '+' : ''}${netClearance.toFixed(2)}m` : 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Tactical Direction */}
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.08)',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            marginBottom: '6px',
                        }}>
                            <span style={{ color: '#94a3b8', fontSize: '10px' }}>Tactical: </span>
                            <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '11px' }}>
                                {tacticalLabel}
                            </span>
                        </div>

                        {/* Point Info */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '10px',
                            color: '#64748b',
                        }}>
                            <span>Set {shotData.set || '–'} • Game {shotData.game || '–'}</span>
                            <span>Pt #{shotData.pointNumber || '–'}</span>
                        </div>

                        {/* Data provenance for confidence */}
                        <div style={{
                            marginTop: '6px',
                            fontSize: '9px',
                            color: '#94a3b8',
                            borderTop: '1px solid rgba(148, 163, 184, 0.18)',
                            paddingTop: '5px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                        }}>
                            <span>Net: {shotData.netClearanceSource === 'excel' ? 'Excel' : 'Estimated'}</span>
                            <span>
                                Tactical: {tacticalMode === 'strict'
                                    ? `Strict-${shotData.tacticalConfidence || 'LOW'}`
                                    : (shotData.tacticalSource === 'excel' ? 'Excel' : 'Geometry')}
                            </span>
                        </div>

                        {/* Break Point indicator */}
                        {shotData.isBreakPoint && (
                            <div style={{
                                marginTop: '6px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                textAlign: 'center',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#f87171',
                                letterSpacing: '0.5px',
                            }}>
                                🔥 BREAK POINT
                            </div>
                        )}
                    </div>
                </Html>
            )}

            {/* Net clearance visualization */}
            {netClearanceLabel && (
                <group position={[0, 0, 0]}>
                    {/* Vertical line from net to arc */}
                    <Line
                        points={[
                            [0, 0.5, 0],
                            [0, 0.5 + Math.abs(netClearance!), 0],
                        ]}
                        color="#06b6d4"
                        lineWidth={1}
                        opacity={0.5}
                        transparent
                    />
                    <Html
                        position={[0, 0.5 + Math.abs(netClearance!) + 0.15, 0]}
                        center
                        style={{ pointerEvents: 'none' }}
                    >
                        <span className="text-[8px] font-mono text-cyan-400 bg-black/70 px-1 py-0.5 rounded">
                            {netClearance! >= 0 ? '+' : ''}{netClearance!.toFixed(2)}m
                        </span>
                    </Html>
                </group>
            )}
        </group>
    );
}


// ═══════════════════════════════════════════════════════
// BALL TRAJECTORY (with filtering + Bezier curves)
// ═══════════════════════════════════════════════════════

function BallTrajectory({
    shots,
    sport,
    filters,
    showHeatmap,
    player1Name,
    player2Name,
    tacticalMode = 'tag',
}: {
    shots: ShotData[];
    sport: string;
    filters?: ShotFilterState;
    showHeatmap?: boolean;
    player1Name?: string;
    player2Name?: string;
    tacticalMode?: 'tag' | 'strict';
}) {
    // ─────────────────────────────────────
    // COURT/PITCH DIMENSIONS
    // ─────────────────────────────────────
    const courtW = sport === 'football' ? 68 : sport === 'cricket' ? 3.05 : sport === 'pickleball' ? 6.10 : 10.97;
    const courtL = sport === 'football' ? 105 : sport === 'cricket' ? 20.12 : sport === 'pickleball' ? 13.41 : 23.77;
    const scalingFactor = sport === 'football' ? 0.12 : sport === 'cricket' ? 0.3 : sport === 'pickleball' ? 0.35 : 0.2;

    // ─────────────────────────────────────
    // ✅ SINGLE SOURCE OF TRUTH - FILTER ENGINE
    // ─────────────────────────────────────
    const filteredShots = useMemo(() => {
        if (!shots || !filters) return [];

        // Use centralized filter engine
        const filtered = applyStrictFilters(shots, filters);

        // 🧪 DEBUG: Log detailed filter breakdown
        console.group('🎾 3D COURT - Filtered Shots');
        console.log('Total input shots:', shots.length);
        console.log('Filters applied:', filters);
        console.log('Filtered result count:', filtered.length);
        console.log('Results breakdown:', {
            winners: filtered.filter(s => s.result === 'winner').length,
            errors: filtered.filter(s => s.result === 'error').length,
            in: filtered.filter(s => s.result === 'in').length,
            out: filtered.filter(s => s.result === 'out').length,
        });
        console.groupEnd();

        // Performance cap
        const capped = filtered.slice(0, 500);

        if (capped.length < filtered.length) {
            console.warn(`⚠️ Capped at 500 shots (${filtered.length} total filtered)`);
        }

        return capped;
    }, [shots, filters]);


    console.log(`✅ NEW CODE: Rendering ${filteredShots.length} trajectories (Filter Panel should match)`);
    if (filteredShots.length === 0 && filters?.results.length && filters.results.length > 0) {
        console.warn('⚠️ No shots match current filters');
    }

    const showNetClearance = filters?.showNetClearance ?? false;

    const heatmapCells = useMemo(() => {
        if (!showHeatmap || (sport !== 'tennis' && sport !== 'pickleball')) return [];

        const gridSize = 12;
        const grid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

        filteredShots.forEach((shot) => {
            const gx = Math.max(0, Math.min(gridSize - 1, Math.floor(((shot.x || 50) / 100) * gridSize)));
            const gz = Math.max(0, Math.min(gridSize - 1, Math.floor(((shot.y || 50) / 100) * gridSize)));
            grid[gz][gx] += 1;
        });

        const maxCount = Math.max(...grid.flat(), 1);
        const cellW = (courtW * scalingFactor) / gridSize;
        const cellL = (courtL * scalingFactor) / gridSize;

        const cells: Array<{ x: number; z: number; intensity: number }> = [];
        for (let z = 0; z < gridSize; z++) {
            for (let x = 0; x < gridSize; x++) {
                const count = grid[z][x];
                if (!count) continue;
                cells.push({
                    x: -((courtW * scalingFactor) / 2) + (x + 0.5) * cellW,
                    z: -((courtL * scalingFactor) / 2) + (z + 0.5) * cellL,
                    intensity: count / maxCount,
                });
            }
        }

        return cells;
    }, [showHeatmap, sport, filteredShots, courtW, courtL, scalingFactor]);

    // Show message when no shots match the filter
    if (!filteredShots.length) {
        return (
            <group>
                {/* Still show court/pitch for context */}
                {sport === 'tennis' && <TennisCourt />}
                {sport === 'cricket' && <CricketPitch />}
                {sport === 'football' && <FootballField />}
                {sport === 'pickleball' && <PickleballCourt />}

                {/* Empty state message - compact horizontal banner */}
                <Html position={[0, 1.5, 0]} center>
                    <div className="bg-orange-500/10 border border-orange-500/40 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <p className="text-sm font-semibold text-orange-400 whitespace-nowrap">
                            ⚠️ No shots match filters • Try adjusting shot types
                        </p>
                    </div>
                </Html>
            </group>
        );
    }

    // Cricket sport — use original style
    if (sport === 'cricket') {
        const scale = 0.3;
        return (
            <group>
                {filteredShots.map((shot, i) => {
                    const x = shot.x * scale;
                    const z = (shot.y - 10) * scale;
                    const height = (shot.height || 0) * scale;
                    const color = shot.isWinner ? '#ff4d4d' : (shot.isError ? '#fbbf24' : '#ffffff');
                    const startX = 0;
                    const startY = 2 * scale;
                    const startZ = -10 * scale;

                    return (
                        <group key={i}>
                            <Sphere args={[0.08, 16, 16]} position={[x, 0.02, z]}>
                                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
                            </Sphere>
                            {height > 0 && (
                                <Cylinder args={[0.01, 0.01, height]} position={[x, height / 2, z]}>
                                    <meshBasicMaterial color={color} opacity={0.3} transparent />
                                </Cylinder>
                            )}
                            <Line
                                points={[[startX, startY, startZ], [x, 0, z]] as any}
                                color={color}
                                opacity={0.4}
                                transparent
                                lineWidth={1}
                            />
                        </group>
                    );
                })}
            </group>
        );
    }

    // Football sport — heatmap style
    if (sport === 'football') {
        return (
            <group>
                {filteredShots.map((shot, i) => {
                    const x = ((shot.x - 50) / 100) * courtW * scalingFactor;
                    const z = ((shot.y - 50) / 100) * courtL * scalingFactor;
                    return (
                        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
                            <ringGeometry args={[0.1, 0.4, 32]} />
                            <meshBasicMaterial color="#fbbf24" opacity={0.3} transparent side={THREE.DoubleSide} />
                        </mesh>
                    );
                })}
            </group>
        );
    }

    // ─── TENNIS / PICKLEBALL: Bezier trajectory arcs ───
    return (
        <group>
            {showHeatmap && heatmapCells.length > 0 && (
                <group>
                    {heatmapCells.map((cell, idx) => {
                        const intensity = cell.intensity;
                        const color = intensity > 0.66 ? '#ef4444' : intensity > 0.33 ? '#f59e0b' : '#22c55e';
                        return (
                            <mesh key={`hm-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[cell.x, 0.012, cell.z]}>
                                <planeGeometry args={[(courtW * scalingFactor) / 12, (courtL * scalingFactor) / 12]} />
                                <meshBasicMaterial
                                    color={color}
                                    transparent
                                    opacity={0.08 + intensity * 0.28}
                                    side={THREE.DoubleSide}
                                    depthWrite={false}
                                />
                            </mesh>
                        );
                    })}
                </group>
            )}
            {filteredShots.map((shot, i) => {
                // Strict result-first color coding for tactical readability.
                let color: string;
                const shotType = shot.type?.toLowerCase();
                const isServe = shotType === 'serve';
                const result = shot.result || (shot.isWinner ? 'winner' : shot.isError ? 'error' : shot.isOut ? 'out' : 'in');
                const hasExplicitResult = Boolean(shot.result || shot.isWinner || shot.isError || shot.isOut || shot.isIn);

                if (result === 'winner') {
                    color = '#facc15'; // Winner -> Gold
                } else if (result === 'error') {
                    color = '#ef4444'; // Error -> Red
                } else if (result === 'out') {
                    color = '#f97316'; // Out -> Orange
                } else if (!hasExplicitResult && (shot.spin || 0) > 2600) {
                    color = '#a855f7'; // Estimated spin-heavy fallback -> Purple
                } else if (result === 'in') {
                    color = '#22c55e'; // In -> Green
                } else {
                    color = '#22c55e';
                }

                // END POINT: Where ball lands (shot coordinates)
                // 🎯 HAWK-EYE STANDARD: "Out" shots MUST visually land outside boundaries
                let landX = shot.x;
                let landY = shot.y;

                if (isServe && (shot.result === 'out' || shot.isOut || shot.isError)) {
                    // ═══ SERVE FAULT LANDING LOGIC ═══
                    const faultType = shot.serveFaultType;
                    const centerX = 50;
                    const centerY = 50;

                    if (faultType === 'long') {
                        // LONG: Past service line — push Y beyond service line
                        const direction = Math.sign(landY - centerY);
                        landY = centerY + direction * (20 + Math.random() * 15);
                    } else if (faultType === 'wide') {
                        // WIDE: Past sideline — push X outside court
                        const direction = Math.sign(landX - centerX) || 1;
                        landX = centerX + direction * (40 + Math.random() * 12);
                    } else if (faultType === 'net') {
                        // NET FAULT: Ball stops at/near the net
                        landY = centerY + (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3);
                        landX = 30 + Math.random() * 40; // somewhere across the net area
                    } else {
                        // Generic out: push outside boundaries
                        const distFromCenterX = landX - centerX;
                        const distFromCenterY = landY - centerY;
                        if (Math.abs(distFromCenterX) > Math.abs(distFromCenterY)) {
                            landX = centerX + Math.sign(distFromCenterX) * 52;
                        } else {
                            landY = centerY + Math.sign(distFromCenterY) * 52;
                        }
                    }
                } else if (shot.result === 'out' || shot.isOut) {
                    // Non-serve out shots (existing logic)
                    const centerX = 50;
                    const centerY = 50;
                    const distFromCenterX = landX - centerX;
                    const distFromCenterY = landY - centerY;
                    const absDistX = Math.abs(distFromCenterX);
                    const absDistY = Math.abs(distFromCenterY);
                    if (absDistX > absDistY) {
                        const direction = Math.sign(distFromCenterX);
                        landX = centerX + (direction * 52);
                    } else {
                        const direction = Math.sign(distFromCenterY);
                        landY = centerY + (direction * 52);
                    }
                }

                const endX = ((landX - 50) / 100) * courtW * scalingFactor;
                const endZ = ((landY - 50) / 100) * courtL * scalingFactor;
                const end = new THREE.Vector3(endX, 0.05, endZ);

                // START POINT: Where ball was hit from
                let startX: number, startZ: number;

                if (isServe) {
                    // ═══════════════════════════════════════════════
                    // SERVE-SPECIFIC TRAJECTORY LOGIC
                    // Enforces: baseline origin, forward travel, proper arc
                    // ═══════════════════════════════════════════════

                    // 1. BASELINE ORIGIN: Server at the baseline (±48% of court from net)
                    if (shot.playerPosition) {
                        startX = ((shot.playerPosition.x - 50) / 100) * courtW * scalingFactor;
                        const serverSide = shot.playerPosition.y > 50 ? 1 : -1;
                        startZ = serverSide * (courtL * scalingFactor * 0.48);
                    } else {
                        const landingSide = endZ > 0 ? -1 : 1;
                        startZ = landingSide * (courtL * scalingFactor * 0.48);
                        startX = (Math.random() > 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.15);
                    }

                    // 2. FORWARD TRAVEL ENFORCEMENT
                    if (shot.serveFaultType === 'net') {
                        // NET FAULT: Ball stays on server's side
                        // End point should be near the net but on server's side
                        const serverSide = Math.sign(startZ);
                        end.z = serverSide * (courtL * scalingFactor * 0.02); // Just barely at net
                        end.y = 0.05; // Ball drops at net level
                    } else if (startZ * endZ >= 0) {
                        // Same side! Force to opposite side baseline
                        startZ = -Math.sign(endZ) * (courtL * scalingFactor * 0.48);
                    }

                    // 3. SERVICE BOX LANDING: For valid serves, clamp to service box
                    const isValidServe = shot.result !== 'out' && !shot.isOut && !shot.isError;
                    if (isValidServe) {
                        const serviceLineDepth = courtL * scalingFactor * 0.28;
                        const serviceBoxHalfWidth = courtW * scalingFactor * 0.35;
                        const landSide = Math.sign(endZ);
                        const clampedZ = landSide * Math.min(Math.abs(end.z), serviceLineDepth);
                        end.z = landSide * Math.max(Math.abs(clampedZ), 0.1);
                        end.x = Math.max(-serviceBoxHalfWidth, Math.min(serviceBoxHalfWidth, end.x));
                    }

                    // 4. SERVE ERROR (long/wide): Ensure ball still crosses net and lands outside service box
                    if ((shot.isError || shot.result === 'error' || shot.isOut) && shot.serveFaultType !== 'net') {
                        // Ensure error serves still cross net (start/end opposite sides)
                        if (startZ * endZ >= 0) {
                            startZ = -Math.sign(endZ) * (courtL * scalingFactor * 0.48);
                        }
                    }

                } else {
                    // ═══ RALLY SHOT POSITIONING (existing logic) ═══
                    if (shot.playerPosition) {
                        startX = ((shot.playerPosition.x - 50) / 100) * courtW * scalingFactor;
                        startZ = ((shot.playerPosition.y - 50) / 100) * courtL * scalingFactor;

                        // NET CROSSING ENFORCEMENT
                        if (startZ * endZ > 0) {
                            startZ = -Math.abs(startZ) * Math.sign(-endZ);
                        }
                    } else {
                        const landingSide = endZ > 0 ? -1 : 1;
                        startZ = landingSide * (courtL * scalingFactor * 0.42);
                        startX = endX * 0.3 + (Math.random() - 0.5) * 0.4;
                    }

                    // FINAL NET CROSSING VALIDATION
                    if (startZ * endZ >= 0) {
                        startZ = -Math.abs(endZ) * 0.85;
                    }
                }

                const start = new THREE.Vector3(startX, isServe ? 0.25 : 0.1, startZ);

                // REALISTIC ARC HEIGHT based on shot type
                const netHeight = 0.914 * scalingFactor; // Official net height
                let peakHeight;

                if (isServe) {
                    // Serve arc based on serve type
                    const serveTypeStr = (shot as any).serveType?.toLowerCase() || '';
                    if (serveTypeStr === 'flat') {
                        peakHeight = netHeight + (0.15 + Math.random() * 0.15); // Low flat serve
                    } else if (serveTypeStr === 'kick') {
                        peakHeight = netHeight + (0.5 + Math.random() * 0.4); // High kick serve
                    } else if (serveTypeStr === 'slice') {
                        peakHeight = netHeight + (0.25 + Math.random() * 0.2); // Medium slice serve
                    } else {
                        peakHeight = netHeight + (0.2 + Math.random() * 0.25); // Default serve
                    }
                    // Fast serves are flatter
                    if (shot.speed && shot.speed > 200) peakHeight -= 0.1;
                } else if (shotType === 'lob') {
                    peakHeight = netHeight + (1.5 + Math.random() * 1.5);
                } else if (shotType === 'dink') {
                    peakHeight = netHeight + (0.05 + Math.random() * 0.1);
                } else if (shotType === 'drive') {
                    peakHeight = netHeight + (0.1 + Math.random() * 0.15);
                } else if (shotType === 'drop') {
                    peakHeight = netHeight + (0.3 + Math.random() * 0.35);
                } else if (shot.speed && shot.speed > 150) {
                    peakHeight = netHeight + (0.15 + Math.random() * 0.25);
                } else {
                    peakHeight = netHeight + (0.4 + Math.random() * 0.6);
                }

                // Topspin adds height
                if (shot.spin && shot.spin > 2500) {
                    peakHeight += 0.25;
                }

                // CONTROL POINT: Always at net (Z=0) to guarantee crossing
                const midX = (start.x + end.x) / 2;
                const control = new THREE.Vector3(midX, peakHeight, 0);

                // Opacity: newer shots are more visible (fade older ones)
                const opacity = 0.3 + (i / filteredShots.length) * 0.7;

                return (
                    <AnimatedTrajectory
                        key={`${shot.id}-${i}`}
                        start={start}
                        control={control}
                        end={end}
                        color={color}
                        isWinner={shot.isWinner}
                        opacity={opacity}
                        delay={i * 0.02}
                        netClearance={shot.netClearance}
                        showNetClearance={showNetClearance}
                        shotData={shot}
                        player1Name={player1Name}
                        player2Name={player2Name}
                        tacticalMode={tacticalMode}
                    />
                );
            })}
        </group>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════

export default function Court3D({
    shots,
    sport,
    overlayStats,
    filters,
    selectedPlayer = 'all',
    player1Name = 'Player 1',
    player2Name = 'Player 2',
    onFilterChange
}: Court3DProps) {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [cameraPreset, setCameraPreset] = useState<CameraPreset>('broadcast');
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [timelinePct, setTimelinePct] = useState(100);
    const RENDER_CAP = 500;

    const timelineShots = useMemo(() => {
        if (timelinePct >= 100) return shots;
        const uniquePoints = Array.from(new Set(shots.map(s => s.pointNumber))).sort((a, b) => a - b);
        if (uniquePoints.length === 0) return shots;
        const keepCount = Math.max(1, Math.ceil((timelinePct / 100) * uniquePoints.length));
        const cutoffPoint = uniquePoints[keepCount - 1];
        return shots.filter(s => s.pointNumber <= cutoffPoint);
    }, [shots, timelinePct]);

    const timelineSummary = useMemo(() => {
        const allPoints = new Set(shots.map(s => s.pointNumber)).size || 1;
        const shownPoints = new Set(timelineShots.map(s => s.pointNumber)).size;
        const maxPoint = timelineShots.length ? Math.max(...timelineShots.map(s => s.pointNumber)) : 0;
        return {
            shownPoints,
            allPoints,
            maxPoint,
            shownShots: timelineShots.length,
            allShots: shots.length || 1,
        };
    }, [shots, timelineShots]);

    const canonicalFilteredShots = useMemo(() => {
        if (!filters) return [];
        return applyStrictFilters(timelineShots, filters);
    }, [timelineShots, filters]);

    const renderedCount = useMemo(() => {
        if (!filters) return 0;
        if (selectedPlayer === 'all') {
            const p1 = canonicalFilteredShots.filter(s => s.playerId === 'player1').length;
            const p2 = canonicalFilteredShots.filter(s => s.playerId === 'player2').length;
            return Math.min(p1, RENDER_CAP) + Math.min(p2, RENDER_CAP);
        }
        return Math.min(canonicalFilteredShots.length, RENDER_CAP);
    }, [filters, selectedPlayer, canonicalFilteredShots]);

    const shotTypeBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        canonicalFilteredShots.forEach(s => {
            const t = (s.type || s.shotType || 'unknown').toString().toLowerCase();
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    }, [canonicalFilteredShots]);

    const setTimelineByPointCount = (pointCount: number) => {
        const uniquePoints = Array.from(new Set(shots.map(s => s.pointNumber))).sort((a, b) => a - b);
        if (uniquePoints.length === 0) {
            setTimelinePct(100);
            return;
        }
        const clamped = Math.max(1, Math.min(pointCount, uniquePoints.length));
        setTimelinePct(Math.round((clamped / uniquePoints.length) * 100));
    };

    // Lock body scroll when fullscreen modal is open
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // ESC key to close fullscreen
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen]);

    // Check WebGL support. Probed once and cached — this allocates a throwaway
    // WebGL context, and browsers cap live contexts at ~16, so calling it on
    // every render (as this used to) exhausts them and kills the real canvas.
    const webGLSupported = useMemo(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }, []);
    const checkWebGL = () => webGLSupported;

    // Handle Canvas errors
    const onCreated = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const onError = (error: any) => {
        console.error('3D Court rendering error:', error);
        setHasError(true);
        setIsLoading(false);
    };

    // Fallback UI for errors or unsupported browsers
    if (!checkWebGL() || hasError) {
        return (
            <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center border border-white/10">
                <div className="text-center px-6 py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-display font-bold text-white mb-2">3D View Unavailable</h3>
                    <p className="text-sm text-white/60 mb-4">
                        {!checkWebGL()
                            ? 'Your browser does not support WebGL, which is required for 3D visualization.'
                            : 'Unable to load 3D court. Please refresh the page or try a different browser.'
                        }
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    const renderViewControls = (mode: 'overlay' | 'panel') => {
        if (!onFilterChange || !filters) return null;
        const wrapperClass = mode === 'overlay'
            ? 'absolute top-4 left-4 z-50 pointer-events-auto max-w-2xl'
            : 'w-full';

        return (
            <div className={wrapperClass}>
                <div className="bg-black/75 backdrop-blur-md px-3 py-3 rounded-lg border border-white/15 flex flex-col gap-3">
                    {mode === 'panel' && (
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-cyan-400"></span>
                            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300">View Controls</span>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-white/40 uppercase mr-1">Camera</span>
                        {([
                            { id: 'broadcast', label: 'Broadcast' },
                            { id: 'baseline', label: 'Baseline' },
                            { id: 'top', label: 'Top' },
                        ] as Array<{ id: CameraPreset; label: string }>).map((preset) => (
                            <button
                                key={preset.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCameraPreset(preset.id);
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${cameraPreset === preset.id
                                    ? 'bg-cyan-500/80 text-white border-cyan-300/60'
                                    : 'bg-white/10 text-white/50 border-white/10 hover:bg-white/20'}`}
                            >
                                {preset.label}
                            </button>
                        ))}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowHeatmap(v => !v);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${showHeatmap
                                ? 'bg-emerald-500/80 text-white border-emerald-300/60'
                                : 'bg-white/10 text-white/50 border-white/10 hover:bg-white/20'}`}
                        >
                            Heatmap {showHeatmap ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-white/40 uppercase">Points Window</span>
                        <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={timelinePct}
                            onChange={(e) => setTimelinePct(Number(e.target.value))}
                            className="w-40 accent-cyan-400"
                        />
                        <span className="text-[10px] font-mono text-cyan-300">{timelinePct}%</span>
                        <span className="text-[10px] font-mono text-white/50">
                            Pts 1-{timelineSummary.maxPoint || '–'} / {timelineSummary.allPoints}
                        </span>
                        <button onClick={() => setTimelineByPointCount(25)} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/70 hover:bg-white/20">Last 25 pts</button>
                        <button onClick={() => setTimelineByPointCount(50)} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/70 hover:bg-white/20">Last 50 pts</button>
                        <button onClick={() => setTimelinePct(100)} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/70 hover:bg-white/20">All pts</button>
                    </div>

                    {mode === 'overlay' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-white/40 uppercase mr-1">Filters</span>
                            {(sport === 'pickleball'
                                ? [
                                    { value: 'serve', label: '🏓 Srv' },
                                    { value: 'return', label: '↩️ Ret' },
                                    { value: 'dink', label: '🎯 Dink' },
                                    { value: 'drive', label: '💨 Drv' },
                                    { value: 'drop', label: '🪂 Drp' },
                                    { value: 'lob', label: '🌙 Lob' },
                                    { value: 'volley', label: '⚡ Vol' },
                                    { value: 'smash', label: '💥 Sms' },
                                ]
                                : [
                                    { value: 'serve', label: '🎾 Serve' },
                                    { value: 'forehand', label: '👉 FH' },
                                    { value: 'backhand', label: '👈 BH' },
                                    { value: 'volley', label: '⚡ Vol' },
                                    { value: 'smash', label: '💥 Sms' },
                                    { value: 'drop', label: '🪂 Drp' },
                                    { value: 'lob', label: '🌙 Lob' },
                                ]
                            ).map(({ value: type, label }) => {
                                const isActive = filters.shotTypes.includes(type);
                                return (
                                    <button
                                        key={type}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newTypes = isActive
                                                ? filters.shotTypes.filter(t => t !== type)
                                                : [...filters.shotTypes, type];
                                            onFilterChange({ ...filters, shotTypes: newTypes });
                                        }}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${isActive
                                            ? 'bg-blue-500/80 text-white border border-blue-400/50'
                                            : 'bg-white/10 text-white/40 border border-white/10 hover:bg-white/20'}`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Main 3D Court Content (reusable for both normal and fullscreen)
    const render3DContent = (isModal = false) => (
        <div className={isModal ? "w-full h-full" : "w-full h-full min-h-[450px] rounded-2xl overflow-hidden bg-neutral-800/60 relative"}>
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-50">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm font-mono text-white/60">Loading 3D Court...</p>
                    </div>
                </div>
            )}

            <Canvas
                camera={{ position: [0, 8, 18], fov: 60 }}
                shadows
                style={{ background: 'transparent' }}
                onCreated={onCreated}
                onError={onError}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    failIfMajorPerformanceCaveat: false
                }}
            >
                <Suspense fallback={null}>
                    <CameraPresetController preset={cameraPreset} selectedPlayer={selectedPlayer} />
                    <ambientLight intensity={0.5} />
                    <directionalLight
                        position={[5, 10, 5]}
                        intensity={1.0}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                    />
                    <pointLight position={[0, 5, 0]} intensity={0.3} color="#FFD700" />

                    {/* Dual courts for both players, single court otherwise */}
                    {selectedPlayer === 'all' ? (
                        <>
                            {/* Player 1 Court (Left side) */}
                            <group position={[-6, 0, 0]}>
                                {sport === 'tennis' && <TennisCourt />}
                                {sport === 'cricket' && <CricketPitch />}
                                {sport === 'football' && <FootballField />}
                                {sport === 'pickleball' && <PickleballCourt />}

                                <BallTrajectory
                                    shots={timelineShots.filter(s => s.playerId === 'player1')}
                                    sport={sport}
                                    filters={filters}
                                    showHeatmap={showHeatmap}
                                    player1Name={player1Name}
                                    player2Name={player2Name}
                                    tacticalMode={filters?.tacticalMode || 'tag'}
                                />

                                {/* Player 1 Label */}
                                <Html position={[0, -0.5, -6]} center>
                                    <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                        <span className="text-sm font-mono font-bold text-amber-300 tracking-wide">{player1Name}</span>
                                    </div>
                                </Html>
                            </group>

                            {/* Player 2 Court (Right side) */}
                            <group position={[6, 0, 0]}>
                                {sport === 'tennis' && <TennisCourt />}
                                {sport === 'cricket' && <CricketPitch />}
                                {sport === 'football' && <FootballField />}
                                {sport === 'pickleball' && <PickleballCourt />}

                                <BallTrajectory
                                    shots={timelineShots.filter(s => s.playerId === 'player2')}
                                    sport={sport}
                                    filters={filters}
                                    showHeatmap={showHeatmap}
                                    player1Name={player1Name}
                                    player2Name={player2Name}
                                    tacticalMode={filters?.tacticalMode || 'tag'}
                                />

                                {/* Player 2 Label */}
                                <Html position={[0, -0.5, -6]} center>
                                    <div className="bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                        <span className="text-sm font-mono font-bold text-cyan-300 tracking-wide">{player2Name}</span>
                                    </div>
                                </Html>
                            </group>
                        </>
                    ) : (
                        <>
                            {/* Single court for individual player */}
                            {sport === 'tennis' && <TennisCourt />}
                            {sport === 'cricket' && <CricketPitch />}
                            {sport === 'football' && <FootballField />}
                            {sport === 'pickleball' && <PickleballCourt />}

                            <BallTrajectory
                                shots={timelineShots}
                                sport={sport}
                                filters={filters}
                                showHeatmap={showHeatmap}
                                player1Name={player1Name}
                                player2Name={player2Name}
                                tacticalMode={filters?.tacticalMode || 'tag'}
                            />

                            {/* Player Label — show which player is being viewed */}
                            <Html position={[0, -0.5, -6]} center>
                                <div className={`${selectedPlayer === 'player1' ? 'bg-amber-500/20 border-amber-500/40' : 'bg-cyan-500/20 border-cyan-500/40'} border px-3 py-1.5 rounded-lg backdrop-blur-sm`}>
                                    <span className={`text-sm font-mono font-bold tracking-wide ${selectedPlayer === 'player1' ? 'text-amber-300' : 'text-cyan-300'}`}>
                                        {selectedPlayer === 'player1' ? player1Name : player2Name}
                                    </span>
                                </div>
                            </Html>
                        </>
                    )}

                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        enableRotate={true}
                        autoRotate={false}
                        minDistance={3}
                        maxDistance={selectedPlayer === 'all' ? 50 : 35}
                        maxPolarAngle={Math.PI / 2.2}
                    />
                </Suspense>
            </Canvas>

            {!isModal && renderViewControls('overlay')}


            {/* Expand Button - Bottom Right (Only in Normal View) */}
            {!isModal && (
                <div className="absolute bottom-4 right-4 z-50 pointer-events-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFullscreen(true);
                        }}
                        className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/20 hover:border-blue-500/50 hover:bg-blue-500/20 transition-all group cursor-pointer shadow-lg"
                        title="Expand to fullscreen"
                    >
                        <Maximize2 className="w-5 h-5 text-white/80 group-hover:text-blue-400 transition-colors" />
                    </button>
                </div>
            )}

            {/* Trajectory Legend */}
            <div className={`absolute ${isModal ? 'bottom-6 left-6' : 'top-4 right-4'} z-40 pointer-events-none`}>
                <div className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-[9px] font-mono uppercase tracking-wide text-white/50 mb-1">Legend</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <span className="text-[10px] text-yellow-300">● Winner</span>
                        <span className="text-[10px] text-red-400">● Error</span>
                        <span className="text-[10px] text-green-400">● In</span>
                        <span className="text-[10px] text-orange-400">● Out</span>
                    </div>
                </div>
            </div>

            {/* OVERLAY STATS */}
            {overlayStats && (
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 pointer-events-none">
                    {overlayStats.map((stat: any, i: number) => (
                        <div key={i} className="bg-black/60 backdrop-blur-sm p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] uppercase font-mono text-white/50 mb-1">{stat.label}</span>
                            <span className="text-xl font-bold font-display text-white">{stat.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Fullscreen Modal - Using Portal for true fullscreen */}
            {isFullscreen && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999]" style={{
                    background: 'radial-gradient(circle at 30% 30%, #0d1b2a 0%, #0a0f1c 40%, #05070d 100%)'
                }}>
                    {/* Animated Particles Background */}
                    <AnimatedParticles />

                    {/* Header with title and close button */}
                    <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 via-black/50 to-transparent z-20 flex items-center justify-between px-8 border-b border-blue-500/30">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="text-3xl">🎾</span>
                                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 text-transparent bg-clip-text">
                                    Broadcast Tactical Engine
                                </span>
                            </h2>
                            <p className="text-sm text-white/60 ml-11 mt-1">
                                {player1Name} <span className="text-cyan-400">vs</span> {player2Name}
                            </p>
                        </div>

                        {/* Close button - fixed positioning */}
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="bg-red-500/10 hover:bg-red-500/30 border-2 border-red-500/30 hover:border-red-500 p-4 rounded-xl transition-all duration-300 group shadow-lg hover:shadow-red-500/50"
                            title="Close fullscreen (ESC)"
                        >
                            <X className="w-6 h-6 text-red-400 group-hover:text-red-200 transition-colors" />
                        </button>
                    </div>

                    {/* Main content area */}
                    <div className="w-full h-full pt-20 flex flex-col lg:flex-row gap-4 p-4">
                        {/* 3D Court - Takes most of the space */}
                        <div className="flex-1 min-h-[42vh] lg:h-full rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl shadow-emerald-900/50">
                            {render3DContent(true)}
                        </div>

                        {/* SPORTY PREMIUM Filter Panel */}
                        {onFilterChange && filters && (
                            <div className="w-full lg:w-[420px] lg:max-w-[42vw] lg:min-w-[340px] h-[44vh] lg:h-full bg-gradient-to-b from-slate-900/95 to-black/95 backdrop-blur-xl border-2 border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/20 flex flex-col min-h-0">
                                {/* Filter Header - Athletic Design */}
                                <div className="bg-gradient-to-r from-emerald-600/30 via-green-600/30 to-emerald-600/30 border-b-2 border-emerald-500/40 px-6 py-5 relative overflow-hidden flex-shrink-0">
                                    {/* Carbon fiber texture overlay */}
                                    <div className="absolute inset-0 opacity-5" style={{
                                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)`
                                    }}></div>

                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                                            <div className="w-1 h-8 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full"></div>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-200">
                                                Shot Filters
                                            </span>
                                        </h3>
                                        <p className="text-xs text-emerald-200/60 mt-2 ml-7 font-semibold uppercase tracking-wider">
                                            Customize Your 3D Analysis
                                        </p>
                                    </div>
                                </div>

                                {/* Scrollable body: keeps lower controls accessible */}
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar-green">
                                    {/* View controls */}
                                    <div className="px-6 pt-4">
                                        {renderViewControls('panel')}
                                    </div>

                                    {/* Filter Content */}
                                    <div className="px-6 py-4">
                                    <ShotFilterPanel
                                        filters={filters}
                                        onChange={onFilterChange}
                                        sport={sport}
                                        shots={timelineShots}
                                        canonicalFilteredCount={canonicalFilteredShots.length}
                                        renderedCount={renderedCount}
                                        shotTypeBreakdown={shotTypeBreakdown}
                                    />
                                    </div>
                                </div>

                                {/* Filter Footer - Stats with Athletic Flair */}
                                <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-t-2 border-emerald-500/30 px-6 py-4 relative overflow-hidden flex-shrink-0">
                                    {/* Subtle glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                                                <span className="text-sm font-bold text-white/80 uppercase tracking-wide">Active Filters</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-black px-4 py-2 rounded-lg font-black text-lg shadow-lg shadow-emerald-500/30">
                                                    {filters.shotTypes.length}
                                                </span>
                                                <span className="text-xs text-emerald-300/70 font-semibold uppercase">types</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ESC key hint - Green theme */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 border-2 border-emerald-500/40 px-6 py-3 rounded-xl backdrop-blur-md shadow-lg shadow-emerald-500/20 z-20 hidden md:block">
                        <p className="text-sm text-white/90 font-mono flex items-center gap-3">
                            <span className="text-emerald-300/70">Press</span>
                            <kbd className="px-4 py-2 bg-emerald-500/20 border-2 border-emerald-400/40 rounded-lg text-emerald-300 font-bold shadow-inner shadow-emerald-500/30">ESC</kbd>
                            <span className="text-emerald-300/70">to exit fullscreen</span>
                        </p>
                    </div>

                    {/* .custom-scrollbar-green lives in dash.css — styled-jsx is a
                        Next-only compiler transform and renders as an invalid
                        <style jsx global> element outside it. */}
                </div>,
                document.body
            )}

            {/* Normal View */}
            {render3DContent(false)}
        </>
    );
}

// ═══════════════════════════════════════════════════════
// COURT COMPONENTS (preserved from original)
// ═══════════════════════════════════════════════════════

function TennisCourt() {
    const courtLength = 23.77;
    const courtWidth = 10.97;
    const scale = 0.2;

    const courtLines = useMemo(() => {
        const lines = [];
        const w = courtWidth * scale;
        const l = courtLength * scale;

        lines.push({
            points: [[-w / 2, 0, -l / 2], [w / 2, 0, -l / 2], [w / 2, 0, l / 2], [-w / 2, 0, l / 2], [-w / 2, 0, -l / 2]],
            color: '#FFFFFF'
        });

        const singlesWidth = 8.23 * scale;
        lines.push({ points: [[-singlesWidth / 2, 0, -l / 2], [-singlesWidth / 2, 0, l / 2]], color: '#FFFFFF80' });
        lines.push({ points: [[singlesWidth / 2, 0, -l / 2], [singlesWidth / 2, 0, l / 2]], color: '#FFFFFF80' });

        const serviceLineZ = 6.4 * scale;
        lines.push({ points: [[-singlesWidth / 2, 0, -serviceLineZ], [singlesWidth / 2, 0, -serviceLineZ]], color: '#FFFFFF80' });
        lines.push({ points: [[-singlesWidth / 2, 0, serviceLineZ], [singlesWidth / 2, 0, serviceLineZ]], color: '#FFFFFF80' });
        lines.push({ points: [[0, 0, -serviceLineZ], [0, 0, serviceLineZ]], color: '#FFFFFF80' });
        lines.push({ points: [[-w / 2, 0, 0], [w / 2, 0, 0]], color: '#FFD700' });

        return lines;
    }, []);

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[courtWidth * scale + 2, courtLength * scale + 2]} />
                <meshStandardMaterial color="#3b82f6" opacity={0.1} transparent roughness={0.8} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
                <planeGeometry args={[courtWidth * scale, courtLength * scale]} />
                <meshStandardMaterial color="#1E5A8E" opacity={0.85} transparent roughness={0.6} />
            </mesh>

            {courtLines.map((line, i) => (
                <Line key={i} points={line.points as [number, number, number][]} color={line.color} lineWidth={2} />
            ))}

            {/* Realistic tennis net — official dimensions */}
            {/* Center height: 0.914m, Post height: 1.07m */}
            {(() => {
                const netCenterH = 0.914 * scale;
                const netPostH = 1.07 * scale;
                const netW = courtWidth * scale;
                // Net posts
                return (
                    <group>
                        {/* Left post */}
                        <Cylinder args={[0.02, 0.02, netPostH]} position={[-netW / 2, netPostH / 2, 0]}>
                            <meshStandardMaterial color="#9CA3AF" />
                        </Cylinder>
                        {/* Right post */}
                        <Cylinder args={[0.02, 0.02, netPostH]} position={[netW / 2, netPostH / 2, 0]}>
                            <meshStandardMaterial color="#9CA3AF" />
                        </Cylinder>
                        {/* Top cable */}
                        <Line
                            points={[
                                [-netW / 2, netPostH, 0],
                                [-netW / 4, (netPostH + netCenterH) / 2, 0],
                                [0, netCenterH, 0],
                                [netW / 4, (netPostH + netCenterH) / 2, 0],
                                [netW / 2, netPostH, 0],
                            ] as [number, number, number][]}
                            color="#FFFFFF"
                            lineWidth={2}
                        />
                        {/* Net mesh (semi-transparent plane with catenary dip) */}
                        <mesh position={[0, (netPostH + netCenterH) / 2 / 2, 0]}>
                            <planeGeometry args={[netW, (netPostH + netCenterH) / 2]} />
                            <meshStandardMaterial color="#FFFFFF" opacity={0.15} transparent side={THREE.DoubleSide} />
                        </mesh>
                        {/* Bottom band */}
                        <Line
                            points={[[-netW / 2, 0.01, 0], [netW / 2, 0.01, 0]] as [number, number, number][]}
                            color="#FFFFFF"
                            lineWidth={1}
                        />
                    </group>
                );
            })()}
        </group>
    );
}

function CricketPitch() {
    const pitchLength = 20.12;
    const pitchWidth = 3.05;
    const scale = 0.3;

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <circleGeometry args={[20, 64]} />
                <meshStandardMaterial color="#15803d" opacity={0.2} transparent roughness={0.9} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[pitchWidth * scale, pitchLength * scale]} />
                <meshStandardMaterial color="#d4d4d8" roughness={0.8} />
            </mesh>
            <Line points={[[-1.5, 0, -9], [1.5, 0, -9]].map(p => [p[0] * scale, p[1], p[2] * scale]) as any} color="white" lineWidth={3} />
            <Line points={[[-1.5, 0, 9], [1.5, 0, 9]].map(p => [p[0] * scale, p[1], p[2] * scale]) as any} color="white" lineWidth={3} />
            <group position={[0, 0, -9 * scale]}>
                <Cylinder args={[0.05, 0.05, 0.7]} position={[-0.1, 0.35, 0]} material-color="#333" />
                <Cylinder args={[0.05, 0.05, 0.7]} position={[0, 0.35, 0]} material-color="#333" />
                <Cylinder args={[0.05, 0.05, 0.7]} position={[0.1, 0.35, 0]} material-color="#333" />
            </group>
            <group position={[0, 0, 9 * scale]}>
                <Cylinder args={[0.05, 0.05, 0.7]} position={[-0.1, 0.35, 0]} material-color="#333" />
                <Cylinder args={[0.05, 0.05, 0.7]} position={[0, 0.35, 0]} material-color="#333" />
                <Cylinder args={[0.05, 0.05, 0.7]} position={[0.1, 0.35, 0]} material-color="#333" />
            </group>
        </group>
    );
}

function FootballField() {
    const scale = 0.12;
    const w = 68 * scale;
    const l = 105 * scale;

    const lines = useMemo(() => {
        const _lines = [];
        _lines.push({ points: [[-w / 2, 0, -l / 2], [w / 2, 0, -l / 2], [w / 2, 0, l / 2], [-w / 2, 0, l / 2], [-w / 2, 0, -l / 2]], color: "white" });
        _lines.push({ points: [[-w / 2, 0, 0], [w / 2, 0, 0]], color: "white" });
        return _lines;
    }, [w, l]);

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[w + 2, l + 2]} />
                <meshStandardMaterial color="#15803d" opacity={0.9} transparent roughness={0.8} />
            </mesh>
            {lines.map((line, i) => (
                <Line key={i} points={line.points as [number, number, number][]} color={line.color} lineWidth={2} />
            ))}
            <Line points={new THREE.EllipseCurve(0, 0, 9.15 * scale, 9.15 * scale, 0, 2 * Math.PI, false, 0).getPoints(50).map(v => [v.x, 0.01, v.y]) as any} color="white" lineWidth={2} rotation={[Math.PI / 2, 0, 0]} />
        </group>
    );
}

function PickleballCourt() {
    const scale = 0.35;
    const width = 6.10 * scale;    // 20 ft court width
    const length = 13.41 * scale;  // 44 ft court length
    const kitchenZ = 2.13 * scale; // 7 ft NVZ on each side

    // ─── Official net dimensions ───
    const postH = 0.914 * scale;   // 36 inches at posts
    const centerH = 0.864 * scale; // 34 inches at center
    const sag = postH - centerH;   // Parabolic sag amount
    const netW = width + 0.1;      // Net spans full court + slight overhang
    const halfW = netW / 2;
    const postR = 0.028;
    const meshCols = 20;           // Dense vertical lines
    const meshRows = 8;            // Dense horizontal lines

    // Parabolic sag: y = postH - sag * (1 - (x/halfW)^2)
    const sagH = (x: number) => postH - sag * (1 - (x / halfW) * (x / halfW));

    const lines = useMemo(() => {
        const _lines = [];
        _lines.push({ points: [[-width / 2, 0, -length / 2], [width / 2, 0, -length / 2], [width / 2, 0, length / 2], [-width / 2, 0, length / 2], [-width / 2, 0, -length / 2]], color: "white" });
        _lines.push({ points: [[-width / 2, 0, -kitchenZ], [width / 2, 0, -kitchenZ]], color: "white" });
        _lines.push({ points: [[-width / 2, 0, kitchenZ], [width / 2, 0, kitchenZ]], color: "white" });
        _lines.push({ points: [[0, 0, -length / 2], [0, 0, -kitchenZ]], color: "white" });
        _lines.push({ points: [[0, 0, length / 2], [0, 0, kitchenZ]], color: "white" });
        return _lines;
    }, [width, length, kitchenZ]);

    // Top band path following parabolic sag
    const topBandPts = useMemo(() => {
        const pts: [number, number, number][] = [];
        for (let s = 0; s <= 32; s++) {
            const x = -halfW + (netW / 32) * s;
            pts.push([x, sagH(x), 0]);
        }
        return pts;
    }, [halfW, netW, postH, sag]);



    return (
        <group>
            {/* ─── COURT SURFACE ─── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[width + 2, length + 2]} />
                <meshStandardMaterial color="#1d6fb8" opacity={0.7} transparent roughness={0.5} />
            </mesh>

            {/* Kitchen (NVZ) Zone */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
                <planeGeometry args={[width, kitchenZ * 2]} />
                <meshStandardMaterial color="#ef4444" opacity={0.1} transparent roughness={0.9} />
            </mesh>

            {/* Court lines */}
            {lines.map((line, i) => (
                <Line key={i} points={line.points as [number, number, number][]} color={line.color} lineWidth={3} />
            ))}

            {/* NVZ Label */}
            <Html position={[0, 0.3, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="text-[8px] font-mono text-red-400/50 uppercase tracking-[0.2em]">
                    Kitchen / NVZ
                </span>
            </Html>

            {/* ═══════════════════════════════════════════
                PROFESSIONAL PICKLEBALL NET
            ═══════════════════════════════════════════ */}

            {/* ─── LEFT POST ─── */}
            <mesh position={[-halfW, postH / 2, 0]} castShadow>
                <cylinderGeometry args={[postR, postR, postH, 12]} />
                <meshStandardMaterial color="#4a4a4a" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[-halfW, postH + 0.008, 0]} castShadow>
                <sphereGeometry args={[postR * 1.4, 12, 12]} />
                <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[-halfW, 0.015, 0]} castShadow>
                <cylinderGeometry args={[postR * 2, postR * 2.2, 0.03, 12]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
            </mesh>

            {/* ─── RIGHT POST ─── */}
            <mesh position={[halfW, postH / 2, 0]} castShadow>
                <cylinderGeometry args={[postR, postR, postH, 12]} />
                <meshStandardMaterial color="#4a4a4a" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[halfW, postH + 0.008, 0]} castShadow>
                <sphereGeometry args={[postR * 1.4, 12, 12]} />
                <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[halfW, 0.015, 0]} castShadow>
                <cylinderGeometry args={[postR * 2, postR * 2.2, 0.03, 12]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
            </mesh>

            {/* ─── TOP WHITE BAND (follows sag curve) ─── */}
            <Line points={topBandPts as any} color="#ffffff" lineWidth={4} />
            {/* Tension cable at very top */}
            <Line
                points={topBandPts.map(([x, y, z]) => [x, y + 0.005, z]) as any}
                color="#bbbbbb" lineWidth={1}
            />

            {/* ─── NET MESH — VERTICAL LINES (charcoal) ─── */}
            {Array.from({ length: meshCols + 1 }).map((_, i) => {
                const x = -halfW + (netW / meshCols) * i;
                return (
                    <Line key={`nv-${i}`}
                        points={[[x, 0.005, 0], [x, sagH(x), 0]] as any}
                        color="#1a1a1a" opacity={0.5} transparent lineWidth={0.6} />
                );
            })}

            {/* ─── NET MESH — HORIZONTAL LINES (follow sag) ─── */}
            {Array.from({ length: meshRows }).map((_, i) => {
                const frac = (i + 1) / (meshRows + 1);
                const pts: [number, number, number][] = [];
                for (let s = 0; s <= 24; s++) {
                    const x = -halfW + (netW / 24) * s;
                    pts.push([x, sagH(x) * frac, 0]);
                }
                return (
                    <Line key={`nh-${i}`}
                        points={pts as any}
                        color="#1a1a1a" opacity={0.4} transparent lineWidth={0.5} />
                );
            })}

            {/* ─── NET BODY (semi-transparent fill behind grid) ─── */}
            <mesh position={[0, centerH / 2 + (postH - centerH) / 4, 0]} castShadow>
                <planeGeometry args={[netW, postH]} />
                <meshStandardMaterial
                    color="#222222"
                    opacity={0.06}
                    transparent
                    side={THREE.DoubleSide}
                    roughness={0.9}
                />
            </mesh>

            {/* ─── BOTTOM CABLE ─── */}
            <Line
                points={[[-halfW, 0.005, 0], [halfW, 0.005, 0]] as any}
                color="#555555" lineWidth={1.5}
            />
        </group>
    );
}
