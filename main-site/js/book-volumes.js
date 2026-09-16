/* Progressive enhancement: plain links and static CSS books work without JS. */
(() => {
    const section = document.querySelector('#books');
    if (!section || !window.CSS?.supports('transform-style', 'preserve-3d')) return;

    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let controller;
    let resetBooks = [];

    function detach() {
        controller?.abort();
        controller = undefined;
        resetBooks.forEach(reset => reset());
        resetBooks = [];
    }

    function attach() {
        detach();
        if (!media.matches) return;
        controller = new AbortController();
        const options = { passive: true, signal: controller.signal };

        section.querySelectorAll('[data-book-stage]').forEach(stage => {
            let frame = 0;
            let x = 0;
            let y = 0;

            function reset() {
                if (frame) cancelAnimationFrame(frame);
                frame = 0;
                stage.classList.remove('is-tracking');
                ['--book-lift', '--book-tilt-x', '--book-tilt-y'].forEach(name => stage.style.removeProperty(name));
            }

            function track(event) {
                // Hybrid laptops may have both a mouse and touch input.
                if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
                const rect = stage.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const clamp = value => Math.max(-1, Math.min(1, value));
                x = clamp((event.clientX - rect.left) / rect.width * 2 - 1);
                y = clamp((event.clientY - rect.top) / rect.height * 2 - 1);
                if (frame) return;
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    stage.classList.add('is-tracking');
                    stage.style.setProperty('--book-lift', '-4px');
                    stage.style.setProperty('--book-tilt-x', `${(-y * 4).toFixed(2)}deg`);
                    stage.style.setProperty('--book-tilt-y', `${(x * 6).toFixed(2)}deg`);
                });
            }

            stage.addEventListener('pointerenter', track, options);
            stage.addEventListener('pointermove', track, options);
            stage.addEventListener('pointerleave', reset, options);
            stage.addEventListener('pointercancel', reset, options);
            resetBooks.push(reset);
        });

        // Scroll, focus changes and background tabs must not leave a lifted book.
        window.addEventListener('scroll', () => resetBooks.forEach(reset => reset()), options);
        window.addEventListener('blur', () => resetBooks.forEach(reset => reset()), options);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) resetBooks.forEach(reset => reset());
        }, options);
    }

    function resume() {
        media.addEventListener('change', attach);
        attach();
    }

    window.addEventListener('pagehide', () => {
        media.removeEventListener('change', attach);
        detach();
    });
    // Reconnect on back/forward cache restoration without accumulating listeners.
    window.addEventListener('pageshow', event => {
        if (event.persisted) resume();
    });
    resume();
})();
