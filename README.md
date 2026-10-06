# Viviora

Viviora là monorepo full-stack cho nền tảng đọc sách xã hội dành cho học sinh THCS. Production dùng React 19/Vite 8 ở frontend và Express 5/Node 22/PostgreSQL ở backend.

## Kiến trúc

```text
frontend/                 React SPA, Router, Axios, Query, AuthContext
  src/auth/               cookie-session auth và route guard
  src/services/api/       Axios client với withCredentials
  src/main.tsx            shell, feed, post cards, poll, moderation
  nginx.conf              SPA fallback và proxy /api, /uploads
backend/                  Express REST API
  database/migrations/    PostgreSQL schema migrations
  database/db.js          PostgreSQL pool and migration runner
  sessionStore.js         express-session store trên PostgreSQL
  routes/                 auth, feed, posts, moderation
  middlewares/            login và role guards
  app.js / server.js      middleware composition và bootstrap
backend/uploads/          bind-mounted upload files
backend/backups/          bind-mounted backup files
design-stitch/             visual source of truth
```

Authentication dùng cookie session server-side, không dùng JWT. Frontend Axios bật `withCredentials`; backend không tin role từ client và kiểm tra quyền ở middleware.

## Chạy bằng Docker

```bash
docker compose up --build
```

- Web: http://localhost:5080
- API: http://localhost:4000/api/health
- PostgreSQL: `vv-postgres:5432` (persistent bind mount at `backend/data/postgres`)

Nếu host đã dùng một cổng, đổi `FRONTEND_PORT`, `BACKEND_PORT` hoặc `POSTGRES_PORT` trong `.env`.

## AI tư vấn sách

AI truy vấn trực tiếp metadata catalog bằng tool calling, chỉ đưa tối đa 8 đầu sách phù hợp vào context và stream phản hồi theo SSE. Không có vector database hay toàn bộ catalog trong prompt.

Trong production, tạo Docker secret cục bộ tại `deploy/secrets/ai_config_key` (thư mục này đã bị git ignore), chứa một chuỗi ngẫu nhiên dài. Compose deploy mount secret này vào `/run/secrets/ai_config_key`; API key provider được mã hóa trong PostgreSQL và chỉ cấu hình qua `/quan-tri/cau-hinh-ai`. Không lưu API key trong `.env`.

Migration và seed là hai thao tác độc lập. Container chỉ chạy migration; seed phải được gọi rõ ràng:

```bash
npm run db:migrate
npm run db:seed
```

Seed production tạo đúng một tài khoản (chỉ tạo khi chạy `db:seed`):

| Tên đăng nhập | Mật khẩu | Họ và tên | Vai trò |
| --- | --- | --- | --- |
| `admin` | `admin123` | Nguyễn Lê Tấn | Thủ thư |

Các mật khẩu seed được bcrypt hash trước khi lưu. Không có tài khoản hay mật khẩu seed nào được tạo khi backend khởi động bình thường.

## API chính

`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/feed?limit=10&cursor=...`, `/api/posts`, `/api/posts/:id/reactions`, `/api/posts/:id/comments`, `/api/posts/:id/shares`, `/api/moderation`, `/api/notifications`.

`POST`, `BOOK_REVIEW`, `VIDEO_REVIEW`, `POLL`, và `ACHIEVEMENT` đều dùng cùng một social post model. Bài do học sinh tạo bắt đầu ở `PENDING`; Giáo viên/Thủ thư có thể duyệt hoặc từ chối.

## Kiểm tra

```bash
npm run build
npm run lint
npm run test
```

Có thể làm sạch toàn bộ dữ liệu ứng dụng rồi tạo lại tài khoản duy nhất bằng:

```bash
npm run db:migrate
npm run db:reset
npm run db:seed
```

`db:reset` xóa dữ liệu theo thứ tự khóa ngoại trong một transaction. `db:seed` cũng làm sạch trước khi tạo lại `admin`, nên chạy lặp lại không tạo bản ghi trùng. Backend startup chỉ chạy migration và không tự seed dữ liệu.

Các thư mục `apps/` và `prisma/` là artifacts của prototype trước đó và không được Compose sử dụng; production source of truth là `frontend/` và `backend/`.
