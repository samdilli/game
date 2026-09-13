# Asset Kurulumu (Quaternius CC0)

Bu oyun **dış asset paketleri** ile büyütülmek üzere tasarlandı. Önerilen kaynaklar:

## 1. Universal Base Characters (karakter modeli)

1. https://quaternius.itch.io/universal-base-characters adresinden **Universal Base Characters [Standard].zip** indirin (ücretsiz).
2. ZIP içinden bir GLB seçin (ör. `Regular_Male.glb`).
3. Şuraya kopyalayın:

```
public/assets/characters/quaternius/Regular_Male.glb
```

## 2. Universal Animation Library 2 (animasyonlar)

1. https://quaternius.itch.io/universal-animation-library-2 adresinden **Universal Animation Library 2 [Standard].zip** indirin.
2. **Root motion kapalı** sürümü tercih edin (oyunda hareket kodu root motion uygular).
3. Godot/Unreal GLB export'unu şuraya kopyalayın:

```
public/assets/animations/quaternius/UAL2_Standard.glb
```

> Animasyon isimleri `src/config/animations.ts` içinde eşleştirilir (Idle, Walk, Run, Sprint…).

## Dev fallback

Quaternius dosyaları yokken oyun otomatik olarak Khronos `CesiumMan.glb` kullanır:

```
public/assets/characters/dev/CesiumMan.glb
```

Quaternius dosyalarını ekledikten sonra yeniden yükleyin — polis/hırsız modelleri otomatik geçer.

## Lisans

Quaternius paketleri **CC0** — ticari ve kişisel projelerde serbest.
