import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie } from 'hono/cookie'
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
      'SELECT id, username, full_name, user_type, class_name FROM users WHERE username = ? AND password_hash = ?'
    ).bind(username, password).first()

    if (!user) {
      return c.json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // 사용자 정보를 쿠키에 저장 (세션 관리)
    setCookie(c, 'user_id', user.id.toString(), {
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      maxAge: 86400 // 24시간
    })
    setCookie(c, 'username', user.username, {
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      maxAge: 86400 // 24시간
    })
    setCookie(c, 'user_type', user.user_type, {
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      maxAge: 86400 // 24시간
    })

    return c.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        user_type: user.user_type,
        class_name: user.class_name
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

// 학생 계정 삭제 API (교사만 가능)
app.delete('/api/teacher/delete-student/:student_id', async (c) => {
  try {
    const studentId = c.req.param('student_id')
    
    if (!studentId) {
      return c.json({ error: '학생 ID가 필요합니다.' }, 400)
    }

    // 학생 정보 확인
    const student = await c.env.DB.prepare(
      'SELECT username, full_name, class_name FROM users WHERE id = ? AND user_type = "student"'
    ).bind(studentId).first()

    if (!student) {
      return c.json({ error: '해당 학생을 찾을 수 없습니다.' }, 404)
    }

    // 트랜잭션으로 관련 데이터 모두 삭제
    // 1. 학생이 작성한 질문에 대한 댓글들 삭제
    await c.env.DB.prepare(`
      DELETE FROM comments 
      WHERE question_id IN (SELECT id FROM questions WHERE user_id = ?)
    `).bind(studentId).run()

    // 2. 학생이 작성한 댓글들 삭제  
    await c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(studentId).run()

    // 3. 학생이 누른 좋아요들 삭제
    await c.env.DB.prepare('DELETE FROM likes WHERE user_id = ?').bind(studentId).run()

    // 4. 학생이 작성한 질문들 삭제
    await c.env.DB.prepare('DELETE FROM questions WHERE user_id = ?').bind(studentId).run()

    // 5. 학생 계정 삭제
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(studentId).run()

    return c.json({ 
      success: true,
      message: `학생 "${student.full_name}" 계정과 관련 데이터가 모두 삭제되었습니다.`
    })
  } catch (error) {
    console.error('학생 삭제 오류:', error)
    return c.json({ error: '학생 계정 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

// 일괄 학생 계정 생성 API (교사만 가능)
app.post('/api/teacher/bulk-create-students', async (c) => {
  try {
    const { teacher_id, students } = await c.req.json()
    
    if (!teacher_id || !students || !Array.isArray(students)) {
      return c.json({ error: '교사 ID와 학생 목록이 필요합니다.' }, 400)
    }

    // 교사 정보 확인
    const teacher = await c.env.DB.prepare(
      'SELECT class_name FROM users WHERE id = ? AND user_type = "teacher"'
    ).bind(teacher_id).first()

    if (!teacher) {
      return c.json({ error: '교사 권한이 없습니다.' }, 403)
    }

    const results = []
    const errors = []
    let createdCount = 0

    // 각 학생 계정 생성 시도
    for (const student of students) {
      const { name, username, password } = student
      
      if (!name || !username || !password) {
        errors.push(`${name || username || '(알 수 없음)'}: 필수 정보 부족`)
        continue
      }

      try {
        // 사용자명 중복 확인
        const existingUser = await c.env.DB.prepare(
          'SELECT id FROM users WHERE username = ?'
        ).bind(username).first()

        if (existingUser) {
          errors.push(`${name} (${username}): 이미 사용 중인 아이디`)
          continue
        }

        // 학생 계정 생성
        const result = await c.env.DB.prepare(
          'INSERT INTO users (username, password_hash, full_name, user_type, class_name) VALUES (?, ?, ?, ?, ?)'
        ).bind(username, password, name, 'student', teacher.class_name).run()

        results.push({
          id: result.meta.last_row_id,
          name: name,
          username: username
        })
        createdCount++

      } catch (error) {
        console.error(`학생 생성 오류 (${name}):`, error)
        errors.push(`${name} (${username}): 생성 중 오류 발생`)
      }
    }

    return c.json({ 
      success: true,
      created_count: createdCount,
      total_count: students.length,
      results: results,
      errors: errors,
      message: `${createdCount}명의 학생 계정이 생성되었습니다.`
    })
  } catch (error) {
    console.error('일괄 학생 생성 오류:', error)
    return c.json({ error: '일괄 학생 계정 생성 중 오류가 발생했습니다.' }, 500)
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

// 교사 아이디 찾기 API (이름 + 이메일)
app.post('/api/auth/find-username', async (c) => {
  try {
    const { full_name, email } = await c.req.json()
    
    if (!full_name || !email) {
      return c.json({ error: '이름과 이메일을 모두 입력해주세요.' }, 400)
    }

    // 교사 계정만 검색 (보안상 이유)
    const user = await c.env.DB.prepare(
      'SELECT username FROM users WHERE full_name = ? AND email = ? AND user_type = "teacher"'
    ).bind(full_name, email).first()

    if (!user) {
      return c.json({ error: '입력하신 정보와 일치하는 교사 계정을 찾을 수 없습니다.' }, 404)
    }

    return c.json({ 
      success: true, 
      username: user.username,
      message: '아이디를 찾았습니다.'
    })
  } catch (error) {
    return c.json({ error: '아이디 찾기 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 교사 비밀번호 재설정 API (아이디 + 이메일)
app.post('/api/auth/reset-password', async (c) => {
  try {
    const { username, email, new_password } = await c.req.json()
    
    if (!username || !email || !new_password) {
      return c.json({ error: '아이디, 이메일, 새 비밀번호를 모두 입력해주세요.' }, 400)
    }

    if (new_password.length < 4) {
      return c.json({ error: '비밀번호는 최소 4자 이상이어야 합니다.' }, 400)
    }

    // 교사 계정 확인
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? AND email = ? AND user_type = "teacher"'
    ).bind(username, email).first()

    if (!user) {
      return c.json({ error: '입력하신 정보와 일치하는 교사 계정을 찾을 수 없습니다.' }, 404)
    }

    // 비밀번호 업데이트
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(new_password, user.id).run()

    return c.json({ 
      success: true, 
      message: '비밀번호가 성공적으로 변경되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '비밀번호 재설정 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 교사 개인정보 수정 API
app.post('/api/teacher/update-profile', async (c) => {
  try {
    const { user_id, current_password, new_email, new_password } = await c.req.json()
    
    if (!user_id || !current_password) {
      return c.json({ error: '사용자 ID와 현재 비밀번호는 필수입니다.' }, 400)
    }

    // 현재 비밀번호 확인
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ? AND password_hash = ? AND user_type = "teacher"'
    ).bind(user_id, current_password).first()

    if (!user) {
      return c.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, 401)
    }

    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP'
    let bindValues = []
    let updateFields = []

    // 이메일 변경 요청 시
    if (new_email && new_email !== user.email) {
      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(new_email)) {
        return c.json({ error: '올바른 이메일 형식이 아닙니다.' }, 400)
      }

      // 이메일 중복 확인
      const existingEmail = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ?'
      ).bind(new_email, user_id).first()

      if (existingEmail) {
        return c.json({ error: '이미 사용 중인 이메일입니다.' }, 409)
      }

      updateQuery += ', email = ?'
      bindValues.push(new_email)
      updateFields.push('이메일')
    }

    // 비밀번호 변경 요청 시
    if (new_password && new_password !== current_password) {
      if (new_password.length < 4) {
        return c.json({ error: '새 비밀번호는 최소 4자 이상이어야 합니다.' }, 400)
      }

      updateQuery += ', password_hash = ?'
      bindValues.push(new_password)
      updateFields.push('비밀번호')
    }

    // 변경할 내용이 없는 경우
    if (bindValues.length === 0) {
      return c.json({ error: '변경할 정보를 입력해주세요.' }, 400)
    }

    updateQuery += ' WHERE id = ?'
    bindValues.push(user_id)

    // 정보 업데이트 실행
    await c.env.DB.prepare(updateQuery).bind(...bindValues).run()

    return c.json({ 
      success: true, 
      message: `${updateFields.join(', ')}이(가) 성공적으로 변경되었습니다.`,
      updated_fields: updateFields
    })
  } catch (error) {
    return c.json({ error: '개인정보 수정 처리 중 오류가 발생했습니다.' }, 500)
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
    // 세션에서 user_id 가져오기
    const userId = getCookie(c, 'user_id')
    
    if (!userId) {
      return c.json({ error: '로그인이 필요합니다.' }, 401)
    }
    
    const { content, reason, category } = await c.req.json()
    
    if (!content || !reason || !category) {
      return c.json({ error: '모든 필드를 입력해주세요. (질문 내용, 작성 이유, 카테고리)' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO questions (user_id, content, reason, category) VALUES (?, ?, ?, ?)'
    ).bind(userId, content, reason, category).run()

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
    
    // 세션에서 user_id 가져오기
    const userId = getCookie(c, 'user_id')
    
    if (!userId) {
      return c.json({ error: '로그인이 필요합니다.' }, 401)
    }
    
    const { content } = await c.req.json()
    
    if (!content) {
      return c.json({ error: '댓글 내용을 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO comments (question_id, user_id, content) VALUES (?, ?, ?)'
    ).bind(questionId, userId, content).run()

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

// 질문 수정 API (작성자만 가능)
app.put('/api/questions/:question_id', async (c) => {
  try {
    const questionId = c.req.param('question_id')
    
    // 세션에서 user_id 가져오기
    const userId = getCookie(c, 'user_id')
    
    if (!userId) {
      return c.json({ error: '로그인이 필요합니다.' }, 401)
    }
    
    const { content, reason, category } = await c.req.json()
    
    if (!content || !reason || !category) {
      return c.json({ error: '모든 필드를 입력해주세요.' }, 400)
    }

    // 질문 존재 확인 및 작성자 권한 확인
    const question = await c.env.DB.prepare(
      'SELECT user_id FROM questions WHERE id = ?'
    ).bind(questionId).first()

    if (!question) {
      return c.json({ error: '질문을 찾을 수 없습니다.' }, 404)
    }

    if (question.user_id != userId) {
      return c.json({ error: '본인이 작성한 질문만 수정할 수 있습니다.' }, 403)
    }

    // 질문 수정
    await c.env.DB.prepare(
      'UPDATE questions SET content = ?, reason = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(content, reason, category, questionId).run()

    // 수정된 질문 정보 반환
    const updatedQuestion = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats WHERE id = ?
    `).bind(questionId).first()

    return c.json({ 
      success: true, 
      question: updatedQuestion,
      message: '질문이 성공적으로 수정되었습니다.'
    })
  } catch (error) {
    console.error('질문 수정 오류:', error)
    return c.json({ error: '질문 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// =================
// 좋아요 관련 API
// =================

// 좋아요 토글
app.post('/api/questions/:id/like', async (c) => {
  try {
    const questionId = c.req.param('id')
    
    // 세션에서 user_id 가져오기
    const userId = getCookie(c, 'user_id')
    
    if (!userId) {
      return c.json({ error: '로그인이 필요합니다.' }, 401)
    }

    // 기존 좋아요 확인
    const existingLike = await c.env.DB.prepare(
      'SELECT id FROM likes WHERE question_id = ? AND user_id = ?'
    ).bind(questionId, userId).first()

    if (existingLike) {
      // 좋아요 취소
      await c.env.DB.prepare(
        'DELETE FROM likes WHERE question_id = ? AND user_id = ?'
      ).bind(questionId, userId).run()
      
      return c.json({ 
        success: true, 
        action: 'unliked',
        message: '좋아요를 취소했습니다.'
      })
    } else {
      // 좋아요 추가
      await c.env.DB.prepare(
        'INSERT INTO likes (question_id, user_id) VALUES (?, ?)'
      ).bind(questionId, userId).run()
      
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

// 학생 개인 통계 조회 API
app.get('/api/student/stats/:user_id', async (c) => {
  try {
    const user_id = c.req.param('user_id')
    
    // 총 좋아요 수
    const totalLikes = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM likes l
      JOIN questions q ON l.question_id = q.id
      WHERE q.user_id = ?
    `).bind(user_id).first()

    // 총 질문 수
    const totalQuestions = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM questions WHERE user_id = ?
    `).bind(user_id).first()

    // 총 댓글 수 (받은 댓글)
    const totalComments = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM comments c
      JOIN questions q ON c.question_id = q.id
      WHERE q.user_id = ?
    `).bind(user_id).first()

    // 이번 주 질문 수
    const weekQuestions = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM questions 
      WHERE user_id = ? AND date >= date('now', '-7 days')
    `).bind(user_id).first()

    // 가장 인기있는 질문
    const bestQuestion = await c.env.DB.prepare(`
      SELECT q.content, COUNT(l.id) as like_count
      FROM questions q
      LEFT JOIN likes l ON q.id = l.question_id
      WHERE q.user_id = ?
      GROUP BY q.id, q.content
      ORDER BY like_count DESC
      LIMIT 1
    `).bind(user_id).first()

    return c.json({ 
      success: true, 
      stats: {
        total_likes: totalLikes.count,
        total_questions: totalQuestions.count,
        total_comments: totalComments.count,
        week_questions: weekQuestions.count,
        best_question: bestQuestion || null
      }
    })
  } catch (error) {
    return c.json({ error: '통계를 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// AI 질문 분석 API
app.post('/api/ai/analyze-question', async (c) => {
  try {
    const { question, user_id } = await c.req.json()
    
    if (!question) {
      return c.json({ error: '질문을 입력해주세요.' }, 400)
    }

    try {
      // Cloudflare AI를 사용하여 질문 분석
      const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: `당신은 한국의 교육 전문가입니다. 반드시 한국어로만 답변하세요. 학생의 질문을 분석하여 다음 형식으로 피드백을 제공해주세요:

🌟 강점
• 이 질문의 좋은 점을 1-2개 설명

⚠️ 약점
• 개선이 필요한 부분을 1-2개 설명

💡 보완점
• 더 깊이 있는 질문으로 만들기 위한 구체적 제안을 1-2개 제시

반드시 한국어로 답변하고, 간결하고 학생이 이해하기 쉽게 작성해주세요. 영어는 절대 사용하지 마세요.`
          },
          {
            role: 'user', 
            content: `다음 질문을 한국어로 분석해주세요: "${question}"`
          }
        ]
      })

      return c.json({ 
        success: true, 
        analysis: response.response 
      })
    } catch (aiError) {
      // AI 서비스 오류시 기본 분석 제공
      const defaultAnalysis = `🌟 강점
• 명확하고 이해하기 쉬운 질문입니다
• 호기심과 탐구 의욕이 잘 드러나 있습니다

⚠️ 약점  
• 좀 더 구체적인 상황이나 배경을 포함하면 좋겠습니다
• 질문의 범위를 더 명확히 설정하면 답변하기 쉬워집니다

💡 오늘의 보완점
• "왜 그럴까요?" → "어떤 상황에서 왜 그럴까요?"로 구체화해보세요
• 본인의 경험이나 관찰한 사례를 질문에 포함해보세요
• 여러 관점에서 접근할 수 있는 하위 질문들을 만들어보세요`
      
      return c.json({ 
        success: true, 
        analysis: defaultAnalysis.trim()
      })
    }
  } catch (error) {
    return c.json({ error: '질문 분석 중 오류가 발생했습니다.' }, 500)
  }
})

// =================
// 개인 상세 통계 API
// =================

// 학생 개인 상세 정보 조회 (내 질문 목록)
app.get('/api/student/details/questions/:user_id', async (c) => {
  try {
    const userId = c.req.param('user_id')
    
    const questions = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats 
      WHERE user_id = ? 
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all()

    return c.json({ 
      success: true, 
      questions: questions.results 
    })
  } catch (error) {
    return c.json({ error: '질문 목록을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 학생 개인 상세 정보 조회 (이번 주 질문 목록)  
app.get('/api/student/details/week-questions/:user_id', async (c) => {
  try {
    const userId = c.req.param('user_id')
    
    const questions = await c.env.DB.prepare(`
      SELECT * FROM questions_with_stats 
      WHERE user_id = ? 
      AND created_at >= date('now', '-7 days')
      ORDER BY created_at DESC
    `).bind(userId).all()

    return c.json({ 
      success: true, 
      questions: questions.results 
    })
  } catch (error) {
    return c.json({ error: '이번 주 질문 목록을 가져오는 중 오류가 발생했습니다.' }, 500)
  }
})

// 학생 개인 상세 정보 조회 (받은 댓글 목록)
app.get('/api/student/details/comments/:user_id', async (c) => {
  try {
    const userId = c.req.param('user_id')
    
    const comments = await c.env.DB.prepare(`
      SELECT 
        c.*,
        q.content as question_content,
        u.full_name as commenter_name
      FROM comments c
      JOIN questions q ON c.question_id = q.id
      JOIN users u ON c.user_id = u.id
      WHERE q.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).bind(userId).all()

    return c.json({ 
      success: true, 
      comments: comments.results 
    })
  } catch (error) {
    return c.json({ error: '댓글 목록을 가져오는 중 오류가 발생했습니다.' }, 500)
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
              
              {/* 아이디/비밀번호 찾기 링크 */}
              <div class="flex justify-center space-x-4 mt-4 pt-4 border-t border-gray-200">
                <button type="button" id="find-username-btn" class="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  아이디 찾기
                </button>
                <span class="text-gray-300">|</span>
                <button type="button" id="reset-password-btn" class="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  비밀번호 재설정
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 비밀번호 재설정 Modal */}
      <div id="reset-password-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-8 w-full max-w-md">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-orange-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <i class="fas fa-key text-2xl text-orange-600"></i>
              </div>
              <h2 class="text-2xl font-bold text-gray-800">비밀번호 찾기</h2>
              <p class="text-gray-600 mt-2">등록된 이메일로 임시 비밀번호를 발송해드립니다</p>
            </div>
            
            <form id="reset-password-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">아이디</label>
                <input type="text" name="username" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
                       placeholder="아이디를 입력하세요" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                <input type="email" name="email" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
                       placeholder="등록하신 이메일을 입력하세요" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                <input type="password" name="new_password" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
                       placeholder="새로운 비밀번호를 입력하세요" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <input type="password" name="confirm_password" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
                       placeholder="비밀번호를 다시 입력하세요" />
              </div>
              
              <div class="flex space-x-3 pt-4">
                <button type="button" class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors modal-close">
                  취소
                </button>
                <button type="submit" class="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors">
                  비밀번호 재설정
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
      
      {/* Footer */}
      <footer class="mt-auto py-6 border-t border-green-200 bg-white/50">
        <div class="max-w-4xl mx-auto px-6 text-center">
          <p class="text-sm text-gray-500">
            © Copyright 2025. 편식왕냐옹이 All rights reserved.
          </p>
        </div>
      </footer>
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
              <form id="student-question-form" class="space-y-4">
                {/* 1. 질문 내용 */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-question-circle mr-1 text-green-500"></i>
                    질문 내용
                  </label>
                  <textarea name="content" placeholder="깊이 있는 질문을 작성해보세요..." required
                            class="w-full px-4 py-3 border border-green-300 rounded-xl h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
                </div>

                {/* 2. 질문 작성 이유 */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-lightbulb mr-1 text-yellow-500"></i>
                    이 질문을 작성한 이유
                  </label>
                  <textarea name="reason" placeholder="왜 이 질문을 하게 되었는지 설명해주세요..." required
                            class="w-full px-4 py-3 border border-green-300 rounded-xl h-20 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
                </div>

                {/* 3. 카테고리 선택 */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">
                    <i class="fas fa-tags mr-1 text-blue-500"></i>
                    카테고리 선택
                  </label>
                  <div class="category-grid grid grid-cols-3 gap-2">
                    <label class="category-option cursor-pointer">
                      <input type="radio" name="category" value="국어" required class="sr-only" />
                      <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-red-300 hover:bg-red-50 transition-colors">
                        <i class="fas fa-book text-xl text-red-500 mb-1"></i>
                        <div class="text-sm font-medium text-gray-700">국어</div>
                      </div>
                    </label>
                    <label class="category-option cursor-pointer">
                      <input type="radio" name="category" value="수학" required class="sr-only" />
                      <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <i class="fas fa-calculator text-xl text-blue-500 mb-1"></i>
                        <div class="text-sm font-medium text-gray-700">수학</div>
                      </div>
                    </label>
                    <label class="category-option cursor-pointer">
                      <input type="radio" name="category" value="사회" required class="sr-only" />
                      <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
                        <i class="fas fa-globe text-xl text-yellow-500 mb-1"></i>
                        <div class="text-sm font-medium text-gray-700">사회</div>
                      </div>
                    </label>
                    <label class="category-option cursor-pointer">
                      <input type="radio" name="category" value="과학" required class="sr-only" />
                      <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-green-300 hover:bg-green-50 transition-colors">
                        <i class="fas fa-flask text-xl text-green-500 mb-1"></i>
                        <div class="text-sm font-medium text-gray-700">과학</div>
                      </div>
                    </label>
                    <label class="category-option cursor-pointer">
                      <input type="radio" name="category" value="예술" required class="sr-only" />
                      <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-purple-300 hover:bg-purple-50 transition-colors">
                        <i class="fas fa-palette text-xl text-purple-500 mb-1"></i>
                        <div class="text-sm font-medium text-gray-700">예술</div>
                      </div>
                    </label>
                    <label class="category-option cursor-pointer">
                      <input type="radio" name="category" value="기타" required class="sr-only" />
                      <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-gray-300 hover:bg-gray-50 transition-colors">
                        <i class="fas fa-ellipsis-h text-xl text-gray-500 mb-1"></i>
                        <div class="text-sm font-medium text-gray-700">기타</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="mt-6 flex justify-end">
                  <button type="submit" 
                          class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors flex items-center space-x-2">
                    <i class="fas fa-pencil-alt"></i>
                    <span>질문 등록하기</span>
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

          {/* Right Sidebar - 나의 질문 레벨 & 분석 */}
          <div class="lg:col-span-1 space-y-6">
            {/* 질문 레벨 시스템 */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-4 flex items-center text-green-800">
                <i class="fas fa-seedling mr-2 text-green-600"></i>
                나의 질문 레벨
              </h3>
              <div id="student-level-display" class="text-center">
                <div id="level-icon" class="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center">
                  <i class="fas fa-seed text-2xl"></i>
                </div>
                <div id="level-name" class="font-bold text-lg text-green-800 mb-2">호기심 씨앗</div>
                <div id="level-progress" class="text-sm text-green-600 mb-3">총 좋아요: 0개</div>
                <div class="bg-green-100 rounded-full h-2 overflow-hidden">
                  <div id="progress-bar" class="bg-green-500 h-full transition-all duration-500" style="width: 0%"></div>
                </div>
                <div id="next-level" class="text-xs text-gray-500 mt-2">다음 단계: 호기심 새싹 (21개)</div>
              </div>
            </div>

            {/* 나의 질문 통계 */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-3 flex items-center text-green-800">
                <i class="fas fa-chart-line mr-2 text-green-600"></i>
                나의 통계
              </h3>
              <div id="student-personal-stats" class="space-y-3">
                <div class="flex justify-between items-center text-sm p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors" onclick="app.showStatsDetail('questions')">
                  <span class="text-gray-600 flex items-center">
                    <i class="fas fa-question-circle mr-2 text-green-500"></i>
                    총 질문 수
                  </span>
                  <span id="my-total-questions" class="font-bold text-green-600 text-lg">0</span>
                </div>
                <div class="flex justify-between items-center text-sm p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors" onclick="app.showStatsDetail('week-questions')">
                  <span class="text-gray-600 flex items-center">
                    <i class="fas fa-calendar-week mr-2 text-blue-500"></i>
                    이번 주 질문
                  </span>
                  <span id="my-week-questions" class="font-bold text-blue-600 text-lg">0</span>
                </div>
                <div class="flex justify-between items-center text-sm p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors" onclick="app.showStatsDetail('comments')">
                  <span class="text-gray-600 flex items-center">
                    <i class="fas fa-comments mr-2 text-purple-500"></i>
                    받은 댓글
                  </span>
                  <span id="my-total-comments" class="font-bold text-purple-600 text-lg">0</span>
                </div>
              </div>
            </div>

            {/* 질문 분석 대시보드 */}
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-200">
              <h3 class="font-semibold mb-4 flex items-center text-green-800">
                <i class="fas fa-microscope mr-2 text-purple-600"></i>
                질문 분석 대시보드
              </h3>
              
              <div id="auto-analysis-content" class="space-y-4">
                {/* 자동 분석 결과가 여기에 표시됩니다 */}
                <div class="text-center text-gray-400 py-8">
                  <i class="fas fa-brain text-3xl mb-3"></i>
                  <p class="text-sm">질문을 작성하면<br/>자동으로 분석 결과가<br/>나타납니다! 🧠</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 상세 통계 모달 */}
      <div id="stats-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div class="flex items-center justify-between mb-4">
              <h2 id="stats-modal-title" class="text-xl font-bold text-gray-800">나의 상세 통계</h2>
              <button onclick="app.closeStatsModal()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <i class="fas fa-times text-gray-500"></i>
              </button>
            </div>
            
            <div id="stats-modal-content" class="overflow-y-auto max-h-[60vh]">
              <div class="text-center text-gray-500 py-8">
                로딩 중...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer class="mt-8 py-6 border-t border-green-200 bg-white/50">
        <div class="max-w-6xl mx-auto px-4 text-center">
          <p class="text-sm text-gray-500">
            © Copyright 2025. 편식왕냐옹이 All rights reserved.
          </p>
        </div>
      </footer>

      {/* 질문 수정 모달 */}
      <div id="edit-question-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-6 w-full max-w-2xl">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-800">질문 수정하기</h2>
              <button onclick="app.closeEditModal()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <i class="fas fa-times text-gray-500"></i>
              </button>
            </div>
            
            <form id="edit-question-form" class="space-y-4">
              <input type="hidden" name="question_id" />
              
              {/* 질문 내용 */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-question-circle mr-1 text-green-500"></i>
                  질문 내용
                </label>
                <textarea name="content" required
                          class="w-full px-4 py-3 border border-green-300 rounded-xl h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
              </div>

              {/* 질문 작성 이유 */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-lightbulb mr-1 text-yellow-500"></i>
                  이 질문을 작성한 이유
                </label>
                <textarea name="reason" required
                          class="w-full px-4 py-3 border border-green-300 rounded-xl h-20 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
              </div>

              {/* 카테고리 선택 */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  <i class="fas fa-tags mr-1 text-blue-500"></i>
                  카테고리 선택
                </label>
                <div class="category-grid grid grid-cols-3 gap-2">
                  <label class="category-option cursor-pointer">
                    <input type="radio" name="category" value="국어" required class="sr-only" />
                    <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-red-300 hover:bg-red-50 transition-colors">
                      <i class="fas fa-book text-xl text-red-500 mb-1"></i>
                      <div class="text-sm font-medium text-gray-700">국어</div>
                    </div>
                  </label>
                  <label class="category-option cursor-pointer">
                    <input type="radio" name="category" value="수학" required class="sr-only" />
                    <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-blue-300 hover:bg-blue-50 transition-colors">
                      <i class="fas fa-calculator text-xl text-blue-500 mb-1"></i>
                      <div class="text-sm font-medium text-gray-700">수학</div>
                    </div>
                  </label>
                  <label class="category-option cursor-pointer">
                    <input type="radio" name="category" value="사회" required class="sr-only" />
                    <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
                      <i class="fas fa-globe text-xl text-yellow-500 mb-1"></i>
                      <div class="text-sm font-medium text-gray-700">사회</div>
                    </div>
                  </label>
                  <label class="category-option cursor-pointer">
                    <input type="radio" name="category" value="과학" required class="sr-only" />
                    <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-green-300 hover:bg-green-50 transition-colors">
                      <i class="fas fa-flask text-xl text-green-500 mb-1"></i>
                      <div class="text-sm font-medium text-gray-700">과학</div>
                    </div>
                  </label>
                  <label class="category-option cursor-pointer">
                    <input type="radio" name="category" value="예술" required class="sr-only" />
                    <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-purple-300 hover:bg-purple-50 transition-colors">
                      <i class="fas fa-palette text-xl text-purple-500 mb-1"></i>
                      <div class="text-sm font-medium text-gray-700">예술</div>
                    </div>
                  </label>
                  <label class="category-option cursor-pointer">
                    <input type="radio" name="category" value="기타" required class="sr-only" />
                    <div class="category-card p-3 border-2 border-gray-200 rounded-xl text-center hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      <i class="fas fa-ellipsis-h text-xl text-gray-500 mb-1"></i>
                      <div class="text-sm font-medium text-gray-700">기타</div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="flex space-x-3 pt-4">
                <button type="button" onclick="app.closeEditModal()" 
                        class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button type="submit" 
                        class="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors">
                  <i class="fas fa-save mr-1"></i>
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
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
              <button id="update-profile-btn" class="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">
                <i class="fas fa-user-edit mr-1"></i>개인정보 수정
              </button>
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
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold flex items-center text-blue-800">
                  <i class="fas fa-users mr-2 text-blue-600"></i>
                  학생 계정 관리
                </h3>
                <div class="flex space-x-2">
                  <button id="single-mode-btn" onclick="app.switchStudentMode('single')" 
                          class="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg transition-colors">
                    개별
                  </button>
                  <button id="bulk-mode-btn" onclick="app.switchStudentMode('bulk')" 
                          class="px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors">
                    일괄
                  </button>
                </div>
              </div>

              {/* 개별 생성 모드 */}
              <div id="single-create-mode">
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

              {/* 일괄 생성 모드 */}
              <div id="bulk-create-mode" class="hidden">
                <div class="mb-3 p-3 bg-blue-50 rounded-lg">
                  <p class="text-xs text-blue-700 mb-2">
                    <i class="fas fa-info-circle mr-1"></i>
                    한 줄에 하나씩 입력하세요
                  </p>
                  <p class="text-xs text-blue-600">
                    형식: 이름,아이디,비밀번호<br/>
                    예시: 홍길동,student01,1234
                  </p>
                </div>
                <form id="bulk-create-student-form">
                  <textarea name="student_list" placeholder="홍길동,student01,1234&#10;김영희,student02,1234&#10;이철수,student03,1234" 
                            class="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-blue-500"></textarea>
                  <button type="submit" 
                          class="w-full mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm transition-colors">
                    <i class="fas fa-users mr-1"></i>
                    일괄 계정 생성
                  </button>
                </form>
              </div>
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
      
      {/* Footer */}
      <footer class="mt-8 py-6 border-t border-blue-200 bg-white/50">
        <div class="max-w-7xl mx-auto px-4 text-center">
          <p class="text-sm text-gray-500">
            © Copyright 2025. 편식왕냐옹이 All rights reserved.
          </p>
        </div>
      </footer>
      
      {/* 개인정보 수정 Modal */}
      <div id="update-profile-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-2xl p-8 w-full max-w-md">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <i class="fas fa-user-edit text-2xl text-green-600"></i>
              </div>
              <h2 class="text-2xl font-bold text-gray-800">개인정보 수정</h2>
              <p class="text-gray-600 mt-2">이메일과 비밀번호를 변경할 수 있습니다</p>
            </div>
            
            <form id="update-profile-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호 *</label>
                <input type="password" name="current_password" required 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
                       placeholder="현재 비밀번호를 입력하세요" />
                <p class="text-xs text-gray-500 mt-1">본인 확인을 위해 현재 비밀번호는 필수입니다</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">새 이메일</label>
                <input type="email" name="new_email" 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
                       placeholder="새로운 이메일 (선택사항)" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                <input type="password" name="new_password" 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
                       placeholder="새로운 비밀번호 (선택사항)" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <input type="password" name="confirm_password" 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
                       placeholder="비밀번호 확인 (비밀번호 변경 시만)" />
              </div>
              
              <div class="bg-blue-50 rounded-xl p-3 mt-4">
                <p class="text-xs text-blue-700">
                  <i class="fas fa-info-circle mr-1"></i>
                  이메일이나 비밀번호 중 변경하고 싶은 항목만 입력하세요. 두 항목 모두 비워두면 변경사항이 없다는 오류가 나타납니다.
                </p>
              </div>
              
              <div class="flex space-x-3 pt-4">
                <button type="button" class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors modal-close">
                  취소
                </button>
                <button type="submit" class="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors">
                  <i class="fas fa-save mr-1"></i>수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
})

// 임시 로그인용 API (디버깅 용도)
app.get('/api/test-login/:userId', (c) => {
  const userId = c.req.param('userId');
  
  // 쿠키 설정
  setCookie(c, 'user_id', userId, { httpOnly: false, maxAge: 3600 });
  setCookie(c, 'username', `student${userId}`, { httpOnly: false, maxAge: 3600 });
  setCookie(c, 'full_name', '테스트 사용자', { httpOnly: false, maxAge: 3600 });
  setCookie(c, 'user_type', 'student', { httpOnly: false, maxAge: 3600 });
  
  return c.json({ success: true, message: `사용자 ID ${userId}로 로그인됨` });
});

// 테스트용 레벨 시스템 페이지
app.get('/test-level', (c) => {
  return c.html(`
    <!DOCTYPE html>
      <html lang="ko">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>레벨 시스템 테스트</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          <link href="/static/style.css" rel="stylesheet">
      </head>
      <body class="bg-gray-100 p-8">
          <div class="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-lg">
              <h1 class="text-2xl font-bold mb-6 text-center">레벨 시스템 테스트</h1>
              
              <!-- 레벨 표시 영역 -->
              <div id="student-level-display" class="text-center mb-6">
                  <div id="level-icon" class="w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-gray-200">
                      <i class="fas fa-seed text-2xl"></i>
                  </div>
                  <div id="level-name" class="font-bold text-lg text-green-800 mb-2">호기심 씨앗</div>
                  <div id="level-progress" class="text-sm text-green-600 mb-3">총 하트: 0개</div>
                  <div class="bg-green-100 rounded-full h-2 overflow-hidden">
                      <div id="progress-bar" class="bg-green-500 h-full transition-all duration-500" style="width: 0%"></div>
                  </div>
                  <div id="next-level" class="text-xs text-gray-500 mt-2">다음 단계: 호기심 새싹 (21개)</div>
              </div>

              <!-- 테스트 버튼들 -->
              <div class="space-y-2">
                  <button onclick="testLevel(5)" class="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      하트 5개 테스트
                  </button>
                  <button onclick="testLevel(8)" class="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                      하트 8개 테스트
                  </button>
                  <button onclick="testLevel(25)" class="w-full py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                      하트 25개 테스트
                  </button>
                  <button onclick="testLevel(60)" class="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                      하트 60개 테스트
                  </button>
                  <button onclick="testLevel(120)" class="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                      하트 120개 테스트
                  </button>
                  <button onclick="testLevel(250)" class="w-full py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                      하트 250개 테스트
                  </button>
              </div>
              
              <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 class="font-semibold mb-2">레벨 기준:</h3>
                  <ul class="text-sm text-gray-600 space-y-1">
                      <li>• 호기심 씨앗: 0-20 하트</li>
                      <li>• 호기심 새싹: 21-50 하트</li>
                      <li>• 호기심 꽃: 51-100 하트</li>
                      <li>• 호기심 나무: 101-200 하트</li>
                      <li>• 호기심 숲: 201+ 하트</li>
                  </ul>
              </div>
          </div>

          <script>
              // 테스트용 간단한 레벨 시스템
              function testLevel(likes) {
                  console.log('🎯 레벨 테스트 시작, likes:', likes);
                  
                  const levels = [
                      { 
                          name: '호기심 씨앗', 
                          min: 0, 
                          max: 20, 
                          image: 'https://page.gensparksite.com/v1/base64_upload/91beec7bb9902dac001b3c9a5526b529',
                          color: 'from-green-400 to-green-500',
                          bgColor: 'bg-green-100',
                          description: '질문을 시작하는 단계'
                      },
                      { 
                          name: '호기심 새싹', 
                          min: 21, 
                          max: 50, 
                          image: 'https://page.gensparksite.com/v1/base64_upload/a629b175d0247b9f540865bcb35d83df',
                          color: 'from-green-500 to-green-600',
                          bgColor: 'bg-green-200',
                          description: '질문 습관이 자라는 단계'
                      },
                      { 
                          name: '호기심 꽃', 
                          min: 51, 
                          max: 100, 
                          image: 'https://page.gensparksite.com/v1/base64_upload/4695dece394aa487b0b2bb723fcbef3d',
                          color: 'from-pink-500 to-pink-600',
                          bgColor: 'bg-pink-200',
                          description: '아름다운 질문을 피우는 단계'
                      },
                      { 
                          name: '호기심 나무', 
                          min: 101, 
                          max: 200, 
                          image: 'https://page.gensparksite.com/v1/base64_upload/06831e87699528949d2c262e8ff5223c',
                          color: 'from-green-700 to-green-800',
                          bgColor: 'bg-green-400',
                          description: '깊이있는 지혜를 키우는 단계'
                      },
                      { 
                          name: '호기심 숲', 
                          min: 201, 
                          max: Infinity, 
                          image: 'https://page.gensparksite.com/v1/base64_upload/b1f3dc14d6e9273914102f2fd64b40bc',
                          color: 'from-emerald-600 to-emerald-800',
                          bgColor: 'bg-emerald-200',
                          description: '질문의 마스터가 된 단계'
                      }
                  ];

                  const currentLevel = levels.find(level => likes >= level.min && likes <= level.max);
                  const nextLevel = levels.find(level => level.min > likes);
                  
                  console.log('🔍 현재 레벨:', currentLevel);
                  console.log('🔍 다음 레벨:', nextLevel);

                  if (currentLevel) {
                      // 레벨 아이콘 업데이트
                      const levelIcon = document.getElementById('level-icon');
                      console.log('🖼️ levelIcon 요소:', levelIcon);
                      
                      if (levelIcon) {
                          const imgHTML = \`<img src="\${currentLevel.image}" alt="\${currentLevel.name}" class="w-16 h-16 object-contain pixel-art" style="image-rendering: pixelated;">\`;
                          console.log('🖼️ 설정할 이미지 HTML:', imgHTML);
                          
                          levelIcon.className = \`w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center \${currentLevel.bgColor} border-4 border-white shadow-lg transform hover:scale-105 transition-transform overflow-hidden\`;
                          levelIcon.innerHTML = imgHTML;
                          console.log('✅ 레벨 아이콘 업데이트 완료');
                      } else {
                          console.error('❌ level-icon 요소를 찾을 수 없습니다');
                      }

                      // 레벨 이름 업데이트
                      const levelName = document.getElementById('level-name');
                      if (levelName) levelName.textContent = currentLevel.name;

                      // 진행도 업데이트
                      const levelProgress = document.getElementById('level-progress');
                      if (levelProgress) levelProgress.textContent = \`총 하트: \${likes}개 (누적)\`;

                      // 다음 레벨 정보
                      const nextLevelElement = document.getElementById('next-level');
                      if (nextLevelElement) {
                          if (nextLevel) {
                              const remainingLikes = nextLevel.min - likes;
                              nextLevelElement.textContent = \`다음 단계: \${nextLevel.name} (하트 \${remainingLikes}개 더 필요)\`;
                              
                              // 프로그레스 바
                              const progressBar = document.getElementById('progress-bar');
                              if (progressBar) {
                                  const currentLevelRange = currentLevel.max - currentLevel.min + 1;
                                  const currentLevelProgress = likes - currentLevel.min;
                                  const progress = Math.min(100, (currentLevelProgress / currentLevelRange) * 100);
                                  progressBar.style.width = \`\${progress}%\`;
                              }
                          } else {
                              nextLevelElement.textContent = '최고 레벨 달성! 호기심 숲의 주인이 되셨습니다! 🎉';
                              const progressBar = document.getElementById('progress-bar');
                              if (progressBar) progressBar.style.width = '100%';
                          }
                      }
                  }
              }
          </script>
    </body>
    </html>
  `);
})

export default app
