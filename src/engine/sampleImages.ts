/** Generates crisp procedural sample images so users can test the studio immediately. */
export async function generateSampleFiles(): Promise<File[]> {
  const specs = [
    {
      name: 'sunset-peaks.png',
      width: 1600,
      height: 1066,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
        sky.addColorStop(0, '#141838');
        sky.addColorStop(0.45, '#5a3278');
        sky.addColorStop(0.8, '#e0645c');
        sky.addColorStop(1, '#f7b267');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Sun glow
        const sun = ctx.createRadialGradient(w * 0.68, h * 0.48, 20, w * 0.68, h * 0.48, w * 0.28);
        sun.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
        sun.addColorStop(0.3, 'rgba(255, 179, 107, 0.5)');
        sun.addColorStop(1, 'rgba(255, 179, 107, 0)');
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, w, h);

        // Layered mountains
        const drawRidge = (color: string, baseY: number, peaks: number[]) => {
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, baseY);
          peaks.forEach((py, idx) => {
            const px = ((idx + 1) / peaks.length) * w;
            ctx.lineTo(px, py);
          });
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        };

        drawRidge('#392854', h * 0.64, [h * 0.56, h * 0.61, h * 0.52, h * 0.63, h * 0.54, h * 0.62]);
        drawRidge('#22183a', h * 0.72, [h * 0.68, h * 0.62, h * 0.71, h * 0.64, h * 0.74]);
        drawRidge('#100c20', h * 0.84, [h * 0.79, h * 0.85, h * 0.77, h * 0.86, h * 0.81]);
      },
    },
    {
      name: 'neon-geometry.png',
      width: 1200,
      height: 1200,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const bg = ctx.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, '#09111e');
        bg.addColorStop(1, '#18243d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Subtle grid
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.08)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= w; i += 80) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, h);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(w, i);
          ctx.stroke();
        }

        // Glowing rings
        const ring = ctx.createLinearGradient(w * 0.2, h * 0.2, w * 0.8, h * 0.8);
        ring.addColorStop(0, '#22d3ee');
        ring.addColorStop(0.5, '#818cf8');
        ring.addColorStop(1, '#f472b6');

        ctx.strokeStyle = ring;
        ctx.lineWidth = 36;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(w * 0.38, h * 0.42, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(w * 0.56, h * 0.54, 150, 150);
      },
    },
    {
      name: 'minimal-portrait.png',
      width: 1080,
      height: 1350,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#f4ece1');
        bg.addColorStop(1, '#e2d2be');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Terracotta arch
        ctx.fillStyle = '#c86d51';
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.44, w * 0.28, Math.PI, 0);
        ctx.lineTo(w * 0.78, h * 0.78);
        ctx.lineTo(w * 0.22, h * 0.78);
        ctx.closePath();
        ctx.fill();

        // Olive circle accent
        ctx.fillStyle = '#4e6754';
        ctx.beginPath();
        ctx.arc(w * 0.62, h * 0.54, w * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // Horizon line
        ctx.fillStyle = '#2d2926';
        ctx.fillRect(w * 0.16, h * 0.78, w * 0.68, 6);
      },
    },
  ];

  const files = await Promise.all(
    specs.map(async (spec) => {
      const canvas = document.createElement('canvas');
      canvas.width = spec.width;
      canvas.height = spec.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        spec.draw(ctx, spec.width, spec.height);
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Sample gen failed'))), 'image/png');
      });
      return new File([blob], spec.name, { type: 'image/png' });
    })
  );

  return files;
}
