    const STORAGE = (() => {
        try {
            const storage = window.localStorage;
            return {
                get(key) {
                    try {
                        return storage.getItem(key);
                    } catch (error) {
                        return null;
                    }
                },
                set(key, value) {
                    try {
                        storage.setItem(key, value);
                    } catch (error) {
                        // Storage can be disabled or full; runtime behavior still works.
                    }
                }
            };
        } catch (error) {
            return {
                get() {
                    return null;
                },
                set() {}
            };
        }
    })();

    function readPosition(key, fallback) {
        const value = STORAGE.get(key);
        if (value === 'auto' || /^-?\d+(?:\.\d+)?px$/.test(value || '') ||
            /^\d+(?:\.\d+)?%$/.test(value || '')) {
            return value;
        }
        return fallback;
    }

    const CUSTOM_DELAY_LIMITS = {
        min: 10,
        max: 2000
    };
    const CUSTOM_DELAY_DEFAULTS = {
        min: 100,
        max: 300
    };

    function loadCustomDelaySettings() {
        try {
            const saved = JSON.parse(STORAGE.get('autoLikerCustomDelays'));
            if (!saved || !Number.isInteger(saved.min) || !Number.isInteger(saved.max) ||
                saved.min < CUSTOM_DELAY_LIMITS.min || saved.max > CUSTOM_DELAY_LIMITS.max ||
                saved.max < saved.min) {
                return { ...CUSTOM_DELAY_DEFAULTS };
            }

            return { min: saved.min, max: saved.max };
        } catch (error) {
            return { ...CUSTOM_DELAY_DEFAULTS };
        }
    }

    function saveCustomDelaySettings() {
        try {
            STORAGE.set('autoLikerCustomDelays', JSON.stringify(CONFIG.customDelay));
        } catch (error) {
            if (CONFIG.debugMode) {
                console.warn('Unable to save custom delay settings:', error);
            }
        }
    }

    // Configuration
    const CONFIG = {
        enabled: false,
        buttonKey: 'l',
        showNotifications: STORAGE.get('autoLikerShowNotifications') !== 'false',
        stats: {
            totalClicks: 0,
            startTime: null,
            successfulClicks: 0,
            failedClicks: 0,
            combos: 0,
            maxCombo: 0,
            currentCombo: 0
        },
        mode: 'normal',
        customDelay: loadCustomDelaySettings(),
        comboTimeoutId: null,
        clickTimerIds: new Set(),
        uiTimerIds: new Set(),
        uiIntervalIds: new Set(),
        retryTimerIds: new Set(),
        dragCleanup: null,
        keyboardCleanup: null,
        lastClickTime: 0,
        debugMode: true,
        isCollapsed: false,
        position: {
            x: readPosition('autoLikerPosX', 'auto'),
            y: readPosition('autoLikerPosY', '50%')
        }
    };

    function scheduleTrackedTimeout(callback, delay, timerSet) {
        const timerId = setTimeout(() => {
            timerSet.delete(timerId);
            callback();
        }, delay);
        timerSet.add(timerId);
        return timerId;
    }

    function clearTrackedTimers(timerSet) {
        timerSet.forEach((timerId) => clearTimeout(timerId));
        timerSet.clear();
    }

    function clearAutoLikerTimers() {
        clearTrackedTimers(CONFIG.clickTimerIds);
        clearTrackedTimers(CONFIG.uiTimerIds);
        clearTrackedTimers(CONFIG.retryTimerIds);
        CONFIG.uiIntervalIds.forEach((timerId) => clearInterval(timerId));
        CONFIG.uiIntervalIds.clear();
        if (CONFIG.comboTimeoutId) {
            clearTimeout(CONFIG.comboTimeoutId);
            CONFIG.comboTimeoutId = null;
        }
    }

    // Mode configurations
    const MODES = {
        normal: {
            min: 50,
            max: 150,
            name: "Normal Mode",
            burstCount: 2
        },
        turbo: {
            min: 20,
            max: 50,
            name: "🚀 Turbo Mode",
            burstCount: 4
        },
        stealth: {
            min: 200,
            max: 500,
            name: "🕵️ Stealth Mode",
            burstCount: 1
        },
        human: {
            // Human Mode: irregular, organic delay (base + jitter) with
            // occasional natural double-taps and a short breather to avoid a
            // mechanical pattern, without long dead gaps. Roughly ~1 like every
            // 0.35-0.6s on average.
            baseDelay: 400,
            jitterMin: 200,
            jitterMax: 500,
            doubleTapChance: 0.25,
            pauseChance: 0.06,
            pauseDuration: 850,
            name: "👤 Human Mode",
            burstCount: 1
        },
        combo: {
            min: 5,
            max: 15,
            name: "⚡ Combo Mode",
            burstCount: 10,
            burstDelay: 5,
            comboTimeout: 800
        },
        custom: {
            min: CONFIG.customDelay.min,
            max: CONFIG.customDelay.max,
            name: "Custom Mode",
            burstCount: 1
        }
    };

    // Button structure
    // NOTE: TikTok's hashed class names (e1tv929b*) rotate frequently and were
    // removed entirely. The stable anchor is the data-e2e attribute used by
    // TikTok's own E2E tests. The legacy class-based selectors are kept only as
    // a fallback in case the DOM shifts again.
    const BUTTON_STRUCTURE = {
        e2e: '[data-e2e="room-chat-like-btn"]',
        container: 'tiktok-1f32i2v e1tv929b0',
        outer: 'tiktok-yl9fg8 e1tv929b1',
        middle: 'tiktok-pn4agh e1tv929b2',
        inner: 'tiktok-1cu4ad e1tv929b3'
    };
