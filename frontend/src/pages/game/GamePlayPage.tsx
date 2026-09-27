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
  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setResult(null);
    setPendingTreasureResult(null);
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
        <span className="eyebrow">GAME HOÀN THÀNH</span>
        <h1>{result.total_questions} CÂU HỎI</h1>
        <p>Bạn đã hoàn thành toàn bộ câu hỏi của game.</p>
        <div className={`game-result-reward ${result.cup_earned ? 'earned' : ''}`}>
          <Trophy size={30} />
          <strong>
            {result.cup_awarded ? `${result.reward_cups} CÚP NHẬN ĐƯỢC` : '0 CÚP NHẬN ĐƯỢC'}
          </strong>
          <span>
            {result.cup_awarded
              ? 'Phần thưởng đã được ghi nhận vào hồ sơ.'
              : 'Bạn đã nhận cúp của game này hôm nay.'}
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
          onAnswer={(question, index) =>
            answer(
              session.questions.find((item) => item.id === question.id) as GameQuestion,
              question.optionIds?.[index] || '',
            )
          }
          onComplete={complete}
        />
      ) : (
        <TreasureHuntMockup
          questionSet={tfQuestions}
          onAnswer={(question, selected) =>
            answer(
              session.questions.find((item) => item.id === question.id) as GameQuestion,
              selected,
            )
          }
          onComplete={complete}
          onFinish={() => {
            if (pendingTreasureResult) setResult(pendingTreasureResult);
          }}
        />
      )}
    </div>
  );
}
