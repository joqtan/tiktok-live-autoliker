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

    const DEBUG_CONFIG_DEFAULTS = {
        minDelay: 200,
        maxDelay: 450,
        doubleTapChance: 0.25,
        tripleTapChance: 0.08,
        pauseChance: 0.06,
        pauseMin: 100,
        pauseMax: 500
    };
    const DEBUG_CONFIG_LIMITS = {
        delay: { min: 10, max: 2000 },
        chance: { min: 0, max: 1 }
    };

    function normalizeDebugConfig(saved) {
        const config = { ...DEBUG_CONFIG_DEFAULTS };
        if (!saved || typeof saved !== 'object') return config;
        ['minDelay', 'maxDelay', 'pauseMin', 'pauseMax'].forEach((key) => {
            if (Number.isFinite(Number(saved[key]))) config[key] = Math.round(Number(saved[key]));
            config[key] = Math.min(DEBUG_CONFIG_LIMITS.delay.max,
                Math.max(DEBUG_CONFIG_LIMITS.delay.min, config[key]));
        });
        ['doubleTapChance', 'tripleTapChance', 'pauseChance'].forEach((key) => {
            if (Number.isFinite(Number(saved[key]))) config[key] = Number(saved[key]);
            config[key] = Math.min(DEBUG_CONFIG_LIMITS.chance.max,
                Math.max(DEBUG_CONFIG_LIMITS.chance.min, config[key]));
        });
        if (config.maxDelay < config.minDelay) config.maxDelay = config.minDelay;
        if (config.pauseMax < config.pauseMin) config.pauseMax = config.pauseMin;
        return config;
    }

    function loadDebugConfig() {
        try {
            const saved = JSON.parse(STORAGE.get('autoLikerDebugConfig'));
            if (saved) return normalizeDebugConfig(saved);
            const legacy = JSON.parse(STORAGE.get('autoLikerCustomDelays'));
            return normalizeDebugConfig({ minDelay: legacy && legacy.min, maxDelay: legacy && legacy.max });
        } catch (error) {
            return { ...DEBUG_CONFIG_DEFAULTS };
        }
    }

    const MODE_IDS = Object.freeze({
        normal: 1,
        turbo: 2,
        stealth: 3,
        human: 4,
        combo: 5,
        debug: 6
    });

    const MODE_KEYS_BY_ID = Object.freeze(Object.fromEntries(
        Object.entries(MODE_IDS).map(([mode, id]) => [String(id), mode])
    ));

    function loadSelectedMode() {
        const savedModeId = STORAGE.get('autoLikerMode');
        const selectedMode = MODE_KEYS_BY_ID[savedModeId] || 'normal';
        if (selectedMode === 'debug' && STORAGE.get('autoLikerIncludeDebugMode') !== 'true') {
            STORAGE.set('autoLikerMode', String(MODE_IDS.human));
            return 'human';
        }
        return selectedMode;
    }

    function saveSelectedMode() {
        STORAGE.set('autoLikerMode', String(MODE_IDS[CONFIG.mode]));
    }

    function saveDebugConfig() {
        STORAGE.set('autoLikerDebugConfig', JSON.stringify(CONFIG.debugConfig));
    }

    function saveCustomDelaySettings() {
        saveDebugConfig();
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
        mode: loadSelectedMode(),
        debugConfig: loadDebugConfig(),
        customDelay: null,
        showAdvancedControls: STORAGE.get('autoLikerShowAdvancedControls') === 'true',
        includeDebugMode: STORAGE.get('autoLikerIncludeDebugMode') === 'true',
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

    CONFIG.customDelay = CONFIG.debugConfig;

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
            // Human Mode: bounded irregular delays with occasional natural
            // double/triple-taps and longer pauses to avoid a mechanical pattern.
            minDelay: 200,
            maxDelay: 450,
            doubleTapChance: 0.25,
            tripleTapChance: 0.08,
            pauseChance: 0.06,
            pauseMin: 100,
            pauseMax: 500,
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
        debug: {
            ...CONFIG.debugConfig,
            name: "Debug Mode",
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
