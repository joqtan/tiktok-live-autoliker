    // Configuration
    const CONFIG = {
        enabled: false,
        buttonKey: 'l',
        showNotifications: localStorage.getItem('autoLikerShowNotifications') !== 'false',
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
        comboTimeoutId: null,
        lastClickTime: 0,
        debugMode: true,
        isCollapsed: false,
        position: {
            x: localStorage.getItem('autoLikerPosX') || 'auto',
            y: localStorage.getItem('autoLikerPosY') || '50%'
        }
    };

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
