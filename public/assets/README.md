# Asset Yol Haritası — Ne Zaman Ne Gerekir?

Bu dosya **hangi asset'in hangi milestone'da ihtiyaç olduğunu** listeler. Quaternius yokken oyun **capsule placeholder** modeller kullanır (ölçek garantili). Quaternius ekleyince otomatik GLB'ye geçer.

---

## ✅ Şimdi (isteğe bağlı — görsel kalite)

| Asset | Kaynak | Hedef path | Neden |
|-------|--------|------------|-------|
| Universal Base Characters [Standard] | [itch.io](https://quaternius.itch.io/universal-base-characters) | `public/assets/characters/quaternius/Regular_Male.glb` | İnsan karakterler (polis/hırsız/NPC) |
| UAL2 [Standard, root motion **kapalı**] | [itch.io](https://quaternius.itch.io/universal-animation-library-2) | `public/assets/animations/quaternius/UAL2_Standard.glb` | Yürüme/koşma/tutuklama animasyonları |

> İkinci karakter modeli (hırsız farklı görünsün): `Regular_Male.glb` yanına `Regular_Female.glb` veya farklı proportion eklenebilir — kod bunu Milestone 4+ ile destekleyecek.

**Şimdilik zorunlu değil.** Ekleyince otomatik devreye girer.

---

## Milestone 4 (şu an — yeni asset gerekmez)

Tutuklama + polis vs hırsız modu mevcut GLB + `E` etkileşimi ile çalışır.

İsteğe bağlı UAL2 clip'leri (yüklemişsen eşleşir):
- `Arrest`, `Surrender`, `Hands Up` — yoksa idle/walk kullanılır

---

## Milestone 5–6 (procedural vaka + yaşayan şehir)

| Asset | Ne zaman | Path önerisi |
|-------|----------|--------------|
| UAL2 tam paket | NPC animasyon çeşitliliği artınca | zaten yukarıda |
| Quaternius City / Modular City | Milestone 6 — prosedürel kutular yerine gerçek binalar | `public/assets/world/quaternius/` |
| Police equipment props | Milestone 6 polish | `public/assets/props/` |

---

## Milestone 7+ (ileride)

| Asset | Ne zaman |
|-------|----------|
| Araç GLB'leri (polis araba, sivil araba) | Araç sistemi implement edilince |
| Ses paketleri (SFX, ambient) | AudioManager polish |
| KTX2/Basis dokular | Performans optimizasyonu |

---

## Kurulum özeti (Quaternius)

```text
public/assets/
  characters/quaternius/Regular_Male.glb
  animations/quaternius/UAL2_Standard.glb
```

Root motion **kapalı** UAL2 sürümünü kullan. Detay: yukarıdaki itch.io linkleri.

## Lisans

Quaternius paketleri **CC0**.
