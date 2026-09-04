"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type HeroButton = {
  text: string;
  onClick?: () => void;
};

type HeroProps = {
  trustBadge?: {
    text: string;
    icons?: string[];
  };
  headline?: {
    line1: string;
    line2: string;
  };
  subtitle?: string;
  buttons?: {
    primary?: HeroButton;
    secondary?: HeroButton;
  };
  children?: ReactNode;
  className?: string;
  showContent?: boolean;
};

const vertexShader = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position=vec4(position,0.0,1.0); }`;

const fragmentShader = `#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float time;
uniform vec2 touch;

float hash(vec2 p){
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}

float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash(i);
  float b=hash(i+vec2(1.0,0.0));
  float c=hash(i+vec2(0.0,1.0));
  float d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0;
  float a=0.5;
  mat2 m=mat2(1.0,-0.42,0.28,1.18);
  for(int i=0;i<5;i++){
    v+=a*noise(p);
    p=2.02*m*p;
    a*=0.5;
  }
  return v;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*resolution.xy)/min(resolution.x,resolution.y);
  vec2 pointer=(touch-.5*resolution.xy)/min(resolution.x,resolution.y);
  float t=time*.085;
  float clouds=fbm(vec2(uv.x*1.7+t, -uv.y*1.18-t*.42));
  float beam=pow(max(0.0,1.0-abs(uv.y+uv.x*.24+.06)*4.8),2.1);
  float orbit=abs(length(uv-pointer*.16)-.36);
  float ring=smoothstep(.012,.0,orbit)*.34;
  float stars=step(.9965,hash(floor((uv+vec2(t*.05,0.0))*300.0)));
  float vignette=smoothstep(1.12,.08,length(uv));
  vec3 deep=vec3(.006,.012,.035);
  vec3 cyan=vec3(.08,.66,1.0);
  vec3 blue=vec3(.035,.18,.62);
  vec3 indigo=vec3(.20,.16,.48);
  vec3 col=deep;
  col+=cyan*(beam*.22+ring*.16);
  col+=blue*(clouds*.13);
  col+=indigo*(fbm(uv*3.8-vec2(t*.36,t*.12))*.075);
  col+=vec3(.78,.92,1.0)*stars*.2;
  col*=vignette;
  color=vec4(col,.82);
}`;

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

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
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

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
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

export default function AnimatedShaderHero({
  trustBadge,
  headline,
  subtitle,
  buttons,
  children,
  className = "",
  showContent = true,
}: HeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<[number, number]>([0, 0]);
  const reducedMotion = useReducedMotionPreference();
  const [fallback, setFallback] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || reducedMotion) return undefined;

    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return undefined;

    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!program || !buffer) return undefined;

    const position = gl.getAttribLocation(program, "position");
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");
    const touch = gl.getUniformLocation(program, "touch");
    let frame = 0;
    let visible = true;
    let running = !document.hidden;
    let start = performance.now();

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.35);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      if (!visible || !running) return;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - start) / 1000);
      gl.uniform2f(touch, pointerRef.current[0], pointerRef.current[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = window.requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && running) {
        start = performance.now();
        frame = window.requestAnimationFrame(render);
      } else if (frame) {
        window.cancelAnimationFrame(frame);
      }
    }, { threshold: 0.05 });

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = rect.height - (event.clientY - rect.top);
      const scaleX = canvas.width / Math.max(1, rect.width);
      const scaleY = canvas.height / Math.max(1, rect.height);
      pointerRef.current = [x * scaleX, y * scaleY];
    };

    const handleVisibility = () => {
      running = !document.hidden;
      if (running && visible) {
        start = performance.now();
        frame = window.requestAnimationFrame(render);
      } else if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };

    resize();
    setFallback(false);
    pointerRef.current = [canvas.width * 0.5, canvas.height * 0.52];
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    observer.observe(wrapper);
    wrapper.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    frame = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      wrapper.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [reducedMotion]);

  return (
    <div ref={wrapperRef} className={`relative h-full min-h-full w-full overflow-hidden bg-cosmos-black ${className}`}>
      {fallback || reducedMotion ? (
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_46%_34%,rgba(103,232,249,0.18),transparent_28%),radial-gradient(circle_at_74%_20%,rgba(79,70,229,0.16),transparent_34%),linear-gradient(180deg,#030712,#03040a)]"
          aria-hidden="true"
        />
      ) : null}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.12),rgba(3,4,10,0.58)),radial-gradient(circle_at_50%_38%,transparent,rgba(3,4,10,0.62)_72%)]" />

      {children}

      {showContent ? (
        <div className="relative z-10 grid h-full min-h-[360px] place-items-center px-5 py-10 text-center text-cosmos-white">
          <div className="max-w-4xl">
            {trustBadge ? (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-oxygen-400/24 bg-oxygen-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-oxygen-200 backdrop-blur-md">
                {trustBadge.icons?.map((icon) => <span key={icon}>{icon}</span>)}
                <span>{trustBadge.text}</span>
              </div>
            ) : null}
            {headline ? (
              <h2 className="text-[clamp(2.4rem,7vw,5.2rem)] font-semibold leading-[1.02] tracking-normal text-cosmos-white">
                {headline.line1}
                <span className="block text-gradient-ai">{headline.line2}</span>
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-cosmos-frost md:text-lg md:leading-8">
                {subtitle}
              </p>
            ) : null}
            {buttons ? (
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {buttons.primary ? (
                  <button type="button" onClick={buttons.primary.onClick} className="cosmos-btn cosmos-btn-primary">
                    {buttons.primary.text}
                  </button>
                ) : null}
                {buttons.secondary ? (
                  <button type="button" onClick={buttons.secondary.onClick} className="cosmos-btn cosmos-btn-secondary">
                    {buttons.secondary.text}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
