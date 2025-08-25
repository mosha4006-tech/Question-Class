-- 데모용 추가 데이터 시드 파일
-- 더 흥미로운 질문들과 좋아요를 추가하여 TOP 5와 실시간 기능을 보여줄 수 있도록 설정

-- 더 많은 흥미로운 질문들 추가 (3학년 1반)
INSERT OR IGNORE INTO questions (user_id, content, created_at, date) VALUES 
  -- Student1 (박지민 - ID 3)이 작성한 질문들
  (3, '만약 지구가 평평했다면 우리 생활은 어떻게 달라질까요?', datetime('now', '-2 days', '+1 hour'), date('now', '-2 days')),
  (3, '왜 어른들은 아이들에게 "꿈을 가져라"라고 말할까요? 꿈이 없으면 안 되는 걸까요?', datetime('now', '-1 day', '+2 hours'), date('now', '-1 day')),
  (3, '인공지능이 발달하면 인간만의 고유한 능력은 무엇이 될까요?', datetime('now', '-3 hours'), date('now')),

  -- Student2 (이서준 - ID 4)이 작성한 질문들  
  (4, '시간을 되돌릴 수 있다면, 역사의 어떤 순간을 바꾸고 싶으신가요? 그리고 그 결과는?', datetime('now', '-2 days', '+3 hours'), date('now', '-2 days')),
  (4, '만약 동물들이 말을 할 수 있다면, 가장 먼저 무엇을 물어보고 싶나요?', datetime('now', '-1 day', '+4 hours'), date('now', '-1 day')),
  (4, '우주가 무한히 크다면, 똑같은 나가 어딘가에 또 있을 가능성이 있을까요?', datetime('now', '-2 hours'), date('now')),

  -- Student3 (최하린 - ID 5) - 우리가 테스트할 계정
  (5, '왜 사람들은 슬픈 영화를 보면서 울까요? 슬픈 걸 좋아하는 건가요?', datetime('now', '-2 days', '+30 minutes'), date('now', '-2 days')),
  (5, '만약 색깔이 없는 세상이라면, 사람들은 어떤 방식으로 아름다움을 느꼈을까요?', datetime('now', '-1 day', '+1 hour'), date('now', '-1 day')),

  -- Student4 (정민수 - ID 6)
  (6, '거짓말이 나쁜 것이라면, 왜 "하얀 거짓말"이라는 말이 있을까요?', datetime('now', '-2 days', '+2 hours'), date('now', '-2 days')),
  (6, '만약 우리가 꿈속에서만 살 수 있다면, 현실과 꿈 중 어느 것이 더 진짜일까요?', datetime('now', '-4 hours'), date('now')),

  -- Student5 (김예은 - ID 7)  
  (7, '왜 사람들은 혼자 있는 것을 두려워할까요? 혼자만의 시간이 주는 장점은 무엇일까요?', datetime('now', '-1 day', '+3 hours'), date('now', '-1 day')),
  (7, '만약 기억을 마음대로 지우거나 추가할 수 있다면, 당신은 어떤 기억을 바꾸고 싶나요?', datetime('now', '-1 hour'), date('now'));

-- 먼저 현재 질문 ID를 확인하고 새로 추가될 질문들에 대해 좋아요 추가
-- 질문 ID는 자동 증가하므로 기존 + 새로 추가된 것들을 고려

-- 흥미로운 좋아요 패턴 생성 (TOP 5를 만들기 위해) 
-- 새로 추가되는 질문들에 대한 좋아요 (질문 ID는 실행 후 확인 필요)
-- 임시로 높은 ID 사용하고, 실제로는 API를 통해 추가하는 것이 안전함











-- 댓글은 질문 ID가 확정된 후 API를 통해 추가하는 것이 안전함