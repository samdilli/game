# Polis Şehri — Browser 3D Split-Screen Game

Baba-oğul için tarayıcı tabanlı, low-poly polis/hırsız split-screen oyunu.

## Teknoloji

- **Babylon.js** — 3D motor (bp900 iskeletinden esinlenen engine katmanı)
- **TypeScript + Vite**
- **WebGPU** öncelikli, **WebGL2** yedek
- **Havok Physics** altyapısı hazır (Milestone 2'de aktif)
- **glTF/GLB** yükleme altyapısı (`AssetManager`)

## Milestone 1 (Mevcut)

- [x] Modüler oyun mimarisi (EventBus, input abstraction, split-screen)
- [x] bp900 tarzı engine bootstrap (WebGPU/WebGL2, Inspector, FPS)
- [x] İki oyuncu: Klavye (P1 Polis) + Gamepad (P2 Hırsız)
- [x] Gerçek split-screen ve bağımsız takip kameraları
- [x] Low-poly şehir blokları + gökyüzü ortamı

## Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

## Kontroller

| Oyuncu | Rol | Giriş | Hareket | Koş | Aksiyon | Etkileşim |
|--------|-----|-------|---------|-----|---------|-----------|
| P1 | Polis | Klavye | WASD | Shift | Space | E |
| P2 | Hırsız | Gamepad | Sol stick | RB (5) | A (0) | X (2) |

**Geliştirici:** `Ctrl+Alt+Shift+I` — Babylon Inspector

## Proje Yapısı

```
src/
  core/           Game, EventBus, ServiceContainer
  engine/         EngineBootstrap, PhysicsManager, AssetManager, DevTools
  input/          KeyboardInput, GamepadInput, InputMapping
  characters/     Character, CharacterMovement
  players/        Player, PlayerController
  ui/             SplitScreenUI
  config/         game.ts, engine-config.ts, controls.ts
```

## Mimari Kararı

Tam bp900 şablonu yerine **hibrit yaklaşım** kullanıldı:

- bp900'dan: WebGPU bootstrap, Havok hazırlığı, GLB pipeline, Inspector/FPS
- Özel: Split-screen, çift oyuncu input abstraction, oyun modülleri

Bu sayede Milestone 2+ (animasyon, fizik, NPC, vaka sistemi) bp900 altyapısı üzerinde büyüyebilir.

## Sonraki Adımlar (Milestone 2)

- GLB karakter modelleri ve animasyon state machine
- Havok physics ile karakter çarpışması
- Genişletilmiş şehir ve AssetManager entegrasyonu
