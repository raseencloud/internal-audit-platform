/**
 * IA PLATFORM - DASHBOARD APPLICATION
 * Version: 2.0.0
 * Date: 2026-07-11
 * Architecture: Class-based Module Pattern
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  APP_NAME: 'IA Platform',
  VERSION: '2.0.0',
  STORAGE_KEY: 'auditSession',
  REPORTS_KEY: 'auditReports',
  SETTINGS_KEY: 'auditSettings',
  DEFAULT_LANGUAGE: 'ar',
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  CHART_COLORS: {
    primary: '#2563eb',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#9333ea',
    gray: '#9ca3af'
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
  /**
   * Debounce function execution
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Format date to Arabic
   */
  formatDateArabic(date = new Date()) {
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Format date to English
   */
  formatDateEnglish(date = new Date()) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Format time
   */
  formatTime(date = new Date()) {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Generate unique ID
   */
  generateId(prefix = 'ID') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Animate number counting
   */
  animateNumber(element, target, duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current);
    }, 16);
  }
};

// ============================================
// AUTHENTICATION MANAGER
// ============================================
class AuthManager {
  constructor() {
    this.session = null;
    this.isGuest = false;
    this.init();
  }

  init() {
    this.checkSession();
    this.setupEventListeners();
  }

  checkSession() {
    try {
      const sessionData = localStorage.getItem(CONFIG.STORAGE_KEY);

      if (!sessionData) {
        this.redirectToLogin();
        return;
      }

      this.session = JSON.parse(sessionData);

      // Validate session structure
      if (!this.session || !this.session.username) {
        this.clearSession();
        this.redirectToLogin();
        return;
      }

      // Check session expiry (24 hours)
      if (this.session.timestamp) {
        const sessionAge = Date.now() - this.session.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge > maxAge) {
          this.clearSession();
          this.redirectToLogin();
          return;
        }
      }

      this.isGuest = this.session.role === 'guest';
      this.updateUI();

    } catch (error) {
      console.error('Auth check error:', error);
      this.clearSession();
      this.redirectToLogin();
    }
  }

  updateUI() {
    if (!this.session) return;

    const userName = Utils.sanitizeInput(this.session.name || this.session.username);
    const avatar = userName.charAt(0).toUpperCase();
    const userRole = this.session.role || 'user';
    const roleText = this.getRoleText(userRole);

    // Update sidebar user info
    const sidebarNameEl = document.querySelector('.sidebar-footer .user-name');
    const sidebarRoleEl = document.querySelector('.sidebar-footer .user-role');
    const sidebarAvatarEl = document.querySelector('.sidebar-footer .avatar');

    if (sidebarNameEl) sidebarNameEl.textContent = userName;
    if (sidebarRoleEl) sidebarRoleEl.textContent = roleText;
    if (sidebarAvatarEl) {
      sidebarAvatarEl.textContent = avatar;
      sidebarAvatarEl.setAttribute('aria-label', userName);
    }

    // Update top bar user info
    const topNameEl = document.querySelector('.user-profile .name');
    const topRoleEl = document.querySelector('.user-profile .role');
    const topAvatarEl = document.querySelector('.user-profile .avatar');

    if (topNameEl) topNameEl.textContent = userName;
    if (topRoleEl) topRoleEl.textContent = roleText;
    if (topAvatarEl) {
      // Safe SVG creation (no XSS risk)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '36');
      svg.setAttribute('height', '36');
      svg.setAttribute('viewBox', '0 0 36 36');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '36');
      rect.setAttribute('height', '36');
      rect.setAttribute('fill', '#475569');
      rect.setAttribute('rx', '18');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '18');
      text.setAttribute('y', '22');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.textContent = avatar;

      svg.appendChild(rect);
      svg.appendChild(text);

      topAvatarEl.innerHTML = '';
      topAvatarEl.appendChild(svg);
    }

    // Update welcome message
    const welcomeTitle = document.querySelector('.welcome-text h2');
    if (welcomeTitle) {
      welcomeTitle.textContent = `مرحباً ${userName} 👋`;
    }

    // Handle guest restrictions
    if (this.isGuest) {
      this.applyGuestRestrictions();
    }
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

  applyGuestRestrictions() {
    const guestBanner = document.getElementById('guestBanner');
    if (guestBanner) {
      guestBanner.classList.add('active');
    }

    // Disable quick actions
    document.querySelectorAll('.quick-action-item').forEach(item => {
      item.style.opacity = '0.5';
      item.style.pointerEvents = 'none';
      item.setAttribute('title', 'متوفر للمستخدمين المسجلين فقط');
    });

    // Disable new report button
    const newReportBtn = document.querySelector('[data-action="new-report"]');
    if (newReportBtn) {
      newReportBtn.disabled = true;
    }
  }

  setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  logout() {
    // Confirm before logout
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      this.clearSession();
      window.location.href = 'index.html';
    }
  }

  clearSession() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    this.session = null;
    this.isGuest = false;
  }

  redirectToLogin() {
    window.location.replace('index.html');
  }

  getSession() {
    return this.session;
  }

  isAuthenticated() {
    return !!this.session;
  }

  hasRole(roles) {
    if (!this.session) return false;
    if (Array.isArray(roles)) {
      return roles.includes(this.session.role);
    }
    return this.session.role === roles;
  }
}

// ============================================
// NOTIFICATION MANAGER
// ============================================
class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.init();
  }

  init() {
    this.createContainer();
    this.loadNotifications();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  }

  loadNotifications() {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem('auditNotifications');
    if (stored) {
      try {
        this.notifications = JSON.parse(stored);
      } catch (e) {
        this.notifications = this.getDefaultNotifications();
      }
    } else {
      this.notifications = this.getDefaultNotifications();
    }
    this.updateBadge();
  }

  getDefaultNotifications() {
    return [
      { id: 1, title: 'مهمة جديدة', message: 'تم إسناد مهمة تدقيق جديدة إليك', type: 'info', read: false, time: new Date().toISOString() },
      { id: 2, title: 'تقرير معلق', message: 'تقرير المشتريات بانتظار الاعتماد', type: 'warning', read: false, time: new Date().toISOString() },
      { id: 3, title: 'موعد اجتماع', message: 'اجتماع مع إدارة المالية الساعة 3:30', type: 'info', read: false, time: new Date().toISOString() },
      { id: 4, title: 'أدلة ناقصة', message: 'يرجى رفع الأدلة المطلوبة للمهمة ENG-2026-023', type: 'error', read: false, time: new Date().toISOString() },
      { id: 5, title: 'تهنئة', message: 'تم اعتماد تقريرك بنجاح!', type: 'success', read: false, time: new Date().toISOString() }
    ];
  }

  show(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span class="toast-message">${Utils.escapeHtml(message)}</span>
    `;

    this.container.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
      toast.remove();
    }, duration + 300);
  }

  updateBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.badge-count');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }

  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.updateBadge();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.updateBadge();
  }

  saveNotifications() {
    localStorage.setItem('auditNotifications', JSON.stringify(this.notifications));
  }
}

// ============================================
// MODAL MANAGER
// ============================================
class ModalManager {
  constructor() {
    this.activeModal = null;
    this.init();
  }

  init() {
    // Close modal on overlay click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close();
      }
    });
  }

  show(title, content, options = {}) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const contentEl = document.getElementById('modalContent');

    if (!overlay || !titleEl || !contentEl) {
      console.error('Modal elements not found');
      return;
    }

    titleEl.textContent = title;
    contentEl.innerHTML = content;

    // Apply options
    if (options.maxWidth) {
      const modal = overlay.querySelector('.modal');
      if (modal) modal.style.maxWidth = options.maxWidth;
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.activeModal = overlay;

    // Focus trap
    this.trapFocus(overlay);
  }

  close() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      this.activeModal = null;
    }
  }

  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
}

// ============================================
// CHART MANAGER
// ============================================
class ChartManager {
  constructor() {
    this.charts = {};
    this.init();
  }

  init() {
    this.initProgressChart();
    this.initKnowledgeGauge();
  }

  initProgressChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if any
    if (this.charts.progress) {
      this.charts.progress.destroy();
    }

    this.charts.progress = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['مكتمل', 'قيد التنفيذ', 'متأخر', 'ملغى'],
        datasets: [{
          data: [76, 14, 6, 4],
          backgroundColor: [
            CONFIG.CHART_COLORS.primary,
            CONFIG.CHART_COLORS.success,
            CONFIG.CHART_COLORS.warning,
            CONFIG.CHART_COLORS.gray
          ],
          borderWidth: 0,
          cutout: '72%',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        },
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const labels = ['completed', 'in-progress', 'overdue', 'cancelled'];
            app.filterByStatus(labels[elements[0].index]);
          }
        },
        animation: {
          animateRotate: true,
          duration: 1000
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: (chart) => {
          const { ctx, chartArea } = chart;
          const centerX = chartArea.left + (chartArea.right - chartArea.left) / 2;
          const centerY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Main percentage
          ctx.font = 'bold 24px "Segoe UI", sans-serif';
          ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#1e293b';
          ctx.fillText('76%', centerX, centerY - 8);

          // Arabic label
          ctx.font = '12px "Segoe UI", sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('إجمالي التقدم', centerX, centerY + 10);

          // English label
          ctx.font = '10px "Segoe UI", sans-serif';
          ctx.fillText('Overall Progress', centerX, centerY + 24);

          ctx.restore();
        }
      }]
    });
  }

  initKnowledgeGauge() {
    const canvas = document.getElementById('knowledgeGauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 10;
    const radius = 55;
    const startAngle = Math.PI;
    const progress = 84; // 84%

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Progress arc
    const progressAngle = startAngle + (progress / 100) * Math.PI;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(1, '#3b82f6');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressAngle);
    ctx.lineWidth = 10;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  updateChart(chartId, data) {
    if (this.charts[chartId]) {
      this.charts[chartId].data = data;
      this.charts[chartId].update('active');
    }
  }

  destroyAll() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }
}

// ============================================
// REPORT MANAGER
// ============================================
class ReportManager {
  constructor() {
    this.reports = [];
    this.init();
  }

  init() {
    this.loadReports();
    this.setupEventListeners();
  }

  loadReports() {
    try {
      const stored = localStorage.getItem(CONFIG.REPORTS_KEY);
      this.reports = stored ? JSON.parse(stored) : this.getDefaultReports();
    } catch (e) {
      this.reports = this.getDefaultReports();
    }
    this.updateDashboard();
  }

  getDefaultReports() {
    return [
      {
        id: 'AR-2026-001',
        title: 'تقرير تدقيق المشتريات',
        subtitle: 'Procurement Audit Report',
        department: 'إدارة المشتريات',
        date: '2026-05-31',
        status: 'completed',
        icon: 'blue'
      },
      {
        id: 'AR-2026-002',
        title: 'تقرير تدقيق المخزون',
        subtitle: 'Inventory Audit Report',
        department: 'إدارة المخزون',
        date: '2026-05-30',
        status: 'completed',
        icon: 'green'
      },
      {
        id: 'AR-2026-003',
        title: 'تقرير تدقيق الموارد البشرية',
        subtitle: 'HR Audit Report',
        department: 'إدارة الموارد البشرية',
        date: '2026-05-28',
        status: 'progress',
        icon: 'orange'
      }
    ];
  }

  setupEventListeners() {
    // Report form submission
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => this.saveReport(e));
    }
  }

  saveReport(event) {
    event.preventDefault();

    // Check permissions
    if (app.auth.isGuest) {
      app.notify.show('الزائر لا يمكنه حفظ التقارير', 'error');
      return;
    }

    const formData = new FormData(event.target);
    const report = {
      id: Utils.generateId('AR'),
      auditNumber: Utils.sanitizeInput(formData.get('auditNumber')),
      title: Utils.sanitizeInput(formData.get('title')),
      department: Utils.sanitizeInput(formData.get('department')),
      auditPeriod: Utils.sanitizeInput(formData.get('auditPeriod')),
      auditor: Utils.sanitizeInput(formData.get('auditor')),
      reviewer: Utils.sanitizeInput(formData.get('reviewer')),
      reportDate: formData.get('reportDate'),
      auditObjective: Utils.sanitizeInput(formData.get('auditObjective')),
      scope: Utils.sanitizeInput(formData.get('scope')),
      observation: Utils.sanitizeInput(formData.get('observation')),
      rootCause: Utils.sanitizeInput(formData.get('rootCause')),
      recommendation: Utils.sanitizeInput(formData.get('recommendation')),
      conclusion: Utils.sanitizeInput(formData.get('conclusion')),
      status: formData.get('status') || 'draft',
      createdAt: new Date().toISOString(),
      createdBy: app.auth.getSession()?.username || 'unknown'
    };

    this.reports.push(report);
    this.saveToStorage();
    this.updateDashboard();

    app.modal.close();
    app.notify.show('تم حفظ التقرير بنجاح!', 'success');

    event.target.reset();
  }

  saveToStorage() {
    localStorage.setItem(CONFIG.REPORTS_KEY, JSON.stringify(this.reports));
  }

  updateDashboard() {
    this.updateKPIs();
    this.updateRecentReports();
  }

  updateKPIs() {
    const openCount = this.reports.filter(r => 
      r.status === 'open' || r.status === 'in-progress'
    ).length;

    const overdueCount = this.reports.filter(r => 
      r.status === 'overdue'
    ).length;

    const highRiskCount = this.reports.filter(r => 
      r.riskRating === 'critical' || r.riskRating === 'high'
    ).length;

    // Update DOM elements safely
    const updateElement = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) {
        Utils.animateNumber(el, value, 800);
      }
    };

    updateElement('[data-kpi="open"]', openCount);
    updateElement('[data-kpi="overdue"]', overdueCount);
    updateElement('[data-kpi="high-risk"]', highRiskCount);
  }

  updateRecentReports() {
    const list = document.getElementById('recentReportsList');
    if (!list) return;

    const recent = this.reports.slice(-3).reverse();

    if (recent.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <h4>لا توجد تقارير</h4>
          <p>ابدأ بإنشاء تقرير جديد</p>
        </div>
      `;
      return;
    }

    list.innerHTML = recent.map(report => {
      const statusClass = report.status === 'completed' ? 'status-completed' : 
                         report.status === 'overdue' ? 'status-overdue' : 'status-progress';
      const statusText = report.status === 'completed' ? 'مكتمل' : 
                        report.status === 'overdue' ? 'متأخر' : 'قيد التنفيذ';
      const iconColor = report.status === 'completed' ? 'green' : 
                       report.status === 'overdue' ? 'red' : 'orange';

      return `
        <li onclick="app.openReport('${report.id}')">
          <div class="report-icon ${iconColor}">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="report-info">
            <div class="title">${Utils.escapeHtml(report.title)}</div>
            <div class="subtitle">${Utils.escapeHtml(report.department || 'N/A')}</div>
          </div>
          <div class="report-meta">
            <div class="date">${report.date || 'N/A'}</div>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
        </li>
      `;
    }).join('');
  }

  getReportById(id) {
    return this.reports.find(r => r.id === id);
  }
}

// ============================================
// SETTINGS MANAGER
// ============================================
class SettingsManager {
  constructor() {
    this.settings = this.loadSettings();
    this.applySettings();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(CONFIG.SETTINGS_KEY);
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (e) {
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      language: 'ar',
      theme: 'light',
      sidebarCollapsed: false,
      notifications: true,
      sound: false,
      fontSize: 'medium'
    };
  }

  applySettings() {
    // Apply theme
    document.documentElement.setAttribute('data-theme', this.settings.theme);

    // Apply language
    document.documentElement.setAttribute('lang', this.settings.language);
    document.documentElement.setAttribute('dir', this.settings.language === 'ar' ? 'rtl' : 'ltr');

    // Apply sidebar state
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', this.settings.sidebarCollapsed);
    }
  }

  saveSettings() {
    localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(this.settings));
  }

  toggleTheme() {
    this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    this.saveSettings();
    app.notify.show(
      this.settings.theme === 'dark' ? 'تم تفعيل الوضع الداكن' : 'تم تفعيل الوضع الفاتح',
      'info'
    );
  }

  toggleLanguage() {
    this.settings.language = this.settings.language === 'ar' ? 'en' : 'ar';
    document.documentElement.setAttribute('lang', this.settings.language);
    document.documentElement.setAttribute('dir', this.settings.language === 'ar' ? 'rtl' : 'ltr');
    this.saveSettings();

    // Reload page to apply language changes
    if (confirm('سيتم إعادة تحميل الصفحة لتطبيق التغييرات. هل تريد المتابعة؟')) {
      window.location.reload();
    }
  }

  toggleSidebar() {
    this.settings.sidebarCollapsed = !this.settings.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', this.settings.sidebarCollapsed);
    }
    this.saveSettings();
  }
}

// ============================================
// MAIN APPLICATION
// ============================================
class DashboardApp {
  constructor() {
    this.auth = null;
    this.notify = null;
    this.modal = null;
    this.charts = null;
    this.reports = null;
    this.settings = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Initialize managers in order
      this.auth = new AuthManager();
      this.notify = new NotificationManager();
      this.modal = new ModalManager();
      this.charts = new ChartManager();
      this.reports = new ReportManager();
      this.settings = new SettingsManager();

      // Setup global event listeners
      this.setupEventListeners();

      // Update dates
      this.updateDates();

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

      this.initialized = true;
      console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized successfully`);

    } catch (error) {
      console.error('Initialization error:', error);
      this.notify?.show('حدث خطأ في تحميل التطبيق', 'error');
    }
  }

  setupEventListeners() {
    // Global search
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch(e.target.value);
        }
      });
    }

    // Sidebar toggle (mobile)
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
      });
    }

    // Window resize
    window.addEventListener('resize', Utils.debounce(() => {
      this.handleResize();
    }, 250));

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.charts?.destroyAll();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }

      // Escape to close sidebar on mobile
      if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar?.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      }
    });
  }

  updateDates() {
    const now = new Date();

    // Update date display
    const dateAr = document.querySelector('.date-display .ar');
    const dateEn = document.querySelector('.date-display .en');

    if (dateAr) dateAr.textContent = Utils.formatDateArabic(now);
    if (dateEn) dateEn.textContent = Utils.formatDateEnglish(now);

    // Update footer date
    const footerDate = document.querySelector('.footer-date');
    if (footerDate) {
      footerDate.textContent = `${Utils.formatDateArabic(now)} · ${Utils.formatTime(now)}`;
    }
  }

  handleSearch(query) {
    if (!query.trim()) return;

    this.notify.show(`البحث عن: ${query}`, 'info');
    // TODO: Implement actual search functionality
    console.log('Search query:', query);
  }

  handleResize() {
    // Close sidebar on large screens
    if (window.innerWidth > 1024) {
      document.getElementById('sidebar')?.classList.remove('open');
    }
  }

  // Navigation
  navigateTo(page, element) {
    // Update active menu item
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    if (element) element.classList.add('active');

    // Update page title
    const titles = {
      'dashboard': { title: 'لوحة التحكم', subtitle: 'نظرة عامة على أداء التدقيق الداخلي' },
      'annual-plan': { title: 'الخطة السنوية للتدقيق', subtitle: 'Annual Audit Plan Management' },
      'engagements': { title: 'مهام التدقيق', subtitle: 'Audit Engagements Management' },
      'risk-register': { title: 'سجل المخاطر', subtitle: 'Risk Register & Assessment' },
      'findings': { title: 'الملاحظات والتوصيات', subtitle: 'Findings & Recommendations' },
      'corrective': { title: 'متابعة الإجراءات التصحيحية', subtitle: 'Corrective Action Tracking' },
      'reports': { title: 'التقارير', subtitle: 'Audit Reports Center' },
      'evidence': { title: 'مركز الأدلة', subtitle: 'Evidence Management' },
      'academy': { title: 'أكاديمية التدقيق', subtitle: 'Audit Academy & Training' },
      'settings': { title: 'الإعدادات', subtitle: 'System Settings' }
    };

    const pageInfo = titles[page];
    if (pageInfo) {
      const pageTitle = document.getElementById('pageTitle');
      const pageSubtitle = document.getElementById('pageSubtitle');

      if (pageTitle) pageTitle.textContent = pageInfo.title;
      if (pageSubtitle) pageSubtitle.textContent = pageInfo.subtitle;
    }

    // Close mobile sidebar
    if (window.innerWidth <= 1024) {
      document.getElementById('sidebar')?.classList.remove('open');
    }

    console.log('Navigating to:', page);
  }

  // Quick Actions
  quickAction(action) {
    if (this.auth.isGuest) {
      this.notify.show('هذه الميزة متاحة للمستخدمين المسجلين فقط', 'warning');
      return;
    }

    const actions = {
      'new-engagement': () => this.showModal('إنشاء مهمة تدقيق جديدة', 'نموذج إنشاء مهمة تدقيق جديدة'),
      'new-report': () => this.openReportModal(),
      'add-finding': () => this.showModal('إضافة ملاحظة', 'نموذج إضافة ملاحظة جديدة'),
      'upload-evidence': () => this.showModal('رفع دليل', 'نموذج رفع دليل جديد'),
      'followup-action': () => this.showModal('متابعة إجراء تصحيحي', 'نموذج متابعة إجراء تصحيحي')
    };

    if (actions[action]) {
      actions[action]();
    } else {
      console.log('Quick action:', action);
    }
  }

  // Filter handlers
  filterByStatus(status) {
    console.log('Filter by status:', status);
    this.notify.show(`تصفية حسب: ${status}`, 'info');
    // TODO: Implement actual filtering
  }

  // Task handlers
  openTask(taskId) {
    console.log('Open task:', taskId);
    this.showModal('تفاصيل المهمة', `عرض تفاصيل المهمة: ${taskId}`);
  }

  viewAllTasks() {
    this.navigateTo('engagements', document.querySelector('[data-page="engagements"]'));
  }

  // Attention handlers
  openAttention(type) {
    console.log('Open attention:', type);
    this.showModal('تفاصيل', `عرض تفاصيل: ${type}`);
  }

  viewAllAttention() {
    this.notify.show('عرض جميع العناصر التي تحتاج اهتماماً', 'info');
  }

  // Report handlers
  openReport(reportId) {
    const report = this.reports.getReportById(reportId);
    if (report) {
      this.showModal(
        report.title,
        `
          <div style="line-height: 1.8;">
            <p><strong>رقم التدقيق:</strong> ${report.auditNumber || report.id}</p>
            <p><strong>الإدارة:</strong> ${report.department || 'N/A'}</p>
            <p><strong>التاريخ:</strong> ${report.date || 'N/A'}</p>
            <p><strong>الحالة:</strong> ${report.status}</p>
            <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--border);">
            <p><strong>الملاحظة:</strong></p>
            <p>${report.observation || 'لا توجد ملاحظات'}</p>
          </div>
        `
      );
    }
  }

  viewAllReports() {
    this.navigateTo('reports', document.querySelector('[data-page="reports"]'));
  }

  openReportModal() {
    const modal = document.getElementById('reportModalOverlay');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeReportModal() {
    const modal = document.getElementById('reportModalOverlay');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Modal helpers
  showModal(title, content) {
    this.modal.show(title, content);
  }

  // AI Assistant
  openAIAssistant() {
    this.showModal(
      'AI Assistant - المساعد الذكي',
      `
        <div style="text-align: center; padding: 20px;">
          <i class="fas fa-robot" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
          <p>المساعد الذكي قيد التطوير...</p>
          <p style="color: var(--text-muted); font-size: 12px;">سيتم توفيره قريباً</p>
        </div>
      `
    );
  }

  // Academy
  openAuditAcademy() {
    this.navigateTo('academy', document.querySelector('[data-page="academy"]'));
  }

  // View report
  viewReport() {
    this.notify.show('جاري تحميل التقرير...', 'info');
  }

  // Profile
  showProfile() {
    const session = this.auth.getSession();
    if (!session) return;

    this.showModal(
      'الملف الشخصي',
      `
        <div style="text-align: center; padding: 20px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #475569, #64748b); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; margin: 0 auto 16px;">
            ${(session.name || session.username).charAt(0).toUpperCase()}
          </div>
          <h3 style="margin-bottom: 8px;">${Utils.escapeHtml(session.name || session.username)}</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">${this.auth.getRoleText(session.role)}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: right;">
            <div style="background: var(--body-bg); padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: var(--text-muted);">اسم المستخدم</div>
              <div style="font-weight: 600;">${Utils.escapeHtml(session.username)}</div>
            </div>
            <div style="background: var(--body-bg); padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: var(--text-muted);">آخر تسجيل دخول</div>
              <div style="font-weight: 600;">${Utils.formatDateArabic()}</div>
            </div>
          </div>
        </div>
      `
    );
  }

  // Notifications
  showNotifications() {
    const unreadNotifications = this.notify.notifications.filter(n => !n.read);

    if (unreadNotifications.length === 0) {
      this.showModal('الإشعارات', '<p style="text-align: center; color: var(--text-muted);">لا توجد إشعارات جديدة</p>');
      return;
    }

    const notificationsHtml = unreadNotifications.map(n => `
      <div style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="app.notify.markAsRead(${n.id})" class="notification-item">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fas ${n.type === 'error' ? 'fa-exclamation-circle' : n.type === 'warning' ? 'fa-exclamation-triangle' : n.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}" style="color: var(--${n.type === 'error' ? 'danger' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'primary'});"></i>
          <div>
            <div style="font-weight: 600; font-size: 13px;">${Utils.escapeHtml(n.title)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${Utils.escapeHtml(n.message)}</div>
          </div>
        </div>
      </div>
    `).join('');

    this.showModal('الإشعارات', `
      <div style="max-height: 400px; overflow-y: auto;">
        ${notificationsHtml}
      </div>
      <div style="margin-top: 16px; text-align: center;">
        <button class="btn btn-ghost" onclick="app.notify.markAllAsRead(); app.modal.close();">
          <i class="fas fa-check-double"></i> تحديد الكل كمقروء
        </button>
      </div>
    `);
  }
}

// ============================================
// INITIALIZATION
// ============================================
let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new DashboardApp();
  app.init();
});

// Expose app to global scope for debugging (remove in production)
window.DashboardApp = DashboardApp;
