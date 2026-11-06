import type { ReactNode } from 'react';
import { Header } from '../components/header/Header';
import { Sidebar } from '../components/sidebar/Sidebar';
import { TrendingBooks } from '../components/community/TrendingBooks';
import { LeaderboardMini } from '../components/community/LeaderboardMini';
import { SurveyPrompt } from '../components/survey/SurveyPrompt';

export function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <SurveyPrompt />
      <main className="layout">
        <Sidebar />
        <section className="content">{children}</section>
        <div className="right-rail">
          <TrendingBooks />
          <LeaderboardMini />
        </div>
      </main>
    </div>
  );
}
