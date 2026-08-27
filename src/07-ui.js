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
                } else if (event.key.toLowerCase() === 'm') {
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

            footer.innerHTML = `Version __AUTO_LIKER_VERSION__ | Made with ❤️<br>Maintained by joqtan<br>Based on AmpedWasTaken`;
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
