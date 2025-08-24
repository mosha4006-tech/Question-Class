-- 새로운 시드 데이터 (교사와 학생 분리)

-- 기존 데이터 삭제
DELETE FROM likes;
DELETE FROM comments;  
DELETE FROM questions;
DELETE FROM ai_chat_sessions;
DELETE FROM classes;
DELETE FROM users;

-- 교사 계정 생성
INSERT OR IGNORE INTO users (username, password_hash, full_name, email, user_type, class_name) VALUES 
  ('teacher1', 'password123', '김선생님', 'teacher@school.edu', 'teacher', '3학년 1반'),
  ('teacher2', 'password123', '이선생님', 'teacher2@school.edu', 'teacher', '3학년 2반');

-- 클래스 생성
INSERT OR IGNORE INTO classes (name, teacher_id) VALUES 
  ('3학년 1반', 1),
  ('3학년 2반', 2);

-- 3학년 1반 학생들
INSERT OR IGNORE INTO users (username, password_hash, full_name, user_type, class_name) VALUES 
  ('student1', 'password123', '박지민', 'student', '3학년 1반'),
  ('student2', 'password123', '이서준', 'student', '3학년 1반'),
  ('student3', 'password123', '최하린', 'student', '3학년 1반'),
  ('student4', 'password123', '정민수', 'student', '3학년 1반'),
  ('student5', 'password123', '김예은', 'student', '3학년 1반');

-- 3학년 2반 학생들  
INSERT OR IGNORE INTO users (username, password_hash, full_name, user_type, class_name) VALUES 
  ('student6', 'password123', '송태우', 'student', '3학년 2반'),
  ('student7', 'password123', '윤서연', 'student', '3학년 2반'),
  ('student8', 'password123', '장유진', 'student', '3학년 2반');

-- 3학년 1반 테스트 질문들 (사용자 ID 수정)
INSERT OR IGNORE INTO questions (user_id, content, date) VALUES 
  -- 오늘 질문들  
  (3, '우리가 살아가면서 가장 소중하게 여겨야 할 가치는 무엇일까요?', date('now')),
  (4, '미래의 교육은 어떤 모습일까요? AI와 인간이 함께 배우는 세상을 상상해보세요.', date('now')),
  (5, '만약 시간여행이 가능하다면, 과거와 미래 중 어디로 가고 싶나요?', date('now')),
  (6, '지구 환경을 보호하기 위해 우리 학교에서 실천할 수 있는 방법은?', date('now')),
  (7, '진정한 친구란 무엇인지에 대해 여러분의 생각을 들려주세요.', date('now')),
  
  -- 어제 질문들
  (3, '예술이 우리 삶에 미치는 영향은 무엇일까요?', date('now', '-1 day')),
  (4, '만약 하루 동안 투명인간이 된다면 무엇을 하고 싶나요?', date('now', '-1 day')),
  (5, '우리나라의 전통문화 중 미래 세대에게 꼭 전해주고 싶은 것은?', date('now', '-1 day')),
  
  -- 이번 주 질문들
  (6, '책을 읽는 것과 영상을 보는 것, 어떤 차이가 있을까요?', date('now', '-2 days')),
  (7, '만약 여러분이 학교 교장이 된다면 어떤 변화를 만들고 싶나요?', date('now', '-3 days')),
  (3, '로봇과 인공지능이 발달하면 인간의 역할은 어떻게 바뀔까요?', date('now', '-4 days')),
  (4, '꿈을 이루기 위해 가장 중요한 것은 무엇이라고 생각하나요?', date('now', '-5 days'));

-- 3학년 2반 테스트 질문들 (사용자 ID 수정)
INSERT OR IGNORE INTO questions (user_id, content, date) VALUES 
  (8, '과학기술의 발달이 우리 생활에 미치는 긍정적인 영향과 부정적인 영향은?', date('now')),
  (9, '만약 세계 여행을 할 수 있다면 가장 가고 싶은 나라와 그 이유는?', date('now')),
  (10, '환경 보호를 위해 개인이 할 수 있는 가장 중요한 일은 무엇일까요?', date('now'));

-- 테스트 댓글들 (3학년 1반)
INSERT OR IGNORE INTO comments (question_id, user_id, content) VALUES 
  (1, 4, '저는 가족과의 소중한 시간이라고 생각해요!'),
  (1, 5, '정직함과 배려심이 가장 중요한 것 같습니다.'),
  (1, 6, '꿈을 포기하지 않는 것도 소중한 가치라고 봅니다.'),
  (2, 3, '정말 흥미로운 질문이네요! 저도 생각해보겠습니다.'),
  (2, 5, 'VR과 AR 기술로 역사 속으로 직접 들어가서 배우는 교육이 가능할 것 같아요!'),
  (3, 4, '과거로 가서 역사의 현장을 직접 보고 싶어요.'),
  (4, 5, '플라스틱 사용을 줄이고 분리수거를 더 철저히 하는 것부터 시작하면 좋을 것 같아요!');

-- 테스트 좋아요들 (3학년 1반)
INSERT OR IGNORE INTO likes (question_id, user_id) VALUES 
  -- 첫 번째 질문이 가장 인기 (4개 좋아요)
  (1, 1), (1, 4), (1, 5), (1, 6),
  -- 두 번째 질문 (3개 좋아요)  
  (2, 1), (2, 3), (2, 7),
  -- 세 번째 질문 (2개 좋아요)
  (3, 1), (3, 5),
  -- 네 번째 질문 (3개 좋아요)
  (4, 1), (4, 3), (4, 4),
  -- 다른 질문들에도 좋아요
  (5, 1), (5, 6),
  (6, 3), (6, 4),
  (7, 1), (7, 5),
  (8, 3), (8, 6),
  (9, 4), (9, 7),
  (10, 3), (10, 5),
  (11, 6), (11, 7),
  (12, 4), (12, 5);

-- 3학년 2반 좋아요들
INSERT OR IGNORE INTO likes (question_id, user_id) VALUES 
  (13, 2), (13, 9), (13, 10),
  (14, 2), (14, 8),
  (15, 2), (15, 8), (15, 9);

-- AI 채팅 세션 테스트 데이터
INSERT OR IGNORE INTO ai_chat_sessions (user_id, session_data) VALUES 
  (3, '{"messages": [{"role": "user", "content": "좋은 질문을 만드는 방법을 알려주세요"}, {"role": "assistant", "content": "좋은 질문은 열린 질문이어야 하며, 생각을 자극하는 내용이어야 합니다."}]}'),
  (4, '{"messages": [{"role": "user", "content": "창의적인 질문 아이디어가 필요해요"}, {"role": "assistant", "content": "일상적인 것들을 다른 관점에서 보는 질문을 만들어보세요."}]}');