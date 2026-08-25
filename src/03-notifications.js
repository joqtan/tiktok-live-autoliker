    // Notification system with safety checks
    function showNotification(message, type = 'info') {
        if (!CONFIG.showNotifications) return;
        if (!document.body) return;  // Safety check
        
        const notification = document.createElement('div');
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FFC107',
            error: '#F44336'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            border-left: 4px solid ${colors[type]};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s forwards;
        `;
        notification.textContent = message;
        
        // Safe append
        try {
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
