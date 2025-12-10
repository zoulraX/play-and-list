(function () {
    console.log("Media Controller Content Script Active");

    let mediaElements = [];

    function updateMediaList() {
        mediaElements = [...document.querySelectorAll('video, audio')];
        reportMediaStatus();
    }

    function getMetadata() {
        let title = document.title;
        let isYouTube = window.location.hostname.includes('youtube.com');

        // YouTube Specific Title Extraction
        if (isYouTube) {
            // Try standard YouTube video title selector
            const ytTitle = document.querySelector("#title > h1 > yt-formatted-string");
            if (ytTitle) {
                title = ytTitle.innerText;
            } else {
                // Clean " - YouTube" suffix
                title = title.replace(" - YouTube", "");
            }
        }

        // General Open Graph Fallback
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && !isYouTube) title = ogTitle.content;

        // Filter valid media (ignore short sounds or previews < 5s if duration known)
        // Also ignore invisible media if possible, but hard to detect reliably without intersection observer.
        const validMedia = mediaElements.filter(m => {
            // YouTube specific: filter out preview videos (often on home page or suggestions)
            if (isYouTube && !window.location.pathname.includes('/watch') && !window.location.pathname.includes('/shorts')) {
                return false;
            }

            // If duration is Infinity (stream) or > 5s, or not yet known (NaN) but playing
            const validDuration = isNaN(m.duration) || m.duration > 5 || m.duration === Infinity;
            return validDuration;
        });

        return {
            title: title || window.location.host, // Fallback to host if empty
            hostname: window.location.hostname,
            hasMedia: validMedia.length > 0,
            isPlaying: validMedia.some(m => !m.paused && !m.ended && m.readyState > 2),
            isIframe: window.self !== window.top
        };
    }

    function reportMediaStatus() {
        const metadata = getMetadata();
        // Always report status to ensure background knows current state
        // If media is removed, hasMedia will be false, and background can decide to clear it.
        browser.runtime.sendMessage({
            type: 'mediaStatusUpdate',
            status: metadata
        }).catch(() => {
            // Ignore errors if background is not ready
        });
    }

    function setupListeners(media) {
        ['play', 'pause', 'ended', 'durationchange', 'volumechange'].forEach(event => {
            media.addEventListener(event, reportMediaStatus);
        });
    }

    // Observe DOM for new media
    const observer = new MutationObserver(() => {
        const currentMedia = [...document.querySelectorAll('video, audio')];
        if (currentMedia.length !== mediaElements.length) {
            // New media found
            currentMedia.forEach(m => {
                if (!mediaElements.includes(m)) {
                    setupListeners(m);
                }
            });
            updateMediaList();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial Scan
    updateMediaList();
    mediaElements.forEach(setupListeners);

    function togglePlayback() {
        mediaElements.forEach(m => {
            if (m.paused) {
                m.play().catch(e => console.error("Play failed", e));
            } else {
                m.pause();
            }
        });
    }

    // Listen for messages from Popup/Background
    browser.runtime.onMessage.addListener((message) => {
        if (message.command === 'togglePlayback') {
            togglePlayback();
        } else if (message.command === 'getMediaStatus') {
            reportMediaStatus();
        }
    });
})();
