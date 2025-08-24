import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

// TypeScript 바인딩 정의
type Bindings = {
  DB: D1Database;
  AI: Ai;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// JSX 렌더러 사용
app.use(renderer)

// =================
// 인증 관련 API
// =================

// 로그인 API
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    if (!username || !password) {
      return c.json({ error: '사용자명과 비밀번호를 입력해주세요.' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, username, full_name, user_type FROM users WHERE username = ? AND password_hash = ?'
    ).bind(username, password).first()

    if (!user) {
      return c.json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    return c.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        user_type: user.user_type
      }
    })
  } catch (error) {
    return c.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원가입 API
app.post('/api/auth/register', async (c) => {
  try {
    const { username, password, full_name, user_type } = await c.req.json()
    
    if (!username || !password || !full_name || !user_type) {
      return c.json({ error: '모든 필드를 입력해주세요.' }, 400)
    }

    if (!['teacher', 'student'].includes(user_type)) {
      return c.json({ error: '올바른 사용자 유형을 선택해주세요.' }, 400)
    }

    // 사용자명 중복 확인
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first()

    if (existingUser) {
      return c.json({ error: '이미 사용 중인 사용자명입니다.' }, 409)
    }

    // 새 사용자 생성
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash, full_name, user_type) VALUES (?, ?, ?, ?)'
    ).bind(username, password, full_name, user_type).run()

    return c.json({ 
      success: true,
      user_id: result.meta.last_row_id,
      message: '회원가입이 완료되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// =================
// 질문 관련 API
// =================

// 질문 목록 조회 (메인 피드)
app.get('/api/questions', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = (page - 1) * limit

    const questions = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    return c.json({ success: true, questions: questions.results })
  } catch (error) {
    return c.json({ error: '질문을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 특정 날짜의 질문 조회
app.get('/api/questions/date/:date', async (c) => {
  try {
    const date = c.req.param('date')
    
    const questions = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats 
      WHERE date = ? 
      ORDER BY like_count DESC, created_at ASC
    `).bind(date).all()

    return c.json({ success: true, questions: questions.results })
  } catch (error) {
    return c.json({ error: '해당 날짜의 질문을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 주간 TOP 5 질문 조회
app.get('/api/questions/top-weekly', async (c) => {
  try {
    const topQuestions = await c.env.DB.prepare(`
      SELECT * FROM weekly_top_questions
    `).all()

    return c.json({ success: true, questions: topQuestions.results })
  } catch (error) {
    return c.json({ error: 'TOP 5 질문을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 질문 작성
app.post('/api/questions', async (c) => {
  try {
    const { user_id, content } = await c.req.json()
    
    if (!user_id || !content) {
      return c.json({ error: '사용자 ID와 질문 내용을 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO questions (user_id, content) VALUES (?, ?)'
    ).bind(user_id, content).run()

    // 생성된 질문 정보 반환
    const newQuestion = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats WHERE id = ?
    `).bind(result.meta.last_row_id).first()

    return c.json({ 
      success: true, 
      question: newQuestion,
      message: '질문이 성공적으로 등록되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '질문 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// =================
// 댓글 관련 API  
// =================

// 특정 질문의 댓글 조회
app.get('/api/questions/:id/comments', async (c) => {
  try {
    const questionId = c.req.param('id')
    
    const comments = await c.env.DB.prepare(`
      SELECT c.*, u.full_name as author_name, u.user_type as author_type
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.question_id = ?
      ORDER BY c.created_at ASC
    `).bind(questionId).all()

    return c.json({ success: true, comments: comments.results })
  } catch (error) {
    return c.json({ error: '댓글을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 댓글 작성
app.post('/api/questions/:id/comments', async (c) => {
  try {
    const questionId = c.req.param('id')
    const { user_id, content } = await c.req.json()
    
    if (!user_id || !content) {
      return c.json({ error: '사용자 ID와 댓글 내용을 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO comments (question_id, user_id, content) VALUES (?, ?, ?)'
    ).bind(questionId, user_id, content).run()

    // 생성된 댓글 정보 반환
    const newComment = await c.env.DB.prepare(`
      SELECT c.*, u.full_name as author_name, u.user_type as author_type
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).bind(result.meta.last_row_id).first()

    return c.json({ 
      success: true, 
      comment: newComment,
      message: '댓글이 성공적으로 등록되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '댓글 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// =================
// 좋아요 관련 API
// =================

// 좋아요 토글
app.post('/api/questions/:id/like', async (c) => {
  try {
    const questionId = c.req.param('id')
    const { user_id } = await c.req.json()
    
    if (!user_id) {
      return c.json({ error: '사용자 ID를 입력해주세요.' }, 400)
    }

    // 기존 좋아요 확인
    const existingLike = await c.env.DB.prepare(
      'SELECT id FROM likes WHERE question_id = ? AND user_id = ?'
    ).bind(questionId, user_id).first()

    if (existingLike) {
      // 좋아요 취소
      await c.env.DB.prepare(
        'DELETE FROM likes WHERE question_id = ? AND user_id = ?'
      ).bind(questionId, user_id).run()
      
      return c.json({ 
        success: true, 
        action: 'unliked',
        message: '좋아요를 취소했습니다.'
      })
    } else {
      // 좋아요 추가
      await c.env.DB.prepare(
        'INSERT INTO likes (question_id, user_id) VALUES (?, ?)'
      ).bind(questionId, user_id).run()
      
      return c.json({ 
        success: true, 
        action: 'liked',
        message: '좋아요를 눌렀습니다.'
      })
    }
  } catch (error) {
    return c.json({ error: '좋아요 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// =================
// AI 챗봇 API
// =================

// AI 챗봇과 대화
app.post('/api/ai/chat', async (c) => {
  try {
    const { message, user_id } = await c.req.json()
    
    if (!message) {
      return c.json({ error: '메시지를 입력해주세요.' }, 400)
    }

    // Cloudflare AI를 사용하여 응답 생성
    const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        {
          role: 'system',
          content: '당신은 학생들이 깊이 있는 질문을 만들 수 있도록 도와주는 친근한 AI 어시스턴트입니다. 창의적이고 생각을 자극하는 질문 아이디어를 제공하고, 질문 작성 방법을 알려주세요.'
        },
        {
          role: 'user', 
          content: message
        }
      ]
    })

    // AI 채팅 세션 저장 (선택적)
    if (user_id) {
      const sessionData = JSON.stringify({
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: response.response }
        ]
      })
      
      await c.env.DB.prepare(
        'INSERT INTO ai_chat_sessions (user_id, session_data) VALUES (?, ?)'
      ).bind(user_id, sessionData).run()
    }

    return c.json({ 
      success: true, 
      response: response.response 
    })
  } catch (error) {
    return c.json({ 
      success: true,
      response: '안녕하세요! 깊이 있는 질문을 만드는 데 도움을 드릴게요. 어떤 주제에 대해 질문을 만들어보고 싶으신가요? 예를 들어, "우정", "환경", "미래" 등의 주제로 시작해보세요!'
    })
  }
})

// =================
// 메인 페이지
// =================
app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-notion-50">
      {/* Header */}
      <header class="bg-white shadow-sm border-b border-notion-200">
        <div class="max-w-6xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <i class="fas fa-comments text-2xl text-blue-600"></i>
              <h1 class="text-2xl font-bold text-gray-800">깊이있는 질문 교실</h1>
            </div>
            <div id="user-menu" class="hidden">
              <div class="flex items-center space-x-4">
                <span id="user-name" class="text-gray-700"></span>
                <button id="logout-btn" class="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                  로그아웃
                </button>
              </div>
            </div>
            <div id="auth-menu">
              <div class="flex items-center space-x-4">
                <button id="login-btn" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  로그인
                </button>
                <button id="register-btn" class="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                  회원가입
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      <div id="login-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold">로그인</h2>
              <button class="modal-close text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <form id="login-form">
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">사용자명</label>
                <input type="text" name="username" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="mb-6">
                <label class="block text-sm font-medium mb-2">비밀번호</label>
                <input type="password" name="password" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" 
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
                로그인
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      <div id="register-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold">회원가입</h2>
              <button class="modal-close text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <form id="register-form">
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">사용자명</label>
                <input type="text" name="username" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">실명</label>
                <input type="text" name="full_name" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">비밀번호</label>
                <input type="password" name="password" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="mb-6">
                <label class="block text-sm font-medium mb-2">계정 유형</label>
                <select name="user_type" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택해주세요</option>
                  <option value="student">학생</option>
                  <option value="teacher">교사</option>
                </select>
              </div>
              <button type="submit" 
                      class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors">
                회원가입
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main class="max-w-6xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Calendar & Rankings */}
          <div class="lg:col-span-1 space-y-6">
            {/* Calendar Widget */}
            <div class="bg-white rounded-lg p-4 shadow-sm border border-notion-200">
              <h3 class="font-semibold mb-3 flex items-center">
                <i class="fas fa-calendar-alt mr-2 text-blue-600"></i>
                날짜별 질문 보기
              </h3>
              <div id="calendar-widget">
                <input type="date" id="date-picker" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            {/* Weekly Top 5 */}
            <div class="bg-white rounded-lg p-4 shadow-sm border border-notion-200">
              <h3 class="font-semibold mb-3 flex items-center">
                <i class="fas fa-trophy mr-2 text-yellow-600"></i>
                이번주 TOP 5
              </h3>
              <div id="top-questions" class="space-y-2">
                <div class="text-center text-gray-500 text-sm py-8">
                  로딩 중...
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div class="lg:col-span-2">
            {/* Question Form (for logged in users) */}
            <div id="question-form-container" class="hidden bg-white rounded-lg p-4 shadow-sm border border-notion-200 mb-6">
              <h3 class="font-semibold mb-3 flex items-center">
                <i class="fas fa-edit mr-2 text-green-600"></i>
                새로운 질문 작성
              </h3>
              <form id="question-form">
                <textarea name="content" placeholder="깊이 있는 질문을 작성해보세요..." required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                <div class="mt-3 flex justify-end">
                  <button type="submit" 
                          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    질문 등록
                  </button>
                </div>
              </form>
            </div>

            {/* Questions Feed */}
            <div id="questions-feed" class="space-y-4">
              <div class="text-center text-gray-500 py-8">
                로딩 중...
              </div>
            </div>
          </div>

          {/* Right Sidebar - AI Chat */}
          <div class="lg:col-span-1">
            <div class="bg-white rounded-lg p-4 shadow-sm border border-notion-200">
              <h3 class="font-semibold mb-3 flex items-center">
                <i class="fas fa-robot mr-2 text-purple-600"></i>
                AI 질문 도우미
              </h3>
              <div id="ai-chat" class="space-y-3">
                <div class="bg-gray-50 rounded-lg p-3 text-sm">
                  <div class="flex items-start space-x-2">
                    <i class="fas fa-robot text-purple-600 mt-1"></i>
                    <div>
                      안녕하세요! 좋은 질문을 만드는 데 도움을 드릴게요. 무엇이든 물어보세요!
                    </div>
                  </div>
                </div>
                <div id="ai-messages" class="space-y-2 max-h-64 overflow-y-auto"></div>
                <form id="ai-chat-form">
                  <div class="flex space-x-2">
                    <input type="text" name="message" placeholder="AI에게 질문해보세요..." required
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <button type="submit" 
                            class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      <i class="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
    </div>
  )
})

export default app
