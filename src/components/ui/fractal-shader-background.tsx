"use client";

import { useEffect, useRef, useState } from "react";

const VERTEX_SHADER = `
precision highp float;
attribute vec3 aPosition;
varying vec2 vTexCoord;

void main() {
  vTexCoord = (aPosition.xy + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 1.0);
}
`;

const FRAGMENT_SHADER = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 iResolution;
uniform int iFrame;
uniform sampler2D iChannel0;
varying vec2 vTexCoord;

float customTanh(float x) {
  float e2x = exp(2.0 * x);
  return (e2x - 1.0) / (e2x + 1.0);
}

void main() {
  vec2 R = iResolution;
  vec2 p = (gl_FragCoord.xy * 2.0 - R) / R.y * mat2(3.0, 4.0, 4.0, -3.0) / 50.0;

  vec4 S = vec4(0.0);
  vec4 C = vec4(1.0, 2.0, 3.0, 0.0);
  vec4 W;
  float t = float(iFrame) / 60.0;
  float T = 0.1 * t + p.y;

  for (int i = 0; i < 30; i++) {
    float fi = float(i);
    W = sin(fi) * C;
    float noise = texture2D(
      iChannel0,
      p / exp(W.x) + vec2(fi / 20.0, mod(t, 32.0) / 32.0)
    ).r;
    S += (cos(W) + 1.0)
      * exp(sin(fi + fi * T))
      / length(max(p, p / vec2(2.0, noise * 40.0)))
      / 1e4;
    p += 0.02 * cos(fi * (C.xz + 8.0 + fi) + T + T);
  }

  vec4 bg = p.x * (C - 1.0) * 2.0;
  vec4 result = bg + S * S;
  vec3 color = vec3(
    customTanh(result.r),
    customTanh(result.g),
    customTanh(result.b)
  );

  color = mix(vec3(0.0, 0.015, 0.055), color * vec3(0.32, 0.72, 1.0), 0.58);
  color += vec3(0.0, 0.045, 0.09) * smoothstep(0.2, 0.95, vTexCoord.y);

  gl_FragColor = vec4(color, 1.0);
}
`;

type FractalShaderBackgroundProps = {
  className?: string;
  speed?: number;
};

type ShaderResources = {
  animationFrame: number;
  buffer: WebGLBuffer | null;
  program: WebGLProgram | null;
  texture: WebGLTexture | null;
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function createNoiseTexture(gl: WebGLRenderingContext) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const value = Math.floor(
        255 *
          Math.abs(
            Math.sin(x * 12.9898 + y * 78.233) *
              Math.sin((x + y) * 0.037) *
              43758.5453,
          ),
      );
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = gl.createTexture();

  if (!texture) {
    throw new Error("Unable to create noise texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

export default function FractalShaderBackground({
  className = "",
  speed = 0.38,
}: FractalShaderBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resourcesRef = useRef<ShaderResources>({
    animationFrame: 0,
    buffer: null,
    program: null,
    texture: null,
  });
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) {
      return undefined;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      stencil: false,
    });

    if (reducedMotion || !gl) {
      setFallback(true);
      return undefined;
    }

    let isVisible = true;
    let isTabVisible = document.visibilityState === "visible";
    let start = performance.now();
    let resizeObserver: ResizeObserver | null = null;

    try {
      const program = createProgram(gl);
      const buffer = gl.createBuffer();
      const texture = createNoiseTexture(gl);

      if (!buffer) {
        throw new Error("Unable to create shader buffer.");
      }

      resourcesRef.current.program = program;
      resourcesRef.current.buffer = buffer;
      resourcesRef.current.texture = texture;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]),
        gl.STATIC_DRAW,
      );

      const positionLocation = gl.getAttribLocation(program, "aPosition");
      const resolutionLocation = gl.getUniformLocation(program, "iResolution");
      const frameLocation = gl.getUniformLocation(program, "iFrame");
      const channelLocation = gl.getUniformLocation(program, "iChannel0");

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.1 : 1.35);
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        gl.viewport(0, 0, width, height);
      };

      let animationFrame = 0;

      const render = (time: number) => {
        if (!isVisible || !isTabVisible) {
          animationFrame = window.requestAnimationFrame(render);
          return;
        }

        resize();
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(channelLocation, 0);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform1i(frameLocation, Math.floor(((time - start) / 1000) * 60 * speed));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animationFrame = window.requestAnimationFrame(render);
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      const intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = Boolean(entry?.isIntersecting);
          if (isVisible) {
            start = performance.now();
          }
        },
        { threshold: 0.02 },
      );

      intersectionObserver.observe(container);

      const onVisibilityChange = () => {
        isTabVisible = document.visibilityState === "visible";
        if (isTabVisible) {
          start = performance.now();
        }
      };

      document.addEventListener("visibilitychange", onVisibilityChange);
      animationFrame = window.requestAnimationFrame(render);

      return () => {
        window.cancelAnimationFrame(animationFrame);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        resizeObserver?.disconnect();
        intersectionObserver.disconnect();
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteBuffer(buffer);
        gl.deleteTexture(texture);
        gl.deleteProgram(program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch {
      setFallback(true);
      const resources = resourcesRef.current;
      return () => {
        window.cancelAnimationFrame(resources.animationFrame);
        resizeObserver?.disconnect();

        if (resources.buffer) {
          gl.deleteBuffer(resources.buffer);
        }

        if (resources.texture) {
          gl.deleteTexture(resources.texture);
        }

        if (resources.program) {
          gl.deleteProgram(resources.program);
        }
      };
    }
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.2),rgba(2,6,23,0)_42%),#020617] ${className}`}
      role="img"
      aria-label="Animated COSMOS fractal shader background"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full will-change-transform"
        aria-hidden="true"
      />
      {fallback ? (
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,rgba(56,189,248,0.28),rgba(59,130,246,0.1)_28%,rgba(2,6,23,0)_62%),linear-gradient(135deg,rgba(14,165,233,0.16),rgba(59,130,246,0.06)_38%,rgba(2,6,23,0.72))]"
          aria-hidden="true"
        />
      ) : null}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0)_0%,rgba(2,6,23,0.12)_48%,rgba(2,6,23,0.62)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
}
