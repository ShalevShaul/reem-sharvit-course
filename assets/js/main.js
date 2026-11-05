(function () {
  'use strict';

  var config = window.COURSE_CONFIG || {};

  /* ---------- Next cohort ---------- */

  function toISO(date) {
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + m + '-' + d;
  }

  function parseISO(iso) {
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function formatDate(date) {
    var d = String(date.getDate()).padStart(2, '0');
    var m = String(date.getMonth() + 1).padStart(2, '0');
    return d + '.' + m + '.' + date.getFullYear();
  }

  // Friday → Sunday, Saturday → Sunday
  function skipWeekend(date) {
    var day = date.getDay();
    if (day === 5) date.setDate(date.getDate() + 2);
    if (day === 6) date.setDate(date.getDate() + 1);
    return date;
  }

  function nextCohort(settings, today) {
    if (!settings || !settings.enabled || !settings.firstCohort) return null;

    var first = parseISO(settings.firstCohort);
    var interval = settings.intervalMonths || 2;
    var overrides = settings.overrides || {};
    var skip = settings.skip || [];

    for (var i = 0; i < 120; i++) {
      var date = skipWeekend(new Date(first.getFullYear(), first.getMonth() + i * interval, first.getDate()));
      var key = toISO(date);
      if (skip.indexOf(key) !== -1) continue;
      if (overrides[key]) date = parseISO(overrides[key]);
      if (date >= today) return date;
    }
    return null;
  }

  function renderCohort() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var date = nextCohort(config.cohorts, today);

    document.querySelectorAll('[data-cohort]').forEach(function (el) {
      var hasDate = el.querySelector('[data-cohort-when="date"]');
      var noDate = el.querySelector('[data-cohort-when="none"]');
      if (date) {
        el.querySelectorAll('[data-cohort-date]').forEach(function (d) {
          d.textContent = formatDate(date);
          if (d.tagName === 'TIME') d.setAttribute('datetime', toISO(date));
        });
        if (hasDate) hasDate.hidden = false;
        if (noDate) noDate.hidden = true;
      } else {
        if (hasDate) hasDate.hidden = true;
        if (noDate) noDate.hidden = false;
      }
    });
  }

  /* ---------- Price & contact details ---------- */

  function renderDetails() {
    if (config.price) {
      var price = config.price.toLocaleString('he-IL') + ' ₪';
      document.querySelectorAll('[data-price]').forEach(function (el) { el.textContent = price; });
    }

    var c = config.contact || {};
    if (c.whatsapp) {
      var wa = 'https://wa.me/' + c.whatsapp + (c.whatsappMessage ? '?text=' + encodeURIComponent(c.whatsappMessage) : '');
      document.querySelectorAll('[data-wa]').forEach(function (el) { el.href = wa; });
    }
    if (c.phone) {
      document.querySelectorAll('[data-tel]').forEach(function (el) { el.href = 'tel:' + c.phone; });
    }
    if (c.phoneDisplay) {
      document.querySelectorAll('[data-phone-display]').forEach(function (el) { el.textContent = c.phoneDisplay; });
    }
    if (c.email) {
      document.querySelectorAll('[data-email]').forEach(function (el) {
        el.href = 'mailto:' + c.email;
        (el.querySelector('[data-email-text]') || el).textContent = c.email;
      });
    }

    var s = config.social || {};
    Object.keys(s).forEach(function (key) {
      document.querySelectorAll('[data-social="' + key + '"]').forEach(function (el) { el.href = s[key]; });
    });

  }

  /* ---------- Sticky hero (curtain reveal) ----------
   * If the hero is taller than the screen (mobile), stick it only once its
   * bottom reaches the bottom of the viewport, so its CTAs are never covered.
   */

  function initStickyHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    function update() {
      var offset = Math.min(0, window.innerHeight - hero.offsetHeight);
      hero.style.setProperty('--hero-top', offset + 'px');
    }
    update();
    window.addEventListener('resize', update);
  }

  /* ---------- Floating contact ----------
   * The hero already has WhatsApp + signup buttons, so the floating ones
   * appear only once the next section covers most of the hero
   * (they'd sit on top of its CTAs on mobile).
   */

  function initFloatingCta() {
    var float = document.querySelector('.float-cta');
    var next = document.querySelector('.hero + .section');
    if (!float || !next) return;

    var ticking = false;
    function update() {
      var covered = next.getBoundingClientRect().top < window.innerHeight * 0.4;
      float.classList.toggle('is-hidden', !covered);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Header ---------- */

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header || header.hasAttribute('data-static')) return;

    // With the sticky hero, stay transparent until the next section reaches the header
    var next = document.querySelector('.hero + .section');
    var ticking = false;
    function update() {
      var scrolled = next
        ? next.getBoundingClientRect().top <= header.offsetHeight
        : window.scrollY > 40;
      header.classList.toggle('is-scrolled', scrolled);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ---------- Reveal on scroll ---------- */

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Curriculum: sticky image follows the chapter in view ---------- */

  function initChapters() {
    var chapters = document.querySelectorAll('[data-chapter]');
    var images = document.querySelectorAll('[data-chapter-img]');
    if (!chapters.length) return;

    function activate(index) {
      chapters.forEach(function (el) { el.classList.toggle('is-active', el.dataset.chapter === index); });
      images.forEach(function (el) { el.classList.toggle('is-active', el.dataset.chapterImg === index); });
    }
    activate('0');

    if (!('IntersectionObserver' in window)) return;
    // A chapter becomes active when it crosses the middle of the viewport.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) activate(entry.target.dataset.chapter);
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    chapters.forEach(function (el) { observer.observe(el); });

    initChapterDots(chapters);
  }

  // Mobile carousel: dots show the card in view and jump to a card on click.
  function initChapterDots(chapters) {
    var list = document.querySelector('.chapters__list');
    var dots = document.createElement('div');
    dots.className = 'chapters__dots';

    var buttons = Array.prototype.map.call(chapters, function (chapter, i) {
      var title = chapter.querySelector('.chapter__title').textContent;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'chapters__dot';
      button.setAttribute('aria-label', 'פרק ' + (i + 1) + ': ' + title);
      button.addEventListener('click', function () {
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        chapter.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
      });
      dots.appendChild(button);
      return button;
    });
    list.after(dots);

    function setCurrent(index) {
      buttons.forEach(function (b, i) { b.setAttribute('aria-current', String(i === index)); });
    }
    setCurrent(0);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(Number(entry.target.dataset.chapter));
      });
    }, { root: list, threshold: 0.6 });
    chapters.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- FAQ open/close animation ---------- */

  function initFaq() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Only one answer stays open: opening an item closes the others.
    if (reduced) {
      items.forEach(function (item) {
        item.addEventListener('toggle', function () {
          if (!item.open) return;
          items.forEach(function (other) { if (other !== item) other.open = false; });
        });
      });
      return;
    }

    var toggles = items.map(function (item) {
      var answer = item.querySelector('.faq__answer');
      var animation = null;

      function isOpen() {
        return item.open && !item.classList.contains('is-closing');
      }

      function setOpen(opening) {
        if (opening === isOpen()) return;
        // Start from the in-flight height when interrupting a running animation.
        var from = animation ? answer.getBoundingClientRect().height : (opening ? 0 : answer.scrollHeight);

        if (animation) animation.cancel();
        if (opening) {
          item.classList.remove('is-closing');
          item.open = true;
        } else {
          item.classList.add('is-closing');
        }
        var to = opening ? answer.scrollHeight : 0;

        animation = answer.animate(
          [{ height: from + 'px', opacity: opening ? 0.4 : 1 }, { height: to + 'px', opacity: opening ? 1 : 0 }],
          { duration: opening ? 400 : 300, easing: 'cubic-bezier(0.25, 0.75, 0.35, 1)' }
        );
        animation.onfinish = function () {
          animation = null;
          if (!opening) {
            item.open = false;
            item.classList.remove('is-closing');
          }
        };
      }

      return { isOpen: isOpen, setOpen: setOpen };
    });

    items.forEach(function (item, i) {
      item.querySelector('summary').addEventListener('click', function (e) {
        e.preventDefault();
        var opening = !toggles[i].isOpen();
        if (opening) {
          toggles.forEach(function (t, j) { if (j !== i) t.setOpen(false); });
        }
        toggles[i].setOpen(opening);
      });
    });
  }


  /* ---------- Contact form (UI only) ---------- */

  function normalizePhone(value) {
    var digits = value.replace(/\D/g, '');
    if (digits.indexOf('972') === 0) digits = '0' + digits.slice(3);
    return digits;
  }

  var validators = {
    name: function (value) {
      return value.trim().length >= 2;
    },
    phone: function (value) {
      // mobile / 07x: 10 digits · landline: 9 digits
      return /^0(?:5\d|7\d)\d{7}$|^0[2-489]\d{7}$/.test(normalizePhone(value));
    },
  };

  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var submit = form.querySelector('[type="submit"]');
    var submitLabel = submit.textContent;
    var success = document.getElementById('form-success');
    var error = document.getElementById('form-error');

    function fieldOf(input) {
      return input.closest('.field');
    }

    function validate(input) {
      var check = validators[input.name];
      if (!check) return true;
      var valid = check(input.value, input);
      var field = fieldOf(input);
      field.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    Object.keys(validators).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var touched = false;
      input.addEventListener('blur', function () {
        touched = true;
        validate(input);
      });
      input.addEventListener('input', function () {
        if (touched || fieldOf(input).classList.contains('is-invalid')) validate(input);
      });
    });

    function showStatus(el) {
      [success, error].forEach(function (s) { s.classList.remove('is-visible'); });
      if (el) el.classList.add('is-visible');
    }

    function setLoading(loading) {
      submit.disabled = loading;
      submit.textContent = loading ? 'שולחת...' : submitLabel;
      form.setAttribute('aria-busy', String(loading));
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      showStatus(null);

      var firstInvalid = null;
      Object.keys(validators).forEach(function (name) {
        var input = form.elements[name];
        if (input && !validate(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // Bots fill the hidden field; pretend everything went fine
      var trap = form.elements.company;
      var isBot = trap && trap.value !== '';

      setLoading(true);

      // TODO: connect a delivery service (see form.demoMode in course.config.js)
      var demo = config.form && config.form.demoMode;
      window.setTimeout(function () {
        setLoading(false);
        if (demo || isBot) {
          form.reset();
          showStatus(success);
        } else {
          showStatus(error);
        }
      }, 900);
    });
  }

  /* ---------- Init ---------- */

  renderCohort();
  renderDetails();
  initHeader();
  initStickyHero();
  initFloatingCta();
  initReveal();
  initFaq();
  initChapters();
  initForm();
})();
