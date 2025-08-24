// 깊이있는 질문 교실 - 메인 JavaScript

class QuestionClassroom {
  constructor() {
    this.currentUser = null;
    this.questions = [];
    this.init();
  }

  init() {
    this.checkAuthState();
    this.bindEvents();
    this.loadData();
  }

  // 인증 상태 확인
  checkAuthState() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
      this.showUserInterface();
    } else {
      this.showAuthInterface();
    }
  }

  // 사용자 인터페이스 표시
  showUserInterface() {
    document.getElementById('auth-menu').classList.add('hidden');
    document.getElementById('user-menu').classList.remove('hidden');
    document.getElementById('user-name').textContent = `${this.currentUser.full_name} (${this.currentUser.user_type === 'teacher' ? '교사' : '학생'})`;
    document.getElementById('question-form-container').classList.remove('hidden');
  }

  // 인증 인터페이스 표시
  showAuthInterface() {
    document.getElementById('user-menu').classList.add('hidden');
    document.getElementById('auth-menu').classList.remove('hidden');
    document.getElementById('question-form-container').classList.add('hidden');
  }

  // 이벤트 바인딩
  bindEvents() {
    // 모달 관련
    document.getElementById('login-btn').addEventListener('click', () => {
      document.getElementById('login-modal').classList.remove('hidden');
    });

    document.getElementById('register-btn').addEventListener('click', () => {
      document.getElementById('register-modal').classList.remove('hidden');
    });

    // 모달 닫기
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.fixed').classList.add('hidden');
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
    document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
    document.getElementById('register-form').addEventListener('submit', this.handleRegister.bind(this));
    document.getElementById('question-form').addEventListener('submit', this.handleQuestionSubmit.bind(this));
    document.getElementById('ai-chat-form').addEventListener('submit', this.handleAIChat.bind(this));

    // 로그아웃
    document.getElementById('logout-btn').addEventListener('click', this.handleLogout.bind(this));

    // 날짜 선택
    document.getElementById('date-picker').addEventListener('change', this.handleDateChange.bind(this));

    // 오늘 날짜로 초기화
    document.getElementById('date-picker').valueAsDate = new Date();
  }

  // 로그인 처리
  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post('/api/auth/login', {
        username: formData.get('username'),
        password: formData.get('password')
      });

      if (response.data.success) {
        this.currentUser = response.data.user;
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        this.showUserInterface();
        document.getElementById('login-modal').classList.add('hidden');
        e.target.reset();
        this.showToast('로그인되었습니다!', 'success');
        this.loadQuestions();
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '로그인에 실패했습니다.', 'error');
    }
  }

  // 회원가입 처리
  async handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post('/api/auth/register', {
        username: formData.get('username'),
        password: formData.get('password'),
        full_name: formData.get('full_name'),
        user_type: formData.get('user_type')
      });

      if (response.data.success) {
        document.getElementById('register-modal').classList.add('hidden');
        e.target.reset();
        this.showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '회원가입에 실패했습니다.', 'error');
    }
  }

  // 로그아웃 처리
  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem('user');
    this.showAuthInterface();
    this.showToast('로그아웃되었습니다.', 'info');
    this.loadQuestions();
  }

  // 질문 작성 처리
  async handleQuestionSubmit(e) {
    e.preventDefault();
    
    if (!this.currentUser) {
      this.showToast('로그인이 필요합니다.', 'error');
      return;
    }

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
        this.loadQuestions();
        this.loadTopQuestions();
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '질문 등록에 실패했습니다.', 'error');
    }
  }

  // AI 채팅 처리
  async handleAIChat(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const message = formData.get('message').trim();
    
    if (!message) return;

    // 사용자 메시지 표시
    this.addAIMessage('user', message);
    e.target.reset();

    // 로딩 표시
    this.addAIMessage('assistant', '생각하는 중...', true);

    try {
      const response = await axios.post('/api/ai/chat', {
        message: message,
        user_id: this.currentUser?.id
      });

      // 로딩 메시지 제거
      const messages = document.getElementById('ai-messages');
      const loadingMsg = messages.lastElementChild;
      if (loadingMsg && loadingMsg.classList.contains('typing-indicator')) {
        loadingMsg.remove();
      }

      // AI 응답 표시
      if (response.data.success) {
        this.addAIMessage('assistant', response.data.response);
      }
    } catch (error) {
      // 로딩 메시지 제거
      const messages = document.getElementById('ai-messages');
      const loadingMsg = messages.lastElementChild;
      if (loadingMsg && loadingMsg.classList.contains('typing-indicator')) {
        loadingMsg.remove();
      }
      
      this.addAIMessage('assistant', '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  // AI 메시지 추가
  addAIMessage(role, content, isLoading = false) {
    const messages = document.getElementById('ai-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start space-x-2 ${role === 'user' ? 'justify-end' : ''} ${isLoading ? 'typing-indicator' : ''}`;
    
    if (role === 'user') {
      messageDiv.innerHTML = `
        <div class="bg-blue-100 rounded-lg p-2 text-sm max-w-xs">
          ${content}
        </div>
        <i class="fas fa-user text-blue-600 mt-1"></i>
      `;
    } else {
      messageDiv.innerHTML = `
        <i class="fas fa-robot text-purple-600 mt-1"></i>
        <div class="bg-gray-50 rounded-lg p-2 text-sm max-w-xs">
          ${content}
        </div>
      `;
    }
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  // 날짜 변경 처리
  async handleDateChange(e) {
    const selectedDate = e.target.value;
    if (selectedDate) {
      this.loadQuestionsByDate(selectedDate);
    }
  }

  // 데이터 로드
  async loadData() {
    await Promise.all([
      this.loadQuestions(),
      this.loadTopQuestions()
    ]);
  }

  // 질문 목록 로드
  async loadQuestions() {
    try {
      const response = await axios.get('/api/questions');
      if (response.data.success) {
        this.questions = response.data.questions;
        this.renderQuestions(this.questions);
      }
    } catch (error) {
      console.error('질문 로드 오류:', error);
      this.showToast('질문을 불러오는데 실패했습니다.', 'error');
    }
  }

  // 특정 날짜 질문 로드
  async loadQuestionsByDate(date) {
    try {
      const response = await axios.get(`/api/questions/date/${date}`);
      if (response.data.success) {
        this.renderQuestions(response.data.questions);
        this.showToast(`${date} 질문을 불러왔습니다.`, 'info');
      }
    } catch (error) {
      console.error('날짜별 질문 로드 오류:', error);
      this.showToast('해당 날짜의 질문을 불러오는데 실패했습니다.', 'error');
    }
  }

  // TOP 5 질문 로드
  async loadTopQuestions() {
    try {
      const response = await axios.get('/api/questions/top-weekly');
      if (response.data.success) {
        this.renderTopQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('TOP 5 질문 로드 오류:', error);
    }
  }

  // 질문 목록 렌더링
  renderQuestions(questions) {
    const feed = document.getElementById('questions-feed');
    
    if (questions.length === 0) {
      feed.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fas fa-comments text-4xl mb-4 text-gray-300"></i>
          <p>아직 질문이 없습니다.</p>
          <p class="text-sm">첫 번째 질문을 작성해보세요!</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = questions.map(question => this.createQuestionCard(question)).join('');
  }

  // 질문 카드 생성
  createQuestionCard(question) {
    const timeAgo = dayjs(question.created_at).fromNow();
    const isLiked = false; // TODO: 사용자별 좋아요 상태 확인
    
    return `
      <div class="question-card bg-white rounded-lg p-6 shadow-sm border border-notion-200 fade-in">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              ${question.author_name.charAt(0)}
            </div>
            <div>
              <div class="font-semibold text-gray-800">${question.author_name}</div>
              <div class="text-sm text-gray-500">
                ${question.author_type === 'teacher' ? '교사' : '학생'} · ${timeAgo}
              </div>
            </div>
          </div>
          <div class="text-sm text-gray-400">#${question.id}</div>
        </div>
        
        <div class="mb-4">
          <p class="text-gray-800 leading-relaxed">${question.content}</p>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button onclick="app.toggleLike(${question.id})" 
                    class="like-button flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors ${isLiked ? 'liked' : ''}">
              <i class="fas fa-heart"></i>
              <span id="like-count-${question.id}">${question.like_count || 0}</span>
            </button>
            <button onclick="app.toggleComments(${question.id})" 
                    class="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
              <i class="fas fa-comment"></i>
              <span>${question.comment_count || 0}</span>
            </button>
          </div>
          <div class="text-sm text-gray-400">
            ${dayjs(question.date).format('YYYY년 M월 D일')}
          </div>
        </div>
        
        <!-- 댓글 섹션 (기본 숨김) -->
        <div id="comments-${question.id}" class="hidden mt-4 pt-4 border-t border-gray-100">
          <div id="comments-list-${question.id}" class="space-y-3 mb-4">
            <!-- 댓글이 여기에 로드됩니다 -->
          </div>
          
          ${this.currentUser ? `
            <form onsubmit="app.submitComment(event, ${question.id})" class="flex space-x-2">
              <input type="text" name="comment" placeholder="댓글을 입력하세요..." required
                     class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" 
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                등록
              </button>
            </form>
          ` : `
            <div class="text-sm text-gray-500 text-center py-2">
              댓글을 작성하려면 로그인해주세요.
            </div>
          `}
        </div>
      </div>
    `;
  }

  // TOP 5 질문 렌더링
  renderTopQuestions(questions) {
    const container = document.getElementById('top-questions');
    
    if (questions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 text-sm py-4">
          이번 주 질문이 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = questions.map((question, index) => `
      <div class="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer slide-in">
        <div class="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          ${index + 1}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 line-clamp-2 leading-snug">
            ${question.content}
          </p>
          <div class="flex items-center mt-1 text-xs text-gray-500">
            <span>${question.author_name}</span>
            <span class="mx-1">·</span>
            <i class="fas fa-heart text-red-500 mr-1"></i>
            <span>${question.like_count}</span>
          </div>
        </div>
      </div>
    `).join('');
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
        this.loadQuestions();
        this.loadTopQuestions();
        
        const message = response.data.action === 'liked' ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다.';
        this.showToast(message, 'success');
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
      <div class="flex items-start space-x-3">
        <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
          ${comment.author_name.charAt(0)}
        </div>
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-1">
            <span class="font-semibold text-sm">${comment.author_name}</span>
            <span class="text-xs text-gray-500">${comment.author_type === 'teacher' ? '교사' : '학생'}</span>
            <span class="text-xs text-gray-400">${dayjs(comment.created_at).fromNow()}</span>
          </div>
          <p class="text-sm text-gray-700">${comment.content}</p>
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
    
    if (!content) {
      this.showToast('댓글 내용을 입력해주세요.', 'error');
      return;
    }

    try {
      const response = await axios.post(`/api/questions/${questionId}/comments`, {
        user_id: this.currentUser.id,
        content: content
      });

      if (response.data.success) {
        e.target.reset();
        this.showToast('댓글이 등록되었습니다!', 'success');
        await this.loadComments(questionId);
        this.loadQuestions(); // 댓글 수 업데이트
      }
    } catch (error) {
      this.showToast(error.response?.data?.error || '댓글 등록에 실패했습니다.', 'error');
    }
  }

  // 토스트 알림 표시
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
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

    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 toast-enter`;
    toast.innerHTML = `
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// 앱 인스턴스 생성
const app = new QuestionClassroom();