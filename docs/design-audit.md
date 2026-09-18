# Viviora Stitch design audit

## Approved desktop screens

| Screen | Production route | Reusable surfaces |
| --- | --- | --- |
| Home feed | `/` | global shell, left rail, composer, post card, book review card, popular books rail |
| User profile | `/ho-so/:userId` | profile header, statistic tile, reading card, achievement shelf, activity list |
| Notifications | `/thong-bao` | notification list, moderation preview |
| Moderation dashboard | `/duyet-bai` | moderation metrics, filters, submission queue card |
| Review search/write/preview | `/tao-bai-dang/danh-gia/*` | stepper, book search, rating input, review preview |
| Submission detail | `/duyet-bai/:postId` | submission identity panel, book panel, moderation feedback form |
| Poll post | feed post variant | poll result rows and social action bar |
| Poll composer | `/tao-bai-dang/binh-chon` | modal composer, option field list, book attachment selector |
| Student feedback view | `/bai-dang/:postId` | approval banner, review and teacher feedback panels |

## Design tokens

- Background: `#f9f9f9` with a 20px black dot grid.
- Ink and structural border: `#000`; normal structural width: `3px`.
- Primary: electric blue `#0040df`; attention: lime `#ccff00`; secondary: vivid yellow `#e7e700`; highlight purple `#9d00ff`; destructive red `#ba1a1a`.
- Depth: hard black shadows at `4px 4px`, and `8px 8px` for dialogs.
- Shape: rectilinear surfaces, normally `0-4px` radius.
- Typography: Anton for headings, Archivo Narrow for prose, Space Mono for labels and metadata.
- Spacing: 4px rhythm, 16px gutter, 40px desktop outer margin.

## Production assumptions and reconciliations

- All user-facing wording is Vietnamese. English placeholder copy and outdated labels in the Stitch prototypes are replaced.
- `Trang chủ`, `Đọc sách`, `Trò chơi`, `Thư viện`, `Thông báo`, and `Hồ sơ` are the global navigation. Đọc sách/Trò chơi/Thư viện are intentional placeholders in this phase.
- The visual prototypes show a few alternative sidebar/header variants. Production standardizes on one global desktop shell and alters only role-gated items.
- Polls are a `PostType.POLL`, never a quiz or assessment screen.
- Student post approval is represented by `PENDING`, `APPROVED`, and `REJECTED`. Teachers and Thủ thư publish directly.
- The `08_create_review_preview` export appears partially unstyled in its screenshot. Its HTML and the surrounding write/search screens establish the intended white panel, 3px border, and hard-shadow treatment.
- Remote prototype avatar/cover URLs are not treated as durable production assets. Seed data supplies deterministic external placeholder images and the UI has letter-avatar fallbacks.

## Required API modules

`auth`, `users`, `feed`, `posts`, `comments`, `reactions`, `shares`, `polls`, `moderation`, `notifications`, `books`, and `reading`.

## Entities

`User`, `Role`, `Post`, `PostMedia`, `PostBook`, `Comment`, `Reaction`, `Share`, `Poll`, `PollOption`, `PollVote`, `Moderation`, `ModerationFeedback`, `Notification`, `Book`, `ReadingProgress`, `Achievement`, and `UserAchievement`.
