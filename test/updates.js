import { DOM, state } from './data.js';
import { damagePlayer, updateHPUI, enemyShoot, createExplosion, showFloatingMessage, spawnIngredients } from './systems.js';

export function updateBullets() {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        let b = state.bullets[i];
        
        // שימוש במהירות שנקבעה ב-shoot (כולל זוויות)
        b.y += (b.vy || 15);
        b.x += (b.vx || 0);

        b.el.style.bottom = b.y + 'px';
        b.el.style.left = b.x + 'px';

        if(b.y > DOM.wrapper.clientHeight || b.x < -50 || b.x > DOM.wrapper.clientWidth + 50) {
            b.el.remove();
            state.bullets.splice(i, 1);
        }
    }
}

export function updateEnemyBullets() {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        let eb = state.enemyBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;
        eb.el.style.left = eb.x + 'px';
        eb.el.style.top = eb.y + 'px';
        
        const ebRect = eb.el.getBoundingClientRect();
        const pRect = DOM.player.getBoundingClientRect();
        
        if(!(ebRect.right < pRect.left || ebRect.left > pRect.right || ebRect.bottom < pRect.top || ebRect.top > pRect.bottom)) {
            damagePlayer(15);
            createExplosion(eb.x, eb.y, 'var(--primary)');
            eb.el.remove();
            state.enemyBullets.splice(i, 1);
            continue;
        }
        if(eb.y > DOM.wrapper.clientHeight || eb.y < -50 || eb.x < -50 || eb.x > DOM.wrapper.clientWidth + 50) {
            eb.el.remove();
            state.enemyBullets.splice(i, 1);
        }
    }
}

export function updateAsteroids() {
    for (let i = state.asteroids.length - 1; i >= 0; i--) {
        let ast = state.asteroids[i];
        ast.y += ast.speed;
        ast.rot += ast.rotSpeed;
        ast.el.style.top = ast.y + 'px';
        ast.el.style.transform = `rotate(${ast.rot}deg)`;

        const aRect = ast.el.getBoundingClientRect();
        const pRect = DOM.player.getBoundingClientRect();

        if(!(aRect.right < pRect.left || aRect.left > pRect.right || aRect.bottom < pRect.top || aRect.top > pRect.bottom)) {
            damagePlayer(20);
            createExplosion(aRect.left + 25, aRect.top + 25, '#555');
            ast.el.remove();
            state.asteroids.splice(i, 1);
            continue;
        }

        for (let j = state.bullets.length - 1; j >= 0; j--) {
            let b = state.bullets[j];
            const bRect = b.el.getBoundingClientRect();
            if(!(bRect.right < aRect.left || bRect.left > aRect.right || bRect.bottom < aRect.top || bRect.top > aRect.bottom)) {
                ast.hp -= b.damage;
                b.el.remove();
                state.bullets.splice(j, 1);
                if(ast.hp <= 0) {
                    state.score += 20;
                    DOM.scoreEl.innerText = state.score;
                    createExplosion(aRect.left + 40, aRect.top + 40, '#555');
                    ast.el.remove();
                    state.asteroids.splice(i, 1);
                }
                break;
            }
        }
        if(ast.y > DOM.wrapper.clientHeight) {
            ast.el.remove();
            state.asteroids.splice(i, 1);
        }
    }
}

export function updateEnemies(now) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let en = state.enemies[i];
        en.y += (en.type === 'orange' ? 1.5 : 2) * state.speedMult;
        en.el.style.top = en.y + 'px';

        if (now - en.lastShot > 2000 / state.speedMult) {
            enemyShoot(en);
            en.lastShot = now;
        }

        const eRect = en.el.getBoundingClientRect();
        const pRect = DOM.player.getBoundingClientRect();

        if(!(eRect.right < pRect.left || eRect.left > pRect.right || eRect.bottom < pRect.top || eRect.top > pRect.bottom)) {
            damagePlayer(30);
            createExplosion(eRect.left + 25, eRect.top + 25, 'var(--danger)');
            en.el.remove();
            state.enemies.splice(i, 1);
            continue;
        }

        for (let j = state.bullets.length - 1; j >= 0; j--) {
            let b = state.bullets[j];
            const bRect = b.el.getBoundingClientRect();
            if(!(bRect.right < eRect.left || bRect.left > eRect.right || bRect.bottom < eRect.top || bRect.top > eRect.bottom)) {
                en.hp -= b.damage;
                en.hpFill.style.width = (en.hp / en.maxHP * 100) + '%';
                b.el.remove();
                state.bullets.splice(j, 1);

                if(en.hp <= 0) {
                    state.score += (en.type === 'orange' ? 50 : 30);
                    DOM.scoreEl.innerText = state.score;
                    createExplosion(eRect.left + 25, eRect.top + 25, en.type === 'orange' ? 'var(--elite)' : 'var(--danger)');
                    
                    if(en.type === 'orange' && Math.random() < 0.4) {
                        spawnIngredients(eRect.left, eRect.top);
                    }
                    
                    en.el.remove();
                    state.enemies.splice(i, 1);
                }
                break;
            }
        }
        if(en.y > DOM.wrapper.clientHeight) {
            en.el.remove();
            state.enemies.splice(i, 1);
        }
    }
}

export function updateIngredients() {
    for (let i = state.ingredients.length - 1; i >= 0; i--) {
        let ing = state.ingredients[i];
        ing.y += 2;
        ing.el.style.top = ing.y + 'px';
        const iRect = ing.el.getBoundingClientRect();
        const pRect = DOM.player.getBoundingClientRect();
        if(!(iRect.right < pRect.left || iRect.left > pRect.right || iRect.bottom < pRect.top || iRect.top > pRect.bottom)) {
            state.score += ing.type.score;
            DOM.scoreEl.innerText = state.score;
            showFloatingMessage(`+${ing.type.name}`, ing.x, ing.y, ing.type.color);
            ing.el.remove();
            state.ingredients.splice(i, 1);
        } else if(ing.y > DOM.wrapper.clientHeight) {
            ing.el.remove();
            state.ingredients.splice(i, 1);
        }
    }
}

export function updateBurgers() {
    // פונקציונליות בורגרים אם יש
}