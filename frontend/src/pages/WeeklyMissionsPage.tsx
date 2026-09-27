import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { weeklyMissionsApi } from '../services/domain';
import { announceAchievement } from '../components/achievements/AchievementCelebrationProvider';
export function WeeklyMissionsPage() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ['weekly-missions'],
    queryFn: () => weeklyMissionsApi.list().then((r) => r.data.data),
  });
  const claim = useMutation({
    mutationFn: (id: string) => weeklyMissionsApi.claim(id),
    onSuccess: async ({ data }) => {
      const m = data.data.mission;
      announceAchievement({
        rewardType: 'CUP',
        unlocked: [
          {
            code: `MISSION_${m.mission_no}`,
            name: m.name,
            condition_text: m.requirement_text,
            exp_reward: m.cup_reward,
          },
        ],
      });
      await client.invalidateQueries({ queryKey: ['weekly-missions'] });
      await client.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
  return (
    <div className="weekly-missions-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">VIVIORA / TUẦN</span>
          <h1>NHIỆM VỤ TUẦN</h1>
          <p>Hoàn thành nhiệm vụ, vào nhận cúp và leo bảng xếp hạng.</p>
        </div>
        <Trophy size={44} />
      </header>
      <div className="weekly-mission-grid">
        {q.data?.missions.map((m) => (
          <article
            className={`weekly-mission-card ${m.is_master ? 'master' : ''}`}
            key={m.mission_id}
          >
            <h2>{m.name}</h2>
            <p>{m.requirement_text}</p>
            <strong>
              {Math.min(m.progress_current, m.progress_target)} / {m.progress_target}
            </strong>
            <footer>
              <b>+{m.cup_reward} CÚP</b>
              {m.status === 'COMPLETED' ? (
                <button className="button primary" onClick={() => claim.mutate(m.mission_id)}>
                  NHẬN CÚP
                </button>
              ) : (
                <em>{m.status === 'CLAIMED' ? 'ĐÃ NHẬN' : 'ĐANG THỰC HIỆN'}</em>
              )}
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
