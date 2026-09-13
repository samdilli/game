# Asset Yol Haritası — CC0 Karakter Paketleri

Oyun **otomatik olarak** mevcut paketleri algılar. Öncelik:

1. **Quaternius Universal Base Characters** (Regular_Male / Regular_Female)
2. **Kenney Mini Characters** (repo'ya dahil — hemen çalışır)
3. **Quaternius Mannequin + UAL2** (animasyon kütüphanesi)
4. Capsule placeholder

---

## Repo'ya dahil (CC0)

| Paket | Lisans | Path | Rol |
|-------|--------|------|-----|
| [Kenney Mini Characters](https://kenney.nl/assets/mini-characters) | CC0 | `characters/kenney/character-male-a.glb` | Polis |
| Kenney | CC0 | `characters/kenney/character-female-a.glb` | Hırsız |
| Kenney | CC0 | `characters/kenney/character-*-b/c.glb` | NPC çeşitliliği |
| [Quaternius UAL2 Standard](https://quaternius.itch.io/universal-animation-library-2) | CC0 | `animations/quaternius/UAL2_Standard.glb` | Quaternius rig animasyonları |
| Quaternius UAL2 | CC0 | `characters/quaternius/Mannequin_F.glb` | UBC yokken geçici mesh |

Lisans metinleri: `public/assets/licenses/`

---

## İsteğe bağlı — Quaternius Universal Base Characters

En iyi görünüm için (Kenney yerine veya üstünde):

| Dosya | Kaynak | Hedef path |
|-------|--------|------------|
| Regular_Male.glb | [itch.io](https://quaternius.itch.io/universal-base-characters) | `characters/quaternius/Regular_Male.glb` |
| Regular_Female.glb | aynı paket | `characters/quaternius/Regular_Female.glb` |

Root motion **kapalı** UAL2 sürümü kullanın. UBC eklenince UAL2 animasyonları otomatik merge edilir.

---

## Paketleri yeniden indir

```bash
npm run fetch-assets
```

OpenGameArt üzerinden Kenney + Quaternius UAL2 zip'lerini indirir.

---

## Milestone 6 — Dünya

| Asset | Path |
|-------|------|
| Quaternius Modular City | `world/quaternius/Building_Small.glb` |

---

## Lisans özeti

- **Kenney** — CC0, credit opsiyonel (kenney.nl)
- **Quaternius** — CC0, ticari kullanım serbest
