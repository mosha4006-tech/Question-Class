# 깊이있는 질문 교실 📚🤔

## 프로젝트 개요
- **이름**: 깊이있는 질문 교실
- **목표**: 학생들이 깊이 있는 질문을 만들고 공유하며, 서로의 생각을 나누는 교육용 웹 플랫폼
- **주요 기능**: 
  - 질문 작성 및 공유
  - 좋아요 및 댓글 시스템
  - 주간 TOP 5 랭킹
  - 달력 기반 날짜별 질문 조회
  - AI 질문 도우미 채팅봇
  - 교사/학생 계정 구분

## URLs
- **개발 서버**: https://3000-iqzp54nisg6fy00wpkzia-6532622b.e2b.dev
- **API 엔드포인트**: https://3000-iqzp54nisg6fy00wpkzia-6532622b.e2b.dev/api
- **GitHub**: (배포 준비 완료)

## 현재 완료된 기능
1. ✅ **사용자 인증 시스템** - 회원가입, 로그인, 교사/학생 구분
2. ✅ **질문 작성 및 피드** - 실시간 질문 작성 및 조회
3. ✅ **좋아요 시스템** - 질문에 좋아요 누르기 및 취소
4. ✅ **댓글 시스템** - 질문에 댓글 작성 및 조회
5. ✅ **주간 TOP 5 랭킹** - 좋아요 수 기반 인기 질문 순위
6. ✅ **달력 기능** - 날짜별 질문 필터링 및 조회
7. ✅ **AI 챗봇** - Cloudflare AI를 활용한 질문 작성 도우미
8. ✅ **노션 스타일 UI** - 깔끔하고 모던한 디자인
9. ✅ **반응형 디자인** - 모바일/데스크톱 최적화

## API 엔드포인트 요약

### 인증 API
- `POST /api/auth/login` - 로그인 (username, password)
- `POST /api/auth/register` - 회원가입 (username, password, full_name, user_type)

### 질문 API
- `GET /api/questions` - 질문 목록 조회 (페이지네이션)
- `POST /api/questions` - 새 질문 작성 (user_id, content)
- `GET /api/questions/date/:date` - 특정 날짜 질문 조회
- `GET /api/questions/top-weekly` - 주간 TOP 5 질문

### 댓글 API
- `GET /api/questions/:id/comments` - 특정 질문의 댓글 조회
- `POST /api/questions/:id/comments` - 댓글 작성 (user_id, content)

### 좋아요 API
- `POST /api/questions/:id/like` - 좋아요 토글 (user_id)

### AI 챗봇 API
- `POST /api/ai/chat` - AI와 대화 (message, user_id?)

## 데이터 아키텍처
- **데이터베이스**: Cloudflare D1 (SQLite 기반)
- **주요 테이블**:
  - `users` - 사용자 정보 (교사/학생 구분)
  - `questions` - 질문 데이터
  - `comments` - 댓글 데이터
  - `likes` - 좋아요 데이터
  - `ai_chat_sessions` - AI 채팅 기록
- **뷰**: `questions_with_stats`, `weekly_top_questions` - 통계 정보 포함
- **AI 서비스**: Cloudflare AI (@cf/meta/llama-2-7b-chat-int8)

## 테스트 계정
- **교사**: username=`teacher1`, password=`hashed_password_123`, 이름=`김선생님`
- **학생들**: 
  - username=`student1`, password=`hashed_password_456`, 이름=`박지민`
  - username=`student2`, password=`hashed_password_789`, 이름=`이서준`
  - username=`student3`, password=`hashed_password_abc`, 이름=`최하린`
  - username=`student4`, password=`hashed_password_def`, 이름=`정민수`

## 사용자 가이드

### 일반 사용자 (비로그인)
1. 메인 페이지에서 모든 질문과 댓글을 조회할 수 있습니다
2. 달력에서 특정 날짜를 선택하여 해당 날짜의 질문을 볼 수 있습니다
3. 주간 TOP 5 랭킹을 확인할 수 있습니다
4. AI 챗봇과 질문 연습이 가능합니다

### 로그인 사용자
1. **회원가입**: 상단 '회원가입' 버튼을 클릭하여 계정을 생성합니다
2. **로그인**: 사용자명과 비밀번호로 로그인합니다
3. **질문 작성**: 중앙 피드 상단에서 새로운 질문을 작성할 수 있습니다
4. **좋아요**: 질문 하단의 하트 아이콘을 클릭하여 좋아요를 누릅니다
5. **댓글 작성**: 질문 하단의 댓글 아이콘을 클릭 후 댓글을 작성합니다
6. **AI 도우미**: 우측 사이드바의 AI 챗봇과 대화하여 질문 아이디어를 얻습니다

### 교사 계정 특징
- 교사로 가입하면 프로필에 '교사' 뱃지가 표시됩니다
- 모든 기능을 동일하게 사용할 수 있습니다
- 향후 관리자 기능 추가 예정

## 배포 상태
- **플랫폼**: Cloudflare Pages (준비 완료)
- **현재 상태**: ✅ 개발 서버 활성
- **기술 스택**: Hono + TypeScript + TailwindCSS + D1 Database + Cloudflare AI
- **마지막 업데이트**: 2025-08-24

## 아직 구현되지 않은 기능
1. 🔄 **실시간 알림**: 새 댓글, 좋아요 실시간 알림
2. 🔄 **검색 기능**: 질문 내용 검색
3. 🔄 **카테고리/태그**: 질문 분류 시스템
4. 🔄 **프로필 페이지**: 사용자별 질문 기록 조회
5. 🔄 **관리자 대시보드**: 교사용 통계 및 관리 기능
6. 🔄 **이미지 첨부**: 질문/댓글에 이미지 업로드
7. 🔄 **좋아요 알림**: 좋아요받은 질문 알림

## 권장 다음 개발 단계
1. **Cloudflare Pages 배포**: 프로덕션 환경 배포
2. **실시간 기능 강화**: WebSocket 또는 Server-Sent Events 추가
3. **검색 및 필터**: 고급 검색 기능 구현
4. **관리자 기능**: 교사용 대시보드 및 통계
5. **모바일 앱**: PWA 또는 네이티브 앱 개발
6. **성능 최적화**: 이미지 최적화, 캐싱 전략

---

## 개발 명령어

### 로컬 개발
```bash
npm install                    # 의존성 설치
npm run build                  # 프로젝트 빌드
npm run db:migrate:local       # 로컬 DB 마이그레이션
npm run db:seed                # 테스트 데이터 삽입
npm run dev:sandbox            # 개발 서버 시작 (샌드박스용)
```

### 데이터베이스 관리
```bash
npm run db:reset               # 로컬 DB 초기화 및 시드
npm run db:console:local       # 로컬 DB 콘솔
npm run db:migrate:prod        # 프로덕션 DB 마이그레이션
```

### 배포
```bash
npm run deploy                 # Cloudflare Pages 배포
npm run cf-typegen             # TypeScript 타입 생성
```

이 프로젝트는 교육 현장에서 학생들의 비판적 사고력과 질문 능력을 향상시키기 위한 미래지향적인 플랫폼입니다! 🚀