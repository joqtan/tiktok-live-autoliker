    function dispatchLikeClick(button) {
        if (!isUsableLikeButton(button)) {
            return false;
        }

        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        button.dispatchEvent(clickEvent);
        return true;
    }

    function waitBetweenClicks(delay) {
        return new Promise((resolve) => {
            scheduleTrackedTimeout(resolve, delay, CONFIG.clickTimerIds);
        });
    }

    const MISSING_BUTTON_RETRY = {
        initialDelay: 250,
        maxDelay: 5000,
        multiplier: 2
    };
    let missingButtonDelay = MISSING_BUTTON_RETRY.initialDelay;

    // Combo clicks are deliberately sequential so burstDelay is respected.
    async function burstClick(button, count) {
        for (let index = 0; index < count && CONFIG.enabled; index++) {
            try {
                if (!dispatchLikeClick(button)) {
                    updateStats(false);
                    return false;
                }
                updateStats(true);
            } catch (error) {
                if (CONFIG.debugMode) {
                    console.error(`Burst click error at index ${index}:`, error);
                }
                updateStats(false);
                return false;
            }

            if (index < count - 1 && CONFIG.enabled) {
                await waitBetweenClicks(MODES.combo.burstDelay);
            }
        }
        return true;
    }

    function retryMissingButton() {
        updateStats(false);
        scheduleTrackedTimeout(clickLikeButton, missingButtonDelay, CONFIG.clickTimerIds);
        missingButtonDelay = Math.min(
            missingButtonDelay * MISSING_BUTTON_RETRY.multiplier,
            MISSING_BUTTON_RETRY.maxDelay
        );
    }

    // Enhanced click function with optimized combo support
    async function clickLikeButton() {
        const likeButton = findLikeButton();
        if (!likeButton) {
            retryMissingButton();
            return;
        }
        missingButtonDelay = MISSING_BUTTON_RETRY.initialDelay;

        try {
            const modeConfig = CONFIG.mode === 'custom' ? CONFIG.customDelay : MODES[CONFIG.mode];
            
            if (CONFIG.mode === 'combo') {
                if (!await burstClick(likeButton, modeConfig.burstCount)) {
                    scheduleTrackedTimeout(clickLikeButton, missingButtonDelay, CONFIG.clickTimerIds);
                    missingButtonDelay = Math.min(
                        missingButtonDelay * MISSING_BUTTON_RETRY.multiplier,
                        MISSING_BUTTON_RETRY.maxDelay
                    );
                    return;
                }
            } else {
                if (!dispatchLikeClick(likeButton)) {
                    retryMissingButton();
                    return;
                }
                updateStats(true);

                // Human Mode: occasional natural double-tap (2 clicks together),
                // like when someone really likes a moment of the stream.
                if (CONFIG.mode === 'human' && Math.random() < modeConfig.doubleTapChance) {
                    scheduleTrackedTimeout(() => {
                        if (!CONFIG.enabled) return;
                        try {
                            if (!dispatchLikeClick(likeButton)) {
                                retryMissingButton();
                                return;
                            }
                            updateStats(true);
                        } catch (error) {
                            retryMissingButton();
                        }
                    }, Math.floor(Math.random() * 90 + 40), CONFIG.clickTimerIds); // 40-130ms gap
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
                scheduleTrackedTimeout(clickLikeButton, delay, CONFIG.clickTimerIds);
            }
        } catch (error) {
            if (CONFIG.debugMode) {
                console.error('Click error:', error);
            }
            retryMissingButton();
        }
    }
