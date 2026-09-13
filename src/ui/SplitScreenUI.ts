import type { Character } from '@/characters/Character';
import type { InputDevice } from '@/input/InputDevice';
import type { GameModeHud } from '@/game-modes/GameMode';

export class SplitScreenUI {
  private root: HTMLElement;
  private leftHud?: HTMLElement;
  private rightHud?: HTMLElement;
  private gamepadStatus?: HTMLElement;
  private restartHandler?: () => void;
  private matchResultFrozen = false;

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
              <li>E veya Space — Tutukla (yakın mesafe, basılı tut)</li>
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
    this.matchResultFrozen = false;
    this.root.innerHTML = `
      <div class="split-divider"></div>
      <div class="split-hud split-hud-left">
        <div class="split-hud-inner" id="hud-p1"></div>
      </div>
      <div class="split-hud split-hud-right">
        <div class="split-hud-inner" id="hud-p2"></div>
      </div>
      <div class="gamepad-status" id="gamepad-status"></div>
      <div class="case-panel" id="case-panel"></div>
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
          <div class="hud-compass" id="compass-p${p.id}">↑</div>
          <div class="hud-hint" id="hint-p${p.id}"></div>
        </div>
      `;
    });

    const panel = this.root.querySelector('#case-panel');
    panel?.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.id === 'btn-restart') {
        this.restartHandler?.();
      }
    });
  }

  setRestartHandler(handler: () => void): void {
    this.restartHandler = handler;
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

  updateCaseHud(hud: GameModeHud): void {
    const panel = this.root.querySelector('#case-panel') as HTMLElement | null;
    if (!panel || !hud.caseSnapshot) return;

    if (hud.showRestart) {
      this.matchResultFrozen = true;
    }
    if (this.matchResultFrozen && panel.querySelector('#btn-restart')) {
      this.updateHudHints(hud);
      return;
    }

    const c = hud.caseSnapshot;
    const mins = Math.floor(c.timeRemainingSeconds / 60);
    const secs = Math.floor(c.timeRemainingSeconds % 60).toString().padStart(2, '0');
    const objectives = c.objectives
      .map((o) => {
        const mark =
          o.status === 'completed' ? '✓' : o.status === 'active' ? '▶' : '○';
        return `<li class="obj-${o.status}">${mark} ${o.description}</li>`;
      })
      .join('');

    let arrestHtml = '';
    if (hud.arrestState && hud.arrestState.inRange) {
      const pct = Math.round(hud.arrestState.progress * 100);
      arrestHtml = `
        <div class="arrest-bar-wrap">
          <div class="arrest-label">Tutuklama ${pct}% — E veya Space basılı tut</div>
          <div class="arrest-bar"><div class="arrest-fill" style="width:${pct}%"></div></div>
        </div>`;
    }

    const resultHtml = hud.resultMessage
      ? `<div class="case-result">${hud.resultMessage}</div>`
      : '';

    const restartHtml = hud.showRestart
      ? `<button class="menu-btn menu-btn-primary match-restart-btn" id="btn-restart">Tekrar Oyna</button>`
      : '';

    panel.innerHTML = `
      <div class="case-title">${c.title}</div>
      ${hud.briefing && !hud.showRestart ? `<div class="case-briefing">${hud.briefing}</div>` : ''}
      <div class="case-timer ${hud.escalationActive ? 'case-timer-urgent' : ''}">⏱ ${mins}:${secs}${hud.escalationActive ? ' · ACİL' : ''}</div>
      <ul class="case-objectives">${objectives}</ul>
      ${arrestHtml}
      ${resultHtml}
      ${restartHtml}
    `;

    if (hud.showRestart) {
      panel.classList.add('case-panel-interactive');
    } else {
      panel.classList.remove('case-panel-interactive');
    }

    this.updateHudHints(hud);
  }

  private updateHudHints(hud: GameModeHud): void {
    const policeHint = this.root.querySelector('#hint-p1');
    if (policeHint && hud.policeHint) {
      policeHint.textContent = hud.policeHint;
    }

    const thiefHint = this.root.querySelector('#hint-p2');
    if (thiefHint && hud.thiefHint) {
      thiefHint.textContent = hud.thiefHint;
    }

    const policeCompass = this.root.querySelector('#compass-p1');
    if (policeCompass && hud.policeCompass) {
      policeCompass.textContent = hud.policeCompass;
    }

    const thiefCompass = this.root.querySelector('#compass-p2');
    if (thiefCompass && hud.thiefCompass) {
      thiefCompass.textContent = hud.thiefCompass;
    }
  }

  showCountdown(seconds: number, briefing?: string): void {
    let el = this.root.querySelector('.countdown-overlay') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.className = 'countdown-overlay';
      this.root.appendChild(el);
    }
    el.innerHTML = `
      <div class="countdown-number">${seconds}</div>
      ${briefing ? `<div class="countdown-briefing">${briefing}</div>` : ''}
    `;
  }

  updateCountdown(seconds: number): void {
    const num = this.root.querySelector('.countdown-number');
    if (num) num.textContent = String(seconds);
  }

  hideCountdown(): void {
    this.root.querySelector('.countdown-overlay')?.remove();
  }

  bindRestart(onRestart: () => void): void {
    this.setRestartHandler(onRestart);
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
