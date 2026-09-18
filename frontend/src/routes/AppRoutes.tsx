import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from '../auth/RequireAdmin';
import { RequireQuestionBank } from '../auth/RequireQuestionBank';
import { RequireStaff } from '../auth/RequireStaff';
import { RequireAuth } from '../auth/RequireAuth';
import { useAuth } from '../auth/AuthContext';
import { MemberLayout } from '../layouts/MemberLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { LandingPage } from '../pages/LandingPage';
import { FeedPage } from '../pages/community/FeedPage';
import { LeaderboardPage } from '../pages/community/LeaderboardPage';
import { PlaceholderPage } from '../pages/common/PlaceholderPage';
import { AdminLibraryPage } from '../pages/library/AdminLibraryPage';
import { AdminCollectionPage } from '../pages/library/AdminCollectionPage';
import { BookPage } from '../pages/library/BookPage';
import { TrendingBooksPage } from '../pages/library/TrendingBooksPage';
import { CollectionPage } from '../pages/library/CollectionPage';
import { LibraryImportPage } from '../pages/library/LibraryImportPage';
import { LibraryPage } from '../pages/library/LibraryPage';
import { ModerationPage } from '../pages/moderation/ModerationPage';
import { PublicProfilePage } from '../pages/profile/PublicProfilePage';
import { AdminMembersPage } from '../pages/members/AdminMembersPage';
import { AdminMemberDetailPage } from '../pages/members/AdminMemberDetailPage';
import { AdminAchievementsPage } from '../pages/achievements/AdminAchievementsPage';
import { QuestionBanksPage } from '../pages/questionBank/QuestionBanksPage';
import { QuestionBankPage } from '../pages/questionBank/QuestionBankPage';
import { GamePage } from '../game/GamePage';
import { MinesweeperMockup } from '../game/mockups/MinesweeperMockup';
import { TreasureHuntMockup } from '../game/mockups/TreasureHuntMockup';
import { GameManagementPage } from '../pages/game/GameManagementPage';
import { GamePlayPage } from '../pages/game/GamePlayPage';

function ProfileAliasRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? `/nguoi-dung/${user.id}` : '/dang-nhap'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/game/mockup/minesweeper"
        element={<MinesweeperMockup />}
      />
      <Route
        path="/game/mockup/treasure-hunt"
        element={<TreasureHuntMockup />}
      />
      <Route
        path="/game/*"
        element={
          <RequireAuth>
            <GamePage />
          </RequireAuth>
        }
      />
      <Route
        path="*"
        element={
          <RequireAuth>
            <MemberLayout>
              <Routes>
                <Route path="/bang-tin" element={<FeedPage />} />
                <Route path="/thong-bao" element={<PlaceholderPage title="THÔNG BÁO" />} />
                <Route path="/bang-xep-hang" element={<LeaderboardPage />} />
                <Route path="/ho-so" element={<ProfileAliasRedirect />} />
                <Route path="/nguoi-dung/:userId" element={<PublicProfilePage />} />
                <Route path="/duyet-bai" element={<ModerationPage />} />
                <Route path="/quan-tri/thanh-tuu" element={<RequireAdmin><AdminAchievementsPage /></RequireAdmin>} />
                <Route path="/thu-vien" element={<LibraryPage />} />
                <Route path="/thu-vien/kho/:collectionId" element={<CollectionPage />} />
                <Route path="/thu-vien/sach/:bookId" element={<BookPage />} />
                <Route path="/thu-vien/sach-thinh-hanh" element={<TrendingBooksPage />} />
                <Route path="/tro-choi" element={<GameManagementPage />} />
                <Route path="/tro-choi/:gameId/choi/:sessionId" element={<GamePlayPage />} />
                <Route path="/tro-choi/:gameId/choi" element={<GamePlayPage />} />
                <Route
                  path="/quan-tri/tro-choi"
                  element={
                    <RequireStaff>
                      <GameManagementPage management />
                    </RequireStaff>
                  }
                />
                <Route
                  path="/quan-tri/thu-vien"
                  element={
                    <RequireAdmin>
                      <AdminLibraryPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/quan-tri/thu-vien/kho/:collectionId"
                  element={
                    <RequireAdmin>
                      <AdminCollectionPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/quan-tri/thu-vien/nhap-kho"
                  element={
                    <RequireAdmin>
                      <LibraryImportPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/quan-tri/thanh-vien"
                  element={
                    <RequireAdmin>
                      <AdminMembersPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/quan-tri/thanh-vien/:userId"
                  element={
                    <RequireAdmin>
                      <AdminMemberDetailPage />
                    </RequireAdmin>
                  }
                />
                <Route path="/kho-cau-hoi" element={<RequireQuestionBank><QuestionBanksPage /></RequireQuestionBank>} />
                <Route path="/kho-cau-hoi/:bankId" element={<RequireQuestionBank><QuestionBankPage /></RequireQuestionBank>} />
                <Route path="*" element={<PlaceholderPage title="KHÔNG TÌM THẤY TRANG" />} />
              </Routes>
            </MemberLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
