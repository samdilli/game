# Polis Şehri — Browser 3D Split-Screen Game

Baba-oğul için tarayıcı tabanlı, low-poly polis/hırsız split-screen oyunu.

## Teknoloji

- **Babylon.js** — 3D motor (bp900 iskeletinden esinlenen engine katmanı)
- **TypeScript + Vite**
- **WebGPU** öncelikli, **WebGL2** yedek
- **Havok Physics** altyapısı hazır (Milestone 2'de aktif)
- **glTF/GLB** yükleme altyapısı (`AssetManager`)

## Milestone 5 (Mevcut)

- [x] **Procedural vaka üretici** — rastgele olay yeri + kaçış hedefi, süre ve brifing
- [x] Olay yeri inceleme hedefi (polis)
- [x] Dünya işaretleri (kırmızı olay yeri, yeşil saklanma noktası)
- [x] HUD pusula okları (polis → hırsız, hırsız → kaçış)
- [x] 3-2-1 geri sayım + vaka brifingi
- [x] Son 45 sn escalation uyarısı
- [x] Vaka bazlı spawn (polis olay yerinde, hırsız kaçış yönünde)

## Milestone 4

- [x] **Polis vs Hırsız** oyun modu
- [x] Vaka sistemi (hedefler, süre, kazanma/kaybetme)
- [x] Tutuklama: yakın mesafe + E basılı tut + progress bar
- [x] Hırsız kazanır: saklanma noktasına ulaş veya süre dolsun
- [x] Polis kazanır: tutuklamayı tamamla

## Milestone 3

- [x] Deterministik şehir + semantic POI'ler (polis merkezi, park, market, saklanma noktası…)
- [x] A* grid navigasyon + path follower (stuck detection, yeniden rota)
- [x] NPC: perception (görüş + işitme + line-of-sight), memory, state machine
- [x] 6 sivil (POI devriyesi, tehditte kaçış) + 1 şüpheli NPC (suç → kaçış → saklanma)
- [x] LOD simulation (yakın/orta/uzak tick aralıkları)
- [x] EventBus: `NPCWitnessedCrime`, `NPCCalledPolice`, `SuspectSeen`…

## Milestone 2

- [x] GLB asset pipeline (`AssetManager`, `CharacterFactory`)
- [x] Quaternius UAL2 animasyon eşleme altyapısı (`config/animations.ts`)
- [x] Hız tabanlı animasyon state machine + blend
- [x] Havok physics (statik zemin + karakter capsule)
- [x] Dev fallback: `CesiumMan.glb` (Quaternius yokken)
- [x] Asset doğrulama (GLB magic byte — Vite HTML fallback koruması)

## Quaternius Asset Kurulumu

Detaylar: `public/assets/README.md`

1. [Universal Base Characters](https://quaternius.itch.io/universal-base-characters) → `public/assets/characters/quaternius/Regular_Male.glb`
2. [Universal Animation Library 2](https://quaternius.itch.io/universal-animation-library-2) → `public/assets/animations/quaternius/UAL2_Standard.glb`

Root motion **kapalı** sürümü tercih edin.

## Milestone 1

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
  navigation/    NavigationGrid, NavigationManager, PathFollower
  npc/           NPCBrain, NPCPerception, NPCMemory, NPCManager
  world/         CityBuilder, CityData (POI + semantic zones)
```

## Mimari Kararı

Tam bp900 şablonu yerine **hibrit yaklaşım** kullanıldı:

- bp900'dan: WebGPU bootstrap, Havok hazırlığı, GLB pipeline, Inspector/FPS
- Özel: Split-screen, çift oyuncu input abstraction, oyun modülleri

Bu sayede Milestone 2+ (animasyon, fizik, NPC, vaka sistemi) bp900 altyapısı üzerinde büyüyebilir.

## Sonraki Adımlar (Milestone 6)

- Living city (gün/gece, hava)
- Quaternius City kit entegrasyonu
- Ses ve görsel polish
