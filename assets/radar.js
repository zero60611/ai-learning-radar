(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const tabs = [...document.querySelectorAll('#research-tabs [data-panel]')];
  const panels = [...document.querySelectorAll('.reading-panel')];
  const cards = [...document.querySelectorAll('.term-card')];
  const sources = [...document.querySelectorAll('.source-list > li')];
  const months = [...document.querySelectorAll('.month-group')];
  const storageKey = 'ai-radar-2026-learned-v2';
  const legacyKey = 'ai-radar-2026-claude-learned-v1';
  const pageSizes = { terms: 6, sources: 10 };
  const state = { panel: 'framework', termPage: 0, sourcePage: 0, learned: new Set(), printSnapshot: null };
  const textIndex = new Map([...cards, ...sources].map(element => [element, element.textContent.toLocaleLowerCase()]));
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase().trim();
  const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyKey) ?? '[]');
    if (Array.isArray(saved)) {
      state.learned = new Set(saved.filter(id => cards.some(card => card.id === id)));
    }
  } catch (_) { /* Reading remains available if storage is blocked. */ }

  function activatePanel(name, focus = false) {
    state.panel = name;
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
    tabs.forEach(tab => {
      const selected = tab.dataset.panel === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
  }

  function syncLearned(card) {
    const selected = state.learned.has(card.id);
    const button = card.querySelector('.learn-button');
    card.classList.toggle('learned', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? '✓ 已學習' : '標記已學習';
    button.setAttribute('aria-label', `${selected ? '取消已學習標記' : '標記已學習'}：${card.querySelector('h3').textContent}`);
  }

  function matchingCards() {
    const query = normalize($('search').value);
    return cards.filter(card => {
      const learned = state.learned.has(card.id);
      return (!query || normalize(textIndex.get(card)).includes(query))
        && (!$('category').value || card.dataset.category === $('category').value)
        && (!$('period').value || card.dataset.period === $('period').value)
        && (!$('progress').value || ($('progress').value === 'learned' ? learned : !learned));
    });
  }

  function renderPage(elements, matches, pageKey, size, prefix) {
    const pages = Math.max(1, Math.ceil(matches.length / size));
    state[pageKey] = Math.max(0, Math.min(state[pageKey], pages - 1));
    const from = state[pageKey] * size;
    const visible = new Set(matches.slice(from, from + size));
    elements.forEach(element => { element.hidden = !visible.has(element); });
    $(prefix + '-pagination').hidden = matches.length <= size;
    $(prefix + '-prev').disabled = state[pageKey] === 0;
    $(prefix + '-next').disabled = state[pageKey] >= pages - 1;
    $(prefix + '-page').textContent = `${state[pageKey] + 1} / ${pages} 頁`;
    return { from, to: Math.min(from + size, matches.length) };
  }

  function syncExpandLabel() {
    const visible = cards.filter(card => !card.hidden);
    const open = visible.length > 0 && visible.every(card => card.querySelector('details').open);
    $('expand').textContent = open ? '收合本頁詳解' : '展開本頁詳解';
    $('expand').setAttribute('aria-expanded', String(open));
    $('expand').disabled = visible.length === 0;
  }

  function renderTerms() {
    const matches = matchingCards();
    const range = renderPage(cards, matches, 'termPage', pageSizes.terms, 'term');
    $('results').textContent = `${matches.length ? `${range.from + 1}–${range.to}` : '0'} / ${matches.length} 個符合詞條 · 共 ${cards.length} 個 · 已學習 ${state.learned.size} 個`;
    $('empty').hidden = matches.length > 0;
    syncExpandLabel();
  }

  function matchingSources() {
    const query = normalize($('source-search').value);
    return sources.filter(source => !query || normalize(textIndex.get(source)).includes(query));
  }

  function renderSources() {
    const matches = matchingSources();
    const range = renderPage(sources, matches, 'sourcePage', pageSizes.sources, 'source');
    $('source-results').textContent = `${matches.length ? `${range.from + 1}–${range.to}` : '0'} / ${matches.length} 筆來源`;
    $('source-empty').hidden = matches.length > 0;
  }

  function syncMonthsLabel() {
    const allOpen = months.every(month => month.open);
    $('timeline-expand').textContent = allOpen ? '收合所有月份' : '展開所有月份';
    $('timeline-expand').setAttribute('aria-expanded', String(allOpen));
  }

  function clearTermFilters() {
    ['search', 'category', 'period', 'progress'].forEach(id => { $(id).value = ''; });
    state.termPage = 0;
  }

  function hashTarget() {
    try { return $(decodeURIComponent(location.hash.slice(1))); }
    catch (_) { return null; }
  }

  function revealTarget(target, scroll = true) {
    if (!target) return;
    const panel = target.closest('.reading-panel');
    if (panel) activatePanel(panel.dataset.panel);
    if (target.classList.contains('term-card')) {
      let matches = matchingCards();
      if (!matches.includes(target)) {
        clearTermFilters();
        matches = matchingCards();
      }
      state.termPage = Math.floor(matches.indexOf(target) / pageSizes.terms);
      renderTerms();
      target.querySelector('details').open = true;
      syncExpandLabel();
    }
    if (sources.includes(target)) {
      let matches = matchingSources();
      if (!matches.includes(target)) {
        $('source-search').value = '';
        matches = matchingSources();
      }
      state.sourcePage = Math.floor(matches.indexOf(target) / pageSizes.sources);
      renderSources();
    }
    let ancestor = target;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    if (target.classList.contains('event')) target.querySelector('details').open = true;
    if (scroll) requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: motion });
      // Programmatic focus keeps keyboard users at the same reading destination.
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  function navigateHash(href) {
    let target;
    try { target = $(decodeURIComponent(href.slice(1))); } catch (_) { return; }
    if (!target) return;
    if (location.hash !== href) history.pushState(null, '', href);
    revealTarget(target);
  }

  $('research-tabs').setAttribute('role', 'tablist');
  tabs.forEach(tab => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'panel-' + tab.dataset.panel);
  });
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + panel.dataset.panel);
    panel.tabIndex = 0;
  });
  $('research-tabs').addEventListener('keydown', event => {
    const current = tabs.indexOf(event.target);
    if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activatePanel(tabs[next].dataset.panel, true);
    history.replaceState(null, '', tabs[next].getAttribute('href'));
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    event.preventDefault();
    navigateHash(anchor.getAttribute('href'));
  });
  window.addEventListener('hashchange', () => revealTarget(hashTarget()));
  window.addEventListener('popstate', () => {
    const target = hashTarget();
    if (target) revealTarget(target);
    else activatePanel('framework');
  });

  cards.forEach(card => {
    syncLearned(card);
    card.querySelector('details').addEventListener('toggle', syncExpandLabel);
    card.querySelector('.learn-button').addEventListener('click', () => {
      state.learned.has(card.id) ? state.learned.delete(card.id) : state.learned.add(card.id);
      syncLearned(card);
      try { localStorage.setItem(storageKey, JSON.stringify([...state.learned])); } catch (_) {}
      renderTerms();
    });
  });
  ['search', 'category', 'period', 'progress'].forEach(id => {
    $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { state.termPage = 0; renderTerms(); });
  });
  $('reset').addEventListener('click', () => { clearTermFilters(); renderTerms(); $('search').focus(); });
  $('expand').addEventListener('click', () => {
    const visible = cards.filter(card => !card.hidden);
    const open = !visible.every(card => card.querySelector('details').open);
    visible.forEach(card => { card.querySelector('details').open = open; });
    syncExpandLabel();
  });
  [['term', 'termPage', renderTerms, 'glossary'], ['source', 'sourcePage', renderSources, 'sources']].forEach(([prefix, key, render, target]) => {
    ['prev', 'next'].forEach(direction => $(prefix + '-' + direction).addEventListener('click', () => {
      state[key] += direction === 'next' ? 1 : -1;
      render();
      $(target).scrollIntoView({ block: 'start', behavior: motion });
    }));
  });
  $('source-search').addEventListener('input', () => { state.sourcePage = 0; renderSources(); });
  months.forEach(month => month.addEventListener('toggle', syncMonthsLabel));
  $('timeline-expand').addEventListener('click', () => {
    const open = !months.every(month => month.open);
    months.forEach(month => { month.open = open; });
    syncMonthsLabel();
  });
  $('print').addEventListener('click', () => window.print());
  $('back-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: motion }));

  window.addEventListener('beforeprint', () => {
    if (state.printSnapshot) return;
    const details = [...document.querySelectorAll('details')];
    state.printSnapshot = {
      visibility: [...panels, ...cards, ...sources].map(element => [element, element.hidden]),
      details: details.map(element => [element, element.open])
    };
    state.printSnapshot.visibility.forEach(([element]) => { element.hidden = false; });
    details.forEach(element => { element.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (!state.printSnapshot) return;
    state.printSnapshot.visibility.forEach(([element, hidden]) => { element.hidden = hidden; });
    state.printSnapshot.details.forEach(([element, open]) => { element.open = open; });
    state.printSnapshot = null;
    syncExpandLabel();
    syncMonthsLabel();
  });

  activatePanel('framework');
  renderTerms();
  renderSources();
  syncMonthsLabel();
  revealTarget(hashTarget(), Boolean(location.hash));
})();
