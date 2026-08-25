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

            groupedNotification.hideTimeout = setTimeout(() => {
                if (group && groupedNotifications.get(group) !== groupedNotification) return;
                notification.style.animation = 'slideOut 0.3s forwards';
                groupedNotification.removeTimeout = setTimeout(() => {
                    if (group && groupedNotifications.get(group) !== groupedNotification) return;
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                    if (group) groupedNotifications.delete(group);
                    if (container.parentNode && container.childElementCount === 0) {
                        container.parentNode.removeChild(container);
                    }
                }, 300);
            }, group === 'combo' ? 5000 : 3000);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
