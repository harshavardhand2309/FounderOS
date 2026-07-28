

import { useEffect, useRef } from 'react';
import { generateMockSession } from '@/data/mockData';

// Mock skeletal data interpolation for demo purposes
// In a real app, this would come from a frame-by-frame JSON or binary stream
const useMockSkeletonAnimation = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let t = 0;

        const render = () => {
            t += 0.05; // Time step

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Neon settings (Updated to Yellow Theme)
            ctx.strokeStyle = '#FFD700'; // Gold
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FFA500'; // Orange glow

            // Mock Joints Logic (Simple oscillating stickman for demo)
            // Center of chest
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // Simple procedural animation math
            const headY = cy - 60 + Math.sin(t) * 10;
            const lHandX = cx - 40 + Math.cos(t * 2) * 20;
            const lHandY = cy + Math.sin(t * 2) * 20;
            const rHandX = cx + 40 + Math.cos(t * 2 + Math.PI) * 20;
            const rHandY = cy + Math.sin(t * 2 + Math.PI) * 20;

            // Draw Connection Helper
            const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            };

            const drawJoint = (x: number, y: number) => {
                ctx.fillStyle = '#FFA500'; // Orange/Gold
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Head to Chest
            drawLine(cx, headY, cx, cy);

            // Chest to Hips
            drawLine(cx, cy, cx, cy + 50);

            // Shoulders (approx)
            drawLine(cx, cy - 10, lHandX, lHandY); // Left Arm
            drawLine(cx, cy - 10, rHandX, rHandY); // Right Arm

            // Legs
            drawLine(cx, cy + 50, cx - 30, cy + 120); // Left Leg
            drawLine(cx, cy + 50, cx + 30, cy + 120); // Right Leg

            // Draw Joints
            drawJoint(cx, headY);
            drawJoint(lHandX, lHandY);
            drawJoint(rHandX, rHandY);
            drawJoint(cx, cy);

            animationFrameId = requestAnimationFrame(render);
        };

        // Resize handler to keep canvas sharp
        const handleResize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Init size

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [canvasRef]);
};

export default function SkeletonOverlay({ className }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useMockSkeletonAnimation(canvasRef);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 pointer-events-none z-10 ${className}`}
        />
    );
}
