    // Find the like button with complete structure
    function findLikeButton() {
        try {
            // 1) Prefer the stable data-e2e anchor used by TikTok's own tests.
            //    Pick the first visible instance (a hidden duplicate exists in
            //    some layouts).
            const e2eButtons = document.querySelectorAll(BUTTON_STRUCTURE.e2e);
            for (const element of e2eButtons) {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return element;
                }
            }

            // 2) Fallback: try each legacy class-based part of the structure
            for (const [key, className] of Object.entries(BUTTON_STRUCTURE)) {
                if (key === 'e2e') continue;
                const elements = document.getElementsByClassName(className);
                for (const element of elements) {
                    if (isValidLikeButton(element)) {
                        return element;
                    }
                }
            }

            return null;
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

            return hasLikeClass && (hasLikeStructure || isClickable);
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
