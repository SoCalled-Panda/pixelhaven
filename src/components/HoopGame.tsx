import { useCallback, useEffect, useRef, useState } from 'react';
import { estimateLaunch } from '../lib/hoopPhysics';

/**
 * HoopUpload mini-game (round 9, file edition round 10) — the upload screen
 * from the mood board: "Drop files here, or take the shot." The picked photo
 * is mounted on a white file card — the "board" from the reference design,
 * with the picture at the top on a white background — and the player flicks
 * that file through the hoop to start the conversion. Misses reset the file
 * so the player can shoot again; the Continue button skips the game entirely.
 *
 * Rendering & physics live on one dpr-aware canvas (same pattern as the
 * coloring renderer): gravity, floor/wall bounces, rim-end colliders, a
 * gentle magnet near the rim so shots feel fair on touch screens, net
 * swish + confetti on a goal.
 *
 * Aiming (round 10 fix): dragging samples recent pointer motion and draws a
 * live dotted trajectory guide; releasing always shoots with the exact
 * velocity the guide displayed — a fast flick throws hard, a slow carried
 * drag tosses along the drag direction, and only a plain click sets the file
 * down without throwing it.
 *
 * The canvas is aria-hidden; the accessible paths are the Continue button
 * and the keyboard controls (arrows to move, Space to shoot).
 */

/* ------------------------------------------------------------ constants */

const GRAVITY = 2100; // px/s²
const RESTITUTION = 0.55; // floor bounce
const RIM_RESTITUTION = 0.5;
const SCORE_DELAY_MS = 950; // swish plays out before conversion starts
const MAGNET_RADIUS = 30; // px above the rim plane where shots get steered

const RIM_COLOR = '#e8875f';
const RIM_DARK = '#b04f2c';
const INK = 'rgba(67, 54, 74, 0.9)';
const INK_MUTED = 'rgba(119, 102, 127, 0.85)';
const BOARD_DASH = 'rgba(67, 54, 74, 0.5)';
const CONFETTI = ['#e8875f', '#f6c945', '#7fb069', '#43364a', '#b04f2c'];

const MISS_LINES = [
  'Rimmed out — one more shot?',
  'So close! Try a slightly higher arc.',
  'Off target — a softer flick might do it.',
  'Missed! The file is back — shoot again.',
  'Not this time — watch the dotted aim guide.',
];

/* ------------------------------------------------------- file card geometry */

/**
 * The flying object is a portrait file card (the "board" from the reference
 * design) rather than a ball. Physics keep a circular collider, so the card
 * is expressed in collider-radius units; half-height = radius keeps the card
 * resting exactly on the floor line.
 */
function cardSize(r: number) {
  return { w: r * 1.52, h: r * 2.0, fold: r * 0.34, pad: r * 0.15 };
}

interface Props {
  /** Object URL (or data URL) of the picked file — shown on the file card. */
  ballSrc: string;
  fileName: string;
  /** How many pictures the player already saved in this browser. */
  importsCount: number;
  /** Goal scored (or Continue pressed) → start the conversion. */
  onScore: () => void;
  /** Skip the mini-game and convert right away. */
  onContinue: () => void;
  /** Open the file picker (the dashed board is clickable). */
  onPickFile: () => void;
  /** A new file was dropped onto the court → swap the ball. */
  onDropFile: (file: File) => void;
}

/* --------------------------------------------------------------- sound */

/** Tiny WebAudio blips — created lazily on first gesture, never throws. */
function makeSounds() {
  let ctx: AudioContext | null = null;
  const ensure = (): AudioContext | null => {
    if (ctx) return ctx;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      ctx = Ctor ? new Ctor() : null;
    } catch {
      ctx = null;
    }
    return ctx;
  };
  const blip = (freq: number, duration: number, type: OscillatorType, volume: number, slide = 0) => {
    const ac = ensure();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + duration);
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch {
      /* audio is a garnish — ignore failures */
    }
  };
  return {
    bounce: () => blip(140, 0.07, 'sine', 0.1, -50),
    rim: () => blip(540, 0.09, 'triangle', 0.08, -140),
    board: () => blip(210, 0.08, 'sine', 0.09),
    score: () => {
      blip(660, 0.1, 'triangle', 0.1);
      setTimeout(() => blip(880, 0.16, 'triangle', 0.1), 90);
    },
    shoot: () => blip(320, 0.06, 'sine', 0.05, 80),
  };
}

/* ---------------------------------------------------------- physics state */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  state: 'rest' | 'drag' | 'fly' | 'scored';
  restTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}

interface TrailDot {
  x: number;
  y: number;
  life: number;
}

interface Layout {
  w: number;
  h: number;
  boardX: number;
  boardY: number;
  boardW: number;
  boardH: number;
  rimY: number;
  rimX0: number;
  rimX1: number;
  floorY: number;
}

export function HoopGame({ ballSrc, fileName, importsCount, onScore, onContinue, onPickFile, onDropFile }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballImgRef = useRef<HTMLImageElement | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [status, setStatus] = useState('Grab the file, drag it, and flick it at the hoop.');

  // Mutable game state lives in refs — the render loop reads them every frame.
  const layoutRef = useRef<Layout | null>(null);
  const ballRef = useRef<Ball>({ x: 80, y: 300, vx: 0, vy: 0, r: 20, angle: 0, state: 'rest', restTimer: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    samples: { t: number; x: number; y: number }[];
  } | null>(null);
  const trailRef = useRef<TrailDot[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const netKickRef = useRef(0);
  const scoredRef = useRef(false);
  const scoreTimerRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;
  const soundsRef = useRef<ReturnType<typeof makeSounds> | null>(null);

  /* ------------------------------------------------------------- ball art */

  useEffect(() => {
    setHasPhoto(false);
    if (!ballSrc) return;
    const img = new Image();
    img.onload = () => {
      ballImgRef.current = img;
      setHasPhoto(true);
    };
    img.onerror = () => {
      ballImgRef.current = null; // file card with placeholder glyph
      setHasPhoto(false);
    };
    img.src = ballSrc;
  }, [ballSrc]);

  useEffect(() => {
    return () => {
      if (scoreTimerRef.current !== null) window.clearTimeout(scoreTimerRef.current);
    };
  }, []);

  /* ------------------------------------------------------------ geometry */

  const computeLayout = useCallback((w: number, h: number): Layout => {
    const boardW = Math.min(Math.max(w * 0.52, 220), 340);
    const boardH = boardW * 0.66;
    const boardX = (w - boardW) / 2;
    const boardY = Math.max(10, h * 0.06);
    const rimW = Math.min(Math.max(boardW * 0.46, 104), 150);
    const floorY = h - 14;
    return {
      w,
      h,
      boardX,
      boardY,
      boardW,
      boardH,
      rimY: boardY + boardH + 4,
      rimX0: w / 2 - rimW / 2,
      rimX1: w / 2 + rimW / 2,
      floorY,
    };
  }, []);

  const placeBallAtStart = useCallback((ball: Ball, layout: Layout) => {
    ball.r = Math.max(19, Math.min(28, layout.w * 0.06));
    ball.x = Math.max(ball.r + 18, layout.w * 0.16);
    ball.y = layout.floorY - ball.r;
    ball.vx = 0;
    ball.vy = 0;
    ball.angle = 0;
    ball.state = 'rest';
    ball.restTimer = 0;
  }, []);

  /* ---------------------------------------------------------- main loop */

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sounds = soundsRef.current ?? (soundsRef.current = makeSounds());

    let raf = 0;
    let last = performance.now();
    let disposed = false;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.max(280, rect.width);
      const h = Math.max(300, Math.min(470, Math.round(w * 0.9)));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const prev = layoutRef.current;
      const layout = computeLayout(w, h);
      layoutRef.current = layout;
      const ball = ballRef.current;
      if (!prev || ball.state === 'rest') placeBallAtStart(ball, layout);
      else {
        ball.x = Math.min(Math.max(ball.r, ball.x), w - ball.r);
        ball.y = Math.min(ball.y, layout.floorY - ball.r);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const spawnConfetti = (layout: Layout) => {
      const cx = (layout.rimX0 + layout.rimX1) / 2;
      for (let i = 0; i < 80; i++) {
        const angle = Math.PI * (0.15 + Math.random() * 0.7);
        const speed = 180 + Math.random() * 420;
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * (layout.rimX1 - layout.rimX0),
          y: layout.rimY,
          vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1) * 0.6,
          vy: -Math.abs(Math.sin(angle)) * speed,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 12,
          color: CONFETTI[i % CONFETTI.length],
          life: 0.9 + Math.random() * 0.7,
        });
      }
    };

    const declareScore = (layout: Layout) => {
      const ball = ballRef.current;
      ball.state = 'scored';
      scoredRef.current = true;
      netKickRef.current = 1;
      ball.vx *= 0.4;
      ball.vy = Math.max(140, ball.vy * 0.6);
      spawnConfetti(layout);
      sounds.score();
      setStatus('Nothing but net! Mixing your colors…');
      scoreTimerRef.current = window.setTimeout(() => onScoreRef.current(), SCORE_DELAY_MS);
    };

    const step = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
      last = now;
      const layout = layoutRef.current;
      if (!layout) {
        raf = requestAnimationFrame(step);
        return;
      }
      const ball = ballRef.current;

      // Keyboard nudging (arrow keys move the ball on the floor).
      if (ball.state === 'rest' && (keysRef.current.left || keysRef.current.right)) {
        const dir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        ball.x = Math.min(Math.max(ball.r + 4, ball.x + dir * 320 * dt), layout.w - ball.r - 4);
      }

      const prevY = ball.y;

      if (ball.state === 'fly' || ball.state === 'scored') {
        ball.vy += GRAVITY * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        // Files tumble far more gently than balls.
        ball.angle += (ball.vx / Math.max(20, ball.r)) * dt * 0.45;

        // Walls + ceiling.
        if (ball.x - ball.r < 0) {
          ball.x = ball.r;
          ball.vx = Math.abs(ball.vx) * 0.6;
        } else if (ball.x + ball.r > layout.w) {
          ball.x = layout.w - ball.r;
          ball.vx = -Math.abs(ball.vx) * 0.6;
        }
        if (ball.y - ball.r < 0) {
          ball.y = ball.r;
          ball.vy = Math.abs(ball.vy) * 0.5;
        }

        // Backboard: bounce off its underside and side edges.
        const bb = layout;
        const nearBoardX = ball.x + ball.r > bb.boardX && ball.x - ball.r < bb.boardX + bb.boardW;
        if (ball.vy < 0 && nearBoardX && prevY + ball.r <= bb.boardY + bb.boardH && ball.y + ball.r > bb.boardY + bb.boardH) {
          ball.y = bb.boardY + bb.boardH - ball.r;
          ball.vy = Math.abs(ball.vy) * 0.45;
          sounds.board();
        }

        // Rim ends: circle colliders.
        for (const rimX of [layout.rimX0, layout.rimX1]) {
          const dx = ball.x - rimX;
          const dy = ball.y - layout.rimY;
          const dist = Math.hypot(dx, dy);
          const minDist = ball.r + 4.5;
          if (dist > 0 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = rimX + nx * minDist;
            ball.y = layout.rimY + ny * minDist;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - (1 + RIM_RESTITUTION) * dot * nx) * 0.86;
            ball.vy = (ball.vy - (1 + RIM_RESTITUTION) * dot * ny) * 0.86;
            sounds.rim();
          }
        }

        // Gentle magnet: steer near-straight drops toward the rim center.
        if (ball.state === 'fly' && ball.vy > 0 && prevY <= layout.rimY && ball.y > layout.rimY - MAGNET_RADIUS) {
          const rimCx = (layout.rimX0 + layout.rimX1) / 2;
          if (Math.abs(ball.x - rimCx) < 34) {
            ball.vx += (rimCx - ball.x) * 7 * dt;
          }
        }

        // Score check: rim plane crossed downward, ball mostly inside.
        if (
          ball.state === 'fly' &&
          prevY < layout.rimY &&
          ball.y >= layout.rimY &&
          ball.vy > 0 &&
          ball.x > layout.rimX0 + ball.r * 0.3 &&
          ball.x < layout.rimX1 - ball.r * 0.3
        ) {
          declareScore(layout);
        }

        // Floor.
        if (ball.y + ball.r > layout.floorY) {
          ball.y = layout.floorY - ball.r;
          if (Math.abs(ball.vy) > 90) {
            ball.vy = -ball.vy * RESTITUTION;
            ball.vx *= 0.92;
            ball.angle *= 0.8;
            sounds.bounce();
          } else {
            ball.vy = 0;
            ball.vx *= 0.6;
          }
        }

        // Missed shots come to rest → reset for another try.
        if (ball.state === 'fly') {
          const speed = Math.hypot(ball.vx, ball.vy);
          if (ball.y + ball.r >= layout.floorY - 1 && speed < 60) {
            ball.restTimer += dt;
            if (ball.restTimer > 0.25) {
              placeBallAtStart(ball, layout);
              setStatus(MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)]);
            }
          } else {
            ball.restTimer = 0;
          }
          trailRef.current.push({ x: ball.x, y: ball.y, life: 0.42 });
        }
      } else if (ball.state === 'rest') {
        // Idle bob so the file feels alive.
        ball.y = layout.floorY - ball.r + Math.sin(now / 480) * 1.5;
      }
      if (ball.state === 'rest' || ball.state === 'drag') {
        // A set-down card should sit flat, not keep its flight tilt.
        ball.angle += (0 - ball.angle) * Math.min(1, dt * 10);
        if (Math.abs(ball.angle) < 0.004) ball.angle = 0;
      }

      // Decay effects.
      netKickRef.current = Math.max(0, netKickRef.current - dt * 1.6);
      for (const dot of trailRef.current) dot.life -= dt;
      trailRef.current = trailRef.current.filter((dot) => dot.life > 0);
      for (const p of particlesRef.current) {
        p.vy += GRAVITY * 0.55 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= dt;
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0 && p.y < layout.h + 40);

      draw(
        ctx,
        layout,
        ball,
        ballImgRef.current,
        hasPhoto,
        fileName,
        trailRef.current,
        particlesRef.current,
        netKickRef.current,
        now,
        dragRef.current,
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [computeLayout, placeBallAtStart, hasPhoto, fileName]);

  /* ------------------------------------------------------------- drawing */

  // (draw is defined below the loop so the loop body stays readable)

  /* ------------------------------------------------------------ pointers */

  // Shared drag logic used by both the canvas handlers and window-level
  // fallback listeners, so a drag that leaves the court still launches.
  const winMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const winUpRef = useRef<((e: PointerEvent) => void) | null>(null);

  const detachWindowListeners = useCallback(() => {
    if (winMoveRef.current) window.removeEventListener('pointermove', winMoveRef.current);
    if (winUpRef.current) window.removeEventListener('pointerup', winUpRef.current);
    winMoveRef.current = null;
    winUpRef.current = null;
  }, []);

  useEffect(() => detachWindowListeners, [detachWindowListeners]);

  const handleMove = useCallback((clientX: number, clientY: number, timeStamp: number) => {
    const drag = dragRef.current;
    const layout = layoutRef.current;
    const canvas = canvasRef.current;
    if (!drag || !layout || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ball = ballRef.current;
    ball.x = Math.min(Math.max(ball.r, x), layout.w - ball.r);
    ball.y = Math.min(Math.max(ball.r, y), layout.floorY - ball.r);
    drag.lastX = x;
    drag.lastY = y;
    drag.samples.push({ t: timeStamp, x, y });
    while (drag.samples.length > 8) drag.samples.shift();
  }, []);

  const handleUp = useCallback(
    (clientX: number, clientY: number, timeStamp: number) => {
      detachWindowListeners();
      const drag = dragRef.current;
      dragRef.current = null;
      const layout = layoutRef.current;
      const canvas = canvasRef.current;
      if (!drag || !layout || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const ball = ballRef.current;
      if (ball.state !== 'drag') return;
      drag.samples.push({ t: timeStamp, x, y });

      // Same estimator the dotted aim guide used while dragging — the release
      // always produces the arc the player saw.
      const estimate = estimateLaunch(
        drag.samples,
        { x: drag.startX, y: drag.startY },
        { x, y },
        timeStamp,
      );
      if (!estimate.launch) {
        ball.state = 'rest';
        setStatus('File placed — flick it toward the hoop to shoot.');
        return;
      }
      ball.vx = estimate.vx;
      ball.vy = estimate.vy;
      ball.state = 'fly';
      ball.restTimer = 0;
      soundsRef.current?.shoot();
      setStatus('It’s in the air…');
    },
    [detachWindowListeners],
  );

  const ballAt = (clientX: number, clientY: number): boolean => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout) return false;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ball = ballRef.current;
    // The grab target is the file card, not a circle.
    const card = cardSize(ball.r);
    return (
      Math.abs(x - ball.x) <= card.w / 2 + 12 &&
      Math.abs(y - ball.y) <= card.h / 2 + 12
    );
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (scoredRef.current) return;
    const layout = layoutRef.current;
    if (!layout) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ball = ballRef.current;
    if (ball.state === 'rest' && ballAt(event.clientX, event.clientY)) {
      ball.state = 'drag';
      ball.vx = 0;
      ball.vy = 0;
      dragRef.current = {
        startX: x,
        startY: y,
        lastX: x,
        lastY: y,
        samples: [{ t: event.timeStamp, x, y }],
      };
      setStatus('Aim with the dotted guide — release to shoot.');
      // Window-level fallbacks: drags that leave the court still count.
      detachWindowListeners();
      const winMove = (e: PointerEvent) => handleMove(e.clientX, e.clientY, e.timeStamp);
      const winUp = (e: PointerEvent) => handleUp(e.clientX, e.clientY, e.timeStamp);
      winMoveRef.current = winMove;
      winUpRef.current = winUp;
      window.addEventListener('pointermove', winMove);
      window.addEventListener('pointerup', winUp);
    } else if (ball.state === 'rest' && x >= layout.boardX && x <= layout.boardX + layout.boardW && y >= layout.boardY && y <= layout.boardY + layout.boardH) {
      onPickFile(); // the dashed board doubles as a pick-another-photo button
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    handleMove(event.clientX, event.clientY, event.timeStamp);
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    handleUp(event.clientX, event.clientY, event.timeStamp);
  };

  /* ------------------------------------------------------------ keyboard */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Don't hijack Space/Enter while a real control has focus (the
      // Continue button would otherwise fire AND the ball would shoot).
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return;
      const ball = ballRef.current;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        keysRef.current[event.key === 'ArrowLeft' ? 'left' : 'right'] = true;
        event.preventDefault();
      } else if ((event.key === ' ' || event.key === 'Enter') && ball.state === 'rest' && !scoredRef.current) {
        const layout = layoutRef.current;
        if (!layout) return;
        const rimCx = (layout.rimX0 + layout.rimX1) / 2;
        const flight = 0.78;
        const jitter = (Math.random() - 0.5) * 0.16;
        ball.vx = ((rimCx - ball.x) / flight) * (1 + jitter);
        ball.vy = ((layout.rimY - ball.y - 0.5 * GRAVITY * flight * flight) / flight) * (1 + jitter * 0.6);
        ball.state = 'fly';
        ball.restTimer = 0;
        soundsRef.current?.shoot();
        setStatus('It’s in the air…');
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') keysRef.current.left = false;
      if (event.key === 'ArrowRight') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /* ---------------------------------------------------------- file drops */

  const [dropHint, setDropHint] = useState(false);
  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropHint(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onDropFile(file);
  };

  return (
    <div className={`hoop${dropHint ? ' hoop--drophint' : ''}`}>
      <div className="hoop__head">
        <p className="hoop__tagline">
          Drag and drop, or take the shot. Make the goal and your picture becomes a coloring page.
        </p>
        <span className="hoop__badge" aria-label={`${importsCount} pictures saved in this browser`}>
          Uploaded <strong>{importsCount}</strong>
        </span>
      </div>

      <div
        ref={wrapRef}
        className="hoop__court"
        onDragOver={(event) => {
          event.preventDefault();
          setDropHint(true);
        }}
        onDragLeave={() => setDropHint(false)}
        onDrop={onDrop}
      >
        <canvas
          ref={canvasRef}
          className="hoop__canvas"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>

      <p className="hoop__status" aria-live="polite">
        {status}
        <span className="hoop__keys">
          {hasPhoto ? `${fileName} · ` : ''}drag to aim · release to shoot · Space shoots · ←/→ move
        </span>
      </p>

      <div className="modal__actions hoop__actions">
        <button type="button" className="hoop__skip" onClick={onContinue}>
          Continue — skip the game →
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- painter */

type DragState = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  samples: { t: number; x: number; y: number }[];
};

function draw(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  ball: Ball,
  ballImg: HTMLImageElement | null,
  hasPhoto: boolean,
  fileName: string,
  trail: TrailDot[],
  particles: Particle[],
  netKick: number,
  now: number,
  drag: DragState | null,
) {
  const { w, h, boardX, boardY, boardW, boardH, rimY, rimX0, rimX1, floorY } = layout;

  ctx.clearRect(0, 0, w, h);

  // Court backdrop: clean white board with a warm floor.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#f7f0e4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(67, 54, 74, 0.1)';
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.fillStyle = 'rgba(232, 135, 95, 0.12)';
  ctx.beginPath();
  ctx.ellipse(w / 2, floorY, w * 0.42, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trail dots.
  for (const dot of trail) {
    ctx.fillStyle = `rgba(232, 135, 95, ${0.3 * dot.life})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, ball.r * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aim guide: dotted trajectory while dragging — the exact arc the release
  // will produce (same estimator as handleUp), so slow careful drags aim too.
  if (drag && ball.state === 'drag') {
    const estimate = estimateLaunch(
      drag.samples,
      { x: drag.startX, y: drag.startY },
      { x: drag.lastX, y: drag.lastY },
      now,
    );
    if (estimate.launch) {
      const dot = { x: ball.x, y: ball.y };
      const vel = { vx: estimate.vx, vy: estimate.vy };
      const stepSize = 1 / 60;
      for (let i = 1; i <= 44; i++) {
        vel.vy += GRAVITY * stepSize;
        dot.x += vel.vx * stepSize;
        dot.y += vel.vy * stepSize;
        if (dot.y > floorY - 4) break;
        if (i % 3 === 0) {
          const t = i / 44;
          ctx.fillStyle = `rgba(176, 79, 44, ${0.55 * (1 - t) + 0.12})`;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 3.4 - 1.6 * t, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Short direction stub off the card so the throw reads instantly.
      const speed = Math.hypot(estimate.vx, estimate.vy);
      const ux = estimate.vx / speed;
      const uy = estimate.vy / speed;
      ctx.strokeStyle = 'rgba(176, 79, 44, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ball.x + ux * (ball.r + 5), ball.y + uy * (ball.r + 5));
      ctx.lineTo(ball.x + ux * (ball.r + 17), ball.y + uy * (ball.r + 17));
      ctx.stroke();
    }
  }

  // Backboard panel (the dashed "Drop files here" card).
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = BOARD_DASH;
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  roundRect(ctx, boardX, boardY, boardW, boardH, 14);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  // Upload glyph.
  const cx = w / 2;
  const glyphY = boardY + boardH * 0.34;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, glyphY - 16);
  ctx.lineTo(cx, glyphY + 6);
  ctx.moveTo(cx - 8, glyphY - 8);
  ctx.lineTo(cx, glyphY - 17);
  ctx.lineTo(cx + 8, glyphY - 8);
  ctx.moveTo(cx - 14, glyphY + 12);
  ctx.lineTo(cx - 14, glyphY + 16);
  ctx.moveTo(cx + 14, glyphY + 12);
  ctx.lineTo(cx + 14, glyphY + 16);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Drop files here', cx, boardY + boardH * 0.62);
  ctx.fillStyle = INK_MUTED;
  ctx.font = '400 12px system-ui, sans-serif';
  ctx.fillText('or take the shot', cx, boardY + boardH * 0.62 + 18);
  ctx.restore();

  // Rim + net.
  const rimCx = (rimX0 + rimX1) / 2;
  const kick = netKick * netKick;
  const netBottom = rimY + 34 + kick * 9;
  const sway = kick > 0 ? Math.sin(now / 40) * kick * 5 : 0;
  ctx.strokeStyle = 'rgba(119, 102, 127, 0.75)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const topX = rimX0 + (rimX1 - rimX0) * t;
    const bottomX = rimCx + (topX - rimCx) * 0.42 + sway;
    ctx.moveTo(topX, rimY);
    ctx.quadraticCurveTo((topX + bottomX) / 2 + sway * 0.6, (rimY + netBottom) / 2, bottomX, netBottom);
  }
  for (const frac of [0.35, 0.7]) {
    const y = rimY + (netBottom - rimY) * frac;
    const half = ((rimX1 - rimX0) / 2) * (1 - 0.58 * frac);
    ctx.moveTo(rimCx - half, y);
    ctx.quadraticCurveTo(rimCx + sway * frac, y + 4, rimCx + half, y);
  }
  ctx.stroke();

  // Rim bar + hooks.
  ctx.strokeStyle = RIM_COLOR;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rimX0 - 4, rimY);
  ctx.lineTo(rimX1 + 4, rimY);
  ctx.stroke();
  ctx.fillStyle = RIM_DARK;
  ctx.fillRect(rimX0 - 6, rimY - 5, 8, 10);
  ctx.fillRect(rimX1 - 2, rimY - 5, 8, 10);
  // Mount plate to the board.
  ctx.fillStyle = RIM_DARK;
  ctx.fillRect(rimCx - 12, rimY - 10, 24, 8);

  // Ball shadow.
  const shadowScale = Math.max(0.35, 1 - (floorY - ball.y) / 320);
  ctx.fillStyle = `rgba(67, 54, 74, ${0.16 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(ball.x, floorY + 3, ball.r * shadowScale, ball.r * 0.3 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // The file itself: the player's photo mounted on a white file card — the
  // "board" from the reference design, picture at the top, white background
  // everywhere (fallback: the same card with an image placeholder glyph).
  const card = cardSize(ball.r);
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.angle);
  ctx.shadowColor = 'rgba(67, 54, 74, 0.3)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 3;
  fileCardPath(ctx, card);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(67, 54, 74, 0.35)';
  ctx.lineWidth = 1.4;
  fileCardPath(ctx, card);
  ctx.stroke();

  // Folded dog-ear corner (the classic file-icon cue).
  ctx.beginPath();
  ctx.moveTo(card.w / 2 - card.fold, -card.h / 2);
  ctx.lineTo(card.w / 2 - card.fold, -card.h / 2 + card.fold);
  ctx.lineTo(card.w / 2, -card.h / 2 + card.fold);
  ctx.closePath();
  ctx.fillStyle = '#efe6d4';
  ctx.fill();
  ctx.strokeStyle = 'rgba(67, 54, 74, 0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Picture slot at the top of the board: white background, contain-fit.
  const slotW = card.w - card.pad * 2;
  const slotH = card.h * 0.52;
  const slotX = -card.w / 2 + card.pad;
  const slotY = -card.h / 2 + card.pad;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(slotX, slotY, slotW, slotH);
  if (ballImg && hasPhoto) {
    const scale = Math.min(slotW / ballImg.naturalWidth, slotH / ballImg.naturalHeight);
    const dw = ballImg.naturalWidth * scale;
    const dh = ballImg.naturalHeight * scale;
    ctx.drawImage(ballImg, slotX + (slotW - dw) / 2, slotY + (slotH - dh) / 2, dw, dh);
  } else {
    // Placeholder glyph: sun + mountains, matching the IconImage icon.
    ctx.strokeStyle = 'rgba(119, 102, 127, 0.7)';
    ctx.lineWidth = 1.4;
    const gy = slotY + slotH / 2;
    ctx.beginPath();
    ctx.arc(-slotW * 0.22, gy - slotH * 0.16, slotH * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-slotW * 0.36, gy + slotH * 0.26);
    ctx.lineTo(-slotW * 0.08, gy - slotH * 0.1);
    ctx.lineTo(slotW * 0.16, gy + slotH * 0.26);
    ctx.moveTo(slotW * 0.02, gy + slotH * 0.26);
    ctx.lineTo(slotW * 0.2, gy);
    ctx.lineTo(slotW * 0.36, gy + slotH * 0.26);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(67, 54, 74, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(slotX, slotY, slotW, slotH);

  // A few "document" lines under the picture.
  const barH = Math.max(2.4, card.h * 0.05);
  [0.62, 0.44, 0.3].forEach((frac, i) => {
    const barW = slotW * frac;
    ctx.fillStyle = `rgba(119, 102, 127, ${0.5 - i * 0.12})`;
    roundRect(ctx, slotX, slotY + slotH + card.pad * (0.9 + i * 1.6), barW, barH, barH / 2);
    ctx.fill();
  });
  ctx.restore();

  // File-name chip under the ball.
  if (fileName) {
    ctx.fillStyle = 'rgba(255, 251, 242, 0.92)';
    ctx.font = '500 11px system-ui, sans-serif';
    const label = fileName.length > 26 ? `${fileName.slice(0, 25)}…` : fileName;
    const textW = ctx.measureText(label).width;
    roundRect(ctx, ball.x - textW / 2 - 8, ball.y + ball.r + 8, textW + 16, 20, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(67, 54, 74, 0.25)';
    ctx.lineWidth = 1;
    roundRect(ctx, ball.x - textW / 2 - 8, ball.y + ball.r + 8, textW + 16, 20, 10);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ball.x, ball.y + ball.r + 18);
    ctx.textBaseline = 'alphabetic';
  }

  // Confetti.
  for (const p of particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(-4, -2.5, 8, 5);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Score banner.
  if (ball.state === 'scored') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '16px "Press Start 2P", "VT323", monospace';
    ctx.fillStyle = RIM_DARK;
    ctx.fillText('SCORE!', cx, boardY + boardH + 66);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** File-card silhouette: portrait rounded rect with the top-right corner cut
 * for the folded dog-ear — the classic file icon shape. */
function fileCardPath(
  ctx: CanvasRenderingContext2D,
  card: { w: number; h: number; fold: number },
) {
  const x0 = -card.w / 2;
  const y0 = -card.h / 2;
  const x1 = card.w / 2;
  const y1 = card.h / 2;
  const r = Math.max(3, card.w * 0.1);
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x1 - card.fold, y0);
  ctx.lineTo(x1, y0 + card.fold);
  ctx.lineTo(x1, y1 - r);
  ctx.arcTo(x1, y1, x1 - r, y1, r);
  ctx.lineTo(x0 + r, y1);
  ctx.arcTo(x0, y1, x0, y1 - r, r);
  ctx.lineTo(x0, y0 + r);
  ctx.arcTo(x0, y0, x0 + r, y0, r);
  ctx.closePath();
}
