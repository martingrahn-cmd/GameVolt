// src/js/audio.js

export class AudioManager {
    constructor() {
        this.musicVolume = 0.5; 
        this.sfxVolume = 0.6;   
        this.currentTrackId = null;
        this.currentAudio = null;
        this.enabled = true;
        this.fadeInInterval = null;
        this.fadeOutInterval = null;

        // MUSIK (Ligger i assets/music/)
        this.tracks = {
            'ambience_jungle': 'assets/music/ambience_jungle.mp3',
            'ambience_ice':    'assets/music/ambience_ice.mp3',
            'ambience_lava':   'assets/music/ambience_lava.mp3',
            'ambience_cyber':  'assets/music/ambience_cyber.mp3',
            'ambience_zen':    'assets/music/ambience_zen.mp3',
            'music_time_attack': 'assets/music/music_time_attack.mp3'
        };

        // LJUDEFFEKTER
        this.sfxPaths = {
            'click':         'assets/sfx/click.mp3',
            'drop':          'assets/sfx/drop.mp3',
            'equip':         'assets/sfx/equip.mp3',
            'hint':          'assets/sfx/hint_appear.mp3',
            'hover':         'assets/sfx/hover.mp3',
            'invalid':       'assets/sfx/invalid.mp3',
            'menu_back':     'assets/sfx/menu_back.mp3',
            'pickup':        'assets/sfx/pickup.mp3',
            'place':         'assets/sfx/place_correct.mp3',
            'place_invalid': 'assets/sfx/place_invalid.mp3',
            'purchase':      'assets/sfx/purchase.mp3',
            'rotate':        'assets/sfx/rotate.mp3',
            'star1':         'assets/sfx/star1.mp3',
            'star2':         'assets/sfx/star2.mp3',
            'star3':         'assets/sfx/star3.mp3',
            'tab':           'assets/sfx/tab_switch.mp3',
            'win':           'assets/sfx/win.mp3',
            'zen_complete':  'assets/sfx/zen_complete.mp3'
        };
        // Bakåtkompatibilitet
        this.sfx = this.sfxPaths;

        // Pre-load alla SFX så de spelas utan fördröjning
        this.sfxCache = {};
        for (const [id, path] of Object.entries(this.sfxPaths)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.load();
            this.sfxCache[id] = audio;
        }
    }

    playMusic(trackId) {
        if (!this.enabled) return;
        
        // --- DEN VIKTIGASTE RADEN ---
        // Om vi redan spelar rätt låt: GÖR INGENTING. Låt den loopa vidare.
        if (this.currentTrackId === trackId && this.currentAudio && !this.currentAudio.paused) {
            return; 
        }

        console.log(`🎵 Byter musik till: ${trackId}`);

        // 1. Tona ut gammal musik
        if (this.currentAudio) {
            this.fadeOut(this.currentAudio);
        }

        // 2. Starta ny musik
        if (this.tracks[trackId]) {
            const newAudio = new Audio(this.tracks[trackId]);
            newAudio.loop = true; 
            newAudio.volume = 0;  // Börja tyst för fade-in
            
            const playPromise = newAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    this.fadeIn(newAudio);
                }).catch(e => console.log("Autoplay blockerat:", e));
            }
            
            this.currentAudio = newAudio;
            this.currentTrackId = trackId;
        }
    }

    stopMusic() {
        if (this.currentAudio) {
            this.fadeOut(this.currentAudio);
            this.currentAudio = null;
            this.currentTrackId = null;
        }
    }

    playSfx(sfxId) {
        if (!this.enabled) return;

        if (!this.sfxPaths[sfxId]) {
            console.warn(`⚠️ Ljud saknas i listan: '${sfxId}'`);
            return;
        }

        try {
            // Använd pre-loadad cache — klona så samma ljud kan spelas överlappande
            const cached = this.sfxCache[sfxId];
            if (cached && cached.readyState >= 2) {
                const sound = cached.cloneNode();
                sound.volume = this.sfxVolume;
                sound.play().catch(() => {});
            } else {
                // Fallback om inte laddat ännu
                const sound = new Audio(this.sfxPaths[sfxId]);
                sound.volume = this.sfxVolume;
                sound.play().catch(() => {});
            }
        } catch (e) {}
    }

    fadeIn(audio) {
        if (this.fadeInInterval) clearInterval(this.fadeInInterval);
        let vol = 0;
        this.fadeInInterval = setInterval(() => {
            if (vol < this.musicVolume) {
                vol += 0.05;
                audio.volume = Math.min(vol, this.musicVolume);
            } else {
                clearInterval(this.fadeInInterval);
                this.fadeInInterval = null;
            }
        }, 100);
    }

    fadeOut(audio) {
        if (this.fadeOutInterval) clearInterval(this.fadeOutInterval);
        const fadingAudio = audio;
        let vol = fadingAudio.volume;
        this.fadeOutInterval = setInterval(() => {
            if (vol > 0.05) {
                vol -= 0.05;
                fadingAudio.volume = Math.max(0, vol);
            } else {
                clearInterval(this.fadeOutInterval);
                this.fadeOutInterval = null;
                fadingAudio.volume = 0;
                fadingAudio.pause();
                fadingAudio.currentTime = 0;
            }
        }, 100);
    }
    
    toggleMute() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.currentAudio) {
            this.currentAudio.pause();
        } else if (this.enabled && this.currentAudio) {
            this.currentAudio.volume = this.musicVolume;
            this.currentAudio.play().catch(() => {});
        }
        return this.enabled;
    }
}