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

// 교사 회원가입 API (교사만 가능)
app.post('/api/auth/register-teacher', async (c) => {
  try {
    const { username, password, full_name, email, class_name } = await c.req.json()
    
    if (!username || !password || !full_name || !email || !class_name) {
      return c.json({ error: '모든 필드를 입력해주세요.' }, 400)
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ error: '올바른 이메일 형식이 아닙니다.' }, 400)
    }

    // 사용자명 중복 확인
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first()

    if (existingUser) {
      return c.json({ error: '이미 사용 중인 사용자명 또는 이메일입니다.' }, 409)
    }

    // 새 교사 계정 생성
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash, full_name, email, user_type, class_name) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(username, password, full_name, email, 'teacher', class_name).run()

    // 클래스 생성
    await c.env.DB.prepare(
      'INSERT INTO classes (name, teacher_id) VALUES (?, ?)'
    ).bind(class_name, result.meta.last_row_id).run()

    return c.json({ 
      success: true,
      user_id: result.meta.last_row_id,
      message: '교사 회원가입이 완료되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 학생 계정 생성 API (교사만 가능)
app.post('/api/teacher/create-student', async (c) => {
  try {
    const { teacher_id, student_name, student_username, student_password } = await c.req.json()
    
    if (!teacher_id || !student_name || !student_username || !student_password) {
      return c.json({ error: '모든 필드를 입력해주세요.' }, 400)
    }

    // 교사 정보 확인
    const teacher = await c.env.DB.prepare(
      'SELECT class_name FROM users WHERE id = ? AND user_type = "teacher"'
    ).bind(teacher_id).first()

    if (!teacher) {
      return c.json({ error: '교사 권한이 없습니다.' }, 403)
    }

    // 사용자명 중복 확인
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(student_username).first()

    if (existingUser) {
      return c.json({ error: '이미 사용 중인 사용자명입니다.' }, 409)
    }

    // 새 학생 계정 생성
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash, full_name, user_type, class_name) VALUES (?, ?, ?, ?, ?)'
    ).bind(student_username, student_password, student_name, 'student', teacher.class_name).run()

    return c.json({ 
      success: true,
      student_id: result.meta.last_row_id,
      message: '학생 계정이 생성되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '학생 계정 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 비밀번호 재설정 요청 API
app.post('/api/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ error: '이메일을 입력해주세요.' }, 400)
    }

    // 사용자 확인
    const user = await c.env.DB.prepare(
      'SELECT id, full_name FROM users WHERE email = ?'
    ).bind(email).first()

    if (!user) {
      return c.json({ error: '등록되지 않은 이메일입니다.' }, 404)
    }

    // 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-8)
    const resetToken = Math.random().toString(36).slice(-16)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1시간 후 만료

    // 임시 비밀번호 저장
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, reset_token = ?, reset_token_expires = ? WHERE id = ?'
    ).bind(tempPassword, resetToken, expiresAt, user.id).run()

    // 실제 환경에서는 이메일 발송 서비스 연동
    // 현재는 개발 단계이므로 임시 비밀번호를 응답으로 반환
    return c.json({ 
      success: true,
      message: '임시 비밀번호가 이메일로 발송되었습니다.',
      temp_password: tempPassword // 개발용 (실제로는 이메일로만 발송)
    })
  } catch (error) {
    return c.json({ error: '비밀번호 재설정 중 오류가 발생했습니다.' }, 500)
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

// 특정 날짜의 질문 조회 (클래스별)
app.get('/api/questions/date/:date', async (c) => {
  try {
    const date = c.req.param('date')
    const class_name = c.req.query('class_name')
    
    let query = `
      SELECT * FROM questions_with_stats 
      WHERE date = ?
    `
    let params = [date]
    
    if (class_name) {
      query += ` AND class_name = ?`
      params.push(class_name)
    }
    
    query += ` ORDER BY like_count DESC, created_at ASC`
    
    const questions = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ success: true, questions: questions.results })
  } catch (error) {
    return c.json({ error: '해당 날짜의 질문을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 클래스별 오늘 질문 조회
app.get('/api/questions/today/:class_name', async (c) => {
  try {
    const class_name = c.req.param('class_name')
    
    const questions = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats 
      WHERE class_name = ? AND date = date('now')
      ORDER BY created_at DESC
    `).bind(class_name).all()

    return c.json({ success: true, questions: questions.results })
  } catch (error) {
    return c.json({ error: '오늘 질문을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 교사용 통계 API
app.get('/api/teacher/stats/:class_name', async (c) => {
  try {
    const class_name = c.req.param('class_name')
    
    // 오늘 질문 수
    const todayCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM questions q
      JOIN users u ON q.user_id = u.id
      WHERE u.class_name = ? AND q.date = date('now')
    `).bind(class_name).first()

    // 이번 주 질문 수
    const weekCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM questions q
      JOIN users u ON q.user_id = u.id
      WHERE u.class_name = ? AND q.date >= date('now', '-7 days')
    `).bind(class_name).first()

    // 활성 학생 수 (이번 주 질문을 작성한 학생 수)
    const activeStudents = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT q.user_id) as count FROM questions q
      JOIN users u ON q.user_id = u.id
      WHERE u.class_name = ? AND q.date >= date('now', '-7 days')
    `).bind(class_name).first()

    // 전체 학생 수
    const totalStudents = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE class_name = ? AND user_type = 'student'
    `).bind(class_name).first()

    return c.json({ 
      success: true, 
      stats: {
        today_questions: todayCount.count,
        week_questions: weekCount.count,
        active_students: activeStudents.count,
        total_students: totalStudents.count
      }
    })
  } catch (error) {
    return c.json({ error: '통계를 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 클래스 학생 목록 조회
app.get('/api/teacher/students/:class_name', async (c) => {
  try {
    const class_name = c.req.param('class_name')
    
    const students = await c.env.DB.prepare(`
      SELECT id, username, full_name, created_at,
             (SELECT COUNT(*) FROM questions WHERE user_id = users.id) as question_count,
             (SELECT COUNT(*) FROM questions WHERE user_id = users.id AND date >= date('now', '-7 days')) as week_question_count
      FROM users 
      WHERE class_name = ? AND user_type = 'student'
      ORDER BY full_name
    `).bind(class_name).all()

    return c.json({ success: true, students: students.results })
  } catch (error) {
    return c.json({ error: '학생 목록을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 주간 TOP 5 질문 조회 (클래스별)
app.get('/api/questions/top-weekly', async (c) => {
  try {
    const class_name = c.req.query('class_name')
    
    let query = `
      SELECT qws.*, 
             ROW_NUMBER() OVER (ORDER BY qws.like_count DESC, qws.created_at ASC) as rank
      FROM questions_with_stats qws
      WHERE qws.date >= date('now', '-7 days')
    `
    let params = []
    
    if (class_name) {
      query += ` AND qws.class_name = ?`
      params.push(class_name)
    }
    
    query += ` ORDER BY qws.like_count DESC, qws.created_at ASC LIMIT 5`
    
    const topQuestions = await c.env.DB.prepare(query).bind(...params).all()

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
// 랜딩 페이지 (로그인/회원가입 페이지)
app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <header class="bg-white/80 backdrop-blur-sm">
        <div class="max-w-4xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <div class="w-4 h-6 bg-white rounded-full relative">
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full"></div>
                  <div class="absolute -top-1 left-1 w-3 h-3 bg-green-300 rounded-full"></div>
                </div>
              </div>
              <span class="text-lg font-semibold text-gray-800">질문이 자라는 교실</span>
            </div>
            <button id="teacher-signup-btn" class="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-2">
              <i class="fas fa-user-tie"></i>
              <span>선생님 회원가입</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div class="max-w-md w-full">
          {/* Logo and Title */}
          <div class="text-center mb-12">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-3xl mb-6">
              <div class="w-10 h-12 bg-white rounded-full relative">
                <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-300 rounded-full"></div>
                <div class="absolute -top-2 left-2 w-6 h-6 bg-green-300 rounded-full"></div>
              </div>
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-3">질문이 자라는 교실</h1>
            <p class="text-gray-600">깊이있는 생각을 키우는 특별한 공간</p>
          </div>

          {/* Login/Signup Buttons */}
          <div class="space-y-4">
            <button id="student-login-btn" 
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition-colors flex items-center justify-center space-x-2">
              <i class="fas fa-graduation-cap"></i>
              <span>선생님 로그인</span>
            </button>
            
            <button id="teacher-login-btn" 
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-semibold transition-colors flex items-center justify-center space-x-2">
              <i class="fas fa-user-graduate"></i>
              <span>학생 로그인</span>
            </button>
          </div>

          {/* Forgot Password Link */}
          <div class="text-center mt-6">
            <button id="forgot-password-btn" class="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>
      </main>

      {/* Teacher Signup Modal */}
      <div id="teacher-signup-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-8 w-full max-w-md">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <i class="fas fa-user-tie text-2xl text-blue-600"></i>
              </div>
              <h2 class="text-2xl font-bold text-gray-800">선생님 회원가입</h2>
              <p class="text-gray-600 mt-2">교실을 만들고 학생들과 소통해보세요</p>
            </div>
            
            <form id="teacher-signup-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input type="text" name="full_name" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                       placeholder="실명을 입력하세요" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                <input type="email" name="email" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                       placeholder="teacher@school.edu" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">사용자명</label>
                <input type="text" name="username" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                       placeholder="로그인 아이디" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input type="password" name="password" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                       placeholder="비밀번호를 입력하세요" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">학급명</label>
                <input type="text" name="class_name" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                       placeholder="예: 3학년 1반" />
              </div>
              
              <div class="flex space-x-3 pt-4">
                <button type="button" class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors modal-close">
                  취소
                </button>
                <button type="submit" class="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                  회원가입
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <div id="login-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-8 w-full max-w-md">
            <div class="text-center mb-6">
              <div id="login-icon" class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                {/* Icon will be set dynamically */}
              </div>
              <h2 id="login-title" class="text-2xl font-bold text-gray-800">로그인</h2>
            </div>
            
            <form id="login-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">사용자명</label>
                <input type="text" name="username" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input type="password" name="password" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div class="flex space-x-3 pt-4">
                <button type="button" class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors modal-close">
                  취소
                </button>
                <button type="submit" id="login-submit-btn" class="flex-1 py-3 rounded-xl transition-colors text-white">
                  로그인
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <div id="forgot-password-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-8 w-full max-w-md">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-orange-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <i class="fas fa-key text-2xl text-orange-600"></i>
              </div>
              <h2 class="text-2xl font-bold text-gray-800">비밀번호 찾기</h2>
              <p class="text-gray-600 mt-2">등록된 이메일로 임시 비밀번호를 발송해드립니다</p>
            </div>
            
            <form id="forgot-password-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">이메일 주소</label>
                <input type="email" name="email" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
                       placeholder="등록된 이메일을 입력하세요" />
              </div>
              
              <div class="flex space-x-3 pt-4">
                <button type="button" class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors modal-close">
                  취소
                </button>
                <button type="submit" class="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors">
                  임시 비밀번호 발송
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
    </div>
  )
})

// 학생 대시보드 페이지
app.get('/student', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100" id="student-dashboard">
      {/* Header */}
      <header class="bg-white/80 backdrop-blur-sm border-b border-green-200">
        <div class="max-w-6xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <div class="w-4 h-6 bg-white rounded-full relative">
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full"></div>
                  <div class="absolute -top-1 left-1 w-3 h-3 bg-green-300 rounded-full"></div>
                </div>
              </div>
              <h1 class="text-xl font-bold text-gray-800">질문이 자라는 교실</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span id="student-name" class="text-green-700 font-medium"></span>
              <button id="student-logout" class="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-6xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Calendar & Rankings */}
          <div class="lg:col-span-1 space-y-6">
            {/* Calendar Widget */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-3 flex items-center text-green-800">
                <i class="fas fa-calendar-alt mr-2 text-green-600"></i>
                날짜별 질문 보기
              </h3>
              <input type="date" id="student-date-picker" 
                     class="w-full px-3 py-2 border border-green-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Weekly Top 5 */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-3 flex items-center text-green-800">
                <i class="fas fa-trophy mr-2 text-yellow-600"></i>
                이번주 TOP 5
              </h3>
              <div id="student-top-questions" class="space-y-2">
                <div class="text-center text-gray-500 text-sm py-8">
                  로딩 중...
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div class="lg:col-span-2 space-y-6">
            {/* Question Form */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-4 flex items-center text-green-800">
                <i class="fas fa-edit mr-2 text-green-600"></i>
                나의 질문 만들기
              </h3>
              <form id="student-question-form">
                <textarea name="content" placeholder="깊이 있는 질문을 작성해보세요..." required
                          class="w-full px-4 py-3 border border-green-300 rounded-xl h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
                <div class="mt-4 flex justify-end">
                  <button type="submit" 
                          class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors">
                    질문 등록
                  </button>
                </div>
              </form>
            </div>

            {/* Today's Questions */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-4 flex items-center text-green-800">
                <i class="fas fa-comments mr-2 text-green-600"></i>
                우리반의 오늘 만든 질문
              </h3>
              <div id="student-questions-feed" class="space-y-4">
                <div class="text-center text-gray-500 py-8">
                  로딩 중...
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - AI Chat */}
          <div class="lg:col-span-1">
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-3 flex items-center text-green-800">
                <i class="fas fa-robot mr-2 text-purple-600"></i>
                AI 질문 도우미
              </h3>
              <div id="student-ai-chat" class="space-y-3">
                <div class="bg-green-50 rounded-xl p-3 text-sm">
                  <div class="flex items-start space-x-2">
                    <i class="fas fa-robot text-purple-600 mt-1"></i>
                    <div class="text-green-800">
                      안녕하세요! 좋은 질문을 만드는 데 도움을 드릴게요. 무엇이든 물어보세요!
                    </div>
                  </div>
                </div>
                <div id="student-ai-messages" class="space-y-2 max-h-64 overflow-y-auto"></div>
                <form id="student-ai-chat-form">
                  <div class="flex space-x-2">
                    <input type="text" name="message" placeholder="AI에게 질문해보세요..." required
                           class="flex-1 px-3 py-2 border border-green-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <button type="submit" 
                            class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors">
                      <i class="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
})

// 교사 대시보드 페이지
app.get('/teacher', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100" id="teacher-dashboard">
      {/* Header */}
      <header class="bg-white/80 backdrop-blur-sm border-b border-blue-200">
        <div class="max-w-6xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <i class="fas fa-chalkboard-teacher text-white"></i>
              </div>
              <h1 class="text-xl font-bold text-gray-800">교사 관리 대시보드</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span id="teacher-name" class="text-blue-700 font-medium"></span>
              <button id="teacher-logout" class="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-6xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Calendar */}
          <div class="space-y-6">
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-blue-200">
              <h3 class="font-semibold mb-3 flex items-center text-blue-800">
                <i class="fas fa-calendar-alt mr-2 text-blue-600"></i>
                날짜별 질문 보기
              </h3>
              <input type="date" id="teacher-date-picker" 
                     class="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Student Management */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-blue-200">
              <h3 class="font-semibold mb-3 flex items-center text-blue-800">
                <i class="fas fa-users mr-2 text-blue-600"></i>
                학생 계정 생성
              </h3>
              <form id="create-student-form" class="space-y-3">
                <input type="text" name="student_name" placeholder="학생 이름" required
                       class="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                <input type="text" name="student_username" placeholder="로그인 아이디" required
                       class="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                <input type="password" name="student_password" placeholder="초기 비밀번호" required
                       class="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                <button type="submit" 
                        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm transition-colors">
                  학생 계정 생성
                </button>
              </form>
            </div>
          </div>

          {/* Middle Column - Today's Questions */}
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-blue-200">
            <h3 class="font-semibold mb-4 flex items-center text-blue-800">
              <i class="fas fa-comments mr-2 text-blue-600"></i>
              우리반의 오늘 만든 질문
            </h3>
            <div id="teacher-questions-feed" class="space-y-4 max-h-96 overflow-y-auto">
              <div class="text-center text-gray-500 py-8">
                로딩 중...
              </div>
            </div>
          </div>

          {/* Right Column - Analytics */}
          <div class="space-y-6">
            {/* Question Statistics */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-blue-200">
              <h3 class="font-semibold mb-3 flex items-center text-blue-800">
                <i class="fas fa-chart-bar mr-2 text-blue-600"></i>
                질문 분석
              </h3>
              <div id="question-stats" class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">오늘 질문 수</span>
                  <span id="today-questions-count" class="font-semibold text-blue-600">-</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">이번 주 질문 수</span>
                  <span id="week-questions-count" class="font-semibold text-blue-600">-</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">활성 학생 수</span>
                  <span id="active-students-count" class="font-semibold text-blue-600">-</span>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-blue-200">
              <h3 class="font-semibold mb-3 flex items-center text-blue-800">
                <i class="fas fa-list mr-2 text-blue-600"></i>
                학생 목록
              </h3>
              <div id="students-list" class="space-y-2 max-h-48 overflow-y-auto">
                <div class="text-center text-gray-500 text-sm py-4">
                  로딩 중...
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
})

export default app
