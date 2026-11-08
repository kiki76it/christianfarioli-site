/* Google Preferred Sources: automatic publisher.js integration, no private SDK API.
 * Analytics adapter contract: window.dispatchEvent(new CustomEvent(
 *   'cf:analytics-consent', {detail: {granted: true|false}}));
 * Consent starts denied. Only an approved existing consent adapter may grant it.
 * Local preview records consented events in __cfPreferredSources.previewEvents;
 * it NEVER pushes to the production dataLayer. Google widget clicks are opaque:
 * only actual activations of our own explicit deeplinks are measured.
 */
(() => {
  'use strict';
  const boot = document.getElementById('preferred-sources-runtime');
  if (!boot || window.__cfPreferredSources) return;
  const preview = boot.dataset.preview === 'true';
  const verified = boot.dataset.eligibility === 'verified';
  const measurement = boot.dataset.measurement === 'true';
  const onRequest = boot.dataset.consentPolicy === 'on-request';
  const policyApproved = onRequest || boot.dataset.consentPolicy === 'approved';
  const state = window.__cfPreferredSources = {
    version: 1, preview, status: 'initialising', previewEvents: [],
    widgetClickCoverage: 'not-observable', consent: 'denied',
    widgetConsent: onRequest ? 'awaiting-request' : 'policy-approved',
  };
  const nodes = [...document.querySelectorAll('[data-preferred-source-placement]')];
  if (preview && !['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname)) {
    nodes.forEach((node) => { node.hidden = true; });
    state.status = 'preview-host-blocked';
    return;
  }
  // Defence in depth; the build also omits all markup when activation is off.
  if (!preview && (!verified || !policyApproved)) {
    nodes.forEach((node) => { node.hidden = true; });
    state.status = 'public-activation-blocked';
    return;
  }
  const OFFICIAL_URL = 'https://news.google.com/swg/js/v1/publisher.js';
  const READINESS_WINDOW = 15000;
  const FALLBACK_DELAY = 8000;
  const blocks = nodes.map((node) => ({
    node, marker: node.querySelector('[google-add-preferred-source-btn]'),
    wrapper: node.querySelector('.preferred-source-widget'),
    fallback: node.querySelector('.preferred-source-fallback'),
    consent: node.querySelector('.preferred-source-consent'),
    consentButton: node.querySelector('.preferred-source-consent-button'),
    loading: null, failedStatus: false,
    ready: node.dataset.integrationType === 'deeplink',
    suppressed: false, ratio: 0, viewTimer: null,
  }));
  let active = false;
  let granted = false;
  let seen = new Set();
  let intersections;
  let readiness;
  let readinessTimer;
  let readinessPoll;
  let fallbackTimer;
  let resize;
  let layoutFrame;
  let publisher;
  // This flag is scoped to this document only. No cookie or storage persists
  // permission, and analytics consent never grants permission for this service.
  let widgetRequested = !onRequest;
  const loadedFrames = new WeakSet();
  const watchedFrames = new Set();
  let watchedRoots = new WeakSet();
  const cleanups = [];

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }
  function clearView(block) {
    clearTimeout(block.viewTimer);
    block.viewTimer = null;
  }
  function emit(name, block) {
    if (!active || !measurement || !granted) return;
    const event = {
      event: name,
      placement: block.node.dataset.preferredSourcePlacement,
      variant: block.node.dataset.variant,
      page_type: block.node.dataset.pageType,
      integration_type: block.node.dataset.integrationType,
      // Deliberately omit the query, hash, document title and any form values.
      page_path: window.location.pathname,
    };
    if (preview) state.previewEvents.push(event);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push(event);
  }
  function trackView(block) {
    const placement = block.node.dataset.preferredSourcePlacement;
    if (!active || !measurement || !granted || seen.has(placement) ||
        document.visibilityState !== 'visible' || block.node.hidden ||
        !block.ready || block.ratio < 0.5) {
      clearView(block);
      return;
    }
    // Crossing from 50% to 100% remains one continuous exposure.
    if (block.viewTimer != null) return;
    block.viewTimer = setTimeout(() => {
      block.viewTimer = null;
      if (!active || !granted || document.visibilityState !== 'visible' ||
          block.node.hidden || block.ratio < 0.5 || seen.has(placement)) return;
      seen.add(placement);
      emit('preferred_source_view', block);
    }, 1000);
  }
  function updateVisibility(block) {
    const available = block.ready || (verified && block.fallback &&
      block.node.dataset.preferredSourceState === 'fallback');
    const awaitingRequest = onRequest && !widgetRequested && block.marker && block.consent;
    const loadingFeedback = block.loading && !block.loading.hidden;
    block.node.hidden = (!available && !awaitingRequest && !loadingFeedback) || block.suppressed;
    // A verified fallback is a real visible CTA for view measurement.
    if (available && block.node.dataset.preferredSourceState === 'fallback') block.ready = true;
    trackView(block);
  }
  function showFallback(block) {
    if (!widgetRequested || block.node.dataset.preferredSourceState === 'ready' || !block.marker) return;
    const restoreFocus = block.loading && document.activeElement === block.loading;
    if (block.loading) block.loading.hidden = true;
    if (block.consent) block.consent.hidden = true;
    if (verified && block.fallback) {
      if (block.wrapper) block.wrapper.hidden = true;
      block.fallback.hidden = false;
      block.node.dataset.preferredSourceState = 'fallback';
      block.node.dataset.integrationType = 'deeplink';
    } else {
      block.node.dataset.preferredSourceState = 'unavailable';
      // When no verified fallback is allowed, retain only a useful failure
      // message while it holds keyboard focus. Tab continues in document order;
      // the panel disappears on focusout instead of dropping focus to <body>.
      if (restoreFocus) {
        block.loading.textContent = 'Google content could not be loaded.';
        block.loading.hidden = false;
        block.failedStatus = true;
      }
    }
    updateVisibility(block);
    if (restoreFocus && block.node.dataset.preferredSourceState === 'fallback') {
      block.fallback.querySelector('a[href]')?.focus({ preventScroll: true });
    } else if (restoreFocus && block.failedStatus) {
      block.loading.focus({ preventScroll: true });
    }
  }
  function isPotentiallyVisible(control) {
    if (control.hidden || control.disabled) return false;
    const style = getComputedStyle(control);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }
  function findControl(root) {
    for (const control of root.querySelectorAll('button,a[href],[role="button"],iframe')) {
      if (!isPotentiallyVisible(control)) continue;
      if (control.tagName === 'IFRAME') {
        // A frame load is observable; cross-origin frame content is not.
        // Never infer a click or a successful preference from focus/blur.
        if (!watchedFrames.has(control)) {
          watchedFrames.add(control);
          listen(control, 'load', () => { loadedFrames.add(control); inspectWidgets(); });
        }
        if (loadedFrames.has(control) && /^https:\/\//.test(control.getAttribute('src') || '')) {
          return { control, evidence: 'iframe-loaded-inner-unverified' };
        }
      } else if (control.textContent.trim() || control.getAttribute('aria-label') ||
                 root.host?.getAttribute('aria-label') ||
                 control.querySelector('svg,img')) {
        return { control, evidence: 'rendered-control' };
      }
    }
    // Only open, inspectable shadow roots can be verified. A closed empty host
    // is not treated as a rendered widget and never creates a blank placeholder.
    for (const host of [root, ...root.querySelectorAll('*')]) {
      if (!host.shadowRoot) continue;
      if (readiness && !watchedRoots.has(host.shadowRoot)) {
        readiness.observe(host.shadowRoot, { childList: true, subtree: true, attributes: true });
        watchedRoots.add(host.shadowRoot);
      }
      const match = findControl(host.shadowRoot);
      if (match) return match;
    }
    return null;
  }
  function inspectWidgets() {
    if (!active || !widgetRequested) return;
    for (const block of blocks) {
      if (!block.marker || block.node.dataset.preferredSourceState === 'ready') continue;
      const match = findControl(block.marker);
      if (!match) continue;
      const restoreFocus = (block.loading && document.activeElement === block.loading) ||
        block.fallback?.contains(document.activeElement);
      if (block.loading) block.loading.hidden = true;
      block.failedStatus = false;
      block.ready = true;
      block.node.dataset.preferredSourceState = 'ready';
      block.node.dataset.preferredSourceEvidence = match.evidence;
      block.node.dataset.integrationType = 'widget';
      if (block.wrapper) block.wrapper.hidden = false;
      if (block.fallback) block.fallback.hidden = true;
      if (block.consent) block.consent.hidden = true;
      updateVisibility(block);
      // Focusing an existing native control preserves keyboard progress. This
      // does not click it, change its attributes or modify Google's preferences.
      if (restoreFocus && !block.node.hidden) match.control.focus({ preventScroll: true });
    }
    if (blocks.every((block) => !block.marker || block.node.dataset.preferredSourceState === 'ready')) {
      stopReadiness();
      clearTimeout(fallbackTimer);
      state.status = 'ready';
    }
  }
  function stopReadiness() {
    readiness?.disconnect();
    readiness = null;
    clearTimeout(readinessTimer);
    clearInterval(readinessPoll);
  }
  function watchReadiness() {
    stopReadiness();
    if (!active) return;
    watchedRoots = new WeakSet();
    readiness = new MutationObserver(inspectWidgets);
    for (const block of blocks) {
      if (block.marker) readiness.observe(block.marker, { childList: true, subtree: true, attributes: true });
    }
    // Poll only during this bounded window, including newly attached open roots.
    readinessPoll = setInterval(inspectWidgets, 300);
    readinessTimer = setTimeout(() => {
      stopReadiness();
      blocks.forEach(showFallback);
      if (state.status !== 'ready') state.status = 'rendering-unverified';
    }, READINESS_WINDOW);
    inspectWidgets();
  }
  function arrangeGrid() {
    layoutFrame = null;
    for (const block of blocks) {
      if (block.node.dataset.preferredSourcePlacement !== 'insights_grid') continue;
      const grid = block.node.parentElement;
      const cards = [...grid.children].filter((node) => node.classList.contains('article-card') &&
        !node.hidden && getComputedStyle(node).display !== 'none');
      const columns = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
      block.suppressed = cards.length < columns;
      if (!block.suppressed) {
        const anchor = cards[columns - 1];
        if (anchor.nextElementSibling !== block.node) anchor.after(block.node);
      }
      updateVisibility(block);
    }
  }
  function queueLayout() {
    if (layoutFrame == null) layoutFrame = requestAnimationFrame(arrangeGrid);
  }
  function loadPublisher() {
    if (!active || !widgetRequested) return;
    state.status = 'loading';
    for (const block of blocks) {
      if (!block.marker) continue;
      if (block.consent) block.consent.hidden = true;
      if (block.node.dataset.preferredSourceState === 'awaiting-request') {
        block.node.dataset.preferredSourceState = 'loading';
      }
      updateVisibility(block);
    }
    watchReadiness();
    fallbackTimer = setTimeout(() => blocks.forEach(showFallback), FALLBACK_DELAY);
    // Keep the load listener until pagehide so a slow request can recover
    // after the bounded observer window without appending a duplicate script.
    if (!publisher) {
      publisher = [...document.scripts].find((script) => script.src === OFFICIAL_URL);
      if (!publisher) {
        publisher = document.createElement('script');
        publisher.src = OFFICIAL_URL;
        publisher.async = true;
        publisher.id = 'preferred-sources-publisher';
      }
    }
    listen(publisher, 'load', () => { state.status = 'publisher-loaded'; watchReadiness(); });
    listen(publisher, 'error', () => {
      state.status = 'publisher-blocked';
      stopReadiness();
      clearTimeout(fallbackTimer);
      blocks.forEach(showFallback);
    });
    if (!publisher.isConnected) document.head.append(publisher);
  }
  function requestWidget(event) {
    // This is a separate, plainly labelled site permission control. It never
    // activates Google's control or changes the visitor's Google preferences.
    if (!event.isTrusted || widgetRequested || !active) return;
    const block = blocks.find((item) => item.consentButton === event.currentTarget || item.consentButton === event.target);
    const preserveFocus = block && (document.activeElement === block.consentButton || event.detail === 0);
    if (block) {
      const loading = document.createElement('p');
      loading.className = 'preferred-source-loading';
      loading.textContent = 'Loading Google’s preferred-source button…';
      loading.setAttribute('role', 'status');
      loading.tabIndex = -1;
      block.loading = loading;
      block.node.append(loading);
      listen(loading, 'focusout', () => {
        if (!block.failedStatus) return;
        block.failedStatus = false;
        loading.hidden = true;
        updateVisibility(block);
      });
    }
    widgetRequested = true;
    state.widgetConsent = 'requested-this-document';
    loadPublisher();
    if (preserveFocus && !block.node.hidden) block.loading.focus({ preventScroll: true });
  }
  function start() {
    if (active) return;
    active = true;
    if ('IntersectionObserver' in window) {
      intersections = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const block = blocks.find((item) => item.node === entry.target);
          if (block) { block.ratio = entry.intersectionRatio; trackView(block); }
        }
      }, { threshold: [0, 0.5, 1] });
      blocks.forEach((block) => intersections.observe(block.node));
    }
    listen(window, 'cf:analytics-consent', (event) => {
      granted = event.detail?.granted === true;
      state.consent = granted ? 'granted' : 'denied';
      blocks.forEach(trackView);
    });
    listen(document, 'visibilitychange', () => blocks.forEach(trackView));
    for (const block of blocks) {
      if (onRequest && block.marker && block.consentButton) {
        listen(block.consentButton, 'click', requestWidget);
        if (!widgetRequested) {
          block.node.dataset.preferredSourceState = 'awaiting-request';
          block.consent.hidden = false;
          if (block.wrapper) block.wrapper.hidden = true;
          if (block.fallback) block.fallback.hidden = true;
          updateVisibility(block);
        }
      }
      listen(block.node, 'click', (event) => {
        // Native click also covers keyboard activation. No extra key handler.
        const link = event.target?.closest?.('a[href]');
        if (!link || !block.node.contains(link) || block.node.hidden ||
            block.node.dataset.integrationType !== 'deeplink') return;
        let target;
        try { target = new URL(link.href); } catch { return; }
        if (target.origin === 'https://www.google.com' && target.pathname === '/preferences/source' &&
            target.searchParams.get('q') === boot.dataset.sourceDomain) emit('preferred_source_click', block);
      });
    }
    arrangeGrid();
    const grids = blocks.filter((block) => block.node.dataset.preferredSourcePlacement === 'insights_grid');
    if (grids.length) {
      if ('ResizeObserver' in window) {
        resize = new ResizeObserver(queueLayout);
        grids.forEach((block) => resize.observe(block.node.parentElement));
      } else listen(window, 'resize', queueLayout);
      const search = document.getElementById('searchInput');
      if (search) listen(search, 'input', queueLayout);
    }
    if (blocks.some((block) => block.marker)) {
      if (widgetRequested) loadPublisher();
      else state.status = 'awaiting-request';
    } else state.status = 'deeplinks-ready';
  }
  function stop() {
    if (!active) return;
    active = false;
    blocks.forEach(clearView);
    intersections?.disconnect();
    resize?.disconnect();
    stopReadiness();
    clearTimeout(fallbackTimer);
    if (layoutFrame != null) cancelAnimationFrame(layoutFrame);
    layoutFrame = null;
    cleanups.splice(0).forEach((remove) => remove());
    watchedFrames.clear();
  }
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      seen = new Set();
      blocks.forEach((block) => { block.ratio = 0; });
      start();
    }
  });
  start();
})();
