/**
 * Main JavaScript for Vanilla Site Template
 *
 * Uses Alpine.js for reactive components
 * Provides utility functions for common tasks
 */

// ===========================
// Scroll Animations
// ===========================

/**
 * Initialize scroll-triggered animations
 * Adds 'animate-fade-in' class when element enters viewport
 */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with data-animate attribute
  document.querySelectorAll('[data-animate]').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// ===========================
// Smooth Scroll
// ===========================

/**
 * Initialize smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ===========================
// Form Handling
// ===========================

/**
 * Initialize form handling with validation and submission
 */
function initForms() {
  document.querySelectorAll('form[data-ajax]').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn?.textContent;

      // Show loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours...';
      }

      try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Get action URL or use default
        const action = form.getAttribute('action') || '/api/form';

        const response = await fetch(action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          // Show success message
          const successMsg = form.querySelector('[data-success]');
          if (successMsg) {
            successMsg.classList.remove('hidden');
          }
          form.reset();
        } else {
          throw new Error('Submission failed');
        }
      } catch (error) {
        // Show error message
        const errorMsg = form.querySelector('[data-error]');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
        }
        console.error('Form submission error:', error);
      } finally {
        // Reset button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  });
}

// ===========================
// Alpine.js Components
// ===========================

/**
 * Alpine.js data functions for common components
 * These can be used with x-data="componentName()"
 */

// Accordion component
window.accordion = () => ({
  active: null,
  toggle(index) {
    this.active = this.active === index ? null : index;
  },
  isOpen(index) {
    return this.active === index;
  }
});

// Tabs component
window.tabs = (defaultTab = null) => ({
  active: defaultTab,
  init() {
    if (!this.active) {
      const firstTab = this.$el.querySelector('[data-tab]');
      if (firstTab) {
        this.active = firstTab.dataset.tab;
      }
    }
  },
  select(tab) {
    this.active = tab;
  },
  isActive(tab) {
    return this.active === tab;
  }
});

// Carousel component
window.carousel = () => ({
  current: 0,
  total: 0,
  init() {
    this.total = this.$el.querySelectorAll('[data-slide]').length;
  },
  next() {
    this.current = (this.current + 1) % this.total;
  },
  prev() {
    this.current = (this.current - 1 + this.total) % this.total;
  },
  goTo(index) {
    this.current = index;
  },
  isActive(index) {
    return this.current === index;
  }
});

// Modal component
window.modal = () => ({
  open: false,
  show() {
    this.open = true;
    document.body.classList.add('overflow-hidden');
  },
  hide() {
    this.open = false;
    document.body.classList.remove('overflow-hidden');
  },
  toggle() {
    this.open ? this.hide() : this.show();
  }
});

// Toast notification
window.toast = () => ({
  show: false,
  message: '',
  type: 'info', // info, success, error, warning
  notify(message, type = 'info', duration = 3000) {
    this.message = message;
    this.type = type;
    this.show = true;
    setTimeout(() => {
      this.show = false;
    }, duration);
  }
});

// ===========================
// Utility Functions
// ===========================

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format number with locale
 */
function formatNumber(number, locale = 'fr-FR') {
  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'EUR', locale = 'fr-FR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// ===========================
// Header Scroll Effect
// ===========================

/**
 * Add background to header on scroll
 */
function initHeaderScroll() {
  const header = document.querySelector('header');
  if (!header) return;

  const handleScroll = throttle(() => {
    if (window.scrollY > 10) {
      header.classList.add('shadow-sm');
    } else {
      header.classList.remove('shadow-sm');
    }
  }, 100);

  window.addEventListener('scroll', handleScroll, { passive: true });
}

// ===========================
// Counter Animation
// ===========================

/**
 * Animate number counting up
 */
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const endValue = parseInt(target.dataset.counter, 10);
        const duration = parseInt(target.dataset.duration || '2000', 10);
        const suffix = target.dataset.suffix || '';
        const prefix = target.dataset.prefix || '';

        animateCounter(target, 0, endValue, duration, prefix, suffix);
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element, start, end, duration, prefix, suffix) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out quad
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const current = Math.floor(start + (end - start) * easeProgress);

    element.textContent = prefix + formatNumber(current) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ===========================
// Initialize Everything
// ===========================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all features
  initScrollAnimations();
  initSmoothScroll();
  initForms();
  initHeaderScroll();
  initCounters();

  // Re-initialize Lucide icons (for dynamically added content)
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// Expose utilities globally
window.siteUtils = {
  debounce,
  throttle,
  formatNumber,
  formatCurrency,
  copyToClipboard
};
