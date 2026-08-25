    // Initialize with retry mechanism
    let liveInitialized = false;
    let bootstrapRetryTimer = null;
    let bootstrapObserver = null;

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

    // URL change detection with safety check
    let lastUrl = location.href;
    bootstrapObserver = new MutationObserver(() => {
        if (!document.body) return;
        
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            initialize();
        }
    });

    // Start observing with error handling
    function startBootstrapObserver() {
        if (bootstrapObserver) {
            bootstrapObserver.observe(document, { subtree: true, childList: true });
        }
    }

    try {
        startBootstrapObserver();
    } catch (error) {
        console.error('Error starting observer:', error);
    }

    // Wait for document to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    window.addEventListener('pagehide', () => {
        disposeAutoLiker();
        if (bootstrapObserver) bootstrapObserver.disconnect();
    }, { once: true });
