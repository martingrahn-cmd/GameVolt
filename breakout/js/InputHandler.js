export default class InputHandler {
  constructor(game, canvas) {
    this.game = game;
    this.hasUnlockedAudio = false; 

    // VIKTIGT: Vi lyssnar på WINDOW istället för canvas.
    // Då fungerar touch överallt på skärmen.
    
    // Touch
    window.addEventListener('touchstart', (e) => this.handleUnlock(e), {passive: false});
    window.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
    window.addEventListener('touchend', (e) => e.preventDefault(), {passive: false});

    // Mus
    window.addEventListener('mousedown', (e) => this.handleUnlock(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));
  }

  handleUnlock(e) {
    // Stoppa scroll/zoom
    if (e.cancelable && e.target !== this.game.canvas) e.preventDefault(); 

    if (!this.hasUnlockedAudio) {
        this.game.audio.unlockIOS();
        this.game.audio.startMusicFlow();
        this.hasUnlockedAudio = true;
    }

    // Vi skickar alltid händelsen vidare, oavsett vad man klickade på
    this.onPress(e);
  }

  onPress(e) {
    // --- MENY / GAMEOVER ---
    if (this.game.state === 'menu' || this.game.state === 'gameover') {
        
        // Vi måste räkna ut klicket relativt canvasen för att träffa knapparna rätt
        // även om man klickar utanför (vilket blir svårt, men bra att ha rätt matte)
        const canvasRect = this.game.canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - canvasRect.left;
        const y = clientY - canvasRect.top;

        if (this.game.state === 'gameover') {
            // Skala om koordinaterna om canvasen är skalad via CSS
            const scaleX = this.game.width / canvasRect.width;
            const scaleY = this.game.height / canvasRect.height;
            
            const action = this.game.hud.checkClick(x * scaleX, y * scaleY);
            if (action === 'continue') {
                this.game.continueGame();
                return;
            } else if (action === 'restart') {
                this.game.start();
                return;
            }
        } else {
            this.game.start();
            return;
        }
    }

    // --- SPEL ---
    this.game.shootLaser();
    if (this.game.state === 'running' && !this.game.ball.isLaunched) {
        this.game.ball.launch();
    }
  }

  onMove(e) {
    // Stoppa scroll
    if (e.cancelable) e.preventDefault();

    if (this.game.state !== 'running') return;

    let clientX;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }

    // Hämta canvasens position (den kan vara centrerad med marginaler)
    const canvasRect = this.game.canvas.getBoundingClientRect();
    
    // Räkna ut var fingret är relativt canvasens vänsterkant
    const relativeX = clientX - canvasRect.left;
    
    // Skala om (om CSS-bredden skiljer sig från spelets interna upplösning)
    const scaleX = this.game.width / canvasRect.width;
    const finalX = relativeX * scaleX;

    if(this.game.paddle && this.game.paddle.moveTo) {
        this.game.paddle.moveTo(finalX);
    }
  }
}