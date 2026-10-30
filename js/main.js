import { load, save } from './save.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { audio } from './audio.js';

const state = load();
audio.enabled = state.settings.sound;
audio.haptics = state.settings.haptics;

const game = new Game(document.getElementById('game'), state);
const ui = new UI(game);
game.resize();

// Welcome-back idle earnings, then daily bonus
setTimeout(() => { if (!ui.welcomeBack() && ui.dailyAvailable()) ui.daily(); }, 600);

// Save whenever the app is hidden/closed
const persist = () => { if (game.s) { state.bossHp = game.hp; save(state); } };
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
window.addEventListener('pagehide', persist);

// Offline support
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
window.__game = game;
