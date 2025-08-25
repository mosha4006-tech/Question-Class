// 질문이 자라는 교실 - 새로운 메인 JavaScript

console.log('🚀 app.js 파일이 로드되었습니다!');
console.log('📅 로드 시간:', new Date().toLocaleTimeString());
console.log('🌐 현재 URL:', window.location.href);

// Day.js 설정
if (typeof dayjs !== 'undefined') {
  dayjs.extend(dayjs_plugin_relativeTime);
  dayjs.locale('ko');
  console.log('📅 Day.js 설정 완료');
}

// Tailwind 설정
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          notion: {
            50: '#f7f6f3',
            100: '#f1f0ec',
            200: '#e8e6e0',
            300: '#ddd9d1',
            400: '#cec8bc',
            500: '#b8afa0',
            600: '#9e9184',
            700: '#84786c',
            800: '#6d635a',
            900: '#5a514a',
          }
        },
        fontFamily: {
          'notion': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif']
        }
      }
    }
  };
  console.log('🎨 Tailwind 설정 완료');
}

class QuestionClassroomApp {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'landing';
    this.lastQuestionId = 0; // 마지막으로 확인한 질문 ID
    this.realTimeInterval = null; // 실시간 업데이트 인터벌
    this.isRealTimeActive = false; // 실시간 업데이트 활성 상태
    this.init();
  }

  init() {
    console.log('🏗️ QuestionClassroomApp 초기화 시작...');
    this.checkAuthState();
    this.bindEvents();
    this.detectCurrentPage();
    console.log('✅ QuestionClassroomApp 초기화 완료!');
    
    // 페이지를 떠날 때 실시간 업데이트 중지
    window.addEventListener('beforeunload', () => {
      this.stopRealTimeUpdates();
    });
    
    // 브라우저 탭이 비활성화될 때 실시간 업데이트 일시 중지
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopRealTimeUpdates();
      } else if (this.currentUser && (this.currentPage === 'student' || this.currentPage === 'teacher')) {
        this.startRealTimeUpdates();
      }
    });
  }

  // 현재 페이지 감지
  detectCurrentPage() {
    const path = window.location.pathname;
    console.log('🔍 페이지 감지 중... 경로:', path);
    
    if (path === '/student') {
      this.currentPage = 'student';
      console.log('👨‍🎓 학생 페이지로 이동');
      this.initStudentPage();
    } else if (path === '/teacher') {
      this.currentPage = 'teacher';
      console.log('👩‍🏫 교사 페이지로 이동');
      this.initTeacherPage();
    } else {
      this.currentPage = 'landing';
      console.log('🏠 랜딩 페이지 상태');
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
    this.startRealTimeUpdates(); // 실시간 업데이트 시작
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

    // 질문 수정 폼
    const editQuestionForm = document.getElementById('edit-question-form');
    if (editQuestionForm) {
      editQuestionForm.addEventListener('submit', this.handleEditQuestion.bind(this));
    }

    // 질문 분석 폼은 제거됨 (자동 분석으로 변경)

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
      this.loadStudentTopQuestions(),
      this.loadStudentPersonalStats()
    ]);
    
    // 마지막 질문 ID 업데이트
    this.updateLastQuestionId();
  }

  async loadStudentQuestions() {
    try {
      const encodedClassName = encodeURIComponent(this.currentUser.class_name);
      const response = await axios.get(`/api/questions/today/${encodedClassName}`);
      if (response.data.success) {
        this.renderStudentQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('학생 질문 로드 오류:', error);
    }
  }

  async loadStudentTopQuestions() {
    try {
      const encodedClassName = encodeURIComponent(this.currentUser.class_name);
      const response = await axios.get(`/api/questions/top-weekly?class_name=${encodedClassName}`);
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
      this.lastQuestionId = 0;
      return;
    }

    feed.innerHTML = questions.map(question => this.createStudentQuestionCard(question)).join('');
    
    // 질문 목록에서 가장 높은 ID를 마지막 질문 ID로 설정
    const maxId = Math.max(...questions.map(q => q.id));
    if (maxId > this.lastQuestionId) {
      console.log(`📝 초기 렌더링: 마지막 질문 ID 설정 ${this.lastQuestionId} -> ${maxId}`);
      this.lastQuestionId = maxId;
    }
  }

  // 카테고리별 색상 및 아이콘 반환
  getCategoryStyle(category) {
    const styles = {
      '국어': { color: 'red', icon: 'fas fa-book' },
      '수학': { color: 'blue', icon: 'fas fa-calculator' },
      '사회': { color: 'yellow', icon: 'fas fa-globe' },
      '과학': { color: 'green', icon: 'fas fa-flask' },
      '예술': { color: 'purple', icon: 'fas fa-palette' },
      '기타': { color: 'gray', icon: 'fas fa-ellipsis-h' }
    };
    
    return styles[category] || styles['기타'];
  }

  createStudentQuestionCard(question) {
    const timeAgo = dayjs(question.created_at).fromNow();
    const categoryStyle = this.getCategoryStyle(question.category || '기타');
    
    return `
      <div class="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-green-200 question-card" data-question-id="${question.id}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              ${question.author_name.charAt(0)}
            </div>
            <div class="flex-1">
              <div class="font-semibold text-green-800 text-sm">${question.author_name}</div>
              <div class="text-xs text-green-600">${timeAgo}</div>
            </div>
          </div>
          ${question.category ? `
            <div class="px-2 py-1 bg-${categoryStyle.color}-100 text-${categoryStyle.color}-600 rounded-full text-xs flex items-center space-x-1">
              <i class="${categoryStyle.icon}"></i>
              <span>${question.category}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="mb-3">
          <p class="text-gray-800 text-sm leading-relaxed">${question.content}</p>
          ${question.reason ? `
            <div class="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300 rounded-r">
              <p class="text-xs text-yellow-700">
                <i class="fas fa-lightbulb mr-1"></i>
                <strong>작성 이유:</strong> ${question.reason}
              </p>
            </div>
          ` : ''}
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
          ${this.currentUser && this.currentUser.id == question.user_id ? `
            <button onclick="app.editQuestion(${question.id}, '${question.content.replace(/'/g, "\\'")}', '${question.reason ? question.reason.replace(/'/g, "\\'") : ''}', '${question.category || '기타'}')" 
                    class="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors text-sm">
              <i class="fas fa-edit"></i>
              <span>수정</span>
            </button>
          ` : ''}
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
    const reason = formData.get('reason').trim();
    const category = formData.get('category');
    
    if (!content || !reason || !category) {
      this.showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }

    try {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>등록중...';
      submitBtn.disabled = true;
      
      const response = await axios.post('/api/questions', {
        user_id: this.currentUser.id,
        content: content,
        reason: reason,
        category: category
      });

      if (response.data.success) {
        e.target.reset();
        this.showToast('질문이 등록되었습니다! 🌱', 'success');
        
        // 즉시 새 질문 카드를 목록 맨 위에 추가
        const newQuestion = {
          id: response.data.question.id,
          content: content,
          author_name: this.currentUser.full_name,
          created_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0
        };
        
        // 현재 목록에 새 질문 추가
        const feed = document.getElementById('student-questions-feed');
        if (feed) {
          const newQuestionHTML = this.createStudentQuestionCard(newQuestion);
          
          // 기존 "질문이 없습니다" 메시지가 있다면 제거
          if (feed.innerHTML.includes('아직 오늘 만든 질문이 없습니다')) {
            feed.innerHTML = newQuestionHTML;
          } else {
            // 맨 위에 새 질문 추가
            feed.insertAdjacentHTML('afterbegin', newQuestionHTML);
          }
        }
        
        // 새로 등록한 질문을 자동으로 분석
        this.performAutoAnalysis(content);
        
        // lastQuestionId 업데이트 (새 질문이 실시간 체크에서 중복 추가되지 않도록)
        if (response.data.question.id > this.lastQuestionId) {
          console.log(`📝 새 질문 등록 후 lastQuestionId 업데이트: ${this.lastQuestionId} -> ${response.data.question.id}`);
          this.lastQuestionId = response.data.question.id;
        }
        
        // 백그라운드에서 전체 데이터 새로고침 (통계 업데이트용)
        setTimeout(async () => {
          await Promise.all([
            this.loadStudentQuestions(),
            this.loadStudentTopQuestions(), 
            this.loadStudentPersonalStats()
          ]);
        }, 500);
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '질문 등록에 실패했습니다.', 'error');
    } finally {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-pencil-alt mr-1"></i>질문 등록하기';
        submitBtn.disabled = false;
      }
    }
  }

  // 개인 통계 로드
  async loadStudentPersonalStats() {
    if (!this.currentUser) return;
    
    try {
      const response = await axios.get(`/api/student/stats/${this.currentUser.id}`);
      if (response.data.success) {
        this.updateStudentStats(response.data.stats);
        // 하트(좋아요) 수 기반으로 레벨 계산 (누적형)
        this.updateStudentLevel(response.data.stats.total_likes);
      }
    } catch (error) {
      console.error('개인 통계 로드 오류:', error);
    }
  }

  // 통계 업데이트
  updateStudentStats(stats) {
    const elements = {
      'my-total-questions': stats.total_questions,
      'my-week-questions': stats.week_questions,
      'my-total-comments': stats.total_comments
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  // 레벨 시스템 업데이트 (하트/좋아요 수 기반 - 누적형)
  updateStudentLevel(totalLikes) {
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

    const currentLevel = levels.find(level => totalLikes >= level.min && totalLikes <= level.max);
    const nextLevel = levels.find(level => level.min > totalLikes);

    if (currentLevel) {
      // 레벨 아이콘 업데이트 - 픽셀 아트 이미지 사용
      const levelIcon = document.getElementById('level-icon');
      if (levelIcon) {
        levelIcon.className = `w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center ${currentLevel.bgColor} border-4 border-white shadow-lg transform hover:scale-105 transition-transform overflow-hidden`;
        levelIcon.innerHTML = `<img src="${currentLevel.image}" alt="${currentLevel.name}" class="w-16 h-16 object-contain pixel-art" style="image-rendering: pixelated;">`;
      }

      // 레벨 이름 업데이트
      const levelName = document.getElementById('level-name');
      if (levelName) levelName.textContent = currentLevel.name;

      // 진행도 업데이트 (하트/좋아요 수 기반)
      const levelProgress = document.getElementById('level-progress');
      if (levelProgress) levelProgress.textContent = `총 하트: ${totalLikes}개 (누적)`;

      // 다음 레벨 정보
      const nextLevelElement = document.getElementById('next-level');
      if (nextLevelElement) {
        if (nextLevel) {
          const remainingLikes = nextLevel.min - totalLikes;
          nextLevelElement.textContent = `다음 단계: ${nextLevel.name} (하트 ${remainingLikes}개 더 필요)`;
          
          // 프로그레스 바
          const progressBar = document.getElementById('progress-bar');
          if (progressBar) {
            const currentLevelRange = currentLevel.max - currentLevel.min + 1;
            const currentLevelProgress = totalLikes - currentLevel.min;
            const progress = Math.min(100, (currentLevelProgress / currentLevelRange) * 100);
            progressBar.style.width = `${progress}%`;
          }
        } else {
          nextLevelElement.textContent = '최고 레벨 달성! 호기심 숲의 주인이 되셨습니다! 🎉';
          const progressBar = document.getElementById('progress-bar');
          if (progressBar) progressBar.style.width = '100%';
        }
      }
    }
  }





  // 자동 질문 분석 수행
  async performAutoAnalysis(question) {
    const analysisContainer = document.getElementById('auto-analysis-content');
    if (!analysisContainer) return;
    
    // 로딩 상태 표시
    analysisContainer.innerHTML = `
      <div class="text-center text-purple-600 py-6">
        <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
        <p class="text-sm font-medium">질문을 분석하고 있습니다...</p>
      </div>
    `;
    
    try {
      const response = await axios.post('/api/ai/analyze-question', {
        question: question,
        user_id: this.currentUser?.id
      });

      if (response.data.success) {
        const analysis = response.data.analysis;
        
        // 분석 결과를 예쁘게 표시
        analysisContainer.innerHTML = `
          <div class="space-y-4">
            <div class="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-xl">
              <div class="flex items-center mb-2">
                <i class="fas fa-lightbulb text-purple-600 mr-2"></i>
                <h4 class="font-semibold text-purple-800 text-sm">방금 작성한 질문 분석</h4>
              </div>
              <p class="text-sm text-purple-700 italic mb-2">"당신의 질문: ${question}"</p>
              <div class="text-sm text-purple-800 whitespace-pre-line leading-relaxed">${analysis}</div>
            </div>
            
            <div class="text-xs text-gray-500 text-center">
              <i class="fas fa-magic mr-1"></i>
              AI가 분석한 결과입니다. 더 나은 질문을 만들어보세요!
            </div>
          </div>
        `;
      }
    } catch (error) {
      // 에러 시 간단한 메시지 표시
      analysisContainer.innerHTML = `
        <div class="text-center text-gray-400 py-4">
          <i class="fas fa-exclamation-triangle text-xl mb-2 text-orange-400"></i>
          <p class="text-sm">분석에 실패했습니다.<br/>다음 질문에서 다시 시도해보세요.</p>
        </div>
      `;
    }
  }

  async handleStudentDateChange(e) {
    const selectedDate = e.target.value;
    if (selectedDate) {
      try {
        const encodedClassName = encodeURIComponent(this.currentUser.class_name);
        const response = await axios.get(`/api/questions/date/${selectedDate}?class_name=${encodedClassName}`);
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
    this.startRealTimeUpdates(); // 실시간 업데이트 시작
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

    // 일괄 학생 계정 생성
    const bulkCreateStudentForm = document.getElementById('bulk-create-student-form');
    if (bulkCreateStudentForm) {
      bulkCreateStudentForm.addEventListener('submit', this.handleBulkCreateStudent.bind(this));
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
      const encodedClassName = encodeURIComponent(this.currentUser.class_name);
      const response = await axios.get(`/api/questions/today/${encodedClassName}`);
      if (response.data.success) {
        this.renderTeacherQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('교사 질문 로드 오류:', error);
    }
  }

  async loadTeacherStats() {
    try {
      const encodedClassName = encodeURIComponent(this.currentUser.class_name);
      const response = await axios.get(`/api/teacher/stats/${encodedClassName}`);
      if (response.data.success) {
        this.updateTeacherStats(response.data.stats);
      }
    } catch (error) {
      console.error('교사 통계 로드 오류:', error);
    }
  }

  async loadTeacherStudents() {
    try {
      const encodedClassName = encodeURIComponent(this.currentUser.class_name);
      const response = await axios.get(`/api/teacher/students/${encodedClassName}`);
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
      this.lastQuestionId = 0;
      return;
    }

    feed.innerHTML = questions.map(question => this.createTeacherQuestionCard(question)).join('');
    
    // 질문 목록에서 가장 높은 ID를 마지막 질문 ID로 설정
    const maxId = Math.max(...questions.map(q => q.id));
    if (maxId > this.lastQuestionId) {
      console.log(`📝 교사 페이지: 마지막 질문 ID 설정 ${this.lastQuestionId} -> ${maxId}`);
      this.lastQuestionId = maxId;
    }
  }

  createTeacherQuestionCard(question) {
    const timeAgo = dayjs(question.created_at).fromNow();
    const categoryStyle = this.getCategoryStyle(question.category || '기타');
    
    return `
      <div class="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-200 question-card" data-question-id="${question.id}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              ${question.author_name.charAt(0)}
            </div>
            <div class="flex-1">
              <div class="font-semibold text-blue-800 text-sm">${question.author_name}</div>
              <div class="text-xs text-blue-600">${timeAgo}</div>
            </div>
          </div>
          ${question.category ? `
            <div class="px-2 py-1 bg-${categoryStyle.color}-100 text-${categoryStyle.color}-600 rounded-full text-xs flex items-center space-x-1">
              <i class="${categoryStyle.icon}"></i>
              <span>${question.category}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="mb-3">
          <p class="text-gray-800 text-sm leading-relaxed">${question.content}</p>
          ${question.reason ? `
            <div class="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300 rounded-r">
              <p class="text-xs text-yellow-700">
                <i class="fas fa-lightbulb mr-1"></i>
                <strong>작성 이유:</strong> ${question.reason}
              </p>
            </div>
          ` : ''}
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
      <div class="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg group">
        <div class="flex-1">
          <div class="font-semibold text-sm text-blue-800">${student.full_name}</div>
          <div class="text-xs text-blue-600">${student.username}</div>
          <div class="text-xs text-gray-500 mt-1">
            질문 ${student.question_count}개 (이번주 ${student.week_question_count}개)
          </div>
        </div>
        <button onclick="app.deleteStudent(${student.id}, '${student.full_name}')" 
                class="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-lg">
          <i class="fas fa-trash-alt mr-1"></i>삭제
        </button>
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
        const encodedClassName = encodeURIComponent(this.currentUser.class_name);
        const response = await axios.get(`/api/questions/date/${selectedDate}?class_name=${encodedClassName}`);
        if (response.data.success) {
          this.renderTeacherQuestions(response.data.questions);
          this.showToast(`${selectedDate} 질문을 불러왔습니다.`, 'info');
        }
      } catch (error) {
        console.error('날짜별 질문 로드 오류:', error);
      }
    }
  }

  // 학생 삭제
  async deleteStudent(studentId, studentName) {
    if (!this.currentUser || this.currentUser.user_type !== 'teacher') {
      this.showToast('권한이 없습니다.', 'error');
      return;
    }

    // 확인 대화상자
    if (!confirm(`정말로 학생 "${studentName}"을(를) 삭제하시겠습니까?\n\n⚠️ 주의: 해당 학생의 모든 질문과 댓글이 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/teacher/delete-student/${studentId}`);

      if (response.data.success) {
        this.showToast(`학생 "${studentName}"이(가) 삭제되었습니다.`, 'success');
        // 학생 목록과 통계 새로고침
        await Promise.all([
          this.loadTeacherStudents(),
          this.loadTeacherStats(),
          this.loadTeacherQuestions() // 질문 목록도 새로고침 (삭제된 학생 질문 제거)
        ]);
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '학생 삭제에 실패했습니다.', 'error');
      console.error('학생 삭제 오류:', error);
    }
  }

  // 학생 생성 모드 전환
  switchStudentMode(mode) {
    const singleMode = document.getElementById('single-create-mode');
    const bulkMode = document.getElementById('bulk-create-mode');
    const singleBtn = document.getElementById('single-mode-btn');
    const bulkBtn = document.getElementById('bulk-mode-btn');

    if (mode === 'single') {
      singleMode.classList.remove('hidden');
      bulkMode.classList.add('hidden');
      singleBtn.className = 'px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg transition-colors';
      bulkBtn.className = 'px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors';
    } else {
      singleMode.classList.add('hidden');
      bulkMode.classList.remove('hidden');
      singleBtn.className = 'px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors';
      bulkBtn.className = 'px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg transition-colors';
    }
  }

  // 일괄 학생 생성
  async handleBulkCreateStudent(e) {
    e.preventDefault();
    
    if (!this.currentUser) return;

    const formData = new FormData(e.target);
    const studentListText = formData.get('student_list').trim();
    
    if (!studentListText) {
      this.showToast('학생 목록을 입력해주세요.', 'error');
      return;
    }

    // 텍스트를 줄별로 분리하고 파싱
    const lines = studentListText.split('\n').map(line => line.trim()).filter(line => line);
    const students = [];
    
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(part => part.trim());
      if (parts.length !== 3) {
        this.showToast(`${i + 1}번째 줄 형식이 잘못되었습니다. (이름,아이디,비밀번호)`, 'error');
        return;
      }
      
      const [name, username, password] = parts;
      if (!name || !username || !password) {
        this.showToast(`${i + 1}번째 줄에 빈 값이 있습니다.`, 'error');
        return;
      }
      
      students.push({ name, username, password });
    }

    if (students.length === 0) {
      this.showToast('등록할 학생이 없습니다.', 'error');
      return;
    }

    try {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>생성 중...';
      submitBtn.disabled = true;

      const response = await axios.post('/api/teacher/bulk-create-students', {
        teacher_id: this.currentUser.id,
        students: students
      });

      if (response.data.success) {
        e.target.reset();
        this.showToast(`${response.data.created_count}명의 학생 계정이 생성되었습니다!`, 'success');
        
        if (response.data.errors && response.data.errors.length > 0) {
          setTimeout(() => {
            this.showToast(`${response.data.errors.length}개 계정 생성 실패 (중복 아이디 등)`, 'warning');
          }, 1000);
        }
        
        // 학생 목록과 통계 새로고침
        await Promise.all([
          this.loadTeacherStudents(),
          this.loadTeacherStats()
        ]);
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '일괄 학생 계정 생성에 실패했습니다.', 'error');
    } finally {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-users mr-1"></i>일괄 계정 생성';
        submitBtn.disabled = false;
      }
    }
  }

  // 질문 수정 모달 열기
  editQuestion(questionId, content, reason, category) {
    const modal = document.getElementById('edit-question-modal');
    const form = document.getElementById('edit-question-form');
    
    // 폼에 기존 값 설정
    form.question_id.value = questionId;
    form.content.value = content;
    form.reason.value = reason || '';
    
    // 카테고리 라디오 버튼 선택
    const categoryRadios = form.querySelectorAll('input[name="category"]');
    categoryRadios.forEach(radio => {
      if (radio.value === category) {
        radio.checked = true;
        radio.closest('.category-option').querySelector('.category-card').classList.add('selected');
      }
    });
    
    modal.classList.remove('hidden');
  }

  // 질문 수정 모달 닫기
  closeEditModal() {
    const modal = document.getElementById('edit-question-modal');
    modal.classList.add('hidden');
    
    // 폼 초기화
    const form = document.getElementById('edit-question-form');
    form.reset();
    
    // 카테고리 선택 상태 초기화
    const categoryCards = form.querySelectorAll('.category-card');
    categoryCards.forEach(card => card.classList.remove('selected'));
  }

  // 질문 수정 처리
  async handleEditQuestion(e) {
    e.preventDefault();
    
    if (!this.currentUser) return;

    const formData = new FormData(e.target);
    const questionId = formData.get('question_id');
    const content = formData.get('content').trim();
    const reason = formData.get('reason').trim();
    const category = formData.get('category');
    
    if (!content || !reason || !category) {
      this.showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }

    try {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>수정 중...';
      submitBtn.disabled = true;

      const response = await axios.put(`/api/questions/${questionId}`, {
        user_id: this.currentUser.id,
        content: content,
        reason: reason,
        category: category
      });

      if (response.data.success) {
        this.showToast('질문이 수정되었습니다! 📝', 'success');
        this.closeEditModal();
        
        // 질문 목록 새로고침
        await Promise.all([
          this.loadStudentQuestions(),
          this.loadStudentPersonalStats()
        ]);
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '질문 수정에 실패했습니다.', 'error');
    } finally {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save mr-1"></i>수정 완료';
        submitBtn.disabled = false;
      }
    }
  }

  // ===== 실시간 업데이트 시스템 =====
  
  // 실시간 업데이트 시작
  startRealTimeUpdates() {
    // 기존 인터벌 정리
    this.stopRealTimeUpdates();
    
    if (!this.currentUser || !this.currentUser.class_name) {
      console.log('❌ 실시간 업데이트 시작 실패: 사용자 정보 부족');
      return;
    }
    
    // 현재 화면의 질문들을 기준으로 lastQuestionId 초기화
    this.updateLastQuestionId();
    
    this.isRealTimeActive = true;
    
    // 3초마다 새로운 질문 확인
    this.realTimeInterval = setInterval(() => {
      this.checkForNewQuestions();
    }, 3000);
    
    console.log('🚀 실시간 업데이트 시작!');
    console.log('👤 사용자:', this.currentUser.full_name);
    console.log('🏫 클래스:', this.currentUser.class_name);
    console.log('🎯 페이지:', this.currentPage);
    console.log('🔢 시작 질문 ID:', this.lastQuestionId);
    
    // 2초 후 첫 번째 체크 (초기화 시간 확보)
    setTimeout(() => {
      console.log('🔍 첫 번째 실시간 체크 시작...');
      this.checkForNewQuestions();
    }, 2000);
  }
  
  // 실시간 업데이트 중지
  stopRealTimeUpdates() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
    this.isRealTimeActive = false;
    console.log('⏹️ 실시간 업데이트 중지');
  }
  
  // 마지막 질문 ID 업데이트
  updateLastQuestionId() {
    const feed = document.getElementById('student-questions-feed') || document.getElementById('teacher-questions-feed');
    if (!feed) {
      console.log('⚠️ 질문 피드를 찾을 수 없음');
      return;
    }
    
    const questionCards = feed.querySelectorAll('.question-card[data-question-id]');
    let maxId = this.lastQuestionId;
    
    console.log(`🔍 현재 화면의 질문 카드 ${questionCards.length}개 스캔 중...`);
    
    questionCards.forEach(card => {
      const questionId = parseInt(card.getAttribute('data-question-id'));
      if (questionId && questionId > maxId) {
        maxId = questionId;
      }
    });
    
    if (maxId > this.lastQuestionId) {
      console.log(`📝 마지막 질문 ID 업데이트: ${this.lastQuestionId} -> ${maxId}`);
      this.lastQuestionId = maxId;
    } else {
      console.log(`✅ 마지막 질문 ID 유지: ${this.lastQuestionId}`);
    }
  }
  
  // 새로운 질문 확인
  async checkForNewQuestions() {
    if (!this.currentUser) {
      console.log('❌ 사용자 정보 없음 - 실시간 업데이트 중지');
      this.stopRealTimeUpdates();
      return;
    }
    
    if (!this.currentUser.class_name) {
      console.log('❌ 클래스 정보 없음 - 실시간 업데이트 중지');
      this.stopRealTimeUpdates();
      return;
    }
    
    try {
      console.log('🔍 새 질문 체크 중... 마지막 ID:', this.lastQuestionId, '클래스:', this.currentUser.class_name);
      
      const encodedClassName = encodeURIComponent(this.currentUser.class_name);
      const apiUrl = `/api/questions/today/${encodedClassName}`;
      console.log('📡 API 호출:', apiUrl);
      
      const response = await axios.get(apiUrl);
      console.log('📡 API 응답:', response.status, response.data);
      
      if (response.data.success) {
        const questions = response.data.questions || [];
        console.log(`📝 총 ${questions.length}개 질문 확인`);
        
        // lastQuestionId가 0이면 현재 존재하는 질문들 중 최대 ID로 초기화
        if (this.lastQuestionId === 0 && questions.length > 0) {
          const maxId = Math.max(...questions.map(q => q.id));
          console.log(`🔧 lastQuestionId 초기화: 0 -> ${maxId}`);
          this.lastQuestionId = maxId;
          return; // 첫 번째 체크에서는 알림 없이 ID만 설정
        }
        
        // 새로운 질문 찾기
        const newQuestions = questions.filter(q => q.id > this.lastQuestionId);
        console.log(`🆕 새로운 질문 ${newQuestions.length}개 찾음 (기준 ID: ${this.lastQuestionId})`);
        
        if (newQuestions.length > 0) {
          console.log(`🎆 새로운 질문 ${newQuestions.length}개 발견!`);
          newQuestions.forEach(q => console.log(`  - ID:${q.id} ${q.author_name}: ${q.content.slice(0,30)}...`));
          
          // 새로운 질문들을 삽입
          this.insertNewQuestions(newQuestions);
          
          // 알림 표시
          this.showNewQuestionNotification(newQuestions.length);
          
          // TOP 5도 업데이트
          if (this.currentPage === 'student') {
            this.loadStudentTopQuestions();
          }
          
          // 통계 업데이트 (교사용)
          if (this.currentPage === 'teacher') {
            this.loadTeacherStats();
          }
        } else {
          console.log('✅ 새로운 질문 없음');
        }
      } else {
        console.error('❌ API 응답 실패:', response.data);
      }
    } catch (error) {
      console.error('❌ 실시간 업데이트 오류:', error.response?.status, error.response?.data || error.message);
      
      // 네트워크 오류가 지속되면 실시간 업데이트 일시 중지
      if (error.response?.status >= 500) {
        console.log('🚫 서버 오류로 인한 실시간 업데이트 일시 중지');
        setTimeout(() => {
          console.log('🔄 실시간 업데이트 재시도');
        }, 10000); // 10초 후 자동 재시도
      }
    }
  }
  
  // 새로운 질문 삽입
  insertNewQuestions(newQuestions) {
    const feed = document.getElementById('student-questions-feed') || document.getElementById('teacher-questions-feed');
    if (!feed) return;
    
    // "질문이 없습니다" 메시지 제거
    if (feed.innerHTML.includes('아직 오늘 만든 질문이 없습니다')) {
      feed.innerHTML = '';
    }
    
    // 새로운 질문들을 맨 위에 추가 (역순으로 삽입)
    newQuestions.reverse().forEach(question => {
      const questionHTML = this.currentPage === 'student' 
        ? this.createStudentQuestionCard(question)
        : this.createTeacherQuestionCard(question);
      
      // 새로운 질문에 애니메이션 효과 추가
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = questionHTML;
      const questionCard = tempDiv.firstElementChild;
      questionCard.style.transform = 'translateY(-20px)';
      questionCard.style.opacity = '0';
      questionCard.style.transition = 'all 0.5s ease';
      
      feed.insertAdjacentElement('afterbegin', questionCard);
      
      // 애니메이션 시작
      setTimeout(() => {
        questionCard.style.transform = 'translateY(0)';
        questionCard.style.opacity = '1';
      }, 10);
    });
    
    // 마지막 질문 ID 업데이트
    this.updateLastQuestionId();
  }
  
  // 새 질문 알림
  showNewQuestionNotification(count) {
    this.showToast(`🎆 새로운 질문 ${count}개가 등록되었습니다!`, 'info', 3000);
  }

  // ===== 공통 기능들 =====
  handleLogout() {
    this.stopRealTimeUpdates(); // 실시간 업데이트 중지
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
        // 실시간으로 모든 데이터 새로고침
        if (this.currentPage === 'student') {
          await Promise.all([
            this.loadStudentQuestions(),
            this.loadStudentTopQuestions(),
            this.loadStudentPersonalStats() // 레벨 업데이트를 위해
          ]);
        } else if (this.currentPage === 'teacher') {
          this.loadTeacherQuestions();
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
          await Promise.all([
            this.loadStudentQuestions(),
            this.loadStudentPersonalStats() // 받은 댓글 수 업데이트
          ]);
        } else if (this.currentPage === 'teacher') {
          this.loadTeacherQuestions();
        }
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '댓글 등록에 실패했습니다.', 'error');
    }
  }

  // ===== 상세 통계 모달 시스템 =====

  // 상세 통계 모달 표시
  async showStatsDetail(type) {
    if (!this.currentUser) {
      this.showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const modal = document.getElementById('stats-detail-modal');
    const title = document.getElementById('stats-modal-title');
    const content = document.getElementById('stats-modal-content');
    
    // 모달 표시
    modal.classList.remove('hidden');
    
    // 로딩 상태 표시
    content.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
        <p>데이터를 불러오는 중...</p>
      </div>
    `;
    
    try {
      let apiUrl, titleText;
      
      switch(type) {
        case 'questions':
          apiUrl = `/api/student/details/questions/${this.currentUser.id}`;
          titleText = '📝 나의 모든 질문';
          break;
        case 'week-questions':
          apiUrl = `/api/student/details/week-questions/${this.currentUser.id}`;
          titleText = '📅 이번 주 질문';
          break;
        case 'comments':
          apiUrl = `/api/student/details/comments/${this.currentUser.id}`;
          titleText = '💬 받은 댓글';
          break;
        default:
          this.closeStatsModal();
          return;
      }
      
      title.textContent = titleText;
      
      const response = await axios.get(apiUrl);
      if (response.data.success) {
        if (type === 'comments') {
          this.renderCommentsDetail(response.data.comments);
        } else {
          this.renderQuestionsDetail(response.data.questions, type);
        }
      } else {
        throw new Error('데이터를 불러오지 못했습니다.');
      }
      
    } catch (error) {
      console.error('상세 통계 로드 오류:', error);
      content.innerHTML = `
        <div class="text-center text-red-500 py-8">
          <i class="fas fa-exclamation-triangle text-2xl mb-3"></i>
          <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
          <button onclick="app.closeStatsModal()" 
                  class="mt-3 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm">
            닫기
          </button>
        </div>
      `;
    }
  }

  // 질문 상세 목록 렌더링
  renderQuestionsDetail(questions, type) {
    const content = document.getElementById('stats-modal-content');
    
    if (questions.length === 0) {
      content.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fas fa-inbox text-3xl mb-3"></i>
          <p>${type === 'week-questions' ? '이번 주에 작성한' : '작성한'} 질문이 없습니다.</p>
        </div>
      `;
      return;
    }
    
    content.innerHTML = `
      <div class="space-y-3">
        <div class="text-sm text-gray-600 mb-4">
          총 ${questions.length}개의 질문
        </div>
        ${questions.map(question => {
          const categoryStyle = this.getCategoryStyle(question.category || '기타');
          return `
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-xs text-gray-500">${dayjs(question.created_at).format('YYYY-MM-DD HH:mm')}</span>
                ${question.category ? `
                  <div class="px-2 py-1 bg-${categoryStyle.color}-100 text-${categoryStyle.color}-600 rounded-full text-xs flex items-center space-x-1">
                    <i class="${categoryStyle.icon}"></i>
                    <span>${question.category}</span>
                  </div>
                ` : ''}
              </div>
              <div class="flex items-center space-x-3 text-xs">
                <div class="flex items-center space-x-1 text-red-500">
                  <i class="fas fa-heart"></i>
                  <span>${question.like_count || 0}</span>
                </div>
                <div class="flex items-center space-x-1 text-blue-500">
                  <i class="fas fa-comment"></i>
                  <span>${question.comment_count || 0}</span>
                </div>
              </div>
            </div>
            <p class="text-gray-800 text-sm leading-relaxed mb-2">${question.content}</p>
            ${question.reason ? `
              <div class="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300 rounded-r">
                <p class="text-xs text-yellow-700">
                  <i class="fas fa-lightbulb mr-1"></i>
                  <strong>작성 이유:</strong> ${question.reason}
                </p>
              </div>
            ` : ''}
          </div>
        `}).join('')}
      </div>
    `;
  }

  // 댓글 상세 목록 렌더링
  renderCommentsDetail(comments) {
    const content = document.getElementById('stats-modal-content');
    
    if (comments.length === 0) {
      content.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fas fa-inbox text-3xl mb-3"></i>
          <p>받은 댓글이 없습니다.</p>
        </div>
      `;
      return;
    }
    
    content.innerHTML = `
      <div class="space-y-3">
        <div class="text-sm text-gray-600 mb-4">
          총 ${comments.length}개의 댓글
        </div>
        ${comments.map(comment => `
          <div class="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div class="mb-2">
              <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>${dayjs(comment.created_at).format('YYYY-MM-DD HH:mm')}</span>
                <span>by ${comment.commenter_name}</span>
              </div>
              <div class="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded mb-2">
                내 질문: "${comment.question_content.length > 50 ? comment.question_content.slice(0, 50) + '...' : comment.question_content}"
              </div>
            </div>
            <p class="text-gray-800 text-sm leading-relaxed">${comment.content}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 상세 통계 모달 닫기
  closeStatsModal() {
    const modal = document.getElementById('stats-detail-modal');
    modal.classList.add('hidden');
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
console.log('🎯 DOM 상태 체크 중...');
console.log('📊 document.readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('⏳ DOM 로딩 대기 중...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM 로딩 완료! 앱 시작...');
    const appInstance = new QuestionClassroomApp();
    window.app = appInstance; // HTML onclick에서 사용할 전역 참조
    window.questionApp = appInstance; // 디버깅용 참조
  });
} else {
  console.log('✅ DOM 이미 준비됨! 즉시 앱 시작...');
  const appInstance = new QuestionClassroomApp();
  window.app = appInstance; // HTML onclick에서 사용할 전역 참조
  window.questionApp = appInstance; // 디버깅용 참조
}