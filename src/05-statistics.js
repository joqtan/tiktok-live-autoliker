    // Combo tracking
    function updateCombo(success) {
        if (success) {
            CONFIG.stats.currentCombo++;
            if (CONFIG.stats.currentCombo > CONFIG.stats.maxCombo) {
                CONFIG.stats.maxCombo = CONFIG.stats.currentCombo;
                showNotification(`🔥 New Max Combo: ${CONFIG.stats.maxCombo}!`, 'success');
            }
            // Reset combo timeout
            if (CONFIG.comboTimeoutId) clearTimeout(CONFIG.comboTimeoutId);
            CONFIG.comboTimeoutId = setTimeout(() => {
                if (CONFIG.stats.currentCombo > 0) {
                    CONFIG.stats.combos++;
                    showNotification(`Combo End: ${CONFIG.stats.currentCombo}x`, 'info');
                    CONFIG.stats.currentCombo = 0;
                }
            }, MODES.combo.comboTimeout);
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

        const runtime = CONFIG.stats.startTime ?
            Math.round((Date.now() - CONFIG.stats.startTime) / 1000) : 0;

        const clicksPerSecond = runtime > 0 ?
            (CONFIG.stats.successfulClicks / runtime).toFixed(2) : 0;

        console.log(`
        📊 Auto Liker Stats:
        ▶ Runtime: ${runtime}s
        ❤ Total Clicks: ${CONFIG.stats.totalClicks}
        ✅ Successful: ${CONFIG.stats.successfulClicks}
        ❌ Failed: ${CONFIG.stats.failedClicks}
        🔥 Current Combo: ${CONFIG.stats.currentCombo}x
        🏆 Max Combo: ${CONFIG.stats.maxCombo}x
        🎯 Total Combos: ${CONFIG.stats.combos}
        ⚡ Clicks/sec: ${clicksPerSecond}
        🔄 Mode: ${MODES[CONFIG.mode].name}
        `);
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
                Success Rate: ${Math.round((CONFIG.stats.successfulClicks / CONFIG.stats.totalClicks) * 100 || 0)}%<br>
                Current Combo: <span style="color: #ff3b5c">${CONFIG.stats.currentCombo}x</span><br>
                Max Combo: <span style="color: #ff3b5c">${CONFIG.stats.maxCombo}x</span><br>
                Total Combos: ${CONFIG.stats.combos}<br>
                Clicks/sec: ${clicksPerSecond}
            `;
        }
    }
