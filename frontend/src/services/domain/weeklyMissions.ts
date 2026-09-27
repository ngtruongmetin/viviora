import { api } from '../api/client';
export type WeeklyMission = {
  mission_id: string;
  mission_no: number;
  name: string;
  requirement_text: string;
  cup_reward: number;
  progress_current: number;
  progress_target: number;
  status: string;
  is_master: boolean;
};
export const weeklyMissionsApi = {
  list: () =>
    api.get<{ data: { weekStart: string; missions: WeeklyMission[] } }>('/weekly-missions'),
  claim: (id: string) =>
    api.post<{ data: { mission: WeeklyMission } }>(`/weekly-missions/${id}/claim`),
};
