import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/dspEngine';

interface OscilloscopeCanvasProps {
  audioRunning: boolean;
  height?: number;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({ audioRunning, height = 84 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const timeBuf = new Float32Array(512);
    const freqBuf = new Uint8Array(128);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(240, Math.floor(rect.width));
      const h = height;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Subtle precision graticule
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      for (let x = 0; x < w; x += 48) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      const analyser = audioEngine.getAnalyser();
      if (analyser && audioRunning) {
        analyser.getFloatTimeDomainData(timeBuf);
        analyser.getByteFrequencyData(freqBuf);

        // Background spectral energy bars in MPC Red
        const barCount = 48;
        const barW = w / barCount;
        ctx.fillStyle = 'rgba(225, 29, 46, 0.14)';
        for (let i = 0; i < barCount; i++) {
          const val = freqBuf[i] / 255;
          const bh = val * (h * 0.72);
          ctx.fillRect(i * barW + 1, h - bh, Math.max(2, barW - 2), bh);
        }

        // High-contrast oscilloscope trace
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        for (let i = 0; i < timeBuf.length; i++) {
          const x = (i / (timeBuf.length - 1)) * w;
          const y = h / 2 - timeBuf[i] * (h * 0.42);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Clean flat standby line
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }

      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [audioRunning, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ height }}
      className="w-full block rounded-lg bg-white/60 border border-slate-900/10"
      aria-label="Live master output oscilloscope and spectrum meter"
    />
  );
};
