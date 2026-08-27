    // Initialize with retry mechanism
    let liveInitialized = false;
    let bootstrapRetryTimer = null;
    let bootstrapNavigationCleanup = null;

    function initialize() {
        if (!document.body) {
            if (CONFIG.debugMode) {
                console.log('Waiting for document body...');
            }
            bootstrapRetryTimer = scheduleTrackedTimeout(initialize, 500, CONFIG.retryTimerIds);
            return;
        }

        if (window.location.pathname.includes('/live')) {
            if (liveInitialized) return;
            liveInitialized = true;
            setupKeyboardControls();
            // Add CSS animations
            const style = document.createElement('style');
            style.id = 'tiktok-auto-liker-bootstrap-style';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            
            try {
                document.head.appendChild(style);
                addControlPanel();
                showNotification('TikTok Live AutoLiker Ready!\nPress L to toggle, M to switch modes', 'info');
            } catch (error) {
                console.error('Error during initialization:', error);
                // Retry initialization if it fails
                liveInitialized = false;
                bootstrapRetryTimer = scheduleTrackedTimeout(initialize, 1000, CONFIG.retryTimerIds);
            }
        } else if (liveInitialized) {
            disposeAutoLiker();
            liveInitialized = false;
        }
    }

    // URL change detection uses explicit SPA navigation signals instead of a
    // document-wide observer that reacts to unrelated DOM mutations.
    function startBootstrapNavigation() {
        if (bootstrapNavigationCleanup) return;

        let lastUrl = location.href;
        const handleNavigation = () => {
            const url = location.href;
            if (url === lastUrl) return;
            lastUrl = url;
            initialize();
        };

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        const patchedPushState = function(...args) {
            const result = originalPushState.apply(this, args);
            handleNavigation();
            return result;
        };
        const patchedReplaceState = function(...args) {
            const result = originalReplaceState.apply(this, args);
            handleNavigation();
            return result;
        };

        history.pushState = patchedPushState;
        history.replaceState = patchedReplaceState;
        window.addEventListener('popstate', handleNavigation);

        bootstrapNavigationCleanup = () => {
            window.removeEventListener('popstate', handleNavigation);
            if (history.pushState === patchedPushState) {
                history.pushState = originalPushState;
            }
            if (history.replaceState === patchedReplaceState) {
                history.replaceState = originalReplaceState;
            }
            bootstrapNavigationCleanup = null;
        };
    }

    startBootstrapNavigation();

    // Wait for document to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    window.addEventListener('pagehide', () => {
        disposeAutoLiker();
        if (bootstrapNavigationCleanup) bootstrapNavigationCleanup();
    }, { once: true });
