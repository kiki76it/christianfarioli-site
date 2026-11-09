/* Google Preferred Sources: automatic publisher.js integration, no private SDK API.
 * Analytics adapter contract (no private Google/CMP properties):
 * - Runtime starts denied, then emits cf:analytics-consent-request with
 *   {consumer: 'preferred-sources', requestId: N} on every start/BFcache restore.
 * - An approved adapter reads authoritative consent and answers by dispatching
 *   cf:analytics-consent with {granted: boolean, requestId: N}.
 * - When the adapter becomes ready or consent changes, it dispatches
 *   cf:analytics-consent-ready to request a fresh snapshot. A denial may also be
 *   dispatched immediately; it invalidates any outstanding grant response.
 * - Grants must match the current, single-use request. No response means denied.
 * Local preview records consented events in __cfPreferredSources.previewEvents;
 * it NEVER pushes to the production dataLayer. Only trusted native clicks on
 * a visible official control or explicit deeplink are measured. A click does
 * not establish that Google saved a preference. Google APIs/DOM are unchanged.
 * Standard mode is explicit and separate from the consent adapter. It sends
 * only trusted clicks to the verified GA4 destination and can use Analytics
 * cookies. It never sets consent, changes advertising consent or defines
 * window.gtag. Existing public Analytics denials and opt-out block transport.
 */
(() => {
  'use strict';
  const boot = document.getElementById('preferred-sources-runtime');
  if (!boot || window.__cfPreferredSources) return;
  const preview = boot.dataset.preview === 'true';
  const verified = boot.dataset.eligibility === 'verified';
  const measurementMode = boot.dataset.measurementMode || 'consented';
  const standard = measurementMode === 'standard';
  const ga4Id = boot.dataset.ga4MeasurementId;
  const measurement = boot.dataset.measurement === 'true' &&
    (measurementMode === 'consented' || (standard && ga4Id === 'G-07K2C80BDJ'));
  const onRequest = boot.dataset.consentPolicy === 'on-request';
  const policyApproved = onRequest || boot.dataset.consentPolicy === 'approved';
  const state = window.__cfPreferredSources = {
    version: 2, preview, status: 'initialising', previewEvents: [],
    widgetClickCoverage: 'native-composed-click-when-available',
    consent: standard ? 'not-set-by-integration' : 'denied',
    consentRequestId: 0, measurementMode,
    analyticsTransport: measurement ? (standard ? 'awaiting-trusted-click' : 'consented-data-layer') : 'disabled',
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
  let consentRequestId = 0;
  let pendingConsentRequest = null;
  const observedClickEvents = new WeakSet();
  let seen = new Set();
  let intersections;
  let readiness;
  let readinessTimer;
  let readinessPoll;
  let fallbackTimer;
  let resize;
  let layoutFrame;
  let publisher;
  const initialAnalyticsLayer = window.dataLayer;
  let analyticsScript;
  let analyticsConfigCommand;
  let analyticsFailed = false;
  let analyticsLoaded = false;
  let pendingAnalyticsClicks = [];
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
  function denyAnalytics() {
    granted = false;
    state.consent = standard ? 'not-set-by-integration' : 'denied';
    blocks.forEach(clearView);
  }
  function requestConsentSnapshot() {
    if (!active || standard) return;
    denyAnalytics();
    pendingConsentRequest = ++consentRequestId;
    state.consentRequestId = consentRequestId;
    window.dispatchEvent(new CustomEvent('cf:analytics-consent-request', {
      detail: { consumer: 'preferred-sources', requestId: consentRequestId },
    }));
  }
  function applyConsentSnapshot(event) {
    if (!active || standard) return;
    if (event.detail?.granted === false) {
      pendingConsentRequest = null;
      denyAnalytics();
      return;
    }
    if (event.detail?.granted !== true || pendingConsentRequest === null ||
        event.detail.requestId !== pendingConsentRequest) return;
    pendingConsentRequest = null;
    granted = true;
    state.consent = 'granted';
    blocks.forEach(trackView);
  }
  function emit(name, block) {
    if (!active || !measurement || (standard ? name !== 'preferred_source_click' : !granted)) return;
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
    else if (standard) {
      try { sendStandardClick(event); }
      catch { analyticsFailed = true; state.analyticsTransport = 'transport-error'; }
    }
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push(event);
  }
  function blockAnalytics(reason) {
    state.analyticsTransport = reason;
    return null;
  }
  function standardLayer() {
    if (window['ga-disable-' + ga4Id] === true) return blockAnalytics('opted-out');
    if (analyticsFailed) return blockAnalytics('tag-load-failed');
    const layer = window.dataLayer;
    if (!Array.isArray(layer) || layer !== initialAnalyticsLayer || typeof layer.push !== 'function') {
      return blockAnalytics('data-layer-state-changed');
    }
    // The public queue is the only observable consent source here. Any seen
    // Analytics denial (including a regional default) fails closed for this
    // document. Never replace a decision with an inferred or synthetic grant.
    // A future CMP can instead use the separate consented adapter mode.
    for (const command of layer) {
      if (command?.[0] === 'consent' && command[2]?.analytics_storage !== undefined) {
        if (command[2].analytics_storage === 'denied') return blockAnalytics('analytics-consent-denied');
        if (command[2].analytics_storage !== 'granted') return blockAnalytics('analytics-consent-conflict');
      }
      if (command?.[0] === 'config' && command[1] === ga4Id && command !== analyticsConfigCommand) {
        return blockAnalytics('existing-destination-configuration');
      }
    }
    return layer;
  }
  function watchAnalyticsScript() {
    if (!analyticsScript) return;
    // Two one-shot listeners belong to this single script, not the page's
    // interaction lifecycle. Completion while hidden records readiness only;
    // pagehide has already discarded every pending click.
    const remove = () => {
      analyticsScript.removeEventListener('load', loaded);
      analyticsScript.removeEventListener('error', failed);
    };
    const loaded = () => {
      remove();
      analyticsLoaded = true;
      state.analyticsTransport = 'tag-loaded-receipt-unverified';
      if (active) {
        try { flushStandardClicks(); }
        catch { analyticsFailed = true; pendingAnalyticsClicks = []; state.analyticsTransport = 'transport-error'; }
      }
    };
    const failed = () => {
      remove();
      analyticsFailed = true;
      pendingAnalyticsClicks = [];
      state.analyticsTransport = 'tag-load-failed';
    };
    analyticsScript.addEventListener('load', loaded, { once: true });
    analyticsScript.addEventListener('error', failed, { once: true });
  }
  function flushStandardClicks() {
    if (!active || !analyticsLoaded || !pendingAnalyticsClicks.length) return;
    const layer = standardLayer();
    if (!layer) { pendingAnalyticsClicks = []; return; }
    function enqueue() { layer.push(arguments); return arguments; }
    if (!analyticsConfigCommand) {
      const page = pendingAnalyticsClicks[0];
      analyticsConfigCommand = enqueue('config', ga4Id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: page.page_location, page_referrer: '', page_title: 'Preferred Sources',
      });
    }
    for (const parameters of pendingAnalyticsClicks.splice(0)) {
      enqueue('event', 'preferred_source_click', parameters);
    }
    state.analyticsTransport = 'event-queued-receipt-unverified';
  }
  function sendStandardClick(event) {
    const layer = standardLayer();
    if (!layer) return;
    // No query/hash, document title, referrer, client ID or form/user values.
    const location = new URL(window.location.href);
    if (location.protocol !== 'https:' ||
        !['christianfarioli.com', 'www.christianfarioli.com'].includes(location.hostname)) {
      blockAnalytics('analytics-host-blocked'); return;
    }
    const page = {
      page_location: location.origin + location.pathname,
      page_referrer: '', page_title: 'Preferred Sources',
    };
    if (!analyticsScript) {
      // An existing loader for this destination is not ours to reconfigure.
      const existing = [...document.scripts].some((script) => {
        try {
          const url = new URL(script.src);
          return url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js' &&
            url.searchParams.get('id') === ga4Id;
        } catch { return false; }
      });
      if (existing) { blockAnalytics('existing-destination-loader'); return; }
      analyticsScript = document.createElement('script');
      analyticsScript.id = 'preferred-sources-ga4';
      analyticsScript.async = true;
      analyticsScript.referrerPolicy = 'no-referrer';
      analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
      watchAnalyticsScript();
      document.head.append(analyticsScript);
    }
    const { event: name, ...parameters } = event;
    // Bounded, per-document pending clicks only. No replays from storage or from
    // before this explicit measurement mode. Configure after our loader resolves
    // so an already running GTM cannot race to load the same destination twice.
    if (pendingAnalyticsClicks.length >= 20) { blockAnalytics('pending-click-limit'); return; }
    pendingAnalyticsClicks.push({ ...parameters, ...page, send_to: ga4Id });
    state.analyticsTransport = 'tag-loading-click-pending';
    flushStandardClicks();
  }
  function emitClick(event, block) {
    if (!event.isTrusted || observedClickEvents.has(event)) return;
    observedClickEvents.add(event);
    emit('preferred_source_click', block);
  }
  function observeWidgetClick(event, block) {
    if (!event.isTrusted || !active || !block.ready || block.node.hidden ||
        block.wrapper?.hidden || block.node.dataset.preferredSourceState !== 'ready' ||
        block.node.dataset.integrationType !== 'widget' || typeof event.composedPath !== 'function') return;
    const path = event.composedPath();
    const markerIndex = path.indexOf(block.marker);
    if (markerIndex < 1) return;
    // Use native HTML semantics, not Google's class names, private properties,
    // method hooks or a guessed iframe interaction. Closed/unavailable controls
    // intentionally produce no event instead of a fabricated click.
    const inside = path.slice(0, markerIndex + 1);
    const control = inside.find((node) => node?.tagName === 'BUTTON' &&
      node.namespaceURI === 'http://www.w3.org/1999/xhtml');
    if (!control) return;
    const disabled = inside.some((node) => node?.nodeType === 1 && (
      node.disabled === true || node.hidden || node.inert ||
      node.hasAttribute('disabled') || node.hasAttribute('inert') ||
      node.matches(':disabled') || node.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true'
    ));
    if (!disabled) emitClick(event, block);
    // Do not inspect defaultPrevented: Google itself prevents default on valid
    // clicks. This passive listener never interferes with its popup or flow.
  }
  function trackView(block) {
    const placement = block.node.dataset.preferredSourcePlacement;
    if (!active || !measurement || standard || !granted || seen.has(placement) ||
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
    // A cached document must not reuse a grant that may have been revoked while
    // it was away. Only the fresh authoritative adapter response can grant it.
    pendingConsentRequest = null;
    denyAnalytics();
    if ('IntersectionObserver' in window) {
      intersections = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const block = blocks.find((item) => item.node === entry.target);
          if (block) { block.ratio = entry.intersectionRatio; trackView(block); }
        }
      }, { threshold: [0, 0.5, 1] });
      blocks.forEach((block) => intersections.observe(block.node));
    }
    if (!standard) {
      listen(window, 'cf:analytics-consent', applyConsentSnapshot);
      listen(window, 'cf:analytics-consent-ready', requestConsentSnapshot);
    }
    listen(document, 'visibilitychange', () => blocks.forEach(trackView));
    for (const block of blocks) {
      if (block.marker) listen(block.marker, 'click', (event) => observeWidgetClick(event, block),
        { capture: true, passive: true });
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
        if (!event.isTrusted) return;
        const link = event.target?.closest?.('a[href]');
        if (!link || !block.node.contains(link) || block.node.hidden ||
            block.node.dataset.integrationType !== 'deeplink') return;
        let target;
        try { target = new URL(link.href); } catch { return; }
        if (target.origin === 'https://www.google.com' && target.pathname === '/preferences/source' &&
            target.searchParams.get('q') === boot.dataset.sourceDomain) emitClick(event, block);
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
    // Listeners exist before the request, so adapters loaded before or after
    // this module can safely return synchronous or asynchronous snapshots.
    requestConsentSnapshot();
  }
  function stop() {
    if (!active) return;
    active = false;
    pendingAnalyticsClicks = [];
    pendingConsentRequest = null;
    denyAnalytics();
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
