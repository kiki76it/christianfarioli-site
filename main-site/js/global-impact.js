/* One counter controller; the authored HTML remains the source of truth. */
(() => {
    const counters = [...document.querySelectorAll('.stats .stat-number span')]
        .filter(element => !element.dataset.impactInitialized)
        .map(element => {
            const label = element.textContent.trim();
            const target = Number(label.replaceAll(',', ''));
            element.dataset.impactInitialized = 'true';
            return { element, label, target, started: false, frame: 0 };
        });
    if (!counters.length) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Leave the correct static text untouched when animation is unavailable.
    if (motion.matches || typeof IntersectionObserver !== 'function'
        || typeof requestAnimationFrame !== 'function') return;

    const active = new Set();
    const byElement = new Map(counters.map(counter => [counter.element, counter]));

    function finish(counter) {
        cancelAnimationFrame(counter.frame);
        counter.frame = 0;
        counter.element.textContent = counter.label;
        active.delete(counter);
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const counter = byElement.get(entry.target);
            if (!entry.isIntersecting || !counter || counter.started) return;
            counter.started = true;
            observer.unobserve(entry.target);
            if (motion.matches || document.hidden || !Number.isSafeInteger(counter.target)
                || counter.target <= 0) return;

            const startedAt = performance.now();
            active.add(counter);
            function step(timestamp) {
                const progress = Math.min(Math.max((timestamp - startedAt) / 1600, 0), 1);
                if (progress >= 1 || motion.matches || document.hidden) {
                    finish(counter);
                    return;
                }
                const value = Math.round(counter.target * (1 - Math.pow(1 - progress, 3)));
                counter.element.textContent = value.toLocaleString('en-US');
                counter.frame = requestAnimationFrame(step);
            }
            counter.frame = requestAnimationFrame(step);
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter.element));
    // A backgrounded tab or a change in motion preference cannot leave partial values.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) active.forEach(finish);
    });
    window.addEventListener('pagehide', () => active.forEach(finish));
    motion.addEventListener('change', () => {
        if (motion.matches) {
            observer.disconnect();
            active.forEach(finish);
        }
    });
})();
