import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { gamesApi, type GameQuestion, type GameResult } from '../../services/domain/games';
import { MinesweeperMockup, type MinesweeperQuestion } from '../../game/mockups/MinesweeperMockup';
import {
  TreasureHuntMockup,
  type TreasureHuntQuestion,
} from '../../game/mockups/TreasureHuntMockup';
import { announceAchievement } from '../../components/achievements/AchievementCelebrationProvider';

export function GamePlayPage() {
  const { gameId = '', sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof gamesApi.start>>['data']['data'] | null
  >(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GameResult | null>(null);
  const [pendingTreasureResult, setPendingTreasureResult] = useState<GameResult | null>(null);
  const [remainingLives, setRemainingLives] = useState(3);
  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setResult(null);
    setPendingTreasureResult(null);
    setRemainingLives(3);
    setError('');
    const load = sessionId ? gamesApi.session(sessionId) : gamesApi.start(gameId);
    load
      .then((response) => {
        if (cancelled) return;
        const data = response.data.data;
        if (!sessionId) {
          navigate(`/tro-choi/${gameId}/choi/${data.sessionId}`, { replace: true });
          return;
        }
        setSession(data);
        setRemainingLives(data.remainingLives);
        if (data.result) setResult(data.result);
      })
      .catch((requestError) => {
        if (!cancelled)
          setError(requestError?.response?.data?.error?.message || 'Không thể tải phiên chơi.');
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, navigate, sessionId]);
  const answer = useCallback(
    async (question: GameQuestion, selected: string | boolean) => {
      if (!session) return { isCorrect: false, pointsAwarded: 0 };
      const response = await gamesApi.answer(session.sessionId, question.id, selected);
      setRemainingLives(response.data.data.remainingLives);
      return response.data.data;
    },
    [session],
  );
  const complete = useCallback(async () => {
    if (!session || result) return;
    const response = await gamesApi.complete(session.sessionId);
    if (response.data.data.achievementEvents)
      announceAchievement(response.data.data.achievementEvents);
    if (session.game.question_type === 'MC') setResult(response.data.data);
    else setPendingTreasureResult(response.data.data);
  }, [session, result]);
  const showGameOver = useCallback(async () => {
    if (!session) return;
    const response = await gamesApi.result(session.sessionId);
    setResult(response.data.data);
  }, [session]);
  const mcQuestions = useMemo<MinesweeperQuestion[]>(
    () =>
      session?.questions.map((question) => ({
        id: question.id,
        question: question.content,
        answers: (question.options || []).map((option) => option.label),
        optionIds: (question.options || []).map((option) => option.id),
      })) || [],
    [session],
  );
  const tfQuestions = useMemo<TreasureHuntQuestion[]>(
    () =>
      session?.questions.map((question) => ({
        id: question.id,
        text: question.content,
        explanation: question.answer_explanation,
      })) || [],
    [session],
  );
  if (error)
    return (
      <div className="state-card error">
        <h2>KHÔNG THỂ BẮT ĐẦU GAME</h2>
        <p>{error}</p>
        <Link className="button secondary" to="/tro-choi">
          <ArrowLeft size={16} /> QUAY LẠI
        </Link>
      </div>
    );
  if (!session) return <div className="state-card">Đang chuẩn bị câu hỏi ngẫu nhiên...</div>;
  if (result)
    return (
      <div className="state-card game-result">
        <span className="eyebrow">KẾT QUẢ GAME</span>
        <h1>{result.outcome === 'WON' ? 'HOÀN THÀNH' : 'HẾT MẠNG'}</h1>
        <div className={`game-result-reward ${result.cup_earned ? 'earned' : ''}`}>
          <Trophy size={30} />
          <strong>
            {result.cup_awarded ? `+${result.reward_cups} CÚP` : '0 CÚP'}
          </strong>
          <span>
            {result.cup_awarded
              ? 'Đã cộng vào hồ sơ'
              : result.outcome === 'WON'
                ? 'Đã nhận cúp hôm nay'
                : 'Bạn đã dùng hết 3 mạng'}
          </span>
        </div>
        <button className="button primary" onClick={() => navigate('/tro-choi')}>
          QUAY VỀ DANH SÁCH
        </button>
      </div>
    );
  return (
    <div className="game-play-shell">
      <header className="game-play-context">
        <strong>{session.game.title}</strong>
        <span>{session.game.book.title}</span>
      </header>
      {session.game.question_type === 'MC' ? (
        <MinesweeperMockup
          questionSet={mcQuestions}
          rewardCups={session.game.reward_cups}
          remainingLives={remainingLives}
          onAnswer={(question, index) =>
            answer(
              session.questions.find((item) => item.id === question.id) as GameQuestion,
              question.optionIds?.[index] || '',
            )
          }
          onComplete={complete}
          onGameOver={showGameOver}
        />
      ) : (
        <TreasureHuntMockup
          questionSet={tfQuestions}
          remainingLives={remainingLives}
          onAnswer={(question, selected) =>
            answer(
              session.questions.find((item) => item.id === question.id) as GameQuestion,
              selected,
            )
          }
          onComplete={complete}
          onGameOver={showGameOver}
          onFinish={() => {
            if (pendingTreasureResult) setResult(pendingTreasureResult);
          }}
        />
      )}
    </div>
  );
}
