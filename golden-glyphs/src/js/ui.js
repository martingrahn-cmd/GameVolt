// src/js/ui.js
export class UI {
    constructor(onNextLevel, ads) {
        this.onNextLevel = onNextLevel;
        this.ads = ads || null;
        this.createStyles();
    }

    createStyles() {
        if (document.getElementById('ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'ui-styles';
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
            
            .hidden { display: none !important; }
            
            #win-screen {
                font-family: 'Cinzel', serif;
                animation: fadeIn 0.5s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            .btn-shine {
                position: relative;
                overflow: hidden;
                transition: transform 0.2s;
            }
            .btn-shine:active { transform: scale(0.95); }
            .gg-result-star {
                width: 46px; height: 46px; display: inline-block;
                clip-path: polygon(50% 0%,61% 34%,98% 35%,68% 57%,79% 94%,50% 72%,21% 94%,32% 57%,2% 35%,39% 34%);
                background: rgba(255,255,255,.1); filter: drop-shadow(0 3px 2px rgba(0,0,0,.45));
            }
            .gg-result-star.earned { background: linear-gradient(145deg,#FFF0A6 0%,#FFD43B 42%,#B97905 100%); filter: drop-shadow(0 0 10px rgba(255,205,47,.58)); }
            .gg-result-rule { height:1px; margin:0 auto 20px; width:72%; background:linear-gradient(90deg,transparent,var(--result-accent),transparent); opacity:.7; }
            #game-shell[data-reduced-motion="true"] *,
            #game-shell[data-reduced-motion="true"] *::before,
            #game-shell[data-reduced-motion="true"] *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        `;
        document.head.appendChild(style);
    }

    showWinScreen(stars, reward, onAdReward, titleText="LEVEL COMPLETE", btnText="NEXT LEVEL", onMainButton=null, playSound=null, streakBonus=0, dailySummary=null, worldUnlock=null) {
        const overlay = document.getElementById('win-screen');
        if (!overlay) {
            console.error("UI Error: #win-screen missing in HTML");
            if (onMainButton) onMainButton();
            else if (this.onNextLevel) this.onNextLevel();
            return;
        }

        // 1. Rensa gammalt innehåll
        overlay.innerHTML = "";

        const visualTheme = document.getElementById('game-shell')?.dataset.visualTheme || 'jungle';
        const resultPalette = {
            jungle:{ accent:'#E8C45B', glow:'rgba(232,196,91,.32)', top:'#263023', bottom:'#070C09' },
            frozen:{ accent:'#9DE7FF', glow:'rgba(92,211,255,.3)', top:'#18303F', bottom:'#040D16' },
            inferno:{ accent:'#FF9A4D', glow:'rgba(255,91,30,.32)', top:'#3B1B13', bottom:'#100405' },
            neon:{ accent:'#52E5FF', glow:'rgba(207,65,255,.32)', top:'#161B3D', bottom:'#030513' },
            zen:{ accent:'#8FD6BF', glow:'rgba(91,199,167,.28)', top:'#1B342D', bottom:'#06100D' }
        }[visualTheme] || { accent:'#E8C45B', glow:'rgba(232,196,91,.32)', top:'#263023', bottom:'#070C09' };
        overlay.style.setProperty('--result-accent', resultPalette.accent);
        
        // 2. Skapa boxen med glas-design
        const box = document.createElement('div');
        box.className = 'win-content';
        Object.assign(box.style, {
            background: `linear-gradient(180deg, ${resultPalette.top} 0%, ${resultPalette.bottom} 100%)`,
            padding: '34px clamp(22px,7vw,40px)',
            borderRadius: '18px',
            border: `1px solid ${resultPalette.accent}`,
            boxShadow: `0 18px 60px rgba(0,0,0,.62), 0 0 26px ${resultPalette.glow}, inset 0 1px 0 rgba(255,255,255,.12)`,
            textAlign: 'center',
            color: '#fff',
            minWidth: 'min(300px, 82vw)',
            maxWidth: 'min(420px, 86vw)',
            maxHeight: '88vh',
            overflowY: 'auto',
            position: 'relative',
            overflowX: 'hidden'
        });
        
        // Glas-shine effekt överst
        const shine = document.createElement('div');
        Object.assign(shine.style, {
            position: 'absolute', top: '0', left: '0', right: '0', height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '13px 13px 0 0', pointerEvents: 'none'
        });
        box.appendChild(shine);

        // 3. Rubrik
        const title = document.createElement('h1');
        title.innerText = titleText;
        Object.assign(title.style, {
            fontSize: 'clamp(1.55rem,7vw,2.2rem)', margin: '0 0 10px 0',
            textShadow: `0 0 20px ${resultPalette.glow}`,
            color: resultPalette.accent,
            fontFamily: "'Cinzel', serif",
            position: 'relative'
        });

        // 4. Stjärnor — staggered pop-in med ljud per stjärna
        const starContainer = document.createElement('div');
        starContainer.style.marginBottom = "22px";
        starContainer.style.position = "relative";
        starContainer.style.display = "flex";
        starContainer.style.justifyContent = "center";
        starContainer.style.gap = "8px";

        for (let i = 0; i < 3; i++) {
            const earned = i < stars;
            const starEl = document.createElement('span');
            starEl.className = `gg-result-star${earned ? ' earned' : ''}`;
            starEl.style.display = "inline-block";
            starEl.style.transition = "none";
            if (earned) {
                starEl.style.transform = "scale(0)";
                starEl.style.opacity = "0";
                const delay = i * 300;
                setTimeout(() => {
                    starEl.style.transition = "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease";
                    starEl.style.transform = "scale(1)";
                    starEl.style.opacity = "1";
                    if (playSound) playSound('star1');
                }, delay);
            } else {
                starEl.style.opacity = "0.32";
            }
            starContainer.appendChild(starEl);
        }


        // 5. Belöningstext
        const rewardText = document.createElement('div');
        rewardText.innerHTML = `<span style="color:rgba(255,255,255,.62);font-size:.72em;letter-spacing:.12em">REWARD</span><br><span style="color:${resultPalette.accent};font-weight:900;font-size:1.45em;">${reward}</span> <span style="display:inline-block;width:.72em;height:.72em;border-radius:50%;background:linear-gradient(145deg,#FFF1A0,#D59610);box-shadow:0 0 8px rgba(255,210,70,.45)"></span>`;
        if (streakBonus > 0) {
            rewardText.innerHTML += `<br><span style="color:#FFB65C;font-size:.72em;">STREAK BONUS +${streakBonus}</span>`;
        }

        rewardText.style.fontSize = "1.2em";
        rewardText.style.margin = "0 0 24px";
        rewardText.style.padding = "13px";
        rewardText.style.border = "1px solid rgba(255,255,255,.08)";
        rewardText.style.borderRadius = "10px";
        rewardText.style.background = "rgba(0,0,0,.2)";
        rewardText.style.fontFamily = "'Cinzel', serif";
        rewardText.style.position = "relative";

        if (dailySummary) {
            const minutes = Math.floor(dailySummary.time / 60);
            const seconds = Math.floor(dailySummary.time % 60).toString().padStart(2, '0');
            const dailyStats = document.createElement('div');
            dailyStats.innerHTML = `<span style="color:#ff6b9b;font-size:.72em;letter-spacing:.16em">DAILY #${dailySummary.number}</span><br><span style="color:#fff;font-size:1.35em">${minutes}:${seconds}</span> <span style="color:rgba(255,255,255,.48);font-size:.72em">· ${dailySummary.hints} HINT${dailySummary.hints === 1 ? '' : 'S'}</span><br><span style="display:inline-block;margin-top:7px;padding:5px 10px;border:1px solid rgba(255,152,0,.36);border-radius:999px;color:#FFB45C;background:rgba(255,120,30,.08);font-size:.76em">${dailySummary.streak} DAY STREAK</span>${dailySummary.replay ? '<br><span style="color:#aaa;font-size:.68em;letter-spacing:.08em">REPLAY · BEST RESULT KEPT</span>' : ''}`;
            Object.assign(dailyStats.style, {
                fontFamily: "'Cinzel', serif", fontSize: '1em', lineHeight: '1.65',
                color: '#FFD700', margin: '-8px 0 22px', position: 'relative'
            });
            box.appendChild(title);
            const rule = document.createElement('div'); rule.className = 'gg-result-rule'; box.appendChild(rule);
            box.appendChild(starContainer);
            box.appendChild(dailyStats);

            const shareText = `Golden Glyphs Daily #${dailySummary.number}\nSolved ${minutes}:${seconds} · ${dailySummary.hints} hint${dailySummary.hints === 1 ? '' : 's'} · ${stars}★\nStreak ${dailySummary.streak}\nhttps://gamevolt.io/golden-glyphs/`;
            const shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.innerText = 'SHARE RESULT';
            shareBtn.className = 'btn-shine';
            Object.assign(shareBtn.style, {
                background: 'rgba(255,255,255,.08)', color: '#FFD700', border: '1px solid rgba(255,215,0,.45)',
                padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', width: '100%',
                fontFamily: "'Cinzel', serif", fontWeight: '700', marginBottom: '16px', position: 'relative'
            });
            shareBtn.onclick = async () => {
                try {
                    if (navigator.share) await navigator.share({ title: `Golden Glyphs Daily #${dailySummary.number}`, text: shareText });
                    else if (navigator.clipboard) { await navigator.clipboard.writeText(shareText); shareBtn.innerText = 'COPIED'; }
                } catch (e) {}
            };
            box.appendChild(shareBtn);

            const leaderboardBox = document.createElement('div');
            Object.assign(leaderboardBox.style, {
                background: 'rgba(0,0,0,.28)', borderRadius: '9px', padding: '10px 14px',
                marginBottom: '14px', fontFamily: "'Cinzel', serif", fontSize: '.8em', position: 'relative'
            });
            leaderboardBox.textContent = 'DAILY TOP 10 · LOADING…';
            box.appendChild(leaderboardBox);
            Promise.resolve(dailySummary.leaderboard || []).then((rows) => {
                leaderboardBox.innerHTML = '';
                const heading = document.createElement('div');
                heading.textContent = 'DAILY TOP 10';
                heading.style.color = '#FFD700';
                heading.style.marginBottom = '7px';
                leaderboardBox.appendChild(heading);
                if (!rows || rows.length === 0) {
                    const empty = document.createElement('div');
                    empty.textContent = 'No ranked results yet — be first.';
                    empty.style.color = '#aaa';
                    leaderboardBox.appendChild(empty);
                    return;
                }
                rows.slice(0, 10).forEach((row, index) => {
                    const line = document.createElement('div');
                    const timeMs = Number(row.time_ms) || 0;
                    const rowMinutes = Math.floor(timeMs / 60000);
                    const rowSeconds = Math.floor((timeMs % 60000) / 1000).toString().padStart(2, '0');
                    line.textContent = `#${row.rank || index + 1}  ${row.username || 'Player'}  ${rowMinutes}:${rowSeconds}`;
                    line.style.cssText = 'display:flex;justify-content:space-between;color:#ddd;padding:3px 0;border-top:1px solid rgba(255,255,255,.06)';
                    leaderboardBox.appendChild(line);
                });
            }).catch(() => { leaderboardBox.textContent = 'DAILY TOP 10 · UNAVAILABLE'; });
        } else {
            box.appendChild(title);
            const rule = document.createElement('div'); rule.className = 'gg-result-rule'; box.appendChild(rule);
            box.appendChild(starContainer);
        }

        // 6. Huvudknapp (Next Level) - glas-design
        const nextBtn = document.createElement('button');
        nextBtn.innerText = btnText;
        nextBtn.className = 'btn-shine';
        Object.assign(nextBtn.style, {
            background: `linear-gradient(180deg, ${resultPalette.accent} 0%, ${resultPalette.accent} 100%)`,
            color: '#07100d',
            border: '1px solid rgba(255,255,255,.32)',
            padding: '15px 40px', 
            fontSize: '20px', 
            fontWeight: 'bold',
            borderRadius: '9px',
            cursor: 'pointer', 
            fontFamily: "'Cinzel', serif",
            marginTop: '10px', 
            width: '100%',
            boxShadow: `0 5px 18px ${resultPalette.glow}, inset 0 1px 0 rgba(255,255,255,.3)`,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            position: 'relative'
        });
        
        nextBtn.onclick = () => {
            overlay.classList.add('hidden');
            if (onMainButton) onMainButton();
            else if (this.onNextLevel) this.onNextLevel();
        };

        // 7. Montera allt i boxen
        box.appendChild(rewardText);
        if (worldUnlock) {
            const unlock = document.createElement('div');
            unlock.textContent = `WORLD UNLOCKED · ${worldUnlock.name}`;
            Object.assign(unlock.style, { color:resultPalette.accent, border:`1px solid ${resultPalette.accent}`, background:'rgba(255,255,255,.045)', padding:'12px', borderRadius:'9px', margin:'0 0 16px', fontWeight:'900', fontFamily:"'Cinzel',serif", boxShadow:`0 0 18px ${resultPalette.glow}` });
            box.appendChild(unlock);
        }
        
        // Annons-knapp (visas BARA om ad-SDK finns)
        if (reward > 0 && onAdReward && this.ads && this.ads.isAvailable()) {
            const adBtn = document.createElement('button');
            adBtn.innerText = "DOUBLE GOLD · AD";
            adBtn.className = 'btn-shine';
            Object.assign(adBtn.style, {
                background: 'linear-gradient(180deg, #FFB74D 0%, #FF9800 50%, #E65100 100%)',
                color: 'white',
                border: 'none',
                borderTop: '1px solid rgba(255,255,255,0.3)',
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
                width: '100%',
                marginBottom: '10px',
                boxShadow: '0 4px 0 #BF360C, inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                position: 'relative'
            });

            adBtn.onclick = () => {
                adBtn.disabled = true;
                this.ads.showRewarded(
                    () => {
                        if (onAdReward) onAdReward();
                        overlay.classList.add('hidden');
                        if (this.onNextLevel) this.onNextLevel();
                    },
                    () => {
                        adBtn.disabled = false;
                    }
                );
            };
            box.appendChild(adBtn);
        }

        box.appendChild(nextBtn);
        overlay.appendChild(box);

        // 8. VISA SKÄRMEN!
        overlay.classList.remove('hidden');
    }
    
    // Hanterar "Out of Time" i Time Attack - Glas-design med ad-animation
    showRevivePopup(onWatchAd, onSkip) {
        const overlay = document.getElementById('win-screen');
        if (!overlay) { if (onSkip) onSkip(); return; }
        
        overlay.innerHTML = "";
        
        // Glas-box
        const box = document.createElement('div');
        box.className = 'win-content';
        Object.assign(box.style, {
            background: 'linear-gradient(180deg, rgba(50, 20, 20, 0.95) 0%, rgba(30, 10, 10, 0.98) 100%)',
            padding: '40px',
            borderRadius: '15px',
            border: '2px solid rgba(255, 80, 80, 0.5)',
            boxShadow: '0 0 30px rgba(255, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            textAlign: 'center',
            color: '#fff',
            minWidth: '300px',
            position: 'relative',
            overflow: 'hidden'
        });
        
        // Glas-shine effekt överst
        const shine = document.createElement('div');
        Object.assign(shine.style, {
            position: 'absolute', top: '0', left: '0', right: '0', height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '13px 13px 0 0', pointerEvents: 'none'
        });
        box.appendChild(shine);

        // Titel
        const title = document.createElement('h1');
        title.innerText = "⏱️ OUT OF TIME!";
        Object.assign(title.style, {
            fontSize: '2em', margin: '0 0 15px 0', 
            textShadow: '0 0 20px rgba(255, 80, 80, 0.5)', 
            color: '#ff6666',
            fontFamily: "'Cinzel', serif",
            position: 'relative'
        });
        
        const sub = document.createElement('p');
        sub.innerText = "Watch an ad to continue?";
        Object.assign(sub.style, {
            fontSize: '1.1em', color: '#aaa', marginBottom: '25px',
            fontFamily: "'Cinzel', serif", position: 'relative'
        });
        
        // Skip-knapp (visas alltid)
        const btnSkip = document.createElement('button');
        btnSkip.innerText = this.ads && this.ads.isAvailable() ? "NO THANKS" : "OK";
        btnSkip.className = 'btn-shine';
        Object.assign(btnSkip.style, {
            background: this.ads && this.ads.isAvailable() ? 'transparent' : 'linear-gradient(180deg, #FF7043 0%, #FF5722 50%, #E64A19 100%)',
            color: this.ads && this.ads.isAvailable() ? '#666' : 'white',
            border: this.ads && this.ads.isAvailable() ? '1px solid #444' : 'none',
            padding: this.ads && this.ads.isAvailable() ? '10px' : '15px 30px',
            borderRadius: this.ads && this.ads.isAvailable() ? '8px' : '10px',
            fontSize: this.ads && this.ads.isAvailable() ? '14px' : '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: "'Cinzel', serif",
            width: '100%',
            position: 'relative'
        });
        btnSkip.onclick = () => {
            overlay.classList.add('hidden');
            onSkip();
        };

        box.appendChild(title);
        box.appendChild(sub);

        // Revive-knapp (visas BARA om ad-SDK finns)
        if (this.ads && this.ads.isAvailable()) {
            const btnAd = document.createElement('button');
            btnAd.innerText = "📺 REVIVE (+20s)";
            btnAd.className = 'btn-shine';
            Object.assign(btnAd.style, {
                background: 'linear-gradient(180deg, #5cb85c 0%, #4CAF50 50%, #3d8b40 100%)',
                color: 'white',
                border: 'none',
                borderTop: '1px solid rgba(255,255,255,0.3)',
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
                width: '100%',
                marginBottom: '12px',
                boxShadow: '0 4px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                position: 'relative'
            });

            btnAd.onclick = () => {
                btnAd.disabled = true;
                this.ads.showRewarded(
                    () => {
                        overlay.classList.add('hidden');
                        onWatchAd();
                    },
                    () => {
                        btnAd.disabled = false;
                    }
                );
            };
            box.appendChild(btnAd);
        }

        box.appendChild(btnSkip);
        overlay.appendChild(box);
        overlay.classList.remove('hidden');
    }
    
    // Time Attack Game Over - visar score, highscore, leaderboard
    showTimeAttackGameOver(score, goldEarned, leaderboard, isNewHighScore, onFinish, stats=null) {
        const overlay = document.getElementById('win-screen');
        if (!overlay) { if (onFinish) onFinish(); return; }
        
        overlay.innerHTML = "";
        
        // Glas-box
        const box = document.createElement('div');
        box.className = 'win-content';
        Object.assign(box.style, {
            background: 'linear-gradient(180deg, rgba(20, 30, 50, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)',
            padding: '35px',
            borderRadius: '15px',
            border: '2px solid rgba(255, 87, 34, 0.5)',
            boxShadow: '0 0 30px rgba(255, 87, 34, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            textAlign: 'center',
            color: '#fff',
            minWidth: '320px',
            maxWidth: '400px',
            position: 'relative',
            overflow: 'hidden'
        });
        
        // Glas-shine
        const shine = document.createElement('div');
        Object.assign(shine.style, {
            position: 'absolute', top: '0', left: '0', right: '0', height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '13px 13px 0 0', pointerEvents: 'none'
        });
        box.appendChild(shine);

        // Titel
        const title = document.createElement('h1');
        title.innerText = "⏱️ TIME'S UP!";
        Object.assign(title.style, {
            fontSize: '2em', margin: '0 0 20px 0', 
            textShadow: '0 0 20px rgba(255, 87, 34, 0.5)', 
            color: '#FF5722',
            fontFamily: "'Cinzel', serif",
            position: 'relative'
        });
        box.appendChild(title);
        
        // Score
        const scoreDiv = document.createElement('div');
        scoreDiv.innerHTML = `SCORE: <span style="color:#FFD700; font-size:1.4em;">${score}</span>`;
        Object.assign(scoreDiv.style, {
            fontSize: '1.3em', marginBottom: '10px',
            fontFamily: "'Cinzel', serif", position: 'relative'
        });
        box.appendChild(scoreDiv);
        
        // New High Score badge
        if (isNewHighScore) {
            const badge = document.createElement('div');
            badge.innerText = "🏆 NEW HIGH SCORE! 🏆";
            Object.assign(badge.style, {
                fontSize: '1.1em', color: '#4CAF50', marginBottom: '15px',
                fontFamily: "'Cinzel', serif", position: 'relative',
                textShadow: '0 0 10px rgba(76, 175, 80, 0.5)'
            });
            box.appendChild(badge);
        }
        
        // Gold earned
        const goldDiv = document.createElement('div');
        goldDiv.innerHTML = `GOLD EARNED: <span style="color:#FFD700;">+${goldEarned}</span> <span style="color:#FFD700;">●</span>`;
        Object.assign(goldDiv.style, {
            fontSize: '1.1em', marginBottom: '20px',
            fontFamily: "'Cinzel', serif", position: 'relative'
        });
        box.appendChild(goldDiv);

        // Run stats + PB
        if (stats) {
            const tierColors = { EASY: '#4CAF50', MEDIUM: '#FF9800', HARD: '#F44336', ARCANE: '#9C27B0' };
            const statsContainer = document.createElement('div');
            Object.assign(statsContainer.style, {
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '15px',
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                textAlign: 'center'
            });

            const makeStatBox = (label, value, color = '#FFD700') => {
                const div = document.createElement('div');
                div.innerHTML = `<div style="color:#888; font-size:0.65em; letter-spacing:1px; margin-bottom:4px;">${label}</div><div style="color:${color}; font-size:1.2em; font-weight:bold;">${value}</div>`;
                div.style.fontFamily = "'Cinzel', serif";
                return div;
            };

            statsContainer.appendChild(makeStatBox('SOLVED', stats.solved));
            statsContainer.appendChild(makeStatBox('TIER', stats.tier, tierColors[stats.tier] || '#FFD700'));
            statsContainer.appendChild(makeStatBox('COMBO', stats.maxCombo > 0 ? `x${stats.maxCombo}` : '-', stats.maxCombo >= 3 ? '#FF9800' : '#FFD700'));
            box.appendChild(statsContainer);

            // PB-rad under
            const pbRow = document.createElement('div');
            Object.assign(pbRow.style, {
                fontSize: '0.75em', color: '#666', marginBottom: '15px',
                fontFamily: "'Cinzel', serif", position: 'relative', letterSpacing: '1px'
            });
            pbRow.innerHTML = `PB: ${stats.pb.bestScore} pts · ${stats.pb.bestSolved} solved · ${stats.pb.bestTier}`;
            box.appendChild(pbRow);
        }

        // Leaderboard
        if (leaderboard && leaderboard.length > 0) {
            const lbTitle = document.createElement('div');
            lbTitle.innerText = "TOP SCORES";
            Object.assign(lbTitle.style, {
                fontSize: '0.9em', color: '#888', marginBottom: '8px',
                fontFamily: "'Cinzel', serif", position: 'relative',
                letterSpacing: '2px'
            });
            box.appendChild(lbTitle);
            
            const lbContainer = document.createElement('div');
            Object.assign(lbContainer.style, {
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '20px',
                position: 'relative'
            });
            
            leaderboard.slice(0, 5).forEach((s, i) => {
                const row = document.createElement('div');
                const isCurrentScore = (s === score && i === leaderboard.indexOf(score));
                row.innerHTML = `<span style="color:#888;">${i+1}.</span> <span style="color:${isCurrentScore ? '#4CAF50' : '#FFD700'};">${s}</span>`;
                Object.assign(row.style, {
                    fontSize: '1em', padding: '4px 0',
                    fontFamily: "'Cinzel', serif",
                    borderBottom: i < Math.min(leaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                });
                lbContainer.appendChild(row);
            });
            box.appendChild(lbContainer);
        }
        
        // Finish-knapp
        const finishBtn = document.createElement('button');
        finishBtn.innerText = "FINISH";
        finishBtn.className = 'btn-shine';
        Object.assign(finishBtn.style, {
            background: 'linear-gradient(180deg, #FF7043 0%, #FF5722 50%, #E64A19 100%)',
            color: 'white', 
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.3)',
            padding: '15px 40px', 
            fontSize: '18px', 
            fontWeight: 'bold',
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontFamily: "'Cinzel', serif",
            width: '100%',
            boxShadow: '0 4px 0 #BF360C, inset 0 1px 0 rgba(255,255,255,0.2)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            position: 'relative'
        });
        finishBtn.onclick = () => {
            overlay.classList.add('hidden');
            if (onFinish) onFinish();
        };
        box.appendChild(finishBtn);
        
        overlay.appendChild(box);
        overlay.classList.remove('hidden');
    }
}
