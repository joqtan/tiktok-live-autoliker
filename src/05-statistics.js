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
                Total Clicks: ${CONFIG.stats.totalClicks}<br>
                Local Dispatch Rate: ${Math.round((CONFIG.stats.successfulClicks / CONFIG.stats.totalClicks) * 100 || 0)}%<br>
                Current Combo: <span style="color: #ff3b5c">${CONFIG.stats.currentCombo}x</span><br>
                Max Combo: <span style="color: #ff3b5c">${CONFIG.stats.maxCombo}x</span><br>
                Total Combos: ${CONFIG.stats.combos}<br>
                Clicks/sec: ${clicksPerSecond}
            `;
        }
    }
