import type { Character } from '@/characters/Character';
import type { InputDevice } from '@/input/InputDevice';

export class SplitScreenUI {
  private root: HTMLElement;
  private leftHud?: HTMLElement;
  private rightHud?: HTMLElement;
  private gamepadStatus?: HTMLElement;

  constructor(uiRoot: HTMLElement) {
    this.root = uiRoot;
  }

  showMenu(onPlay: () => void, assetHint?: string): void {
    this.root.innerHTML = `
      <div class="menu-overlay interactive">
        <div class="menu-panel">
          <h1>Polis Şehri</h1>
          <p>Baba-oğul split-screen macerası. Polis ve hırsız olarak aynı şehirde yarışın!</p>
          ${assetHint ? `<p class="asset-hint">${assetHint}</p>` : ''}
          <button class="menu-btn menu-btn-primary" id="btn-play">Oyna</button>
          <div class="controls-info">
            <h3>Oyuncu 1 — Polis (Klavye)</h3>
            <ul>
              <li>WASD — Hareket</li>
              <li>Shift — Koş</li>
              <li>Space — Aksiyon</li>
              <li>E — Etkileşim</li>
            </ul>
            <h3 style="margin-top: 1rem">Oyuncu 2 — Hırsız (Gamepad)</h3>
            <ul>
              <li>Sol stick — Hareket</li>
              <li>A (0) — Aksiyon</li>
              <li>X (2) — Etkileşim</li>
              <li>RB (5) — Koş</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#btn-play')?.addEventListener('click', onPlay);
  }

  showLoading(message: string): void {
    this.root.innerHTML = `
      <div class="menu-overlay interactive">
        <div class="menu-panel">
          <h1>Yükleniyor…</h1>
          <p>${message}</p>
          <div class="loading-bar"><div class="loading-bar-fill"></div></div>
        </div>
      </div>
    `;
  }

  showError(message: string, onBack: () => void): void {
    this.root.innerHTML = `
      <div class="menu-overlay interactive">
        <div class="menu-panel">
          <h1>Hata</h1>
          <p>${message}</p>
          <button class="menu-btn menu-btn-secondary" id="btn-back">Menüye Dön</button>
        </div>
      </div>
    `;
    this.root.querySelector('#btn-back')?.addEventListener('click', onBack);
  }

  showGameHud(players: { id: number; role: 'police' | 'thief'; label: string }[]): void {
    this.root.innerHTML = `
      <div class="split-divider"></div>
      <div class="split-hud split-hud-left">
        <div class="split-hud-inner" id="hud-p1"></div>
      </div>
      <div class="split-hud split-hud-right">
        <div class="split-hud-inner" id="hud-p2"></div>
      </div>
      <div class="gamepad-status" id="gamepad-status"></div>
    `;

    this.leftHud = this.root.querySelector('#hud-p1')!;
    this.rightHud = this.root.querySelector('#hud-p2')!;
    this.gamepadStatus = this.root.querySelector('#gamepad-status')!;

    players.forEach((p, i) => {
      const el = i === 0 ? this.leftHud : this.rightHud;
      if (!el) return;
      const badgeClass = p.role === 'police' ? 'player-badge-police' : 'player-badge-thief';
      el.innerHTML = `
        <div class="player-badge ${badgeClass}">P${p.id} — ${p.role === 'police' ? 'Polis' : 'Hırsız'}</div>
        <div class="hud-stats" id="stats-p${p.id}">
          <div>${p.label}</div>
          <div id="speed-p${p.id}">Hız: 0</div>
        </div>
      `;
    });
  }

  updateHud(
    playerId: number,
    character: Character,
    device: InputDevice,
  ): void {
    const speedEl = this.root.querySelector(`#speed-p${playerId}`);
    if (speedEl) {
      const state = character.movement.isSprinting ? 'Koşuyor' : character.movement.isMoving ? 'Yürüyor' : 'Bekliyor';
      speedEl.textContent = `${state} · ${character.movement.currentSpeed.toFixed(1)} m/s`;
    }

    if (playerId === 2 && this.gamepadStatus) {
      this.gamepadStatus.className = `gamepad-status ${device.isConnected ? 'gamepad-connected' : 'gamepad-disconnected'}`;
      this.gamepadStatus.textContent = device.isConnected
        ? `🎮 ${device.displayName}`
        : '🎮 Gamepad bağlı değil — USB/Bluetooth ile bağlayın';
    }
  }

  showDebug(info: string): void {
    let el = this.root.querySelector('.debug-overlay') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.className = 'debug-overlay';
      this.root.appendChild(el);
    }
    el.textContent = info;
  }

  hideDebug(): void {
    this.root.querySelector('.debug-overlay')?.remove();
  }

  clear(): void {
    this.root.innerHTML = '';
  }
}
