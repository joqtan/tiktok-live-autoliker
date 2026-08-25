    // Initialize with retry mechanism
    function initialize() {
        if (!document.body) {
            if (CONFIG.debugMode) {
                console.log('Waiting for document body...');
            }
            setTimeout(initialize, 500);
            return;
        }

        if (window.location.pathname.includes('/live')) {
            // Add CSS animations
            const style = document.createElement('style');
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
                setTimeout(initialize, 1000);
            }
        }
    }

    // URL change detection with safety check
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        if (!document.body) return;
        
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            initialize();
        }
    });

    // Start observing with error handling
    try {
        observer.observe(document, { subtree: true, childList: true });
    } catch (error) {
        console.error('Error starting observer:', error);
    }

    // Wait for document to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
