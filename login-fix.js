/**
 * IA PLATFORM - AUTHENTICATION & SESSION FIX
 * Version: 2.0.1
 * Fixes: Login Loop, Session Mismatch, Storage Key Issues
 */

// ============================================
// CONFIGURATION - تأكد من تطابق هذه القيم في جميع الملفات
// ============================================
const AUTH_CONFIG = {
  // ⚠️ مهم جداً: يجب أن يكون نفس المفتاح في login.html و dashboard.html
  STORAGE_KEY: 'auditSession',        // لا تغيّره!

  // إعدادات الجلسة
  SESSION_DURATION: 24 * 60 * 60 * 1000,  // 24 ساعة بالمللي ثانية
  MAX_LOGIN_ATTEMPTS: 5,              // عدد المحاولات المسموحة
  LOCKOUT_DURATION: 15 * 60 * 1000,   // 15 دقيقة قفل بعد تجاوز المحاولات

  // إعدادات التوجيه
  LOGIN_PAGE: 'index.html',
  DASHBOARD_PAGE: 'dashboard.html',

  // إعدادات التصحيح (ضع true للتطوير، false للإنتاج)
  DEBUG: true
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const AuthUtils = {
  log(message, type = 'info') {
    if (AUTH_CONFIG.DEBUG) {
      const styles = {
        info: 'color: #2563eb; font-weight: bold;',
        success: 'color: #22c55e; font-weight: bold;',
        warning: 'color: #f59e0b; font-weight: bold;',
        error: 'color: #ef4444; font-weight: bold;'
      };
      console.log(`%c[Auth] ${message}`, styles[type] || styles.info);
    }
  },

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  getTimestamp() {
    return new Date().toISOString();
  },

  // التحقق من صلاحية البيانات
  isValidSession(session) {
    if (!session || typeof session !== 'object') {
      this.log('Session is not an object', 'error');
      return false;
    }

    const requiredFields = ['username', 'name', 'role', 'timestamp', 'sessionId'];
    for (const field of requiredFields) {
      if (!session[field]) {
        this.log(`Missing required field: ${field}`, 'error');
        return false;
      }
    }

    return true;
  },

  // التحقق من انتهاء صلاحية الجلسة
  isSessionExpired(session) {
    if (!session || !session.timestamp) return true;

    const now = Date.now();
    const sessionTime = new Date(session.timestamp).getTime();
    const age = now - sessionTime;

    if (age > AUTH_CONFIG.SESSION_DURATION) {
      this.log(`Session expired. Age: ${Math.round(age / 1000)}s`, 'warning');
      return true;
    }

    return false;
  }
};

// ============================================
// LOGIN ATTEMPT TRACKER
// ============================================
class LoginAttemptTracker {
  constructor() {
    this.key = 'loginAttempts';
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.key);
      this.data = stored ? JSON.parse(stored) : { count: 0, lastAttempt: null, locked: false };
    } catch (e) {
      this.data = { count: 0, lastAttempt: null, locked: false };
    }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  recordAttempt() {
    this.load();
    this.data.count++;
    this.data.lastAttempt = Date.now();

    if (this.data.count >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      this.data.locked = true;
      this.data.lockoutEnd = Date.now() + AUTH_CONFIG.LOCKOUT_DURATION;
      AuthUtils.log('Account locked due to too many attempts', 'warning');
    }

    this.save();
  }

  reset() {
    this.data = { count: 0, lastAttempt: null, locked: false, lockoutEnd: null };
    this.save();
  }

  isLocked() {
    this.load();

    if (!this.data.locked) return false;

    // التحقق من انتهاء فترة القفل
    if (this.data.lockoutEnd && Date.now() > this.data.lockoutEnd) {
      this.reset();
      return false;
    }

    return true;
  }

  getRemainingLockout() {
    if (!this.data.locked || !this.data.lockoutEnd) return 0;
    return Math.max(0, this.data.lockoutEnd - Date.now());
  }

  getRemainingAttempts() {
    this.load();
    return Math.max(0, AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - this.data.count);
  }
}

// ============================================
// SESSION MANAGER - النسخة المصححة
// ============================================
class SessionManager {
  constructor() {
    this.attemptTracker = new LoginAttemptTracker();
  }

  // إنشاء جلسة جديدة - يُستخدم بعد تسجيل الدخول الناجح
  createSession(userData) {
    AuthUtils.log('Creating new session...', 'info');

    const session = {
      sessionId: AuthUtils.generateSessionId(),
      username: userData.username || userData.email || 'unknown',
      name: userData.name || userData.username || 'User',
      role: userData.role || 'user',
      email: userData.email || '',
      avatar: userData.avatar || '',
      timestamp: AuthUtils.getTimestamp(),
      expiresAt: new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION).toISOString(),
      loginTime: AuthUtils.getTimestamp(),
      userAgent: navigator.userAgent,
      ip: 'client-side' // لا يمكن الحصول على IP من الجانب العميل
    };

    // التحقق من صلاحية الجلسة قبل الحفظ
    if (!AuthUtils.isValidSession(session)) {
      AuthUtils.log('Failed to create valid session', 'error');
      return null;
    }

    // حفظ الجلسة
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, JSON.stringify(session));

    // إعادة تعيين عداد المحاولات
    this.attemptTracker.reset();

    AuthUtils.log(`Session created for: ${session.username}`, 'success');
    AuthUtils.log(`Session expires at: ${session.expiresAt}`, 'info');

    return session;
  }

  // الحصول على الجلسة الحالية
  getSession() {
    try {
      const sessionData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);

      if (!sessionData) {
        AuthUtils.log('No session found in storage', 'warning');
        return null;
      }

      const session = JSON.parse(sessionData);

      // التحقق من صلاحية البنية
      if (!AuthUtils.isValidSession(session)) {
        AuthUtils.log('Invalid session structure', 'error');
        this.clearSession();
        return null;
      }

      // التحقق من انتهاء الصلاحية
      if (AuthUtils.isSessionExpired(session)) {
        AuthUtils.log('Session expired', 'warning');
        this.clearSession();
        return null;
      }

      AuthUtils.log(`Session valid for: ${session.username}`, 'success');
      return session;

    } catch (error) {
      AuthUtils.log(`Error reading session: ${error.message}`, 'error');
      this.clearSession();
      return null;
    }
  }

  // التحقق من وجود جلسة صالحة
  isAuthenticated() {
    return this.getSession() !== null;
  }

  // تحديث وقت النشاط
  updateActivity() {
    const session = this.getSession();
    if (session) {
      session.lastActivity = AuthUtils.getTimestamp();
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, JSON.stringify(session));
    }
  }

  // مسح الجلسة
  clearSession() {
    AuthUtils.log('Clearing session...', 'info');
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
  }

  // تسجيل محاولة فاشلة
  recordFailedAttempt() {
    this.attemptTracker.recordAttempt();
  }

  // التحقق من حالة القفل
  isLocked() {
    return this.attemptTracker.isLocked();
  }

  // الحصول على المحاولات المتبقية
  getRemainingAttempts() {
    return this.attemptTracker.getRemainingAttempts();
  }
}

// ============================================
// AUTH GUARD - حماية الصفحات
// ============================================
class AuthGuard {
  constructor() {
    this.sessionManager = new SessionManager();
  }

  // حماية الصفحة - يُستخدم في بداية كل صفحة محمية
  protectPage() {
    AuthUtils.log('Protecting page...', 'info');

    // 1. التحقق من وجود جلسة
    const session = this.sessionManager.getSession();

    if (!session) {
      AuthUtils.log('No valid session, redirecting to login...', 'warning');
      this.redirectToLogin();
      return false;
    }

    // 2. تحديث وقت النشاط
    this.sessionManager.updateActivity();

    // 3. عرض معلومات المستخدم
    this.displayUserInfo(session);

    AuthUtils.log('Page protected successfully', 'success');
    return true;
  }

  // التوجيه إلى صفحة تسجيل الدخول
  redirectToLogin() {
    // إضافة معلمة للإشارة إلى أن التوجيه كان بسبب انتهاء الجلسة
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.replace(`${AUTH_CONFIG.LOGIN_PAGE}?redirect=${currentUrl}&reason=session_expired`);
  }

  // عرض معلومات المستخدم
  displayUserInfo(session) {
    // تحديث الاسم
    const nameElements = document.querySelectorAll('[data-user="name"]');
    nameElements.forEach(el => {
      el.textContent = session.name || session.username;
    });

    // تحديث الدور
    const roleElements = document.querySelectorAll('[data-user="role"]');
    const roleText = this.getRoleText(session.role);
    roleElements.forEach(el => {
      el.textContent = roleText;
    });

    // تحديث الصورة الرمزية
    const avatarElements = document.querySelectorAll('[data-user="avatar"]');
    const avatar = (session.name || session.username).charAt(0).toUpperCase();
    avatarElements.forEach(el => {
      el.textContent = avatar;
    });

    // تحديث رسالة الترحيب
    const welcomeElements = document.querySelectorAll('[data-user="welcome"]');
    welcomeElements.forEach(el => {
      el.textContent = `مرحباً ${session.name || session.username} 👋`;
    });
  }

  getRoleText(role) {
    const roles = {
      'guest': 'زائر · Guest',
      'auditor': 'مدقق · Auditor',
      'senior': 'مدقق أول · Senior Auditor',
      'manager': 'مدير تدقيق · Audit Manager',
      'executive': 'مدير تنفيذي · Chief Audit Executive',
      'admin': 'مدير نظام · System Admin'
    };
    return roles[role] || role;
  }
}

// ============================================
// LOGIN HANDLER - معالجة تسجيل الدخول
// ============================================
class LoginHandler {
  constructor() {
    this.sessionManager = new SessionManager();
    this.attemptTracker = new LoginAttemptTracker();
  }

  // معالجة تسجيل الدخول
  async handleLogin(username, password, remember = false) {
    AuthUtils.log(`Login attempt for: ${username}`, 'info');

    // 1. التحقق من القفل
    if (this.attemptTracker.isLocked()) {
      const remaining = this.attemptTracker.getRemainingLockout();
      const minutes = Math.ceil(remaining / 60000);
      return {
        success: false,
        error: `الحساب مقفل. يرجى الانتظار ${minutes} دقيقة.`
      };
    }

    // 2. التحقق من المدخلات
    if (!username || !password) {
      return {
        success: false,
        error: 'يرجى إدخال اسم المستخدم وكلمة المرور'
      };
    }

    // 3. محاكاة التحقق من قاعدة البيانات (استبدل هذا بـ API حقيقي)
    const user = await this.authenticateUser(username, password);

    if (!user) {
      this.attemptTracker.recordAttempt();
      const remaining = this.attemptTracker.getRemainingAttempts();

      return {
        success: false,
        error: `اسم المستخدم أو كلمة المرور غير صحيحة. محاولات متبقية: ${remaining}`
      };
    }

    // 4. إنشاء الجلسة
    const session = this.sessionManager.createSession(user);

    if (!session) {
      return {
        success: false,
        error: 'حدث خطأ في إنشاء الجلسة. يرجى المحاولة مرة أخرى.'
      };
    }

    // 5. التوجيه إلى Dashboard
    AuthUtils.log('Login successful, redirecting...', 'success');

    // استخدام replace بدلاً من href لمنع الرجوع
    window.location.replace(AUTH_CONFIG.DASHBOARD_PAGE);

    return { success: true };
  }

  // محاكاة التحقق من المستخدم (استبدل هذا بـ API حقيقي)
  async authenticateUser(username, password) {
    // ⚠️ هذا مثال فقط - في الإنتاج استخدم Backend API
    const users = [
      { username: 'admin', password: 'admin123', name: 'مدير النظام', role: 'admin' },
      { username: 'Ibrahim', password: 'Ibrahim123', name: 'ابراهيم الشرقاوي', role: 'executive' },
      { username: 'guest', password: 'guest', name: 'زائر', role: 'guest' }
    ];

    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      return {
        username: user.username,
        name: user.name,
        role: user.role
      };
    }

    return null;
  }

  // تسجيل الخروج
  logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      this.sessionManager.clearSession();
      window.location.replace(AUTH_CONFIG.LOGIN_PAGE);
    }
  }
}

// ============================================
// DEBUG INFO - معلومات التصحيح
// ============================================
function showDebugInfo() {
  console.log('%c=== IA Platform Auth Debug ===', 'color: #2563eb; font-size: 16px; font-weight: bold;');

  const sessionData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
  console.log('Session Key:', AUTH_CONFIG.STORAGE_KEY);
  console.log('Session Data:', sessionData ? JSON.parse(sessionData) : 'None');

  const attemptData = localStorage.getItem('loginAttempts');
  console.log('Login Attempts:', attemptData ? JSON.parse(attemptData) : 'None');

  console.log('Current URL:', window.location.href);
  console.log('User Agent:', navigator.userAgent);
  console.log('================================');
}

// ============================================
// INITIALIZATION
// ============================================

// إنشاء instances عامة
const sessionManager = new SessionManager();
const authGuard = new AuthGuard();
const loginHandler = new LoginHandler();

// تصدير للاستخدام العام
window.AuthSystem = {
  sessionManager,
  authGuard,
  loginHandler,
  config: AUTH_CONFIG,
  utils: AuthUtils,
  showDebugInfo
};

// تشغيل معلومات التصحيح في وضع التطوير
if (AUTH_CONFIG.DEBUG) {
  showDebugInfo();
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// في login.html:
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const result = await loginHandler.handleLogin(username, password);

  if (!result.success) {
    alert(result.error);
  }
});

// في dashboard.html (أول الكود):
document.addEventListener('DOMContentLoaded', () => {
  authGuard.protectPage();
});

// لتسجيل الخروج:
document.getElementById('logoutBtn').addEventListener('click', () => {
  loginHandler.logout();
});

// للتحقق من حالة الجلسة:
if (sessionManager.isAuthenticated()) {
  console.log('User is logged in');
}

// لعرض معلومات التصحيح:
AuthSystem.showDebugInfo();
*/
