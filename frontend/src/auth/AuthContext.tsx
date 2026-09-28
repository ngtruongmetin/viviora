import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, type RegisterInput } from '../services/domain';
import type { CurrentUser } from '../types/models';
import { announceAchievement } from '../components/achievements/AchievementCelebrationProvider';
type User = CurrentUser;
type Auth = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
};
const AuthContext = createContext<Auth>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .current()
      .then((response) => setUser(response.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refreshProgression = (event: Event) => {
      const payload = (
        event as CustomEvent<{
          exp?: number;
          currentLevel?: number;
          currentLevelExp?: number;
          nextLevelExp?: number | null;
        }>
      ).detail;
      if (!payload || payload.exp === undefined) return;
      setUser((current) =>
        current
          ? {
              ...current,
              exp: payload.exp,
              level: payload.currentLevel,
              current_level_exp: payload.currentLevelExp,
              next_level_exp: payload.nextLevelExp,
            }
          : current,
      );
    };
    window.addEventListener('viviora-achievement-events', refreshProgression);
    return () => window.removeEventListener('viviora-achievement-events', refreshProgression);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    setUser(response.data.data);
    if (response.data.data.achievementEvents)
      announceAchievement(response.data.data.achievementEvents);
  };
  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };
  const register = async (data: RegisterInput) => {
    const response = await authApi.register(data);
    setUser(response.data.data);
    if (response.data.data.achievementEvents)
      announceAchievement(response.data.data.achievementEvents);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
