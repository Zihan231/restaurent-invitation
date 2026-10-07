"use client";

import { useEffect, useRef } from "react";

type Props = {
  opening: boolean;
  reduced: boolean;
  onReady: () => void;
  onUnsupported: () => void;
  onSettled: () => void;
};

/*
 * Procedural velvet stage curtain rendered in a single fragment shader.
 * The fabric is a height field of vertical folds; as each drape is drawn
 * aside the folds compress (deeper shadows, brighter velvet sheen), the
 * top rail leads and the hem trails behind, then the hem swings and
 * settles into a tie-back. Nothing is uploaded per frame except a few
 * uniforms, and the loop stops once the curtain has settled.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uCss;     // canvas size in CSS px
uniform vec2 uRes;     // backing store size in px
uniform float uTime;   // seconds since mount (idle sway)
uniform float uOpenT;  // seconds since opening began, < 0 while closed
uniform float uDur;    // seconds for one point of the curtain to travel
uniform float uLag;    // how far the hem trails the rail (s)
uniform float uFolds;  // folds per drape
uniform float uSwags;  // swags in the valance
uniform vec3 uShape;   // open width at top / tie-back / floor (fraction of W)
uniform float uTieY;   // tie-back height (fraction of H)
uniform float uValH;   // valance band height (fraction of H)
uniform float uSwagD;  // swag drop (fraction of H)

const float PI = 3.14159265;
const float TAU = 6.2831853;

float hash(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }

float progT(float y) {
  if (uOpenT < 0.0) return 0.0;
  return clamp((uOpenT - y * uLag) / uDur, 0.0, 1.0);
}
float smoother(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float openWidth(float y) {
  float tw = uShape.y;
  if (y < uTieY) {
    float k = (uTieY - y) / uTieY;
    return tw + (uShape.x - tw) * pow(k, 1.7);
  }
  float k = (y - uTieY) / (1.0 - uTieY);
  return tw + (uShape.z - tw) * pow(k, 1.25);
}

// Inner edge of a drape at height y, as a fraction of the screen width.
float edgeAt(float y, float seed) {
  float e = smoother(progT(y));
  float closedW = 0.508 + 0.004 * sin(uTime * 0.9 + y * 4.0 + seed) * y;
  float w = mix(closedW, openWidth(y), e);
  float t2 = uOpenT - y * uLag - uDur;
  if (uOpenT >= 0.0 && t2 > 0.0) w -= 0.03 * y * y * exp(-2.2 * t2) * sin(5.5 * t2);
  return w;
}

float stageLight(vec2 q) {
  float spot = exp(-(pow(q.x - 0.5, 2.0) * 2.2 + pow(q.y - 0.4, 2.0) * 1.6));
  return (0.62 + 0.7 * spot) * (0.5 + 0.5 * smoothstep(0.0, 0.3, q.y)) * (1.0 - 0.4 * smoothstep(0.7, 1.0, q.y));
}

vec3 velvet(vec3 n, float lx, float ao, float light) {
  vec3 L = normalize(vec3((0.5 - lx) * 1.1, -0.55, 1.0));
  float diff = max(dot(n, L), 0.0);
  float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.5);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 24.0);
  vec3 deep = vec3(0.13, 0.0, 0.012);
  vec3 base = vec3(0.66, 0.035, 0.065);
  vec3 sheen = vec3(1.0, 0.34, 0.32);
  vec3 c = mix(deep, base, diff) * ao;
  c += sheen * rim * (0.25 + diff) * 0.5;   // velvet glows on grazing fold flanks
  c += vec3(1.0, 0.65, 0.6) * spec * 0.05;
  return c * light;
}

vec3 gold(float v) {
  return mix(vec3(0.28, 0.16, 0.03), vec3(1.0, 0.87, 0.52), clamp(v, 0.0, 1.0));
}

// One drape. x is measured from the drape's outer (wall) edge; dir flips normals for the right side.
vec4 drape(float x, float y, float seed, float dir, out float edge) {
  edge = edgeAt(y, seed);
  float t = progT(y);
  float vel = 30.0 * t * t * (1.0 - t) * (1.0 - t);
  float s = x / edge;                          // cloth coordinate: 0 wall .. 1 leading edge
  float c = clamp(0.5 / edge, 1.0, 7.0);       // how bunched the fabric is
  // gathered fabric hides folds behind each other, so fewer (but deeper) folds show
  float N = uFolds * mix(1.0, 0.5, smoothstep(1.0, 4.5, c));
  float sway = 0.22 * sin(uTime * 0.7 + s * 2.5 + seed) * y
             + vel * 0.9 * sin(TAU * 1.3 * s - uOpenT * 6.0 + seed) * (0.3 + 0.7 * y);
  float p1 = TAU * N * s + seed + 0.9 * sin(y * 2.3 + seed * 1.7) + sway;
  float p2 = TAU * N * 1.93 * s + seed * 3.1 + 1.3 * sin(y * 3.1 + seed) + sway * 1.4;
  float p3 = TAU * N * 0.47 * s + seed * 5.0 + 0.7 * sin(y * 1.7 + seed * 2.0) + sway * 0.6;
  float h = sin(p1) + 0.35 * sin(p2) + 0.5 * sin(p3);
  float d = cos(p1) + 0.68 * cos(p2) + 0.24 * cos(p3);
  float dy = cos(p1) * 2.07 * cos(y * 2.3 + seed * 1.7) + 1.4 * cos(p2) * cos(y * 3.1 + seed);
  float amp = mix(0.55, 1.0, y);
  vec3 n = normalize(vec3(-d * amp * 0.75 * c * dir, -dy * amp * 0.08, 1.0));
  float ao = 0.4 + 0.6 * smoothstep(-1.7, 1.5, h);
  ao *= 1.0 - 0.25 * smoothstep(0.93, 1.0, s);  // leading edge turns away
  vec3 col = velvet(n, dir > 0.0 ? x : 1.0 - x, ao, stageLight(vec2(dir > 0.0 ? x : 1.0 - x, y)));
  // shadow from the valance above
  col *= 0.45 + 0.55 * smoothstep(uValH, uValH + uSwagD + 0.06, y);

  float pxs = 1.5 / (uRes.x * edge);
  float cov = smoothstep(1.0 + 0.012 * h + pxs, 1.0 + 0.012 * h - pxs, s);
  float hem = 0.994 - 0.007 * (h * 0.5 + 0.5) * amp;
  cov *= smoothstep(hem + 0.003, hem - 0.003, y);
  return vec4(col, cov);
}

// Gold rope tie-back with a tassel, in CSS px measured from the wall.
vec4 tieback(vec2 P, float edgePx, float tieY) {
  vec4 o = vec4(0.0);
  float x1 = edgePx + 5.0;
  float t = clamp(P.x / x1, 0.0, 1.0);
  float yR = tieY - 12.0 + 16.0 * t + 7.0 * sin(PI * t);
  float th = 4.0;
  float dist = P.y - yR;
  float cov = smoothstep(th + 0.8, th - 0.8, abs(dist)) * step(P.x, x1 + th);
  float k = clamp(dist / th, -1.0, 1.0);
  float nz = sqrt(1.0 - k * k);
  float tw = 0.5 + 0.5 * sin((P.x - P.y) * 1.3);
  o = vec4(gold(nz * (0.45 + 0.55 * tw) - k * 0.2) * cov, cov);

  vec2 kn = vec2(x1 - 1.0, tieY + 11.0);
  // tassel skirt
  vec2 q = P - vec2(kn.x, kn.y + 4.0);
  float len = 46.0;
  float hw = 4.5 + 7.0 * clamp(q.y / len, 0.0, 1.0);
  float strands = 0.5 + 0.5 * sin(q.x * 2.4 + q.y * 0.15);
  float tip = len - 3.0 * hash(vec2(floor(q.x * 1.2), 1.0));
  float sc = smoothstep(hw + 0.8, hw - 0.8, abs(q.x)) * step(0.0, q.y) * smoothstep(tip + 0.8, tip - 0.8, q.y);
  float sn = sqrt(max(0.0, 1.0 - pow(q.x / hw, 2.0)));
  vec3 skirt = gold(sn * (0.35 + 0.65 * strands) * (1.0 - 0.35 * q.y / len));
  float collar = step(5.0, q.y) * step(q.y, 9.0);
  skirt = mix(skirt, gold(0.4 + 0.6 * sn), collar);
  o = vec4(skirt * sc + o.rgb * (1.0 - sc), sc + o.a * (1.0 - sc));
  // knot / head
  float r = length(P - kn);
  float hc = smoothstep(7.8, 6.2, r);
  float hz = sqrt(max(0.0, 1.0 - pow(r / 7.0, 2.0)));
  vec3 head = gold(hz * 0.9 + (kn.y - P.y) * 0.03);
  o = vec4(head * hc + o.rgb * (1.0 - hc), hc + o.a * (1.0 - hc));
  return o;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float x = uv.x;
  float y = 1.0 - uv.y;

  float eL, eR;
  vec4 Ld = drape(x, y, 1.3, 1.0, eL);
  vec4 Rd = drape(1.0 - x, y, 4.7, -1.0, eR);

  // soft shadows the drapes throw onto the stage behind them
  float shL = step(eL, x) * smoothstep(0.08, 0.0, x - eL);
  float shR = step(eR, 1.0 - x) * smoothstep(0.08, 0.0, (1.0 - x) - eR);
  vec3 c = vec3(0.0);
  float a = 0.6 * max(shL, shR);

  c = Ld.rgb * Ld.a + c * (1.0 - Ld.a);
  a = Ld.a + a * (1.0 - Ld.a);
  c *= 1.0 - 0.5 * shR;
  c = Rd.rgb * Rd.a + c * (1.0 - Rd.a);
  a = Rd.a + a * (1.0 - Rd.a);

  // tie-backs appear as the drapes are gathered in
  float tk = smoothstep(0.8, 1.0, progT(uTieY));
  if (tk > 0.0) {
    vec2 P = vec2(x * uCss.x, y * uCss.y);
    float ty = uTieY * uCss.y;
    vec4 tl = tieback(P, edgeAt(uTieY, 1.3) * uCss.x, ty) * tk;
    vec4 tr = tieback(vec2(uCss.x - P.x, P.y), edgeAt(uTieY, 4.7) * uCss.x, ty) * tk;
    c = tl.rgb + c * (1.0 - tl.a); a = tl.a + a * (1.0 - tl.a);
    c = tr.rgb + c * (1.0 - tr.a); a = tr.a + a * (1.0 - tr.a);
  }

  // swag valance with gold fringe
  float u = fract(x * uSwags);
  float sw = sin(PI * u);
  float vb = uValH + uSwagD * pow(max(sw, 0.0), 0.8);
  float fr = 15.0 / uCss.y;
  float py = 1.5 / uRes.y;
  if (y < vb + fr + py) {
    float r = clamp(y / vb, 0.0, 1.0);
    float ph = TAU * 3.2 * pow(r, 1.15) + 0.5 * sin(x * 13.0);
    float am = (0.25 + 0.75 * r) * (0.4 + 0.6 * sw);
    float hv = sin(ph) * am;
    float dv = cos(ph) * am;
    vec3 n = normalize(vec3(dv * cos(PI * u) * 0.9, -dv * 1.8, 1.0));
    float ao = (0.5 + 0.5 * smoothstep(-0.8, 0.8, hv / max(am, 0.01))) * (0.5 + 0.5 * pow(sw, 0.35));
    ao *= 0.55 + 0.45 * smoothstep(0.0, uValH, y);
    vec3 vc = velvet(n, x, ao, 0.75 + 0.5 * exp(-pow(x - 0.5, 2.0) * 3.0));
    float vcov = smoothstep(vb + py, vb - py, y);

    // fringe hanging under each swag
    float fy = y - vb;
    float strand = 0.5 + 0.5 * sin(x * uCss.x * 1.4);
    float tipF = fr * (0.7 + 0.3 * hash(vec2(floor(x * uCss.x / 2.2), 3.0)));
    float braid = step(0.0, fy) * step(fy, 3.0 / uCss.y);
    float fcov = step(0.0, fy) * step(fy, tipF) * max(smoothstep(0.2, 0.6, strand), braid);
    vec3 fc = gold((0.35 + 0.65 * strand) * (1.0 - 0.45 * fy / fr) + braid * 0.3);

    c = fc * fcov + c * (1.0 - fcov); a = fcov + a * (1.0 - fcov);
    c = vc * vcov + c * (1.0 - vcov); a = vcov + a * (1.0 - vcov);
  }
  // valance shadow onto whatever is below it
  float vs = 0.45 * smoothstep(0.07, 0.0, y - vb - fr) * step(vb + fr, y);
  c *= 1.0 - vs;
  a = a + vs * (1.0 - a);

  c += (hash(gl_FragCoord.xy) - 0.5) * 0.02 * a;  // grain to hide banding
  gl_FragColor = vec4(c, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

export default function VelvetCurtain({ opening, reduced, onReady, onUnsupported, onSettled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openRef = useRef<(() => void) | null>(null);
  const cbs = useRef({ onReady, onUnsupported, onSettled });
  cbs.current = { onReady, onUnsupported, onSettled };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    }) as WebGLRenderingContext | null;
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!gl || !vs || !fs) {
      cbs.current.onUnsupported();
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      cbs.current.onUnsupported();
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      css: U("uCss"), res: U("uRes"), time: U("uTime"), openT: U("uOpenT"), dur: U("uDur"), lag: U("uLag"),
      folds: U("uFolds"), swags: U("uSwags"), shape: U("uShape"), tie: U("uTieY"), valH: U("uValH"), swagD: U("uSwagD"),
    };

    const dur = reduced ? 1.2 : 2.9;
    const lag = reduced ? 0.15 : 0.55;
    const settleAt = dur + lag + 2.4; // let the hem swing die out
    gl.uniform1f(u.dur, dur);
    gl.uniform1f(u.lag, lag);
    gl.uniform1f(u.tie, 0.6);

    const start = performance.now();
    let openAt = -1;
    let raf = 0;
    let last = 0;
    let first = true;
    let settled = false;
    let time = 0;
    let openT = -1;

    const draw = () => {
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.openT, openT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      // Velvet is soft, so render below native resolution: big GPU savings on phones.
      const q = Math.min(window.devicePixelRatio || 1, 2) * 0.65;
      canvas.width = Math.max(1, Math.round(W * q));
      canvas.height = Math.max(1, Math.round(H * q));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const narrow = W < 640;
      gl.uniform2f(u.css, W, H);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.folds, Math.min(14, Math.max(6, Math.round(W / 2 / 30))));
      gl.uniform1f(u.swags, Math.min(7, Math.max(3, Math.round(W / 240))));
      if (narrow) gl.uniform3f(u.shape, 0.16, 0.06, 0.18);
      else gl.uniform3f(u.shape, 0.2, 0.075, 0.22);
      gl.uniform1f(u.valH, Math.min(0.05, 32 / H));
      gl.uniform1f(u.swagD, Math.min(0.09, 70 / H));
      if (settled) draw();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const isOpening = openAt >= 0;
      if (!isOpening && now - last < 32) return; // idle sway only needs ~30fps
      last = now;
      time = (now - start) / 1000;
      openT = isOpening ? Math.min((now - openAt) / 1000, settleAt) : -1;
      draw();
      if (first) {
        first = false;
        cbs.current.onReady();
      }
      if (isOpening && openT >= settleAt) {
        cancelAnimationFrame(raf);
        settled = true;
        cbs.current.onSettled();
      }
    };

    openRef.current = () => {
      if (openAt < 0) openAt = performance.now() + 300; // let the seal fade first
    };

    resize();
    window.addEventListener("resize", resize);

    // Debug: ?curtainT=1.5 renders a single frozen frame at that point of the opening.
    const freeze = new URLSearchParams(window.location.search).get("curtainT");
    if (freeze !== null) {
      document.documentElement.dataset.freeze = "";
      time = 2;
      openT = Math.min(parseFloat(freeze), settleAt);
      settled = true;
      draw();
      cbs.current.onReady();
      return () => window.removeEventListener("resize", resize);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      openRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    if (opening) openRef.current?.();
  }, [opening]);

  return <canvas ref={canvasRef} className="velvet" aria-hidden />;
}
