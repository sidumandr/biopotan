# biopotan protokolü – Sürüm 1

Bu belge, cihaz (ESP32) ile arayüz (web) arasında gidip gelen ikili paketlerin
formatını tanımlar. **Tek doğruluk kaynağı bu belgedir:** TypeScript ve C++
kodları bu belgeye göre yazılır. Belge ile kod çelişirse kod yanlıştır.

## Kısaca

Bir paketi bir kargo kutusu gibi düşün:

1. **Kutunun üstündeki etiket (ortak başlık):** "Bu bir biopotan paketi, sürümü
   şu, türü şu, sıra numarası şu, içinde şu kadar bayt var."
2. **İçerik listesi (kanal tanımlayıcıları):** "İçeride şu kanallar var; her
   birinin modu, örnekleme hızı ve kaç örnek olduğu şu."
3. **İçerik (veri):** Örneklerin kendisi, kanal kanal sırayla.

Alıcı önce etiketi okur, sonra listeyi, sonra listeye bakarak içeriği doğru
yerlerden keser.

## Genel kurallar

| Kural | Değer |
| --- | --- |
| Bayt sırası | **Little-endian** (düşük anlamlı bayt önce). Tüm çok baytlı alanlar için geçerli. |
| Kayan nokta | IEEE 754, 32 bit (`float32`) |
| Örnek birimi | **Mikrovolt (µV)**, elektrottaki gerilim. Kazanç dönüşümünü cihaz yapar. |
| Hizalama | Her bölümün boyutu 4'ün katıdır; veri bölümü her zaman 4 baytlık sınırda başlar. |
| Ayrılmış alanlar | `reserved` alanlar gönderilirken 0 yazılır, okunurken yok sayılır. |
| Taşıma | WebSocket ikili mesajı; bir mesaj = bir paket. |

Not: JavaScript'te `DataView` varsayılan olarak big-endian okur. Her okuma ve
yazmada `littleEndian` parametresi `true` verilmelidir.

## Paketin genel yapısı

```
+-------------------+----------------+---------------------------+----------------------+
| Ortak başlık      | Alt başlık     | Kanal tanımlayıcıları     | Veri                 |
| 12 bayt           | 4 bayt         | 12 bayt x kanal sayısı    | 4 bayt x örnek sayısı|
+-------------------+----------------+---------------------------+----------------------+
```

## 1. Ortak başlık (12 bayt)

Her paket türünde aynıdır.

| Konum | Boyut | Alan | Tür | Açıklama |
| --- | --- | --- | --- | --- |
| 0 | 2 | `magic` | 2 × uint8 | Sabit `0x42 0x50` (ASCII `"BP"`). Paketin başını tanımak için. |
| 2 | 1 | `version` | uint8 | Protokol sürümü. Bu belge için `1`. |
| 3 | 1 | `type` | uint8 | Paket türü (aşağıdaki tablo). |
| 4 | 4 | `seq` | uint32 | Sıra numarası. Gönderen her pakette 1 artırır; 2³²−1'den sonra 0'a döner. |
| 8 | 2 | `payloadLength` | uint16 | Ortak başlıktan sonra gelen bayt sayısı. |
| 10 | 2 | `reserved` | uint16 | 0. |

### Paket türleri

| Değer | Ad | Yön | Durum |
| --- | --- | --- | --- |
| 1 | `SAMPLES` | Cihaz → arayüz | Tanımlı (bu belge) |
| 2 | `FEATURES` | Cihaz → arayüz | İleride (bant güçleri, EMG zarfı, BPM) |
| 16 | `COMMAND` | Arayüz → cihaz | İleride (mod seçme, kayıt başlat/durdur) |

## 2. SAMPLES paketi

### 2.1 Alt başlık (4 bayt)

| Konum | Boyut | Alan | Tür | Açıklama |
| --- | --- | --- | --- | --- |
| 12 | 1 | `channelCount` | uint8 | Paketteki kanal sayısı (en az 1). |
| 13 | 3 | `reserved` | 3 × uint8 | 0. |

### 2.2 Kanal tanımlayıcıları (her kanal için 12 bayt)

Alt başlıktan hemen sonra, `channelCount` adet, art arda gelir. *i*. kanalın
tanımlayıcısı `16 + 12 × i` konumunda başlar.

| Göreli konum | Boyut | Alan | Tür | Açıklama |
| --- | --- | --- | --- | --- |
| 0 | 1 | `channelId` | uint8 | Kanal numarası (0, 1, 2…). |
| 1 | 1 | `mode` | uint8 | Ölçüm modu (aşağıdaki tablo). |
| 2 | 1 | `flags` | uint8 | Durum bitleri (aşağıdaki tablo). |
| 3 | 1 | `reserved` | uint8 | 0. |
| 4 | 2 | `sampleRate` | uint16 | Örnekleme hızı, Hz. 0 olamaz. |
| 6 | 2 | `sampleCount` | uint16 | Bu pakette bu kanala ait örnek sayısı. |
| 8 | 4 | `firstSampleIndex` | uint32 | Bu paketteki ilk örneğin, kanalın ölçüm başından beri kaçıncı örneği olduğu. |

#### Modlar

| Değer | Ad | Açıklama |
| --- | --- | --- |
| 0 | `TEST` | Sentetik / test sinyali |
| 1 | `EMG` | Kas sinyali |
| 2 | `ECG` | Kalp sinyali (EKG) |
| 3 | `EEG` | Beyin sinyali |

#### Bayraklar (`flags`)

| Bit | Ad | Anlamı |
| --- | --- | --- |
| 0 | `SATURATED` | Bu paketteki örneklerden en az biri ADC sınırına dayandı. |
| 1–7 | — | Ayrılmış, 0. |

### 2.3 Veri

Tanımlayıcılardan hemen sonra başlar. Örnekler **kanal kanal** (planar) dizilir:
önce 0. tanımlayıcıdaki kanalın tüm örnekleri, sonra 1.'ninkiler, vb. Her örnek
bir `float32`'dir (µV).

Kanalların örnek sayıları farklı olabilir (ör. EEG 250 Hz, EMG 1000 Hz aynı
pakette). Bu yüzden örnekler iç içe (interleaved) değil, planar dizilir.

### 2.4 Zaman

Bir örneğin zamanı, saat bilgisiyle değil örnek indeksiyle belirlenir:

```
zaman (saniye) = (firstSampleIndex + k) / sampleRate
```

Burada *k*, örneğin paket içindeki sırasıdır (0'dan başlar). Bir kanalın ardışık
iki paketinde `ikinci.firstSampleIndex` = `birinci.firstSampleIndex + birinci.sampleCount`
olmalıdır; değilse arada örnek kaybolmuştur.

### 2.5 Boyut

```
payloadLength = 4 + 12 × channelCount + 4 × (tüm kanalların sampleCount toplamı)
toplam boyut  = 12 + payloadLength
```

## 3. Alıcının yapması gereken kontroller

Çözücü (decoder) bir paketi kabul etmeden önce şunları kontrol eder; herhangi
biri başarısız olursa paket reddedilir ve hata bildirilir:

1. Toplam boyut en az 12 bayt.
2. `magic` = `0x42 0x50`.
3. `version` = 1. (Bilinmeyen sürüm okunmaya çalışılmaz.)
4. `type` bilinen bir değer.
5. `12 + payloadLength` = gelen toplam bayt sayısı.
6. SAMPLES için: `channelCount` ≥ 1, her `sampleRate` > 0, `mode` bilinen bir
   değer ve 2.5'teki boyut formülü tutuyor.

Paket kaybı (`seq` atlaması) hata değildir; paket yine işlenir, kayıp ayrıca
raporlanır.

## 4. Test vektörü

Aşağıdaki 36 bayt, şu içeriğe sahip SAMPLES paketidir:
`seq = 7`, tek kanal, `channelId = 0`, `mode = EEG`, `flags = 0`,
`sampleRate = 250`, `firstSampleIndex = 1000`, örnekler `[1.0, -0.5]`.

```
42 50 01 01  07 00 00 00  18 00 00 00
01 00 00 00
00 03 00 00  FA 00 02 00  E8 03 00 00
00 00 80 3F  00 00 00 BF
```

Satır satır açıklama:

| Baytlar | Alan | Değer | Neden |
| --- | --- | --- | --- |
| `42 50` | magic | "BP" | ASCII B = 0x42, P = 0x50 |
| `01` | version | 1 | |
| `01` | type | SAMPLES | |
| `07 00 00 00` | seq | 7 | Little-endian: küçük bayt önce |
| `18 00` | payloadLength | 24 | 0x18 = 24 = 4 + 12 + 2 × 4 |
| `00 00` | reserved | 0 | |
| `01` | channelCount | 1 | |
| `00 00 00` | reserved | 0 | |
| `00` | channelId | 0 | |
| `03` | mode | EEG | |
| `00` | flags | 0 | |
| `00` | reserved | 0 | |
| `FA 00` | sampleRate | 250 | 250 = 0x00FA, little-endian'da FA 00 |
| `02 00` | sampleCount | 2 | |
| `E8 03 00 00` | firstSampleIndex | 1000 | 1000 = 0x000003E8 |
| `00 00 80 3F` | örnek 0 | 1.0 | IEEE 754'te 1.0 = 0x3F800000 |
| `00 00 00 BF` | örnek 1 | −0.5 | IEEE 754'te −0.5 = 0xBF000000 |

Her iki tarafın kodlayıcısı bu nesneden tam olarak bu baytları üretmeli,
çözücüsü de bu baytlardan aynı nesneyi geri çıkarmalıdır.

## 5. Sürümleme

- Mevcut bir alanın anlamı, konumu ya da boyutu değişirse `version` artırılır.
- Yeni bir paket türü eklemek ya da bir `reserved` alana anlam vermek (eski
  alıcıların onu yok saymasının sorun yaratmadığı durumda) sürüm artırmayı
  gerektirmez; bu belgeye not düşülür.
- Alıcı, bilmediği sürümdeki paketi okumaya çalışmaz, reddeder.