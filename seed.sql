-- 테스트 데이터 삽입

-- 테스트 사용자들 (교사 1명, 학생 4명)
INSERT OR IGNORE INTO users (username, password_hash, full_name, user_type) VALUES 
  ('teacher1', 'hashed_password_123', '김선생님', 'teacher'),
  ('student1', 'hashed_password_456', '박지민', 'student'),
  ('student2', 'hashed_password_789', '이서준', 'student'),
  ('student3', 'hashed_password_abc', '최하린', 'student'),
  ('student4', 'hashed_password_def', '정민수', 'student');

-- 테스트 질문들 (다양한 날짜로)
INSERT OR IGNORE INTO questions (user_id, content, date) VALUES 
  (2, '우리가 살아가면서 가장 소중하게 여겨야 할 가치는 무엇일까요?', date('now')),
  (3, '미래의 교육은 어떤 모습일까요? AI와 인간이 함께 배우는 세상을 상상해보세요.', date('now')),
  (4, '만약 시간여행이 가능하다면, 과거와 미래 중 어디로 가고 싶나요? 그 이유는?', date('now')),
  (5, '지구 환경을 보호하기 위해 우리 학교에서 실천할 수 있는 방법은 무엇이 있을까요?', date('now')),
  (2, '진정한 친구란 무엇인지에 대해 여러분의 생각을 들려주세요.', date('now', '-1 day')),
  (3, '예술이 우리 삶에 미치는 영향은 무엇일까요?', date('now', '-1 day')),
  (4, '만약 하루 동안 투명인간이 된다면 무엇을 하고 싶나요?', date('now', '-2 days')),
  (5, '우리나라의 전통문화 중 미래 세대에게 꼭 전해주고 싶은 것은?', date('now', '-2 days'));

-- 테스트 댓글들
INSERT OR IGNORE INTO comments (question_id, user_id, content) VALUES 
  (1, 3, '저는 가족과의 소중한 시간이라고 생각해요!'),
  (1, 4, '정직함과 배려심이 가장 중요한 것 같습니다.'),
  (1, 5, '꿈을 포기하지 않는 것도 소중한 가치라고 봅니다.'),
  (2, 2, '정말 흥미로운 질문이네요! 저도 생각해보겠습니다.'),
  (2, 4, 'VR과 AR 기술로 역사 속으로 직접 들어가서 배우는 교육이 가능할 것 같아요!'),
  (3, 2, '과거로 가서 역사의 현장을 직접 보고 싶어요.'),
  (4, 3, '플라스틱 사용을 줄이고 분리수거를 더 철저히 하는 것부터 시작하면 좋을 것 같아요!');

-- 테스트 좋아요들 (인기 질문 만들기)
INSERT OR IGNORE INTO likes (question_id, user_id) VALUES 
  -- 첫 번째 질문이 가장 인기 (4개 좋아요)
  (1, 1), (1, 3), (1, 4), (1, 5),
  -- 두 번째 질문 (3개 좋아요)
  (2, 1), (2, 2), (2, 5),
  -- 세 번째 질문 (2개 좋아요)
  (3, 1), (3, 4),
  -- 네 번째 질문 (3개 좋아요)
  (4, 1), (4, 2), (4, 3),
  -- 다른 질문들에도 좋아요
  (5, 1), (5, 4),
  (6, 2), (6, 3),
  (7, 1),
  (8, 2), (8, 5);

-- AI 채팅 세션 테스트 데이터
INSERT OR IGNORE INTO ai_chat_sessions (user_id, session_data) VALUES 
  (2, '{"messages": [{"role": "user", "content": "좋은 질문을 만드는 방법을 알려주세요"}, {"role": "assistant", "content": "좋은 질문은 열린 질문이어야 하며, 생각을 자극하는 내용이어야 합니다."}]}'),
  (3, '{"messages": [{"role": "user", "content": "창의적인 질문 아이디어가 필요해요"}, {"role": "assistant", "content": "일상적인 것들을 다른 관점에서 보는 질문을 만들어보세요."}]}');