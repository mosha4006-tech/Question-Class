-- 질문 테이블에 이유와 카테고리 필드 추가
ALTER TABLE questions ADD COLUMN reason TEXT;
ALTER TABLE questions ADD COLUMN category TEXT;

-- 기존 뷰 삭제
DROP VIEW IF EXISTS questions_with_stats;
DROP VIEW IF EXISTS weekly_top_questions;

-- 새로운 질문 뷰 생성 (reason, category 포함)
CREATE VIEW IF NOT EXISTS questions_with_stats AS
SELECT 
  q.id,
  q.user_id,
  q.content,
  q.reason,
  q.category,
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
GROUP BY q.id, q.user_id, q.content, q.reason, q.category, q.created_at, q.updated_at, q.date, u.full_name, u.user_type, u.class_name;

-- 주간 TOP 5 질문 뷰 (클래스별)
CREATE VIEW IF NOT EXISTS weekly_top_questions AS
SELECT 
  qws.*,
  ROW_NUMBER() OVER (PARTITION BY qws.class_name ORDER BY qws.like_count DESC, qws.created_at ASC) as rank
FROM questions_with_stats qws
WHERE qws.date >= date('now', '-7 days')
ORDER BY qws.class_name, qws.like_count DESC, qws.created_at ASC;