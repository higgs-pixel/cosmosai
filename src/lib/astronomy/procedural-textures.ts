import * as THREE from "three";

/**
 * Generates procedural textures using 2D canvas for realistic 3D rendering
 * without needing external asset downloads.
 */

// 1. Procedural Jupiter Banded Cloud Texture
export function createJupiterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, "#d4a373");
    grad.addColorStop(0.15, "#faedcd");
    grad.addColorStop(0.3, "#ccd5ae");
    grad.addColorStop(0.42, "#bc6c25");
    grad.addColorStop(0.5, "#dda15e"); // Great Red Spot band
    grad.addColorStop(0.58, "#f4a261");
    grad.addColorStop(0.7, "#e9c46a");
    grad.addColorStop(0.85, "#2a9d8f");
    grad.addColorStop(1.0, "#a8ded6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise bands
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * canvas.height;
      const h = Math.random() * 8 + 2;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.15)" : "rgba(100, 50, 20, 0.15)";
      ctx.fillRect(0, y, canvas.width, h);
    }

    // Draw Great Red Spot
    ctx.fillStyle = "#c1121f";
    ctx.beginPath();
    ctx.ellipse(650, 280, 70, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fdf0d5";
    ctx.beginPath();
    ctx.ellipse(650, 280, 45, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Procedural Saturn Ring Texture
export function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0.0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.1, "rgba(212, 163, 115, 0.2)");
    grad.addColorStop(0.25, "rgba(230, 200, 150, 0.95)");
    grad.addColorStop(0.48, "rgba(180, 140, 90, 0.9)");
    grad.addColorStop(0.52, "rgba(0, 0, 0, 0.1)"); // Cassini Division gap!
    grad.addColorStop(0.56, "rgba(210, 170, 120, 0.85)");
    grad.addColorStop(0.85, "rgba(160, 120, 80, 0.6)");
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Procedural Moon Craters Texture
export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Base lunar regolith grey
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dark lunar maria patches
    const mariaColors = ["#475569", "#334155", "#1e293b"];
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 120 + 40;
      ctx.fillStyle = mariaColors[i % mariaColors.length];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Impact Craters
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 12 + 2;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.beginPath();
      ctx.arc(x + 1, y + 1, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. Procedural Mars Topography Texture
export function createMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#c2410c"; // Martian rust orange
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dark volcanic basalt regions (Syrtis Major)
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 100 + 30;
      ctx.fillStyle = "rgba(67, 20, 7, 0.35)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Polar ice cap (North Pole)
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, 20, 300, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 5. Procedural Sun Corona & Flare Texture
export function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
    grad.addColorStop(0.0, "#ffffff");
    grad.addColorStop(0.2, "#fef08a");
    grad.addColorStop(0.5, "#f97316");
    grad.addColorStop(0.8, "rgba(239, 68, 68, 0.3)");
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 6. Procedural 3D Milky Way Sky Dome Texture
export function createMilkyWayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Deep galactic background
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Diagonal Milky Way dust band
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 6);

    const grad = ctx.createLinearGradient(0, -200, 0, 200);
    grad.addColorStop(0.0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.3, "rgba(99, 102, 241, 0.15)");
    grad.addColorStop(0.5, "rgba(217, 70, 239, 0.3)"); // Galactic core bright pink/magenta
    grad.addColorStop(0.7, "rgba(56, 189, 248, 0.15)");
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(-1000, -200, 2000, 400);

    // Core star dust clouds
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 1800;
      const y = (Math.random() - 0.5) * 250;
      const r = Math.random() * 3 + 0.5;
      ctx.fillStyle = i % 3 === 0 ? "rgba(255, 255, 255, 0.8)" : "rgba(192, 132, 252, 0.6)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
