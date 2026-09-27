import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './minesweeper.css';

type Point = { x: number; y: number };
type GameState = 'idle' | 'moving' | 'correct' | 'wrong' | 'advancing' | 'complete';

export type MinesweeperQuestion = {
  id?: string;
  question: string;
  answers: string[];
  optionIds?: string[];
  correct?: number;
  explanation?: string;
};

const MOVE_MS = 900;
const WRONG_RETURN_MS = 600;

/**
 * Các câu hỏi chỉ là dữ liệu.
 * Số lượng câu có thể thay đổi mà không ảnh hưởng tới layout.
 */
const defaultQuestions: MinesweeperQuestion[] = [
  {
    question: 'Thủ đô của Việt Nam là thành phố nào?',
    answers: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
    correct: 0,
    explanation: 'Hà Nội là thủ đô của Việt Nam.',
  },
  {
    question: 'Hành tinh nào được gọi là hành tinh đỏ?',
    answers: ['Sao Kim', 'Sao Hỏa', 'Sao Mộc', 'Sao Thổ'],
    correct: 1,
    explanation: 'Sao Hỏa có bề mặt màu đỏ đặc trưng.',
  },
  {
    question: 'Ai là tác giả của “Dế Mèn phiêu lưu ký”?',
    answers: ['Tô Hoài', 'Nam Cao', 'Ngô Tất Tố', 'Xuân Diệu'],
    correct: 0,
    explanation: 'Tô Hoài viết tác phẩm thiếu nhi nổi tiếng này.',
  },
  {
    question: 'Đại dương lớn nhất thế giới là gì?',
    answers: ['Đại Tây Dương', 'Ấn Độ Dương', 'Thái Bình Dương', 'Bắc Băng Dương'],
    correct: 2,
    explanation: 'Thái Bình Dương là đại dương rộng nhất.',
  },
  {
    question: 'Một năm có bao nhiêu tháng?',
    answers: ['10', '11', '12', '13'],
    correct: 2,
    explanation: 'Một năm dương lịch có 12 tháng.',
  },
  {
    question: 'Loài vật nào là biểu tượng của sự kiên trì?',
    answers: ['Thỏ', 'Rùa', 'Cáo', 'Hươu'],
    correct: 1,
    explanation: 'Rùa nhắc chúng ta tiến chậm mà chắc.',
  },
];

/**
 * ============================================================
 * LAYOUT CỐ ĐỊNH
 * ============================================================
 *
 * Đây là một hình thang cân:
 *
 *             B -------- C
 *            /              \
 *           /                \
 *          A                  D
 *
 * B/C nằm phía trên, A/D nằm phía dưới.
 *
 * QUAN TRỌNG:
 * - Layout này KHÔNG thay đổi theo questionIndex.
 * - Không cộng playerOffsetY vào từng point.
 * - Không dùng camera để tính lại vị trí tương đối giữa A/B/C/D.
 *
 * Camera chỉ pan toàn bộ world.
 */
const ANSWER_POSITIONS: Point[] = [
  { x: -330, y: -45 }, // A
  { x: -160, y: -255 }, // B
  { x: 160, y: -255 }, // C
  { x: 330, y: -45 }, // D
];

const runningSprites = {
  forward: [
    '/minesweeper/forward1.png',
    '/minesweeper/forward2.png',
    '/minesweeper/forward1.png',
    '/minesweeper/forward2.png',
  ],

  left: [
    '/minesweeper/left1.png',
    '/minesweeper/left2.png',
    '/minesweeper/left1.png',
    '/minesweeper/left2.png',
  ],

  right: [
    '/minesweeper/right1.png',
    '/minesweeper/right2.png',
    '/minesweeper/right1.png',
    '/minesweeper/right2.png',
  ],
};

type Direction = keyof typeof runningSprites;

const cssPosition = (value: number) => `calc(50% ${value >= 0 ? '+' : '-'} ${Math.abs(value)}px)`;

/**
 * Tạo một bãi mìn tại một anchor.
 *
 * Anchor là WORLD POSITION.
 * Các đáp án luôn giữ nguyên khoảng cách với nhau.
 */
const createMinePositions = (anchor: Point): Point[] =>
  ANSWER_POSITIONS.map((point) => ({
    x: anchor.x + point.x,
    y: anchor.y + point.y,
  }));

export function MinesweeperMockup({
  questionSet = defaultQuestions,
  onAnswer,
  onComplete,
  rewardCups = 10,
}: {
  questionSet?: MinesweeperQuestion[];
  onAnswer?: (
    question: MinesweeperQuestion,
    selectedIndex: number,
  ) => Promise<{ isCorrect: boolean; pointsAwarded?: number; explanation?: string | null }>;
  onComplete?: () => void;
  rewardCups?: number;
}) {
  const navigate = useNavigate();

  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [state, setState] = useState<GameState>('idle');

  /**
   * anchor = vị trí WORLD của tâm bãi mìn hiện tại.
   *
   * KHÔNG phải vị trí camera.
   */
  const [anchor, setAnchor] = useState<Point>({ x: 0, y: 0 });

  const arenaRef = useRef<HTMLElement>(null);

  /**
   * playerOffsetY chỉ dùng để xác định:
   * "camera phải pan bao nhiêu để điểm được chọn
   * tới đúng vị trí nhân vật".
   *
   * Không được cộng nó vào ANSWER_POSITIONS.
   */
  const [playerOffsetY, setPlayerOffsetY] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight * 0.26,
  );

  const initialCameraY = typeof window === 'undefined' ? 0 : -(window.innerHeight * 0.26);

  const [camera, setCamera] = useState<Point>({
    x: 0,
    y: initialCameraY,
  });

  const [previousCamera, setPreviousCamera] = useState<Point>({
    x: 0,
    y: initialCameraY,
  });

  /**
   * target = WORLD POSITION của đáp án đang chọn.
   */
  const [target, setTarget] = useState<Point | null>(null);

  const [selected, setSelected] = useState<number | null>(null);

  const [direction, setDirection] = useState<Direction>('forward');

  const [frame, setFrame] = useState(0);

  const [audioOn, setAudioOn] = useState(true);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const explosionSoundRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Bãi mìn kế tiếp chỉ dùng cho animation preview.
   */
  const [incoming, setIncoming] = useState<{
    index: number;
    anchor: Point;
  } | null>(null);

  const cameraInitialized = useRef(false);

  useEffect(() => {
    const bgMusic = new Audio('/minesweeper/bgmusic.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.28;
    const correctSound = new Audio('/minesweeper/correct.mp3');
    correctSound.volume = 0.8;
    const explosionSound = new Audio('/minesweeper/explosion.mp3');
    explosionSound.volume = 0.8;
    bgMusicRef.current = bgMusic;
    correctSoundRef.current = correctSound;
    explosionSoundRef.current = explosionSound;

    const resumeMusic = () => {
      if (audioOn) void bgMusic.play().catch(() => undefined);
    };
    document.addEventListener('pointerdown', resumeMusic, { once: true });
    document.addEventListener('keydown', resumeMusic, { once: true });
    void bgMusic.play().catch(() => undefined);
    return () => {
      document.removeEventListener('pointerdown', resumeMusic);
      document.removeEventListener('keydown', resumeMusic);
      bgMusic.pause();
      bgMusic.currentTime = 0;
      correctSound.pause();
      explosionSound.pause();
      bgMusicRef.current = null;
      correctSoundRef.current = null;
      explosionSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const bgMusic = bgMusicRef.current;
    if (!bgMusic) return;
    if (audioOn) void bgMusic.play().catch(() => undefined);
    else bgMusic.pause();
  }, [audioOn]);

  const questions = questionSet.length ? questionSet : defaultQuestions;
  const question = questions[questionIndex];

  /**
   * ============================================================
   * CURRENT MINEFIELD
   * ============================================================
   *
   * Anchor của bãi mìn hiện tại.
   *
   * Mỗi câu:
   *
   *     A B C D
   *
   * vẫn có đúng cùng layout.
   *
   * Chỉ có anchor của toàn bộ bãi thay đổi khi camera tiến lên.
   */
  const points = useMemo(() => createMinePositions(anchor), [anchor]);

  /**
   * Incoming field cũng sử dụng chính xác cùng layout.
   */
  const incomingPoints = useMemo(() => {
    if (!incoming) return [];

    return createMinePositions(incoming.anchor);
  }, [incoming]);

  /**
   * ============================================================
   * INITIAL CAMERA
   * ============================================================
   *
   * Camera được khởi tạo MỘT LẦN.
   *
   * Không thay đổi anchor của bãi mìn đầu tiên.
   */
  useLayoutEffect(() => {
    const updateLayout = () => {
      const height = arenaRef.current?.clientHeight || window.innerHeight;

      const offset = height * 0.26;

      setPlayerOffsetY(offset);

      if (!cameraInitialized.current) {
        /**
         * Bãi mìn đầu tiên vẫn nằm ở anchor (0, 0).
         *
         * Camera chỉ pan lên để nhân vật đứng ở vị trí
         * phù hợp trên màn hình.
         */
        const initialCamera = {
          x: 0,
          y: -offset,
        };

        setCamera(initialCamera);
        setPreviousCamera(initialCamera);

        cameraInitialized.current = true;
      }
    };

    updateLayout();

    window.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  /**
   * ============================================================
   * RUNNING ANIMATION
   * ============================================================
   */
  useEffect(() => {
    if (state !== 'moving') return;

    const interval = window.setInterval(() => {
      setFrame((current) => current + 1);
    }, 130);

    return () => window.clearInterval(interval);
  }, [state]);

  /**
   * ============================================================
   * MOVEMENT COMPLETE
   * ============================================================
   */
  useEffect(() => {
    if (state !== 'moving' || !target || selected === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        /**
         * Luôn reset frame trước khi chuyển state.
         *
         * Điều này đảm bảo sau animation nhân vật trở về
         * frame1 thay vì giữ frame cuối của animation.
         */
        setFrame(0);

        const result = onAnswer
          ? await onAnswer(question, selected)
          : {
              isCorrect: selected === question.correct,
              pointsAwarded: selected === question.correct ? 1 : 0,
              explanation: question.explanation,
            };
        if (result.isCorrect) {
          /**
           * ================================
           * ĐÚNG
           * ================================
           */
          setCorrectAnswers((current) => current + 1);
          const correctSound = correctSoundRef.current;
          if (audioOn && correctSound) {
            correctSound.currentTime = 0;
            void correctSound.play().catch(() => undefined);
          }

          /**
           * Preview bãi mìn kế tiếp.
           *
           * IMPORTANT:
           *
           * target là WORLD POSITION của điểm đã tới.
           *
           * Bãi tiếp theo có anchor tại chính vị trí mà
           * camera vừa pan tới.
           *
           * Không được dùng:
           *
           * target.y + playerOffsetY
           *
           * hoặc cộng offset vào từng mine.
           */
          if (questionIndex < questions.length - 1) {
            const nextAnchor = {
              x: target.x,
              y: target.y - playerOffsetY,
            };

            setIncoming({
              index: questionIndex + 1,
              anchor: nextAnchor,
            });
          }

          setState('correct');
        } else {
          /**
           * ================================
           * SAI
           * ================================
           *
           * Camera quay về vị trí cũ.
           */
          setCamera(previousCamera);
          const explosionSound = explosionSoundRef.current;
          if (audioOn && explosionSound) {
            explosionSound.currentTime = 0;
            void explosionSound.play().catch(() => undefined);
          }

          setState('wrong');
        }
      })();
    }, MOVE_MS);

    return () => window.clearTimeout(timer);
  }, [
    state,
    target,
    selected,
    question.id,
    questionIndex,
    previousCamera,
    playerOffsetY,
    onAnswer,
    rewardCups,
    questions.length,
    audioOn,
  ]);

  /**
   * ============================================================
   * WRONG -> IDLE
   * ============================================================
   */
  useEffect(() => {
    if (state !== 'wrong') return;

    const timer = window.setTimeout(() => {
      /**
       * Reset hoàn toàn trạng thái animation.
       *
       * frame = 0 => frame1.png
       */
      setTarget(null);
      setSelected(null);
      setFrame(0);
      if (onAnswer) {
        // A wrong answer retries the same field. Keep its world anchor and
        // camera so the player and answer markers stay in the same coordinate space.
        setState('idle');
      } else setState('idle');
    }, WRONG_RETURN_MS);

    return () => window.clearTimeout(timer);
  }, [state, onAnswer, onComplete, playerOffsetY, questionIndex, questions.length]);

  /**
   * ============================================================
   * CORRECT -> ADVANCING
   * ============================================================
   */
  useEffect(() => {
    if (state !== 'correct') return;

    const timer = window.setTimeout(() => {
      setState('advancing');
    }, 720);

    return () => window.clearTimeout(timer);
  }, [state]);

  /**
   * ============================================================
   * ADVANCE TO NEXT QUESTION
   * ============================================================
   */
  useEffect(() => {
    if (state !== 'advancing') return;

    const timer = window.setTimeout(() => {
      /**
       * Hết câu hỏi:
       *
       * KHÔNG render bãi mìn mới.
       */
      if (questionIndex === questions.length - 1) {
        setTarget(null);
        setSelected(null);
        setIncoming(null);
        setFrame(0);
        setState('complete');
        onComplete?.();

        return;
      }

      if (!target) return;

      /**
       * Điểm đã chọn chính là nơi nhân vật vừa tới.
       *
       * Camera mới được đặt sao cho:
       *
       *     target -> vị trí nhân vật
       *
       * Nhưng anchor của minefield tiếp theo được tính
       * riêng, không làm biến dạng hình thang.
       */
      const nextCamera = {
        x: target.x,
        y: target.y - playerOffsetY,
      };

      /**
       * Câu hỏi tiếp theo.
       */
      setQuestionIndex((current) => current + 1);

      /**
       * Anchor mới của minefield.
       *
       * QUAN TRỌNG:
       *
       * nextAnchor = nextCamera
       *
       * Điều này giúp các câu 2,3,4... nằm cùng một
       * cấu trúc hình thang.
       */
      setAnchor(nextCamera);

      /**
       * Camera pan.
       */
      setCamera(nextCamera);
      setPreviousCamera(nextCamera);

      /**
       * Xóa preview.
       */
      setIncoming(null);

      setTarget(null);
      setSelected(null);

      /**
       * Đảm bảo nhân vật về frame1.
       */
      setFrame(0);

      setState('idle');
    }, 380);

    return () => window.clearTimeout(timer);
  }, [state, questionIndex, target, playerOffsetY, onComplete]);

  /**
   * ============================================================
   * CHOOSE ANSWER
   * ============================================================
   */
  const choose = (answerIndex: number) => {
    if (state !== 'idle') return;

    const destination = points[answerIndex];

    /**
     * Camera destination:
     *
     * đáp án được chọn sẽ tới đúng vị trí nhân vật.
     *
     * Đây là PAN CAMERA.
     *
     * Không thay đổi ANSWER_POSITIONS.
     */
    const cameraDestination = {
      x: destination.x,
      y: destination.y - playerOffsetY,
    };

    const delta = {
      x: cameraDestination.x - camera.x,

      y: cameraDestination.y - camera.y,
    };

    setPreviousCamera(camera);

    /**
     * target giữ WORLD POSITION thật.
     */
    setTarget(destination);

    setSelected(answerIndex);

    /**
     * Luôn bắt đầu animation từ frame1.
     */
    setFrame(0);

    /**
     * Xác định hướng chạy.
     */
    setDirection(
      Math.abs(delta.x) >= Math.abs(delta.y) * 0.5 ? (delta.x < 0 ? 'left' : 'right') : 'forward',
    );

    /**
     * PAN CAMERA.
     *
     * Đây mới là nơi playerOffsetY được sử dụng.
     */
    setCamera(cameraDestination);

    setState('moving');
  };

  /**
   * ============================================================
   * UI
   * ============================================================
   */

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    }
  };

  const toggleFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  /**
   * Khi không chạy:
   * LUÔN frame1.
   */
  const sprite =
    state === 'moving' ? runningSprites[direction][frame % 2] : '/minesweeper/frame1.png';
  const earnedCups = Math.round((correctAnswers * rewardCups) / questions.length);
  const questionProgress =
    state === 'complete' ? 100 : Math.round((questionIndex / questions.length) * 100);

  return (
    <main className="mine-game">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="mine-sidebar">
        <div className="mine-hud mine-sidebar-hud">
          <div className="mine-score-hud">
            <strong>
              {earnedCups} / {rewardCups}
            </strong>
            <span>CÚP</span>
          </div>

          <div className="mine-progress">
            <span>{`CÂU ${questionIndex + 1} / ${questions.length}`}</span>

            <div className="mine-progress-track">
              <span style={{ width: `${questionProgress}%` }} />
            </div>
          </div>

          <div className="mine-tools">
            <button title="Toggle sound" onClick={() => setAudioOn((value) => !value)}>
              {audioOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>

            <button title="Fullscreen" onClick={toggleFullscreen}>
              <Maximize2 size={17} />
            </button>
          </div>
        </div>

        <button className="mine-back" onClick={goBack}>
          <ArrowLeft size={16} />
          Quay lại
        </button>

        <section className="mine-panel">
          <div className="mine-count">
            {state === 'complete' ? 'HOÀN THÀNH' : `CÂU ${questionIndex + 1} / ${questions.length}`}
          </div>

          {state === 'complete' ? (
            <div className="mine-complete">
              <div className="mine-complete-mark">✓</div>

              <h1>Vượt qua bãi mìn</h1>

              <p>Bạn đã hoàn thành hành trình kiến thức.</p>

              <strong>
                {earnedCups} / {rewardCups} CÚP
              </strong>

              <button onClick={() => navigate('/game')}>Quay về</button>
            </div>
          ) : (
            <>
              <h1>{question.question}</h1>

              <div className="mine-divider" />

              {state === 'idle' && (
                <p className="mine-instruction">
                  Chọn một điểm đến trên bản đồ. Nhân vật sẽ tự chạy tới đó.
                </p>
              )}

              {state === 'moving' && <p className="mine-instruction">Đang tiến về điểm đến...</p>}

              {state === 'wrong' && (
                <div className="mine-feedback wrong">
                  <strong>Chưa chính xác</strong>

                  <p>Hệ thống đã ghi nhận câu trả lời của bạn.</p>

                  <small>Bãi mìn phát nổ. Camera đang đưa bạn về vị trí cũ.</small>
                </div>
              )}

              {state === 'correct' && (
                <div className="mine-feedback correct">
                  <strong>Chính xác</strong>

                  <p>{question.explanation || 'Câu trả lời đã được xác thực.'}</p>

                  <small>Khu vực tiếp theo đang mở ra.</small>
                </div>
              )}

              <div className="mine-score">
                <span>CÚP</span>
                <strong>
                  {earnedCups} / {rewardCups}
                </strong>
              </div>
            </>
          )}
        </section>
      </aside>

      {/* =====================================================
          GAME FIELD
      ===================================================== */}

      <section className="mine-field" ref={arenaRef} aria-label="Bản đồ dò mìn">
        <div className="mine-hud">
          <div className="mine-score-hud">
            <strong>
              {earnedCups} / {rewardCups}
            </strong>
            <span>CÚP</span>
          </div>

          <div className="mine-progress">
            <span>
              CÂU {questionIndex + 1} / {questions.length}
            </span>

            <div className="mine-progress-track">
              <span style={{ width: `${questionProgress}%` }} />
            </div>
          </div>

          <div className="mine-tools">
            <button
              title={audioOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
              onClick={() => setAudioOn((value) => !value)}
            >
              {audioOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>

            <button title="Toàn màn hình" onClick={toggleFullscreen}>
              <Maximize2 size={17} />
            </button>
          </div>
        </div>

        {/* ===================================================
            WORLD
            ===================================================

            Camera transform chỉ pan WORLD.

            Không transform riêng từng mine.

            Không cộng playerOffsetY vào mine position.
        */}

        <div
          className={`mine-world ${state === 'wrong' ? 'returning' : ''}`}
          style={{
            transform: `translate3d(${-camera.x}px, ${-camera.y}px, 0)`,
          }}
        >
          <div className="mine-tile-pool" />

          {/* =================================================
              CURRENT MINEFIELD
          ================================================= */}

          {state !== 'complete' &&
            points.map((point, index) => (
              <button
                key={`${questionIndex}-${index}`}
                className={`
                    mine-marker
                    ${selected === index ? 'chosen' : ''}
                    ${state !== 'idle' ? 'disabled' : ''}
                    ${
                      state === 'correct' || state === 'advancing'
                        ? state === 'correct' && selected === index
                          ? 'arrived'
                          : 'fading-out'
                        : ''
                    }
                  `}
                style={{
                  left: cssPosition(point.x),
                  top: cssPosition(point.y),
                }}
                onClick={() => choose(index)}
                aria-label={`Đáp án ${String.fromCharCode(65 + index)}: ${question.answers[index]}`}
              >
                <span>{String.fromCharCode(65 + index)}</span>

                <b>{question.answers[index]}</b>
              </button>
            ))}

          {/* =================================================
              NEXT MINEFIELD PREVIEW
          ================================================= */}

          {state !== 'complete' &&
            incoming &&
            incomingPoints.map((point, index) => (
              <div
                key={`incoming-${incoming.index}-${index}`}
                className="mine-marker fresh disabled"
                style={{
                  left: cssPosition(point.x),
                  top: cssPosition(point.y),
                }}
                aria-hidden="true"
              >
                <span>{String.fromCharCode(65 + index)}</span>

                <b>{questions[incoming.index].answers[index]}</b>
              </div>
            ))}
        </div>

        {/* ===================================================
            PLAYER
            =================================================== */}

        <img
          className={`
            mine-player
            ${state === 'wrong' ? 'is-wobbling' : ''}
          `}
          src={state === 'wrong' ? '/minesweeper/wobble.png' : sprite}
          alt="Nhân vật dò mìn"
        />

        {/* ===================================================
            EXPLOSION
            =================================================== */}

        {state === 'wrong' && (
          <div className="mine-explosion" aria-hidden="true">
            <span className="mine-ring" />

            <i />
            <i />
            <i />
            <i />
            <i />

            <b>!</b>
          </div>
        )}

        {/* ===================================================
            STATUS
            =================================================== */}

        {state === 'moving' && <div className="mine-status">Đang di chuyển</div>}

        {state === 'correct' && (
          <div className="mine-status success">+1&nbsp;&nbsp;Đúng! Bản đồ đang tiến lên</div>
        )}

        {state === 'wrong' && <div className="mine-status danger">Dính mìn! Thử lại câu này</div>}
      </section>
    </main>
  );
}
