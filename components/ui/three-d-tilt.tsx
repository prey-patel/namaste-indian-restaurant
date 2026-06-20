'use client';

import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

type ThreeDTiltCardProps = {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
  translateZ?: string;
};

export default function ThreeDTiltCard({
  children,
  className = '',
  maxTilt = 15,
  glareOpacity = 0.15,
  translateZ = '20px',
}: ThreeDTiltCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth out tilt using Framer Motion springs
  const tiltX = useSpring(x, { stiffness: 150, damping: 22 });
  const tiltY = useSpring(y, { stiffness: 150, damping: 22 });

  // Map mouse positions to 3D rotation angles
  const rotateX = useTransform(tiltY, [-0.5, 0.5], [`${maxTilt}deg`, `-${maxTilt}deg`]);
  const rotateY = useTransform(tiltX, [-0.5, 0.5], [`-${maxTilt}deg`, `${maxTilt}deg`]);

  // Dynamic glare spot calculations based on cursor coordinate
  const glareX = useTransform(tiltX, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(tiltY, [-0.5, 0.5], ['0%', '100%']);
  
  // Calculate distance from center to control glare brightness
  const glareBrightness = useTransform(
    [tiltX, tiltY],
    ([latestX, latestY]) => {
      const distance = Math.sqrt((latestX as number) ** 2 + (latestY as number) ** 2) * 2;
      return Math.min(distance * glareOpacity, glareOpacity);
    }
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalize coordinates to ranges [-0.5, 0.5]
    const relativeX = (e.clientX - rect.left) / width - 0.5;
    const relativeY = (e.clientY - rect.top) / height - 0.5;
    
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      className={`relative transition-all duration-300 ${className}`}
    >
      {/* 3D Inner Wrapper that pops out */}
      <div 
        style={{ 
          transform: `translateZ(${translateZ})`, 
          transformStyle: 'preserve-3d' 
        }} 
        className="w-full h-full"
      >
        {children}
      </div>

      {/* Dynamic Cursor Glare Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[inherit] mix-blend-overlay"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([xPos, yPos]) => `radial-gradient(circle at ${xPos} ${yPos}, rgba(255,255,255,0.4) 0%, transparent 60%)`
          ),
          opacity: glareBrightness,
        }}
      />
    </motion.div>
  );
}
