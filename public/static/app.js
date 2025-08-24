// 질문이 자라는 교실 - 새로운 메인 JavaScript

class QuestionClassroomApp {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'landing';
    this.init();
  }

  init() {
    this.checkAuthState();
    this.bindEvents();
    this.detectCurrentPage();
  }

  // 현재 페이지 감지
  detectCurrentPage() {
    const path = window.location.pathname;
    if (path === '/student') {
      this.currentPage = 'student';
      this.initStudentPage();
    } else if (path === '/teacher') {
      this.currentPage = 'teacher';
      this.initTeacherPage();
    } else {
      this.currentPage = 'landing';
      this.initLandingPage();
    }
  }

  // 인증 상태 확인
  checkAuthState() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }

  // ===== 랜딩 페이지 관련 =====
  initLandingPage() {
    if (this.currentUser) {
      // 이미 로그인된 사용자는 해당 대시보드로 리다이렉트
      if (this.currentUser.user_type === 'teacher') {
        window.location.href = '/teacher';
      } else {
        window.location.href = '/student';
      }
    }
  }

  bindEvents() {
    // 랜딩 페이지 이벤트
    this.bindLandingEvents();
    // 학생 페이지 이벤트
    this.bindStudentEvents();
    // 교사 페이지 이벤트
    this.bindTeacherEvents();
  }

  bindLandingEvents() {
    // 교사 회원가입 버튼
    const teacherSignupBtn = document.getElementById('teacher-signup-btn');
    if (teacherSignupBtn) {
      teacherSignupBtn.addEventListener('click', () => {
        document.getElementById('teacher-signup-modal').classList.remove('hidden');
      });
    }

    // 선생님 로그인 버튼
    const studentLoginBtn = document.getElementById('student-login-btn');
    if (studentLoginBtn) {
      studentLoginBtn.addEventListener('click', () => {
        this.showLoginModal('teacher');
      });
    }

    // 학생 로그인 버튼
    const teacherLoginBtn = document.getElementById('teacher-login-btn');
    if (teacherLoginBtn) {
      teacherLoginBtn.addEventListener('click', () => {
        this.showLoginModal('student');
      });
    }

    // 비밀번호 찾기 버튼
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', () => {
        document.getElementById('forgot-password-modal').classList.remove('hidden');
      });
    }

    // 모달 닫기
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if (modal) modal.classList.add('hidden');
      });
    });

    // 모달 배경 클릭으로 닫기
    document.querySelectorAll('.fixed').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // 폼 이벤트
    const teacherSignupForm = document.getElementById('teacher-signup-form');
    if (teacherSignupForm) {
      teacherSignupForm.addEventListener('submit', this.handleTeacherSignup.bind(this));
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', this.handleForgotPassword.bind(this));
    }
  }

  showLoginModal(userType) {
    const modal = document.getElementById('login-modal');
    const icon = document.getElementById('login-icon');
    const title = document.getElementById('login-title');
    const submitBtn = document.getElementById('login-submit-btn');

    if (userType === 'teacher') {
      icon.className = 'w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center';
      icon.innerHTML = '<i class="fas fa-user-tie text-2xl text-blue-600"></i>';
      title.textContent = '선생님 로그인';
      submitBtn.className = 'flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors text-white';
    } else {
      icon.className = 'w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center';
      icon.innerHTML = '<i class="fas fa-user-graduate text-2xl text-green-600"></i>';
      title.textContent = '학생 로그인';
      submitBtn.className = 'flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors text-white';
    }

    modal.setAttribute('data-user-type', userType);
    modal.classList.remove('hidden');
  }

  // 교사 회원가입 처리
  async handleTeacherSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post('/api/auth/register-teacher', {
        username: formData.get('username'),
        password: formData.get('password'),
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        class_name: formData.get('class_name')
      });

      if (response.data.success) {
        document.getElementById('teacher-signup-modal').classList.add('hidden');
        e.target.reset();
        this.showToast('교사 회원가입이 완료되었습니다! 로그인해주세요.', 'success');
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '회원가입에 실패했습니다.', 'error');
    }
  }

  // 로그인 처리
  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const modal = document.getElementById('login-modal');
    const userType = modal.getAttribute('data-user-type');
    
    try {
      const response = await axios.post('/api/auth/login', {
        username: formData.get('username'),
        password: formData.get('password')
      });

      if (response.data.success) {
        const user = response.data.user;
        
        // 사용자 유형 검증
        if (user.user_type !== userType) {
          this.showToast('선택한 계정 유형과 일치하지 않습니다.', 'error');
          return;
        }

        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        
        document.getElementById('login-modal').classList.add('hidden');
        e.target.reset();
        
        // 해당 대시보드로 리다이렉트
        if (user.user_type === 'teacher') {
          window.location.href = '/teacher';
        } else {
          window.location.href = '/student';
        }
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '로그인에 실패했습니다.', 'error');
    }
  }

  // 비밀번호 찾기 처리
  async handleForgotPassword(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email: formData.get('email')
      });

      if (response.data.success) {
        document.getElementById('forgot-password-modal').classList.add('hidden');
        e.target.reset();
        // 개발용으로 임시 비밀번호 표시
        this.showToast(`임시 비밀번호: ${response.data.temp_password}`, 'info', 10000);
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '비밀번호 찾기에 실패했습니다.', 'error');
    }
  }

  // ===== 학생 페이지 관련 =====
  initStudentPage() {
    if (!this.currentUser || this.currentUser.user_type !== 'student') {
      window.location.href = '/';
      return;
    }

    this.updateStudentUI();
    this.loadStudentData();
  }

  bindStudentEvents() {
    // 학생 로그아웃
    const studentLogout = document.getElementById('student-logout');
    if (studentLogout) {
      studentLogout.addEventListener('click', this.handleLogout.bind(this));
    }

    // 학생 질문 폼
    const studentQuestionForm = document.getElementById('student-question-form');
    if (studentQuestionForm) {
      studentQuestionForm.addEventListener('submit', this.handleStudentQuestionSubmit.bind(this));
    }

    // 학생 AI 채팅
    const studentAIChatForm = document.getElementById('student-ai-chat-form');
    if (studentAIChatForm) {
      studentAIChatForm.addEventListener('submit', this.handleStudentAIChat.bind(this));
    }

    // 학생 날짜 선택
    const studentDatePicker = document.getElementById('student-date-picker');
    if (studentDatePicker) {
      studentDatePicker.addEventListener('change', this.handleStudentDateChange.bind(this));
      studentDatePicker.valueAsDate = new Date();
    }
  }

  updateStudentUI() {
    const nameElement = document.getElementById('student-name');
    if (nameElement && this.currentUser) {
      nameElement.textContent = `${this.currentUser.full_name} (${this.currentUser.class_name || '미지정'})`;
    }
  }

  async loadStudentData() {
    if (!this.currentUser) return;
    
    await Promise.all([
      this.loadStudentQuestions(),
      this.loadStudentTopQuestions()
    ]);
  }

  async loadStudentQuestions() {
    try {
      const response = await axios.get(`/api/questions/today/${this.currentUser.class_name}`);
      if (response.data.success) {
        this.renderStudentQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('학생 질문 로드 오류:', error);
    }
  }

  async loadStudentTopQuestions() {
    try {
      const response = await axios.get(`/api/questions/top-weekly?class_name=${this.currentUser.class_name}`);
      if (response.data.success) {
        this.renderStudentTopQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('학생 TOP 질문 로드 오류:', error);
    }
  }

  renderStudentQuestions(questions) {
    const feed = document.getElementById('student-questions-feed');
    if (!feed) return;
    
    if (questions.length === 0) {
      feed.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fas fa-comments text-4xl mb-4 text-gray-300"></i>
          <p>아직 오늘 만든 질문이 없습니다.</p>
          <p class="text-sm">첫 번째 질문을 작성해보세요!</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = questions.map(question => this.createStudentQuestionCard(question)).join('');
  }

  createStudentQuestionCard(question) {
    const timeAgo = dayjs(question.created_at).fromNow();
    
    return `
      <div class="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-green-200 question-card">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              ${question.author_name.charAt(0)}
            </div>
            <div>
              <div class="font-semibold text-green-800 text-sm">${question.author_name}</div>
              <div class="text-xs text-green-600">${timeAgo}</div>
            </div>
          </div>
        </div>
        
        <div class="mb-3">
          <p class="text-gray-800 text-sm leading-relaxed">${question.content}</p>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <button onclick="app.toggleLike(${question.id})" 
                    class="like-button flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors text-sm">
              <i class="fas fa-heart"></i>
              <span id="like-count-${question.id}">${question.like_count || 0}</span>
            </button>
            <button onclick="app.toggleComments(${question.id})" 
                    class="flex items-center space-x-1 text-gray-500 hover:text-green-500 transition-colors text-sm">
              <i class="fas fa-comment"></i>
              <span>${question.comment_count || 0}</span>
            </button>
          </div>
        </div>
        
        <!-- 댓글 섹션 -->
        <div id="comments-${question.id}" class="hidden mt-3 pt-3 border-t border-green-100">
          <div id="comments-list-${question.id}" class="space-y-2 mb-3">
            <!-- 댓글이 여기에 로드됩니다 -->
          </div>
          
          <form onsubmit="app.submitComment(event, ${question.id})" class="flex space-x-2">
            <input type="text" name="comment" placeholder="댓글을 입력하세요..." required
                   class="flex-1 px-3 py-1 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            <button type="submit" 
                    class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
              등록
            </button>
          </form>
        </div>
      </div>
    `;
  }

  renderStudentTopQuestions(questions) {
    const container = document.getElementById('student-top-questions');
    if (!container) return;
    
    if (questions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 text-sm py-4">
          이번 주 질문이 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = questions.map((question, index) => `
      <div class="flex items-start space-x-2 p-2 hover:bg-green-50 rounded-lg cursor-pointer">
        <div class="w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          ${index + 1}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-green-800 line-clamp-2 leading-snug">
            ${question.content}
          </p>
          <div class="flex items-center mt-1 text-xs text-green-600">
            <span>${question.author_name}</span>
            <span class="mx-1">·</span>
            <i class="fas fa-heart text-red-500 mr-1"></i>
            <span>${question.like_count}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  async handleStudentQuestionSubmit(e) {
    e.preventDefault();
    
    if (!this.currentUser) return;

    const formData = new FormData(e.target);
    const content = formData.get('content').trim();
    
    if (!content) {
      this.showToast('질문 내용을 입력해주세요.', 'error');
      return;
    }

    try {
      const response = await axios.post('/api/questions', {
        user_id: this.currentUser.id,
        content: content
      });

      if (response.data.success) {
        e.target.reset();
        this.showToast('질문이 등록되었습니다!', 'success');
        this.loadStudentQuestions();
        this.loadStudentTopQuestions();
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '질문 등록에 실패했습니다.', 'error');
    }
  }

  async handleStudentAIChat(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const message = formData.get('message').trim();
    
    if (!message) return;

    this.addAIMessage('user', message, 'student');
    e.target.reset();

    this.addAIMessage('assistant', '생각하는 중...', 'student', true);

    try {
      const response = await axios.post('/api/ai/chat', {
        message: message,
        user_id: this.currentUser?.id
      });

      const messages = document.getElementById('student-ai-messages');
      const loadingMsg = messages.lastElementChild;
      if (loadingMsg && loadingMsg.classList.contains('typing-indicator')) {
        loadingMsg.remove();
      }

      if (response.data.success) {
        this.addAIMessage('assistant', response.data.response, 'student');
      }
    } catch (error) {
      const messages = document.getElementById('student-ai-messages');
      const loadingMsg = messages.lastElementChild;
      if (loadingMsg && loadingMsg.classList.contains('typing-indicator')) {
        loadingMsg.remove();
      }
      
      this.addAIMessage('assistant', '죄송합니다. 일시적인 오류가 발생했습니다.', 'student');
    }
  }

  async handleStudentDateChange(e) {
    const selectedDate = e.target.value;
    if (selectedDate) {
      try {
        const response = await axios.get(`/api/questions/date/${selectedDate}?class_name=${this.currentUser.class_name}`);
        if (response.data.success) {
          this.renderStudentQuestions(response.data.questions);
          this.showToast(`${selectedDate} 질문을 불러왔습니다.`, 'info');
        }
      } catch (error) {
        console.error('날짜별 질문 로드 오류:', error);
      }
    }
  }

  // ===== 교사 페이지 관련 =====
  initTeacherPage() {
    if (!this.currentUser || this.currentUser.user_type !== 'teacher') {
      window.location.href = '/';
      return;
    }

    this.updateTeacherUI();
    this.loadTeacherData();
  }

  bindTeacherEvents() {
    // 교사 로그아웃
    const teacherLogout = document.getElementById('teacher-logout');
    if (teacherLogout) {
      teacherLogout.addEventListener('click', this.handleLogout.bind(this));
    }

    // 학생 계정 생성
    const createStudentForm = document.getElementById('create-student-form');
    if (createStudentForm) {
      createStudentForm.addEventListener('submit', this.handleCreateStudent.bind(this));
    }

    // 교사 날짜 선택
    const teacherDatePicker = document.getElementById('teacher-date-picker');
    if (teacherDatePicker) {
      teacherDatePicker.addEventListener('change', this.handleTeacherDateChange.bind(this));
      teacherDatePicker.valueAsDate = new Date();
    }
  }

  updateTeacherUI() {
    const nameElement = document.getElementById('teacher-name');
    if (nameElement && this.currentUser) {
      nameElement.textContent = `${this.currentUser.full_name} (${this.currentUser.class_name || '미지정'})`;
    }
  }

  async loadTeacherData() {
    if (!this.currentUser) return;
    
    await Promise.all([
      this.loadTeacherQuestions(),
      this.loadTeacherStats(),
      this.loadTeacherStudents()
    ]);
  }

  async loadTeacherQuestions() {
    try {
      const response = await axios.get(`/api/questions/today/${this.currentUser.class_name}`);
      if (response.data.success) {
        this.renderTeacherQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('교사 질문 로드 오류:', error);
    }
  }

  async loadTeacherStats() {
    try {
      const response = await axios.get(`/api/teacher/stats/${this.currentUser.class_name}`);
      if (response.data.success) {
        this.updateTeacherStats(response.data.stats);
      }
    } catch (error) {
      console.error('교사 통계 로드 오류:', error);
    }
  }

  async loadTeacherStudents() {
    try {
      const response = await axios.get(`/api/teacher/students/${this.currentUser.class_name}`);
      if (response.data.success) {
        this.renderTeacherStudents(response.data.students);
      }
    } catch (error) {
      console.error('학생 목록 로드 오류:', error);
    }
  }

  renderTeacherQuestions(questions) {
    const feed = document.getElementById('teacher-questions-feed');
    if (!feed) return;
    
    if (questions.length === 0) {
      feed.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fas fa-comments text-4xl mb-4 text-gray-300"></i>
          <p>오늘 학생들이 만든 질문이 없습니다.</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = questions.map(question => this.createTeacherQuestionCard(question)).join('');
  }

  createTeacherQuestionCard(question) {
    const timeAgo = dayjs(question.created_at).fromNow();
    
    return `
      <div class="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-200 question-card">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              ${question.author_name.charAt(0)}
            </div>
            <div>
              <div class="font-semibold text-blue-800 text-sm">${question.author_name}</div>
              <div class="text-xs text-blue-600">${timeAgo}</div>
            </div>
          </div>
        </div>
        
        <div class="mb-3">
          <p class="text-gray-800 text-sm leading-relaxed">${question.content}</p>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-1 text-red-500 text-sm">
              <i class="fas fa-heart"></i>
              <span>${question.like_count || 0}</span>
            </div>
            <div class="flex items-center space-x-1 text-blue-500 text-sm">
              <i class="fas fa-comment"></i>
              <span>${question.comment_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateTeacherStats(stats) {
    const todayCount = document.getElementById('today-questions-count');
    const weekCount = document.getElementById('week-questions-count');
    const activeCount = document.getElementById('active-students-count');

    if (todayCount) todayCount.textContent = stats.today_questions;
    if (weekCount) weekCount.textContent = stats.week_questions;
    if (activeCount) activeCount.textContent = `${stats.active_students}/${stats.total_students}`;
  }

  renderTeacherStudents(students) {
    const container = document.getElementById('students-list');
    if (!container) return;
    
    if (students.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 text-sm py-4">
          등록된 학생이 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = students.map(student => `
      <div class="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg">
        <div>
          <div class="font-semibold text-sm text-blue-800">${student.full_name}</div>
          <div class="text-xs text-blue-600">${student.username}</div>
        </div>
        <div class="text-xs text-gray-500">
          질문 ${student.question_count}개 (이번주 ${student.week_question_count}개)
        </div>
      </div>
    `).join('');
  }

  async handleCreateStudent(e) {
    e.preventDefault();
    
    if (!this.currentUser) return;

    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post('/api/teacher/create-student', {
        teacher_id: this.currentUser.id,
        student_name: formData.get('student_name'),
        student_username: formData.get('student_username'),
        student_password: formData.get('student_password')
      });

      if (response.data.success) {
        e.target.reset();
        this.showToast('학생 계정이 생성되었습니다!', 'success');
        this.loadTeacherStudents();
        this.loadTeacherStats();
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '학생 계정 생성에 실패했습니다.', 'error');
    }
  }

  async handleTeacherDateChange(e) {
    const selectedDate = e.target.value;
    if (selectedDate) {
      try {
        const response = await axios.get(`/api/questions/date/${selectedDate}?class_name=${this.currentUser.class_name}`);
        if (response.data.success) {
          this.renderTeacherQuestions(response.data.questions);
          this.showToast(`${selectedDate} 질문을 불러왔습니다.`, 'info');
        }
      } catch (error) {
        console.error('날짜별 질문 로드 오류:', error);
      }
    }
  }

  // ===== 공통 기능들 =====
  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem('user');
    window.location.href = '/';
  }

  // 좋아요 토글
  async toggleLike(questionId) {
    if (!this.currentUser) {
      this.showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      const response = await axios.post(`/api/questions/${questionId}/like`, {
        user_id: this.currentUser.id
      });

      if (response.data.success) {
        // 좋아요 수 업데이트
        if (this.currentPage === 'student') {
          this.loadStudentQuestions();
          this.loadStudentTopQuestions();
        }
        
        const message = response.data.action === 'liked' ? '좋아요!' : '좋아요 취소';
        this.showToast(message, 'success', 2000);
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '좋아요 처리에 실패했습니다.', 'error');
    }
  }

  // 댓글 토글
  async toggleComments(questionId) {
    const commentsDiv = document.getElementById(`comments-${questionId}`);
    
    if (commentsDiv.classList.contains('hidden')) {
      commentsDiv.classList.remove('hidden');
      await this.loadComments(questionId);
    } else {
      commentsDiv.classList.add('hidden');
    }
  }

  // 댓글 로드
  async loadComments(questionId) {
    try {
      const response = await axios.get(`/api/questions/${questionId}/comments`);
      if (response.data.success) {
        this.renderComments(questionId, response.data.comments);
      }
    } catch (error) {
      console.error('댓글 로드 오류:', error);
    }
  }

  // 댓글 렌더링
  renderComments(questionId, comments) {
    const container = document.getElementById(`comments-list-${questionId}`);
    
    if (comments.length === 0) {
      container.innerHTML = `
        <div class="text-sm text-gray-500 text-center py-2">
          아직 댓글이 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = comments.map(comment => `
      <div class="flex items-start space-x-2">
        <div class="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
          ${comment.author_name.charAt(0)}
        </div>
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-1">
            <span class="font-semibold text-xs">${comment.author_name}</span>
            <span class="text-xs text-gray-400">${dayjs(comment.created_at).fromNow()}</span>
          </div>
          <p class="text-xs text-gray-700">${comment.content}</p>
        </div>
      </div>
    `).join('');
  }

  // 댓글 작성
  async submitComment(e, questionId) {
    e.preventDefault();
    
    if (!this.currentUser) {
      this.showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const formData = new FormData(e.target);
    const content = formData.get('comment').trim();
    
    if (!content) return;

    try {
      const response = await axios.post(`/api/questions/${questionId}/comments`, {
        user_id: this.currentUser.id,
        content: content
      });

      if (response.data.success) {
        e.target.reset();
        await this.loadComments(questionId);
        
        if (this.currentPage === 'student') {
          this.loadStudentQuestions();
        } else if (this.currentPage === 'teacher') {
          this.loadTeacherQuestions();
        }
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '댓글 등록에 실패했습니다.', 'error');
    }
  }

  // AI 메시지 추가
  addAIMessage(role, content, pageType = 'student', isLoading = false) {
    const messagesId = pageType === 'student' ? 'student-ai-messages' : 'teacher-ai-messages';
    const messages = document.getElementById(messagesId);
    if (!messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start space-x-2 ${role === 'user' ? 'justify-end' : ''} ${isLoading ? 'typing-indicator' : ''}`;
    
    const bgColor = pageType === 'student' ? 'bg-green-100' : 'bg-blue-100';
    const textColor = pageType === 'student' ? 'text-green-800' : 'text-blue-800';
    
    if (role === 'user') {
      messageDiv.innerHTML = `
        <div class="${bgColor} rounded-xl p-2 text-sm max-w-xs ${textColor}">
          ${content}
        </div>
        <i class="fas fa-user ${textColor} mt-1"></i>
      `;
    } else {
      messageDiv.innerHTML = `
        <i class="fas fa-robot text-purple-600 mt-1"></i>
        <div class="bg-gray-50 rounded-xl p-2 text-sm max-w-xs">
          ${content}
        </div>
      `;
    }
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  // 토스트 알림 표시
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    };

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle',
      warning: 'fa-exclamation-triangle'
    };

    toast.className = `${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 toast-enter`;
    toast.innerHTML = `
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}

// 앱 인스턴스 생성
const app = new QuestionClassroomApp();