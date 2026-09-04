"use client";

import React, { useEffect, useRef, useState } from "react";

type ShaderBackgroundProps = {
  width?: number;
  height?: number;
  speed?: number;
  mouseEnable?: boolean;
  timeOffset?: number;
  className?: string;
};

const vertexShader = `
  precision highp float;
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;

  void main() {
    vTexCoord = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    gl_Position = positionVec4;
  }
`;

const fragmentShader = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform vec2 iMouse;
  varying vec2 vTexCoord;

  float tanh_approx(float x) {
    x = clamp(x, -3.0, 3.0);
    float x2 = x * x;
    return x * (27.0 + x2) / (27.0 + 9.0 * x2);
  }

  void main() {
    vec2 uv = vTexCoord * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    const int MAX_STEPS = 20;
    const int NOISE_ITER = 7;
    const float INITIAL_OFFSET = 0.1;
    const float RADIAL_SCALE = 5.0;
    const float DEPTH_ATTEN = 0.2;

    float rayDepth = 0.0;
    vec4 finalColor = vec4(0.0);
    vec3 rayDir = normalize(vec3(uv, 1.0));

    for (int step = 0; step < MAX_STEPS; step++) {
      vec3 pos = rayDepth * rayDir + INITIAL_OFFSET;
      float angle = atan(pos.y / 0.2, pos.x) * 2.0;
      float radius = length(pos.xy) - RADIAL_SCALE - rayDepth * DEPTH_ATTEN;
      float height = pos.z / 3.0;
      pos = vec3(angle, height, radius);

      for (int i = 1; i <= NOISE_ITER; i++) {
        float s = float(i);
        vec3 inp = pos.yzx * s + iTime + 0.3 * float(step);
        pos += sin(inp) / s;
      }

      vec3 pattern = 0.4 * cos(pos) - 0.4;
      float dist = max(length(vec4(pattern, pos.z)), 0.02);
      rayDepth += dist;

      float phase = pos.x + float(step) * 0.4 + rayDepth + iMouse.x * 0.08;
      vec4 cp = vec4(5.6, 1.6, 8.2, 0.0);
      finalColor += (1.0 + cos(phase + cp)) / dist;
    }

    vec4 col = finalColor * finalColor / 520.0;
    col.r = tanh_approx(col.r) * 0.55;
    col.g = tanh_approx(col.g) * 0.82;
    col.b = tanh_approx(col.b);
    col.rgb *= vec3(0.52, 0.78, 1.0);
    col.rgb += vec3(0.0, 0.015, 0.035);
    col.a = 1.0;
    gl_FragColor = col;
  }
`;

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export default function ShaderBackground({
  width,
  height,
  speed = 1,
  mouseEnable = true,
  timeOffset = 0,
  className = "",
}: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<[number, number]>([0, 0]);
  const reducedMotion = useReducedMotionPreference();
  const [fallback, setFallback] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || reducedMotion) return undefined;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return undefined;

    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!program || !buffer) return undefined;

    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aTexCoord = gl.getAttribLocation(program, "aTexCoord");
    const iResolution = gl.getUniformLocation(program, "iResolution");
    const iTime = gl.getUniformLocation(program, "iTime");
    const iMouse = gl.getUniformLocation(program, "iMouse");
    const vertices = new Float32Array([
      0, 0, 0, 0,
      1, 0, 1, 0,
      0, 1, 0, 1,
      1, 1, 1, 1,
    ]);

    let frame = 0;
    let visible = true;
    let running = !document.hidden;
    const start = performance.now();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const targetWidth = width ?? rect.width;
      const targetHeight = height ?? rect.height;
      const isMobile = window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.25);
      canvas.width = Math.max(1, Math.floor(targetWidth * dpr));
      canvas.height = Math.max(1, Math.floor(targetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      if (!visible || !running) return;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(aTexCoord);
      gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);
      gl.uniform2f(iResolution, canvas.width, canvas.height);
      gl.uniform1f(iTime, ((now - start) / 1000) * speed + timeOffset);
      gl.uniform2f(iMouse, mouseRef.current[0], mouseRef.current[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = window.requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && running) {
        frame = window.requestAnimationFrame(render);
      } else if (frame) {
        window.cancelAnimationFrame(frame);
      }
    }, { threshold: 0.05 });

    const handleMouseMove = (event: PointerEvent) => {
      if (!mouseEnable) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = [
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        (1 - (event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
      ];
    };

    const handleVisibility = () => {
      running = !document.hidden;
      if (running && visible) {
        frame = window.requestAnimationFrame(render);
      } else if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };

    resize();
    setFallback(false);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    observer.observe(container);
    container.addEventListener("pointermove", handleMouseMove);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    frame = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      container.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [height, mouseEnable, reducedMotion, speed, timeOffset, width]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-cosmos-black ${className}`}
      role="img"
      aria-label="Dynamic generative COSMOS shader background"
    >
      {fallback || reducedMotion ? (
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_48%_38%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_72%_18%,rgba(99,102,241,0.16),transparent_34%),linear-gradient(180deg,#030712,#03040a)]"
          aria-hidden="true"
        />
      ) : null}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.1),rgba(3,4,10,0.58)),radial-gradient(circle_at_50%_50%,transparent,rgba(3,4,10,0.52)_74%)]" />
    </div>
  );
}
