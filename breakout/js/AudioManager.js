export default class AudioManager {
  constructor(game) {
    this.game = game;
    this.sounds = {};
    this.musicVolume = 0.7;

    // Separate mute states (persisted)
    this.sfxMuted = localStorage.getItem('bo_sfx') === '0';
    this.musicMuted = localStorage.getItem('bo_music') === '0';

    // DJ System
    this.musicPlayers = [new Audio(), new Audio()];
    this.activePlayerIndex = 0; 
    this.playlist = ['music1.mp3', 'music2.mp3', 'music3.mp3'];
    this.isCrossfading = false;
    this.lastSongIndex = -1; 

    this.musicPlayers.forEach(p => {
        p.preload = 'auto';
        p.volume = this.musicVolume; 
        p.addEventListener('timeupdate', () => this.checkCrossfade(p));
    });

    // --- LJUDEFFEKTER ---
    const soundFiles = {
      'paddle_hit': 'paddle_hit.wav',
      'wall_hit': 'wall_hit.wav',
      'brick_hit': 'brick_hit.wav',
      'brick_explode': 'brick_explode.wav',
      'ball_launch': 'ball_launch.wav',
      'game_over': 'game_over.wav',
      'level_clear': 'level_clear.mp3',
      
      // Powerups
      'extra_life': 'extra_life.mp3',
      'multiball': 'multiball.mp3',
      'paddle_wide': 'paddle_extended.mp3',
      
      // NYA:
      'powerup_laser': 'laser.mp3',
      'powerup_floor': 'floor.mp3',
      
      // Laser skott (vi lånar ball_launch tillsvidare eller om du vill ha ett eget ljud för "pew pew")
      'laser_shoot': 'ball_launch.wav' 
    };

    for (let [name, file] of Object.entries(soundFiles)) {
      this.loadSfx(name, `assets/audio/${file}`);
    }
  }

  loadSfx(name, path) {
    const audio = new Audio(path);
    audio.preload = 'auto'; 
    audio.volume = 0.85; 
    audio.onerror = () => console.warn(`Saknas: ${path}`);
    this.sounds[name] = audio;
  }

  startMusicFlow() {
    if (this.musicMuted) return;
    if (this.musicPlayers[0].paused && this.musicPlayers[1].paused) {
        this.playTrackOnPlayer(0, true);
    }
  }

  playTrackOnPlayer(playerIndex, instantStart = false) {
    const player = this.musicPlayers[playerIndex];
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * this.playlist.length);
    } while (nextIndex === this.lastSongIndex && this.playlist.length > 1);

    this.lastSongIndex = nextIndex;
    const nextSong = this.playlist[nextIndex];
    player.src = `assets/audio/${nextSong}`;
    
    if (instantStart) player.volume = this.musicVolume; 
    else player.volume = 0; 

    player.play().then(() => {
        this.activePlayerIndex = playerIndex;
        if (!instantStart) this.fadeAudio(player, 0, this.musicVolume, 2000);
        setTimeout(() => { this.isCrossfading = false; }, 3000);
    }).catch(e => {});
  }

  checkCrossfade(player) {
    if (this.isCrossfading) return; 
    if (player.paused || !player.duration) return;
    if (player !== this.musicPlayers[this.activePlayerIndex]) return;

    if (player.duration - player.currentTime < 5) {
        this.isCrossfading = true; 
        this.fadeAudio(player, this.musicVolume, 0, 4500);
        const nextIndex = (this.activePlayerIndex + 1) % 2;
        this.playTrackOnPlayer(nextIndex, false); 
    }
  }

  fadeAudio(player, startVol, endVol, duration) {
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = (endVol - startVol) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
        currentStep++;
        let newVol = startVol + (volStep * currentStep);
        if (newVol > 1) newVol = 1;
        if (newVol < 0) newVol = 0;
        player.volume = newVol;

        if (currentStep >= steps) {
            clearInterval(interval);
            if (endVol === 0) { 
                player.pause();
                player.currentTime = 0;
            }
        }
    }, stepTime);
  }

  play(name) {
    if (this.sfxMuted) return;
    if (name === 'music') return;

    const sound = this.sounds[name];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => {});
    }
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('bo_music', this.musicMuted ? '0' : '1');
    if (this.musicMuted) {
        this.musicPlayers.forEach(p => { p.pause(); p.currentTime = 0; });
        this.isCrossfading = false;
    } else {
        this.startMusicFlow();
    }
    return !this.musicMuted;
  }

  toggleSFX() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem('bo_sfx', this.sfxMuted ? '0' : '1');
    return !this.sfxMuted;
  }

  unlockIOS() {
    if(this.sounds['ball_launch']) {
        const s = this.sounds['ball_launch'];
        s.volume = 0;
        s.play().then(() => {
            s.pause(); s.volume=0.85;
        }).catch(()=>{});
    }
  }
}