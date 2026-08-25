    // Optimized burst clicking for combo mode
    async function burstClick(button, count) {
        const clicks = new Array(count).fill(null);
        
        try {
            await Promise.all(clicks.map(async (_, index) => {
                try {
                    // Create and dispatch a custom mouse event
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    button.dispatchEvent(clickEvent);
                    
                    CONFIG.stats.successfulClicks++;
                    updateCombo(true);
                    
                    // Add minimal delay between clicks in burst
                    await new Promise(r => setTimeout(r, MODES.combo.burstDelay));
                } catch (error) {
                    if (CONFIG.debugMode) {
                        console.error(`Burst click error at index ${index}:`, error);
                    }
                    CONFIG.stats.failedClicks++;
                    updateCombo(false);
                }
            }));
        } catch (error) {
            if (CONFIG.debugMode) {
                console.error('Burst sequence error:', error);
            }
        }
    }

    // Enhanced click function with optimized combo support
    async function clickLikeButton() {
        const likeButton = findLikeButton();
        if (!likeButton) {
            updateStats(false);
            return;
        }

        try {
            const modeConfig = MODES[CONFIG.mode];
            
            if (CONFIG.mode === 'combo') {
                await burstClick(likeButton, modeConfig.burstCount);
            } else {
                // Use custom event dispatch for single clicks too
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                likeButton.dispatchEvent(clickEvent);
                updateStats(true);

                // Human Mode: occasional natural double-tap (2 clicks together),
                // like when someone really likes a moment of the stream.
                if (CONFIG.mode === 'human' && Math.random() < modeConfig.doubleTapChance) {
                    setTimeout(() => {
                        likeButton.dispatchEvent(new MouseEvent('click', {
                            bubbles: true, cancelable: true, view: window
                        }));
                        updateStats(true);
                    }, Math.floor(Math.random() * 90 + 40)); // 40-130ms gap
                }
            }
            
            const now = Date.now();
            CONFIG.lastClickTime = now;

            let delay;
            if (CONFIG.mode === 'human') {
                // Irregular human delay: base + jitter, with occasional short
                // breather to break the mechanical pattern.
                if (Math.random() < modeConfig.pauseChance) {
                    delay = modeConfig.pauseDuration + Math.floor(Math.random() * 250);
                } else {
                    delay = modeConfig.baseDelay +
                        Math.floor(Math.random() * (modeConfig.jitterMax - modeConfig.jitterMin)) +
                        modeConfig.jitterMin;
                }
            } else {
                delay = Math.floor(Math.random() *
                    (modeConfig.max - modeConfig.min) + modeConfig.min);
            }
            
            if (CONFIG.enabled) {
                setTimeout(clickLikeButton, delay);
            }
        } catch (error) {
            if (CONFIG.debugMode) {
                console.error('Click error:', error);
            }
            updateStats(false);
        }
    }
