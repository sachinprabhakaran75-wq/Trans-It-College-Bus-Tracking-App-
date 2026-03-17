import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: -1, pointerEvents: 'none', background: '#030712' }}>
            {/* Orb 1: Violet */}
            <motion.div
                className="bg-orb"
                style={{
                    width: '60vw',
                    height: '60vw',
                    background: '#7c3aed',
                    top: '-20%',
                    left: '-10%',
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb 2: Teal */}
            <motion.div
                className="bg-orb"
                style={{
                    width: '50vw',
                    height: '50vw',
                    background: '#0ea5a4',
                    bottom: '-10%',
                    right: '-20%',
                }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, -60, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb 3: Accent/Rose (New) */}
            <motion.div
                className="bg-orb"
                style={{
                    width: '40vw',
                    height: '40vw',
                    background: '#f43f5e',
                    top: '30%',
                    left: '30%',
                    opacity: 0.3
                }}
                animate={{
                    x: [0, 60, 0],
                    y: [0, -40, 0],
                    scale: [0.9, 1.3, 0.9],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Noise Texture Overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")',
                    opacity: 0.05,
                    mixBlendMode: 'overlay'
                }}
            />

            {/* Grid Overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
                    opacity: 0.4
                }}
            />
        </div>
    );
}
