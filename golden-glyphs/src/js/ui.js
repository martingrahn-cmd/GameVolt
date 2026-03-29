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
        `;
        document.head.appendChild(style);
    }

    showWinScreen(stars, reward, onAdReward, titleText="LEVEL COMPLETE", btnText="NEXT LEVEL", onMainButton=null, playSound=null, streakBonus=0) {
        const overlay = document.getElementById('win-screen');
        if (!overlay) {
            console.error("UI Error: #win-screen missing in HTML");
            if (onMainButton) onMainButton();
            else if (this.onNextLevel) this.onNextLevel();
            return;
        }

        // 1. Rensa gammalt innehåll
        overlay.innerHTML = "";
        
        // 2. Skapa boxen med glas-design
        const box = document.createElement('div');
        box.className = 'win-content';
        Object.assign(box.style, {
            background: 'linear-gradient(180deg, rgba(20, 30, 50, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)',
            padding: '40px',
            borderRadius: '15px',
            border: '2px solid rgba(255, 215, 0, 0.5)',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
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

        // 3. Rubrik
        const title = document.createElement('h1');
        title.innerText = titleText;
        Object.assign(title.style, {
            fontSize: '2.2em', margin: '0 0 20px 0', 
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)', 
            color: '#FFD700',
            fontFamily: "'Cinzel', serif",
            position: 'relative'
        });

        // 4. Stjärnor — staggered pop-in med ljud per stjärna
        const starContainer = document.createElement('div');
        starContainer.style.fontSize = "50px";
        starContainer.style.marginBottom = "20px";
        starContainer.style.position = "relative";
        starContainer.style.display = "flex";
        starContainer.style.justifyContent = "center";
        starContainer.style.gap = "8px";

        for (let i = 0; i < 3; i++) {
            const earned = i < stars;
            const starEl = document.createElement('span');
            starEl.innerText = earned ? "⭐" : "☆";
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
                starEl.style.opacity = "0.3";
            }
            starContainer.appendChild(starEl);
        }


        // 5. Belöningstext
        const rewardText = document.createElement('div');
        rewardText.innerHTML = `REWARD: <span style="color:#FFD700; font-weight:bold; font-size:1.3em;">${reward}</span> <span style="color:#FFD700; font-size:1.3em;">●</span>`;
        if (streakBonus > 0) {
            rewardText.innerHTML += `<br><span style="color:#FF9800; font-size:0.75em;">STREAK BONUS +${streakBonus} 🔥</span>`;
        }

        rewardText.style.fontSize = "1.2em";
        rewardText.style.marginBottom = "30px";
        rewardText.style.fontFamily = "'Cinzel', serif";
        rewardText.style.position = "relative";

        // 6. Huvudknapp (Next Level) - glas-design
        const nextBtn = document.createElement('button');
        nextBtn.innerText = btnText;
        nextBtn.className = 'btn-shine';
        Object.assign(nextBtn.style, {
            background: 'linear-gradient(180deg, #5cb85c 0%, #4CAF50 50%, #3d8b40 100%)',
            color: 'white', 
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.3)',
            padding: '15px 40px', 
            fontSize: '20px', 
            fontWeight: 'bold',
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontFamily: "'Cinzel', serif",
            marginTop: '10px', 
            width: '100%',
            boxShadow: '0 4px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.2)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            position: 'relative'
        });
        
        nextBtn.onclick = () => {
            overlay.classList.add('hidden');
            if (onMainButton) onMainButton();
            else if (this.onNextLevel) this.onNextLevel();
        };

        // 7. Montera allt i boxen
        box.appendChild(title);
        box.appendChild(starContainer);
        box.appendChild(rewardText);
        
        // Annons-knapp (visas BARA om ad-SDK finns)
        if (reward > 0 && onAdReward && this.ads && this.ads.isAvailable()) {
            const adBtn = document.createElement('button');
            adBtn.innerText = "📺 DOUBLE GOLD (AD)";
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