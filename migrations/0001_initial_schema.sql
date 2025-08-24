-- 깊이있는 질문 교실 데이터베이스 스키마

-- 사용자 테이블 (교사/학생 구분)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('teacher', 'student')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 질문 테이블
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  date DATE NOT NULL DEFAULT (date('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 좋아요 테이블
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(question_id, user_id) -- 한 사용자는 질문당 하나의 좋아요만 가능
);

-- AI 채팅 세션 테이블 (AI 질문 연습용)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_data TEXT, -- JSON 형태로 채팅 기록 저장
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_date ON questions(date);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_question_id ON comments(question_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_question_id ON likes(question_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);

-- 뷰 생성: 질문과 좋아요 수를 함께 조회
CREATE VIEW IF NOT EXISTS questions_with_stats AS
SELECT 
  q.id,
  q.user_id,
  q.content,
  q.created_at,
  q.updated_at,
  q.date,
  u.full_name as author_name,
  u.user_type as author_type,
  COUNT(l.id) as like_count,
  COUNT(c.id) as comment_count
FROM questions q
LEFT JOIN users u ON q.user_id = u.id
LEFT JOIN likes l ON q.id = l.question_id
LEFT JOIN comments c ON q.id = c.question_id
GROUP BY q.id, q.user_id, q.content, q.created_at, q.updated_at, q.date, u.full_name, u.user_type;

-- 뷰 생성: 주간 TOP 5 질문
CREATE VIEW IF NOT EXISTS weekly_top_questions AS
SELECT 
  qws.*,
  ROW_NUMBER() OVER (ORDER BY qws.like_count DESC, qws.created_at ASC) as rank
FROM questions_with_stats qws
WHERE qws.date >= date('now', '-7 days')
ORDER BY qws.like_count DESC, qws.created_at ASC
LIMIT 5;