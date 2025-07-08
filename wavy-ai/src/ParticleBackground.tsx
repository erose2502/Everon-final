import { useCallback, useEffect, useRef } from "react";

// Simple particle animation using canvas
export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const drawParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const numParticles = Math.floor((w * h) / 4000);
    const particles = Array.from({ length: numParticles }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.7,
      dx: (Math.random() - 0.5) * 0.7,
      dy: (Math.random() - 0.5) * 0.7,
      color: `rgba(100, 180, 255, ${Math.random() * 0.5 + 0.2})`,
    }));

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      animationRef.current = requestAnimationFrame(animate);
    }
    animate();
  }, []);

  useEffect(() => {
    drawParticles();
    window.addEventListener("resize", drawParticles);
    return () => {
      window.removeEventListener("resize", drawParticles);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [drawParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
