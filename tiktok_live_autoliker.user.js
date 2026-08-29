// ==UserScript==
// @name         TikTok Live AutoLiker
// @namespace    https://tampermonkey.net/
// @version      0.2.3
// @description  Advanced auto-liker for TikTok live streams with ultra-fast combo mode
// @author       joqtan
// @license      MIT
// @match        https://www.tiktok.com/live*
// @match        https://www.tiktok.com/*/live*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Credits and Info
    console.log(`
    ████████╗██╗██╗  ██╗████████╗ ██████╗ ██╗  ██╗    ██╗     ██╗██╗  ██╗███████╗██████╗ 
    ╚══██╔══╝██║██║ ██╔╝╚══██╔══╝██╔═══██╗██║ ██╔╝    ██║     ██║██║ ██╔╝██╔════╝██╔══██╗
       ██║   ██║█████╔╝    ██║   ██║   ██║█████╔╝     ██║     ██║█████╔╝ █████╗  ██████╔╝
       ██║   ██║██╔═██╗    ██║   ██║   ██║██╔═██╗     ██║     ██║██╔═██╗ ██╔══╝  ██╔══██╗
       ██║   ██║██║  ██╗   ██║   ╚██████╔╝██║  ██╗    ███████╗██║██║  ██╗███████╗██║  ██║
       ╚═╝   ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
                                                                                           
    TikTok Live AutoLiker v0.1.0
    Maintained by joqtan
    Based on the original work by AmpedWasTaken
    Enhanced Features:
    - Ultra-fast combo mode
    - Multi-mode liking system
    - Statistics tracking
    - Advanced detection methods
    - Performance optimization
    `);

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

    // Notification system with safety checks
    const groupedNotifications = new Map();

    function showNotification(message, type = 'info', group = null) {
        if (!CONFIG.showNotifications) return;
        if (!document.body) return;  // Safety check

        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FFC107',
            error: '#F44336'
        };

        let container = document.querySelector('#tiktok-auto-liker-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tiktok-auto-liker-notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 999998;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        let groupedNotification = group ? groupedNotifications.get(group) : null;
        let notification;

        if (groupedNotification) {
            clearTimeout(groupedNotification.hideTimeout);
            clearTimeout(groupedNotification.removeTimeout);
            notification = groupedNotification.notification;
            notification.textContent = message;
            notification.style.borderLeftColor = colors[type];
        } else {
            notification = document.createElement('div');
        }
        
        if (!groupedNotification) {
            notification.style.cssText = `
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                border-left: 4px solid ${colors[type]};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s forwards;
                pointer-events: auto;
            `;
            notification.textContent = message;
        }
        
        // Safe append
        try {
            if (!groupedNotification) {
                container.appendChild(notification);
                groupedNotification = {
                    notification,
                    hideTimeout: null,
                    removeTimeout: null
                };
                if (group) groupedNotifications.set(group, groupedNotification);
            }

            groupedNotification.hideTimeout = scheduleTrackedTimeout(() => {
                if (group && groupedNotifications.get(group) !== groupedNotification) return;
                notification.style.animation = 'slideOut 0.3s forwards';
                groupedNotification.removeTimeout = scheduleTrackedTimeout(() => {
                    if (group && groupedNotifications.get(group) !== groupedNotification) return;
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                    if (group) groupedNotifications.delete(group);
                    if (container.parentNode && container.childElementCount === 0) {
                        container.parentNode.removeChild(container);
                    }
                }, 300, CONFIG.uiTimerIds);
            }, group === 'combo' ? 5000 : 3000, CONFIG.uiTimerIds);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    let likeButtonRoot = null;

    function isUsableLikeButton(element) {
        try {
            if (!element || !element.isConnected) {
                return false;
            }

            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0';
        } catch (error) {
            return false;
        }
    }

    function getVisibleE2eButton(root) {
        const e2eButtons = root.querySelectorAll(BUTTON_STRUCTURE.e2e);
        for (const element of e2eButtons) {
            if (isUsableLikeButton(element)) {
                return element;
            }
        }
        return null;
    }

    function findLegacyLikeButton(root) {
        for (const [key, className] of Object.entries(BUTTON_STRUCTURE)) {
            if (key === 'e2e') continue;
            const elements = root.getElementsByClassName(className);
            for (const element of elements) {
                if (isValidLikeButton(element)) {
                    return element;
                }
            }
        }
        return null;
    }

    // Find the like button with the stable selector first. Legacy classes are
    // only searched inside a root anchored by a stable button when possible.
    function findLikeButton() {
        try {
            if (likeButtonRoot && !likeButtonRoot.isConnected) {
                likeButtonRoot = null;
            }

            const focusedRoot = likeButtonRoot || document;
            let button = getVisibleE2eButton(focusedRoot);
            if (button) {
                likeButtonRoot = button.closest(`.${BUTTON_STRUCTURE.container}`);
                return button;
            }

            if (focusedRoot !== document) {
                likeButtonRoot = null;
                button = getVisibleE2eButton(document);
                if (button) {
                    likeButtonRoot = button.closest(`.${BUTTON_STRUCTURE.container}`);
                    return button;
                }
            }

            const legacyRoot = likeButtonRoot || document;
            button = findLegacyLikeButton(legacyRoot);
            if (!button && legacyRoot !== document) {
                likeButtonRoot = null;
                button = findLegacyLikeButton(document);
            }
            return button;

        } catch (error) {
            console.error('Error finding like button:', error);
            return null;
        }
    }

    // Validate if element is actually a like button
    function isValidLikeButton(element) {
        try {
            // Check if element or its children contain like button characteristics
            const hasLikeClass = element.className.includes('e1tv929b');
            const hasLikeStructure = element.closest(`.${BUTTON_STRUCTURE.container}`);
            const isClickable = window.getComputedStyle(element).cursor === 'pointer';

            return isUsableLikeButton(element) && hasLikeClass &&
                (hasLikeStructure || isClickable);
        } catch (error) {
            return false;
        }
    }

    // Improved click simulation
    function simulateClick(element) {
        try {
            // Create and dispatch multiple types of events
            const events = [
                new MouseEvent('mouseover', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }),
                new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }),
                new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }),
                new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    detail: 1
                })
            ];

            // Try clicking the element and its parent structure
            const elementsToClick = [
                element,
                element.parentElement,
                element.closest(`.${BUTTON_STRUCTURE.container}`),
                element.querySelector(`.${BUTTON_STRUCTURE.inner}`),
                element.querySelector(`.${BUTTON_STRUCTURE.middle}`)
            ].filter(Boolean);

            // Try clicking each element with each event
            elementsToClick.forEach(el => {
                events.forEach(event => {
                    el.dispatchEvent(event);
                });
                try { el.click(); } catch (e) {}
            });

            return true;
        } catch (error) {
            if (CONFIG.debugMode) {
                console.error('Click simulation error:', error);
            }
            return false;
        }
    }

    // Combo tracking
    function updateCombo(success) {
        if (success) {
            CONFIG.stats.currentCombo++;
            if (CONFIG.stats.currentCombo > CONFIG.stats.maxCombo) {
                CONFIG.stats.maxCombo = CONFIG.stats.currentCombo;
                showNotification(`🔥 New Max Combo: ${CONFIG.stats.maxCombo}!`, 'success', 'combo');
            }
            // Reset combo timeout
            if (CONFIG.comboTimeoutId) clearTimeout(CONFIG.comboTimeoutId);
            CONFIG.comboTimeoutId = scheduleTrackedTimeout(() => {
                if (CONFIG.stats.currentCombo > 0) {
                    CONFIG.stats.combos++;
                    showNotification(`Combo End: ${CONFIG.stats.currentCombo}x`, 'info', 'combo');
                    CONFIG.stats.currentCombo = 0;
                }
            }, MODES.combo.comboTimeout, CONFIG.clickTimerIds);
        } else {
            if (CONFIG.stats.currentCombo > 0) {
                CONFIG.stats.combos++;
            }
            CONFIG.stats.currentCombo = 0;
        }
    }
    // Enhanced statistics tracking with combo stats
    function updateStats(success = true) {
        CONFIG.stats.totalClicks++;
        if (success) {
            CONFIG.stats.successfulClicks++;
            updateCombo(true);
        } else {
            CONFIG.stats.failedClicks++;
            updateCombo(false);
        }

    }

    // Update the stats display in the control panel
    function updateStatsDisplay(statsDiv) {
        if (CONFIG.enabled) {
            const runtime = Math.round((Date.now() - CONFIG.stats.startTime) / 1000);
            const clicksPerSecond = runtime > 0 ?
                (CONFIG.stats.successfulClicks / runtime).toFixed(2) : 0;

            statsDiv.innerHTML = `
                <span style="color: #ff3b5c">Mode: ${MODES[CONFIG.mode].name}</span><br>
                Runtime: ${runtime}s<br>
                Attempts: ${CONFIG.stats.totalClicks}<br>
                Dispatched: ${CONFIG.stats.successfulClicks}<br>
                Errors: ${CONFIG.stats.failedClicks}<br>
                Dispatch Rate: ${Math.round((CONFIG.stats.successfulClicks / CONFIG.stats.totalClicks) * 100 || 0)}%<br>
                ${CONFIG.mode === 'combo' ? `
                Current Combo: <span style="color: #ff3b5c">${CONFIG.stats.currentCombo}x</span><br>
                Max Combo: <span style="color: #ff3b5c">${CONFIG.stats.maxCombo}x</span><br>
                Total Combos: ${CONFIG.stats.combos}<br>
                ` : ''}
                Dispatched/sec: ${clicksPerSecond}
            `;
        }
    }

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

    function scheduleHumanExtraClicks(button, remainingClicks) {
        if (remainingClicks <= 0) return;

        scheduleTrackedTimeout(() => {
            if (!CONFIG.enabled) return;
            try {
                if (!dispatchLikeClick(button)) {
                    updateStats(false);
                    return;
                }
                updateStats(true);
                scheduleHumanExtraClicks(button, remainingClicks - 1);
            } catch (error) {
                updateStats(false);
            }
        }, Math.floor(Math.random() * 91) + 40, CONFIG.clickTimerIds); // 40-130ms gap
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

                // Triple and double taps are mutually exclusive. The initial
                // click above is followed by only the remaining clicks.
                if (CONFIG.mode === 'human') {
                    const sequenceRoll = Math.random();
                    if (sequenceRoll < modeConfig.tripleTapChance) {
                        scheduleHumanExtraClicks(likeButton, 2);
                    } else if (sequenceRoll < modeConfig.tripleTapChance + modeConfig.doubleTapChance) {
                        scheduleHumanExtraClicks(likeButton, 1);
                    }
                }
            }
            
            const now = Date.now();
            CONFIG.lastClickTime = now;

            let delay;
            if (CONFIG.mode === 'human') {
                if (Math.random() < modeConfig.pauseChance) {
                    delay = Math.floor(Math.random() *
                        (modeConfig.pauseMax - modeConfig.pauseMin + 1) + modeConfig.pauseMin);
                } else {
                    delay = Math.floor(Math.random() *
                        (modeConfig.maxDelay - modeConfig.minDelay + 1) + modeConfig.minDelay);
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

    // Enhanced toggle function
    function toggleAutoLiker() {
        CONFIG.enabled = !CONFIG.enabled;
        
        if (CONFIG.enabled) {
            CONFIG.stats.startTime = Date.now();
            CONFIG.stats.totalClicks = 0;
            CONFIG.stats.successfulClicks = 0;
            CONFIG.stats.failedClicks = 0;
            CONFIG.stats.combos = 0;
            CONFIG.stats.maxCombo = 0;
            CONFIG.stats.currentCombo = 0;
            showNotification(`Auto Liker: ON (${MODES[CONFIG.mode].name})`, 'success');
            clickLikeButton();
        } else {
            clearTrackedTimers(CONFIG.clickTimerIds);
            showNotification('Auto Liker: OFF', 'warning');
        }
    }

    // Mode switcher
    let modeUIUpdater = null;

    function switchMode() {
        const modes = Object.keys(MODES);
        const currentIndex = modes.indexOf(CONFIG.mode);
        CONFIG.mode = modes[(currentIndex + 1) % modes.length];
        if (modeUIUpdater) {
            modeUIUpdater();
        }
        showNotification(`Switched to ${MODES[CONFIG.mode].name}`, 'info');
    }

    function isEditableKeyboardTarget(target) {
        while (target && target !== document) {
            const tagName = target.tagName && target.tagName.toLowerCase();
            const role = target.getAttribute && target.getAttribute('role');
            const contentEditable = target.getAttribute && target.getAttribute('contenteditable');

            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' ||
                target.isContentEditable || (contentEditable && contentEditable !== 'false') ||
                role === 'textbox' || role === 'searchbox') {
                return true;
            }
            target = target.parentElement;
        }
        return false;
    }

    // Enhanced keyboard controls
    function setupKeyboardControls() {
        if (CONFIG.keyboardCleanup) return;

        const handleKeydown = function(event) {
            if (!isEditableKeyboardTarget(event.target)) {

                if (event.key.toLowerCase() === CONFIG.buttonKey) {
                    toggleAutoLiker();
                } else if (event.shiftKey && event.key.toLowerCase() === 'm') {
                    switchMode();
                }
            }
        };
        document.addEventListener('keydown', handleKeydown);
        CONFIG.keyboardCleanup = () => document.removeEventListener('keydown', handleKeydown);
    }

    // Setup drag functionality
    function setupDrag(panel, handle) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const dragStart = (e) => {
            if (e.target === handle || handle.contains(e.target)) {
                isDragging = true;
                handle.style.cursor = 'grabbing';
                
                if (e.type === "touchstart") {
                    initialX = e.touches[0].clientX - xOffset;
                    initialY = e.touches[0].clientY - yOffset;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }
            }
        };

        const dragEnd = () => {
            if (!isDragging) return;
            
            isDragging = false;
            handle.style.cursor = 'grab';
            
            // Save position
            STORAGE.set('autoLikerPosX', panel.style.left);
            STORAGE.set('autoLikerPosY', panel.style.top);
        };

        const drag = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;
            
            // Constrain to window bounds
            const bounds = panel.getBoundingClientRect();
            const maxX = window.innerWidth - bounds.width;
            const maxY = window.innerHeight - bounds.height;
            
            currentX = Math.min(Math.max(0, currentX), maxX);
            currentY = Math.min(Math.max(0, currentY), maxY);
            
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
        };

        // Touch events
        handle.addEventListener("touchstart", dragStart, false);
        document.addEventListener("touchend", dragEnd, false);
        document.addEventListener("touchmove", drag, false);

        // Mouse events
        handle.addEventListener("mousedown", dragStart, false);
        document.addEventListener("mouseup", dragEnd, false);
        document.addEventListener("mousemove", drag, false);

        const cleanup = () => {
            handle.removeEventListener("touchstart", dragStart, false);
            document.removeEventListener("touchend", dragEnd, false);
            document.removeEventListener("touchmove", drag, false);
            handle.removeEventListener("mousedown", dragStart, false);
            document.removeEventListener("mouseup", dragEnd, false);
            document.removeEventListener("mousemove", drag, false);
        };

        // Load saved position
        const savedX = readPosition('autoLikerPosX', null);
        const savedY = readPosition('autoLikerPosY', null);
        if (savedX && savedY) {
            panel.style.left = savedX;
            panel.style.top = savedY;
            xOffset = parseInt(savedX);
            yOffset = parseInt(savedY);
        }

        return cleanup;
    }

    // Setup collapse functionality
    function setupCollapse(panel, header, content) {
        const collapseButton = document.createElement('button');
        collapseButton.type = 'button';
        collapseButton.textContent = '▼';
        collapseButton.setAttribute('aria-expanded', 'true');
        collapseButton.setAttribute('aria-label', 'Collapse panel');
        collapseButton.style.cssText = `
            margin-left: 10px;
            font-size: 18px;
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            transition: transform 0.3s ease;
            width: 24px;
            height: 24px;
            padding: 0;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            user-select: none;
        `;

        let isCollapsed = false;

        const applyCollapseState = () => {
            content.style.maxHeight = isCollapsed ? '0' : '1000px';
            content.style.opacity = isCollapsed ? '0' : '1';
            content.style.overflow = isCollapsed ? 'hidden' : 'visible';
            collapseButton.style.transform = isCollapsed ? 'rotate(-180deg)' : '';
            collapseButton.textContent = isCollapsed ? '▲' : '▼';
            collapseButton.setAttribute('aria-expanded', String(!isCollapsed));
            collapseButton.setAttribute('aria-label', isCollapsed ? 'Expand panel' : 'Collapse panel');
        };

        const toggleCollapse = () => {
            isCollapsed = !isCollapsed;
            applyCollapseState();
            STORAGE.set('autoLikerCollapsed', String(isCollapsed));
        };

        collapseButton.addEventListener('click', toggleCollapse);
        header.appendChild(collapseButton);

        // Load saved state
        isCollapsed = STORAGE.get('autoLikerCollapsed') === 'true';
        applyCollapseState();

        // Add transition styles
        content.style.transition = 'all 0.3s ease';
        content.style.maxHeight = '1000px';
        content.style.opacity = '1';
        content.style.overflow = 'hidden';
    }

    function addControlPanel() {
        if (!document.body) {
            if (CONFIG.debugMode) {
                console.log('Document body not ready, retrying...');
            }
            scheduleTrackedTimeout(addControlPanel, 500, CONFIG.retryTimerIds);
            return;
        }

        // Check if panel already exists
        const existingPanel = document.querySelector('#tiktok-auto-liker-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        try {
            const panel = document.createElement('div');
            const header = document.createElement('div');
            const logo = document.createElement('div');
            const titleContainer = document.createElement('div');
            const title = document.createElement('div');
            const subtitle = document.createElement('div');
            const content = document.createElement('div');
            const toggleButton = document.createElement('button');
            const modeButton = document.createElement('button');
            const customDelaySection = document.createElement('div');
            const customMinSlider = document.createElement('input');
            const customMaxSlider = document.createElement('input');
            const customMinValue = document.createElement('span');
            const customMaxValue = document.createElement('span');
            const notificationButton = document.createElement('button');
            const statsDiv = document.createElement('div');
            const footer = document.createElement('div');

            // Set IDs
            panel.id = 'tiktok-auto-liker-panel';
            content.id = 'panel-content';

            // Basic styling with centered position
            panel.style.cssText = `
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                background: #010101;
                color: white;
                padding: 20px;
                border-radius: 20px;
                z-index: 999999;
                min-width: 240px;
                max-width: 300px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                animation: fadeIn 0.3s ease-out;
            `;

            header.style.cssText = `
                display: flex;
                align-items: center;
                margin: -10px -10px 15px -10px;
                padding: 10px;
                cursor: grab;
                user-select: none;
                border-bottom: 1px solid #25f4ee;
                background: #010101;
                border-radius: 20px 20px 0 0;
            `;

            logo.innerHTML = '❤️';
            logo.style.cssText = `
                font-size: 24px;
                margin-right: 10px;
                animation: pulse 2s infinite;
            `;

            titleContainer.style.cssText = 'flex: 1;';
            
            title.textContent = 'TikTok Live AutoLiker';
            title.style.cssText = 'font-size: 16px; font-weight: 600; color: #25f4ee;';

            subtitle.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.6);';

            content.style.cssText = `
                transition: all 0.3s ease;
                overflow: hidden;
            `;

            toggleButton.textContent = 'Start Auto-Liker';
            toggleButton.type = 'button';
            toggleButton.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-bottom: 10px;
                border: none;
                border-radius: 8px;
                background: #ff3b5c;
                color: white;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            `;

            modeButton.textContent = `Current: ${MODES[CONFIG.mode].name}`;
            modeButton.style.cssText = `
                width: 100%;
                padding: 10px;
                margin-bottom: 10px;
                border: none;
                border-radius: 8px;
                background: #25f4ee;
                color: #161823;
                cursor: pointer;
                transition: all 0.3s ease;
            `;

            customDelaySection.style.cssText = `
                margin-bottom: 10px;
                padding: 10px;
                background: #161823;
                border-radius: 8px;
            `;
            customDelaySection.setAttribute('aria-label', 'Custom delay settings');

            const customTitle = document.createElement('div');
            customTitle.textContent = 'Custom delay range';
            customTitle.style.cssText = 'font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #25f4ee;';
            customDelaySection.appendChild(customTitle);

            const setupDelaySlider = (slider, label, valueDisplay, valueKey) => {
                slider.type = 'range';
                slider.min = String(CUSTOM_DELAY_LIMITS.min);
                slider.max = String(CUSTOM_DELAY_LIMITS.max);
                slider.step = '10';
                slider.style.cssText = 'width: 100%; accent-color: #25f4ee; cursor: pointer;';

                const row = document.createElement('label');
                row.style.cssText = 'display: block; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.85);';
                const heading = document.createElement('div');
                heading.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';
                heading.append(label, valueDisplay);
                row.append(heading, slider);
                customDelaySection.appendChild(row);

                slider.addEventListener('input', () => {
                    const value = Number(slider.value);
                    CONFIG.customDelay[valueKey] = value;
                    if (valueKey === 'min' && value > CONFIG.customDelay.max) {
                        CONFIG.customDelay.max = value;
                        customMaxSlider.value = String(value);
                    } else if (valueKey === 'max' && value < CONFIG.customDelay.min) {
                        CONFIG.customDelay.min = value;
                        customMinSlider.value = String(value);
                    }
                    customMinSlider.max = String(CONFIG.customDelay.max);
                    customMaxSlider.min = String(CONFIG.customDelay.min);
                    customMinValue.textContent = `${CONFIG.customDelay.min} ms`;
                    customMaxValue.textContent = `${CONFIG.customDelay.max} ms`;
                    MODES.custom.min = CONFIG.customDelay.min;
                    MODES.custom.max = CONFIG.customDelay.max;
                    saveCustomDelaySettings();
                });
            };

            customMinSlider.value = String(CONFIG.customDelay.min);
            customMaxSlider.value = String(CONFIG.customDelay.max);
            customMinValue.textContent = `${CONFIG.customDelay.min} ms`;
            customMaxValue.textContent = `${CONFIG.customDelay.max} ms`;
            setupDelaySlider(customMinSlider, 'Minimum delay', customMinValue, 'min');
            setupDelaySlider(customMaxSlider, 'Maximum delay', customMaxValue, 'max');

            notificationButton.type = 'button';
            notificationButton.style.cssText = `
                width: 100%;
                padding: 10px;
                margin-bottom: 10px;
                border: none;
                border-radius: 8px;
                color: white;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            `;

            statsDiv.style.cssText = `
                font-size: 13px;
                margin-top: 10px;
                padding: 10px;
                 background: #161823;
                border-radius: 8px;
            `;

            footer.innerHTML = `Version 0.2.3 | Made with ❤️<br>Maintained by joqtan<br>Based on AmpedWasTaken`;
            footer.style.cssText = `
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid rgba(255,255,255,0.1);
                font-size: 11px;
                color: rgba(255,255,255,0.6);
                text-align: center;
            `;

            // Event listeners
            const updateToggleButton = () => {
                toggleButton.textContent = CONFIG.enabled ? 'Stop Auto-Liker' : 'Start Auto-Liker';
                toggleButton.style.background = CONFIG.enabled ? '#fe2c55' : '#ff3b5c';
            };

            const updateNotificationButton = () => {
                const state = CONFIG.showNotifications ? 'On' : 'Off';
                notificationButton.textContent = `Notifications: ${state}`;
                notificationButton.setAttribute('aria-pressed', String(CONFIG.showNotifications));
                notificationButton.setAttribute('aria-label', `Notifications ${state}`);
                notificationButton.style.background = CONFIG.showNotifications ? '#25f4ee' : '#555';
                notificationButton.style.color = CONFIG.showNotifications ? '#161823' : 'white';
            };

            updateNotificationButton();

            toggleButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleAutoLiker();
                updateToggleButton();
            });

            const updateModeUI = () => {
                modeButton.textContent = `Current: ${MODES[CONFIG.mode].name}`;
                customDelaySection.style.display = CONFIG.mode === 'custom' ? 'block' : 'none';
            };
            modeUIUpdater = updateModeUI;
            updateModeUI();

            modeButton.onclick = () => {
                switchMode();
            };

            notificationButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                CONFIG.showNotifications = !CONFIG.showNotifications;
                STORAGE.set('autoLikerShowNotifications', String(CONFIG.showNotifications));
                updateNotificationButton();
            });

            // Add fade-in animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                #tiktok-auto-liker-panel button:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }
                #tiktok-auto-liker-panel button:active {
                    transform: translateY(0);
                    filter: brightness(0.95);
                }
            `;
            style.id = 'tiktok-auto-liker-panel-style';
            document.head.appendChild(style);

            // Modify setupDrag to handle centered positioning
            const setupDragForPanel = () => {
                // Load saved position or use center position
                const savedX = readPosition('autoLikerPosX', null);
                const savedY = readPosition('autoLikerPosY', null);
                
                if (savedX && savedY) {
                    // Remove centering transform and set saved position
                    panel.style.transform = 'none';
                    panel.style.left = savedX;
                    panel.style.top = savedY;
                }
                
                // Setup drag functionality
                CONFIG.dragCleanup = setupDrag(panel, header);
            };

            // Assemble the panel
            titleContainer.appendChild(title);
            titleContainer.appendChild(subtitle);
            
            header.appendChild(logo);
            header.appendChild(titleContainer);
            
            content.appendChild(toggleButton);
            content.appendChild(modeButton);
            content.appendChild(customDelaySection);
            content.appendChild(notificationButton);
            content.appendChild(statsDiv);
            content.appendChild(footer);
            
            panel.appendChild(header);
            panel.appendChild(content);
            
            document.body.appendChild(panel);

            // Wait for animation to complete before enabling drag
            scheduleTrackedTimeout(setupDragForPanel, 300, CONFIG.uiTimerIds);

            // Setup collapse functionality
            setupCollapse(panel, header, content);

            // Start stats update
            const statsInterval = setInterval(() => {
                if (CONFIG.enabled) {
                    updateStatsDisplay(statsDiv);
                }
            }, 1000);
            CONFIG.uiIntervalIds.add(statsInterval);

        } catch (error) {
            console.error('Error assembling panel:', error);
        }
    }

    function disposeAutoLiker() {
        CONFIG.enabled = false;
        clearAutoLikerTimers();
        if (CONFIG.keyboardCleanup) {
            CONFIG.keyboardCleanup();
            CONFIG.keyboardCleanup = null;
        }
        if (CONFIG.dragCleanup) {
            CONFIG.dragCleanup();
            CONFIG.dragCleanup = null;
        }
        modeUIUpdater = null;
        const panel = document.querySelector('#tiktok-auto-liker-panel');
        if (panel) panel.remove();
        const notifications = document.querySelector('#tiktok-auto-liker-notifications');
        if (notifications) notifications.remove();
        document.querySelector('#tiktok-auto-liker-panel-style')?.remove();
        document.querySelector('#tiktok-auto-liker-bootstrap-style')?.remove();
    }

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
                showNotification('TikTok Live AutoLiker Ready!\nPress L to toggle, Shift+M to switch modes', 'info');
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

})();
