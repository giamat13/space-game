// ===== SHOOTING TIME MANAGEMENT =====

function updateShootingTime(now) {
    const timeSinceLastShot = now - state.shootingTime.lastShootTime;
    
    // Check if we should start regeneration (10 seconds without shooting)
    if (!state.shootingTime.isRegenerating && timeSinceLastShot >= 10000) {
        state.shootingTime.isRegenerating = true;
        state.shootingTime.regenStartTime = now;
        console.log('🔋 [SHOOT TIME] Regeneration started!');
        showFloatingMessage('RECHARGE +30s', DOM.wrapper.clientWidth/2 - 60, 100, '#2ecc71');
    }
    
    // Handle regeneration
    if (state.shootingTime.isRegenerating) {
        const regenElapsed = now - state.shootingTime.regenStartTime;
        const regenAmount = Math.min(30000, regenElapsed); // Cap at 30 seconds
        const newTime = Math.min(state.shootingTime.max, state.shootingTime.current + regenAmount);
        
        if (regenAmount >= 30000) {
            // Regeneration complete
            state.shootingTime.current = newTime;
            state.shootingTime.isRegenerating = false;
            console.log('✅ [SHOOT TIME] Regeneration complete! Current:', state.shootingTime.current);
        } else {
            // Still regenerating
            state.shootingTime.current = newTime;
        }
    }
    
    updateShootTimeUI();
}

function updateShootTimeUI() {
    if (!DOM.shootTimeBar || !DOM.shootTimeText) return;
    
    const seconds = Math.floor(state.shootingTime.current / 1000);
    const percent = (state.shootingTime.current / state.shootingTime.max) * 100;
    
    // Update text
    const secondsSpan = document.getElementById('shoot-time-seconds');
    if (secondsSpan) {
        secondsSpan.innerText = seconds;
    }
    
    // Update bar width
    DOM.shootTimeBar.style.width = percent + '%';
    
    // Update bar color based on percentage
    DOM.shootTimeBar.classList.remove('low', 'critical', 'regenerating');
    
    if (state.shootingTime.isRegenerating) {
        DOM.shootTimeBar.classList.add('regenerating');
    } else if (percent < 10) {
        DOM.shootTimeBar.classList.add('critical');
    } else if (percent < 30) {
        DOM.shootTimeBar.classList.add('low');
    }
}

function addShootingTime(seconds) {
    const milliseconds = seconds * 1000;
    const oldTime = state.shootingTime.current;
    state.shootingTime.current = Math.min(state.shootingTime.max, state.shootingTime.current + milliseconds);
    const actualAdded = state.shootingTime.current - oldTime;
    
    if (actualAdded > 0) {
        const addedSeconds = Math.floor(actualAdded / 1000);
        console.log(`🔫 [SHOOT TIME] +${addedSeconds}s | Total: ${Math.floor(state.shootingTime.current/1000)}s`);
        showFloatingMessage(`+${addedSeconds}s AMMO`, DOM.wrapper.clientWidth/2 - 40, 120, '#00f2ff');
    }
    
    updateShootTimeUI();
}

// Add to main update loop (in update() function)
// Call: updateShootingTime(now);
