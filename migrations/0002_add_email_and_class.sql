-- 사용자 테이블에 이메일과 클래스 정보 추가
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN class_name TEXT;
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;

-- 이메일 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 클래스 테이블 생성
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  teacher_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 클래스 인덱스
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- 질문 뷰 업데이트를 위해 기존 뷰 삭제
DROP VIEW IF EXISTS questions_with_stats;
DROP VIEW IF EXISTS weekly_top_questions;

-- 새로운 질문 뷰 생성 (클래스 정보 포함)
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
  u.class_name,
  COUNT(l.id) as like_count,
  COUNT(c.id) as comment_count
FROM questions q
LEFT JOIN users u ON q.user_id = u.id
LEFT JOIN likes l ON q.id = l.question_id
LEFT JOIN comments c ON q.id = c.question_id
GROUP BY q.id, q.user_id, q.content, q.created_at, q.updated_at, q.date, u.full_name, u.user_type, u.class_name;

-- 주간 TOP 5 질문 뷰 (클래스별)
CREATE VIEW IF NOT EXISTS weekly_top_questions AS
SELECT 
  qws.*,
  ROW_NUMBER() OVER (PARTITION BY qws.class_name ORDER BY qws.like_count DESC, qws.created_at ASC) as rank
FROM questions_with_stats qws
WHERE qws.date >= date('now', '-7 days')
ORDER BY qws.class_name, qws.like_count DESC, qws.created_at ASC;