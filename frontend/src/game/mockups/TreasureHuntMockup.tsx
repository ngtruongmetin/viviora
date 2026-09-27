import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Maximize2,
  Minimize2,
  MousePointer2,
  Swords,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './treasure-hunt.css';

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';
type Feedback = 'correct' | 'wrong' | null;
export type TreasureHuntQuestion = {
  id?: string;
  text: string;
  answer?: boolean;
  explanation?: string | null;
};
type MonsterState = { position: Point; spriteIndex: number; defeated: boolean; attempted: boolean };

const ASSET = '/game-assets/treasure-hunt';
const WORLD_WIDTH = 1448;
const WORLD_ASPECT = 1086 / 1448;
const WORLD_ZOOM = 1.5;
const PLAYER_SPEED = 15;
const PLAYER_RADIUS = 0.7;
const ENCOUNTER_RADIUS = 3.2;
const COLLISION_COLUMNS = 48;
const COLLISION_ROWS = 36;
const collisionRows = [
  '################################################',
  '################################################',
  '################################################',
  '####.......................................#####',
  '####..........####.##########.####..####....####',
  '####.........#####################..####.....###',
  '###..........#####################..####.....###',
  '###...........###..##########.####..........####',
  '####..........###..##########..###..........####',
  '###.....########...##########..#########....####',
  '####....########...............#########.....###',
  '###.....########.....######....#########....###',
  '###.....########.....######....#########....###',
  '####....########.....######....#########....###',
  '####....########.....######....#########....###',
  '###..........................................###',
  '###..........................................###',
  '###.....############.............##..###....####',
  '##......############....####.....#######.....###',
  '###.....############....####.....#######.....###',
  '###.....############....####.....#######.....###',
  '###.....############....####.####............###',
  '##......############....####.####............###',
  '##......................####.###########.....###',
  '####....................####.###########.....###',
  '####..............####..####....########.....###',
  '###...............####..####....########.....###',
  '####.....########.####..####....########.....###',
  '###......########...............########.....###',
  '###......########...............########.....###',
  '###......########............................###',
  '####........................................####',
  '######.....................................#####',
  '#########.#####....####################...######',
  '################################################',
  '################################################',
];
const defaultQuestions: TreasureHuntQuestion[] = [
  { text: 'Trái Đất quay quanh Mặt Trời.', answer: true },
  { text: 'Nước đóng băng ở 0°C trong điều kiện thường.', answer: true },
  { text: 'Mặt Trăng là một ngôi sao tự phát sáng.', answer: false },
  { text: 'Việt Nam nằm ở châu Á.', answer: true },
  { text: '2 + 2 = 5.', answer: false },
];
const directionFrames: Record<Direction, string[]> = {
  up: ['forward1.png', 'forward2.png'],
  down: ['down1.png', 'down2.png'],
  left: ['move-left1.png', 'move-left2.png'],
  right: ['move-right1.png', 'move-right2.png'],
};

function isBlocked(x: number, y: number) {
  if (x < 0 || x > 100 || y < 0 || y > 100) return true;
  const column = Math.min(
    COLLISION_COLUMNS - 1,
    Math.max(0, Math.floor((x / 100) * COLLISION_COLUMNS)),
  );
  const row = Math.min(COLLISION_ROWS - 1, Math.max(0, Math.floor((y / 100) * COLLISION_ROWS)));
  return collisionRows[row][column] === '#';
}
function canStand(x: number, y: number) {
  return (
    !isBlocked(x - PLAYER_RADIUS, y) &&
    !isBlocked(x + PLAYER_RADIUS, y) &&
    !isBlocked(x - PLAYER_RADIUS, y - 1.6) &&
    !isBlocked(x + PLAYER_RADIUS, y - 1.6)
  );
}
function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, (a.y - b.y) * WORLD_ASPECT);
}
function createWalkablePosition(existing: Point[] = []): Point {
  const separation = Math.max(4.5, 10 - existing.length * 0.3);
  let best: Point = { x: 52, y: 48 };
  let bestDistance = -1;
  for (let attempt = 0; attempt < 1200; attempt += 1) {
    const candidate = { x: 8 + Math.random() * 84, y: 12 + Math.random() * 76 };
    if (!canStand(candidate.x, candidate.y)) continue;
    const nearest = existing.length
      ? Math.min(...existing.map((point) => distance(point, candidate)))
      : Infinity;
    if (nearest > bestDistance) {
      best = candidate;
      bestDistance = nearest;
    }
    if (nearest >= separation) return candidate;
  }
  return best;
}
function createMonsterStates(questionList: TreasureHuntQuestion[]): MonsterState[] {
  const positions: Point[] = [];
  return questionList.map(() => {
    const position = createWalkablePosition(positions);
    positions.push(position);
    return {
      position,
      spriteIndex: Math.floor(Math.random() * 16),
      defeated: false,
      attempted: false,
    };
  });
}
function MonsterSprite({
  index,
  className = '',
  size,
}: {
  index: number;
  className?: string;
  size?: number;
}) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return (
    <div
      className={`th-monster-sprite ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${ASSET}/monsters.png)`,
        backgroundSize: '400% 400%',
        backgroundPosition: `${(column / 3) * 100}% ${(row / 3) * 100}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

export function TreasureHuntMockup({
  questionSet = defaultQuestions,
  onAnswer,
  onComplete,
  onFinish,
}: {
  questionSet?: TreasureHuntQuestion[];
  onAnswer?: (
    question: TreasureHuntQuestion,
    selected: boolean,
  ) => Promise<{ isCorrect: boolean; pointsAwarded?: number; explanation?: string | null }>;
  onComplete?: () => void;
  onFinish?: () => void;
}) {
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Point>({ x: 15.625, y: 18.0556 });
  const targetRef = useRef<Point | null>(null);
  const keysRef = useRef(new Set<Direction>());
  const lockedRef = useRef(false);
  const activeStageRef = useRef<number | null>(null);
  const nearbyRef = useRef<number | null>(null);
  const pointerStartRef = useRef<Point | null>(null);
  const pointerDraggedRef = useRef(false);
  const [pos, setPos] = useState(posRef.current);
  const [viewport, setViewport] = useState({ width: 900, height: 480 });
  const [direction, setDirection] = useState<Direction>('down');
  const [moving, setMoving] = useState(false);
  const [frame, setFrame] = useState(0);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [selected, setSelected] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [answerExplanation, setAnswerExplanation] = useState<string | null>(null);
  const [monsters, setMonsters] = useState<MonsterState[]>(() => createMonsterStates(questionSet));
  const [chestPosition] = useState<Point>(() => createWalkablePosition());
  const [chestOpen, setChestOpen] = useState(false);
  const [ripple, setRipple] = useState<Point | null>(null);
  const [bgmOn, setBgmOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const killSoundRef = useRef<HTMLAudioElement | null>(null);
  const chaseSoundRef = useRef<HTMLAudioElement | null>(null);
  const isMobile = viewport.width < 600;
  const worldWidth = Math.max(WORLD_WIDTH * (isMobile ? 0.9 : 1) * WORLD_ZOOM, viewport.width);
  const worldHeight = worldWidth * WORLD_ASPECT;
  const completedCount = monsters.filter((monster) => monster.defeated).length;
  const allPassed = completedCount === questionSet.length;

  useEffect(() => {
    const bgMusic = new Audio(`${ASSET}/bgmusic.mp3`);
    bgMusic.loop = true;
    bgMusic.volume = 0.28;
    const killSound = new Audio(`${ASSET}/kill.mp3`);
    const chaseSound = new Audio(`${ASSET}/chase.mp3`);
    killSound.volume = 0.8;
    chaseSound.volume = 0.8;
    bgMusicRef.current = bgMusic;
    killSoundRef.current = killSound;
    chaseSoundRef.current = chaseSound;

    const resumeMusic = () => {
      if (bgmOn) void bgMusic.play().catch(() => undefined);
    };
    document.addEventListener('pointerdown', resumeMusic, { once: true });
    document.addEventListener('keydown', resumeMusic, { once: true });
    void bgMusic.play().catch(() => undefined);
    return () => {
      document.removeEventListener('pointerdown', resumeMusic);
      document.removeEventListener('keydown', resumeMusic);
      bgMusic.pause();
      killSound.pause();
      chaseSound.pause();
      bgMusicRef.current = null;
      killSoundRef.current = null;
      chaseSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const bgMusic = bgMusicRef.current;
    if (!bgMusic) return;
    if (bgmOn) void bgMusic.play().catch(() => undefined);
    else bgMusic.pause();
  }, [bgmOn]);

  useEffect(() => {
    const update = () => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (rect) setViewport({ width: rect.width, height: rect.height });
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);
  const finishEncounter = useCallback(
    (index: number, defeated: boolean) => {
      setMonsters((current) =>
        current.map((monster, monsterIndex) => {
          if (monsterIndex !== index) return monster;
          if (defeated) return { ...monster, defeated: true };
          const occupied = current
            .filter((item, itemIndex) => itemIndex !== index && !item.defeated)
            .map((item) => item.position);
          return {
            ...monster,
            attempted: true,
            position: createWalkablePosition([...occupied, chestPosition, posRef.current]),
          };
        }),
      );
      targetRef.current = null;
      keysRef.current.clear();
      nearbyRef.current = null;
      setActiveStage(null);
      setSelected(null);
      setFeedback(null);
    },
    [chestPosition],
  );
  useEffect(() => {
    const map: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right',
    };
    const down = (event: KeyboardEvent) => {
      const next = map[event.code];
      if (!next) return;
      if (activeStageRef.current !== null || lockedRef.current) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      keysRef.current.add(next);
      targetRef.current = null;
    };
    const up = (event: KeyboardEvent) => {
      const next = map[event.code];
      if (next) keysRef.current.delete(next);
    };
    const clear = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);
  const worldPointFromEvent = useCallback((event: React.PointerEvent) => {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }, []);
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.th-hud')) return;
      if (lockedRef.current) return;
      const next = worldPointFromEvent(event);
      if (!next) return;
      targetRef.current = next;
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      pointerDraggedRef.current = false;
      setRipple({ x: event.clientX, y: event.clientY });
      window.setTimeout(() => setRipple(null), 520);
    },
    [worldPointFromEvent],
  );
  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.th-hud')) return;
      if (event.buttons === 0 || lockedRef.current) return;
      if (
        pointerStartRef.current &&
        Math.hypot(
          event.clientX - pointerStartRef.current.x,
          event.clientY - pointerStartRef.current.y,
        ) > 6
      )
        pointerDraggedRef.current = true;
      const next = worldPointFromEvent(event);
      if (next) targetRef.current = next;
    },
    [worldPointFromEvent],
  );
  useEffect(() => {
    let raf = 0;
    let previous = performance.now();
    let animationClock = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (lockedRef.current) {
        setMoving(false);
        return;
      }
      if (allPassed && distance(posRef.current, chestPosition) <= ENCOUNTER_RADIUS) {
        keysRef.current.clear();
        targetRef.current = null;
        setMoving(false);
        lockedRef.current = true;
        setChestOpen(true);
        onComplete?.();
        return;
      }
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (keys.size) {
        if (keys.has('left')) dx -= 1;
        if (keys.has('right')) dx += 1;
        if (keys.has('up')) dy -= 1;
        if (keys.has('down')) dy += 1;
      } else if (targetRef.current) {
        const target = targetRef.current;
        const current = posRef.current;
        dx = target.x - current.x;
        dy = (target.y - current.y) * WORLD_ASPECT;
        const length = Math.hypot(dx, dy);
        if (length > 0.6) {
          dx /= length;
          dy /= length;
        } else {
          targetRef.current = null;
          dx = 0;
          dy = 0;
        }
      }
      const length = Math.hypot(dx, dy);
      if (!length) {
        setMoving(false);
        return;
      }
      dx /= length;
      dy /= length;
      const current = posRef.current;
      const moveX = dx * PLAYER_SPEED * delta;
      const moveY = (dy * PLAYER_SPEED * delta) / WORLD_ASPECT;
      let nextX = current.x;
      let nextY = current.y;
      if (canStand(current.x + moveX, current.y)) nextX = current.x + moveX;
      if (canStand(nextX, current.y + moveY)) nextY = current.y + moveY;
      nextX = Math.max(0, Math.min(100, nextX));
      nextY = Math.max(0, Math.min(100, nextY));
      if (nextX === current.x && nextY === current.y) {
        setMoving(false);
        return;
      }
      posRef.current = { x: nextX, y: nextY };
      setPos(posRef.current);
      setDirection(
        Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down',
      );
      setMoving(true);
      animationClock += delta * 1000;
      if (animationClock > 130) {
        animationClock = 0;
        setFrame((value) => value + 1);
      }
      const encounter = monsters.findIndex(
        (monster) =>
          !monster.defeated && distance(posRef.current, monster.position) <= ENCOUNTER_RADIUS,
      );
      if (encounter >= 0 && nearbyRef.current !== encounter) {
        nearbyRef.current = encounter;
        keysRef.current.clear();
        lockedRef.current = true;
        setActiveStage(encounter);
        setSelected(null);
        setFeedback(null);
        targetRef.current = null;
      }
      if (encounter < 0) nearbyRef.current = null;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [allPassed, chestPosition, monsters, onComplete]);
  const camera = useMemo(() => {
    const playerX = (pos.x / 100) * worldWidth;
    const playerY = (pos.y / 100) * worldHeight;
    return {
      x:
        worldWidth <= viewport.width
          ? (viewport.width - worldWidth) / 2
          : Math.max(viewport.width - worldWidth, Math.min(0, viewport.width / 2 - playerX)),
      y:
        worldHeight <= viewport.height
          ? (viewport.height - worldHeight) / 2
          : Math.max(viewport.height - worldHeight, Math.min(0, viewport.height / 2 - playerY)),
    };
  }, [pos, viewport, worldWidth, worldHeight]);
  useEffect(() => {
    activeStageRef.current = activeStage;
    lockedRef.current = activeStage !== null || feedback !== null || chestOpen;
  }, [activeStage, feedback, chestOpen]);
  const flee = () => {
    if (activeStage !== null && feedback === null) finishEncounter(activeStage, false);
  };
  const answerQuestion = () => {
    if (activeStage === null || selected === null || feedback !== null) return;
    const index = activeStage;
    void (async () => {
      const question = questionSet[index];
      const result = onAnswer
        ? await onAnswer(question, selected)
        : {
            isCorrect: selected === question.answer,
            pointsAwarded: selected === question.answer ? 1 : 0,
          };
      setAnswerExplanation(result.explanation ?? question.explanation ?? null);
      const sound = result.isCorrect ? killSoundRef.current : chaseSoundRef.current;
      if (bgmOn && sound) {
        sound.currentTime = 0;
        void sound.play().catch(() => undefined);
      }
      setFeedback(result.isCorrect ? 'correct' : 'wrong');
    })();
  };
  const continueEncounter = () => {
    if (activeStage === null || feedback === null) return;
    finishEncounter(activeStage, feedback === 'correct');
  };
  const toggleFullscreen = async () => {
    const target = document.querySelector('.th-game') as HTMLElement | null;
    if (!document.fullscreenElement) await target?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const currentQuestion = activeStage === null ? null : questionSet[activeStage];
  const playerFrames = directionFrames[direction];
  return (
    <main className="th-game">
      <div className="th-play-row">
        <section
          ref={viewportRef}
          className="th-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            if (pointerDraggedRef.current) targetRef.current = null;
            pointerStartRef.current = null;
          }}
          onPointerLeave={() => {
            if (pointerDraggedRef.current) targetRef.current = null;
            pointerStartRef.current = null;
          }}
        >
          <div
            ref={worldRef}
            className="th-world"
            style={{
              width: worldWidth,
              height: worldHeight,
              transform: `translate3d(${Math.round(camera.x)}px, ${Math.round(camera.y)}px, 0)`,
            }}
          >
            <div className="th-world-tint" />
            {monsters.map((monster, index) =>
              monster.defeated ? null : (
                <div
                  key={index}
                  className={`th-station ${monster.attempted ? 'attempted' : ''}`}
                  style={{
                    left: `${Math.round((monster.position.x / 100) * worldWidth)}px`,
                    top: `${Math.round((monster.position.y / 100) * worldHeight)}px`,
                    zIndex: 10 + Math.round(monster.position.y),
                  }}
                >
                  <div
                    className="th-ring"
                    style={{ width: worldWidth * 0.05, height: worldWidth * 0.05 }}
                  />
                  <div className="th-shadow" />
                  <div className="th-station-icon">
                    <MonsterSprite
                      index={monster.spriteIndex}
                      size={Math.max(1, Math.round(worldWidth * 0.0287))}
                    />
                  </div>
                  <div className={`th-tag ${monster.attempted ? 'attempted' : ''}`}>
                    <Swords size={12} /> {monster.attempted ? 'Thử lại' : `Quái vật #${index + 1}`}
                  </div>
                </div>
              ),
            )}
            {allPassed && (
              <div
                className="th-chest-world"
                style={{ left: `${chestPosition.x}%`, top: `${chestPosition.y}%`, zIndex: 180 }}
              >
                <div className="th-ring chest-ring" />
                <img src={`${ASSET}/chest.webp`} alt="Rương kho báu" />
                <span>Kho báu</span>
              </div>
            )}
            <div
              className={`th-char ${moving ? 'walking' : 'idle'}`}
              style={{
                left: `${Math.round((pos.x / 100) * worldWidth)}px`,
                top: `${Math.round((pos.y / 100) * worldHeight)}px`,
                width: Math.round(worldWidth * 0.0345),
                height: Math.round(worldWidth * 0.0345),
              }}
            >
              <div className="th-char-shadow" />
              <div className="th-char-sprites">
                {!moving ? (
                  <img src={`${ASSET}/frame1.png`} alt="Nhân vật" className="visible" />
                ) : (
                  <img
                    src={`${ASSET}/${playerFrames[frame % playerFrames.length]}`}
                    alt="Nhân vật đang di chuyển"
                    className={`visible ${direction === 'left' || direction === 'right' ? 'th-side-frame' : ''}`}
                  />
                )}
              </div>
            </div>
          </div>
          {ripple && (
            <span
              className="th-click-ripple"
              style={{
                left: ripple.x - (viewportRef.current?.getBoundingClientRect().left ?? 0),
                top: ripple.y - (viewportRef.current?.getBoundingClientRect().top ?? 0),
              }}
            />
          )}
          <div className="th-hud th-hud-title">
            <strong>Treasure Hunt</strong>
            <span>
              Đã hoàn thành {completedCount}/{questionSet.length}
            </span>
          </div>
          <div className="th-hud th-hud-actions">
            <button
              type="button"
              title={bgmOn ? 'Tắt nhạc' : 'Bật nhạc'}
              onClick={() => setBgmOn((value) => !value)}
            >
              {bgmOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              title={fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button type="button" title="Thoát" onClick={() => navigate('/tro-choi')}>
              <ArrowLeft size={16} />
            </button>
          </div>
          <div className="th-hud th-hud-progress">
            <span style={{ width: `${(completedCount / questionSet.length) * 100}%` }} />
          </div>
          <div className="th-hud th-hud-help">
            <MousePointer2 size={14} /> WASD / Arrow / click-to-move
          </div>
        </section>
      </div>
      {currentQuestion && activeStage !== null && (
        <div
          className={`th-modal-backdrop ${feedback ? `is-${feedback}` : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Câu hỏi ${activeStage + 1}`}
        >
          <div className="th-question-modal">
            <button
              className="th-modal-close"
              type="button"
              aria-label="Đóng"
              onClick={flee}
              disabled={feedback !== null}
            >
              <X size={19} />
            </button>
            <div className="th-question-main">
              {feedback ? (
                <div className="th-feedback">
                  <p className="th-answer-explanation">
                    {feedback === 'correct'
                      ? answerExplanation || 'Câu trả lời đã được xác thực.'
                      : 'Đừng bỏ cuộc! Hãy xem lại câu hỏi và thử sức ở thử thách tiếp theo.'}
                  </p>
                  <button type="button" className="th-continue-button" onClick={continueEncounter}>
                    Tiếp tục
                  </button>
                  <span>{feedback === 'correct' ? <Check size={54} /> : '×'}</span>
                  <h2>{feedback === 'correct' ? 'Chính xác' : 'Chưa đúng'}</h2>
                  <p>
                    {feedback === 'correct'
                      ? 'Quái vật đã bị hạ.'
                      : 'Quái vật đang di chuyển sang vị trí mới.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="th-modal-kicker">
                    <Swords size={15} /> QUÁI VẬT #{activeStage + 1}
                  </div>
                  <h2>{currentQuestion.text}</h2>
                  <p className="th-choice-hint">Chọn đáp án rồi tấn công.</p>
                  <div className="th-true-false">
                    <button
                      type="button"
                      className={selected === true ? 'selected' : ''}
                      onClick={() => setSelected(true)}
                    >
                      <span>ĐÚNG</span>
                      <b>✓</b>
                    </button>
                    <button
                      type="button"
                      className={selected === false ? 'selected' : ''}
                      onClick={() => setSelected(false)}
                    >
                      <span>SAI</span>
                      <b>×</b>
                    </button>
                  </div>
                  <div className="th-modal-actions">
                    <button type="button" onClick={flee}>
                      Bỏ chạy
                    </button>
                    <button
                      type="button"
                      className="attack"
                      disabled={selected === null}
                      onClick={answerQuestion}
                    >
                      <Swords size={16} /> Tấn công
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="th-modal-monster">
              <MonsterSprite
                index={monsters[activeStage].spriteIndex}
                className={feedback === 'correct' ? 'defeated' : ''}
              />
            </div>
          </div>
        </div>
      )}
      {chestOpen && allPassed && (
        <div className="th-modal-backdrop" role="dialog" aria-modal="true" aria-label="Chúc mừng">
          <div className="th-treasure-modal">
            <button
              className="th-modal-close"
              type="button"
              aria-label="Đóng"
              onClick={() => setChestOpen(false)}
            >
              <X size={19} />
            </button>
            <img src={`${ASSET}/treasure.png`} alt="Kho báu" />
            <h2>Chúc mừng</h2>
            <p>Bạn đã hoàn thành tất cả câu hỏi và mở được kho báu.</p>
            <button
              type="button"
              onClick={() => {
                setChestOpen(false);
                onFinish?.();
              }}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
