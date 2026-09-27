import { AuthProvider } from './auth/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { AchievementCelebrationProvider } from './components/achievements/AchievementCelebrationProvider';

export function App() {
  return (
    <AuthProvider>
      <AchievementCelebrationProvider>
        <AppRoutes />
      </AchievementCelebrationProvider>
    </AuthProvider>
  );
}
