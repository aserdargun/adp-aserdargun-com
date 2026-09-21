# ADP eğitim modeli v1

ADP, tarayıcıda çalışan bir öğrenme laboratuvarıdır. Gerçek model eğitmez; ağırlık, GPU işi, model yanıtı veya ölçülmüş benchmark üretmez. JSON çıktısı simülasyon kaydıdır; kullanılabilir bir model kontrol noktası değildir.

[English specification](educational-model.md)

## Kanıt türleri

- **Hesaplanan:** Eğitim profili ve kullanıcı girdilerinden belirlenimci aritmetik.
- **Tahmini:** Açık varsayımlara bağlı bellek ve kaynak hesabı.
- **Sentetik / simüle:** Kurgulanmış eğri, skor, olay ve davranış.
- **Kullanıcı girdisi:** Yapılandırma ve tohum değeri.
- **Doğrulanmış kaynak:** Atıf yapılan birincil yayın; ADP sayılarının doğrulanması değildir.
- **Ölçülmüş:** Gelecekteki gerçek yürütme bağlantıları için ayrılmıştır; bu sürümde ölçülmüş sonuç yoktur.

## Parametreler

W boyutu [d_out, d_in], A boyutu [r, d_in], B boyutu [d_out, r] olur. Standart LoRA için etkin ağırlık W + (α/r)BA biçimindedir. ADP, α/r oranını 1 tutar ve bunun kalite etkisini modellemez. Her seçili izdüşüm, her transformer katmanında r(d_in + d_out) eğitilebilir parametre ekler. Adaptör yöntemlerinde bias veya çıkış başlığı eğitilmez. Full FT tüm temel parametreleri günceller; adaptör eklemez. Eğitilebilir yüzde, temel ve adaptör parametrelerinin toplamına göre hesaplanır.

1/3/7/14/32/70B profilleri yuvarlatılmış bütçeler ve temsili boyutlar kullanır; belirli bir modelin mimarisi değildir. Q/K/V/O kare, MLP up/down dikdörtgen kabul edilir. GQA ve kapılı MLP modellenmez. Profil kaynağı ADP’dir; mimari doğrulama tarihi yoktur.

## Bellek

GiB = 2^30 bayt. Temel ağırlık belleği = parametre × gösterim biti / 8. BF16 ve FP16 burada 2, FP32 4 bayttır. QLoRA’nın donmuş temeli 4 bit ve parametre başına temsili 0,127 bit meta veri kullanır; hesaplama ve adaptörler seçili 16/32-bit hassasiyette kalır. NF4 çekirdekleri, çift kuantizasyon ve sayfalı optimizer uygulanmaz. Bu, QLoRA makalesinin tam yeniden üretimi değildir.

Eğitilebilir parametre başına gradyan 4 bayt, Adam’ın iki momenti 8 bayttır. 16-bit eğitim varsayımında FP32 ana kopya için 4 bayt daha ayrılır; FP32’de ek ana kopya yoktur. Donmuş parametreler için gradyan, optimizer durumu veya ana kopya ayrılmaz.

Aktivasyon baytı = mikro yığın × dizi uzunluğu × gizli boyut × katman sayısı × hesaplama baytı × 8 × kontrol noktası çarpanı. Çarpan, gradyan kontrol noktaları açıkken 0,3; kapalıyken 1’dir. Katsayılar eğitim amaçlı varsayımlardır, ölçümden türetilmez. S² dikkat matrisi oluşturmayan, belleği verimli kullanan dikkat varsayılır. Çalışma alanı = 1 GiB + diğer bileşenlerin %5’i. Sharding, offload, bellek parçalanması ve iletişim tamponları dahil değildir. Tahmine sığmak, donanım uyumluluğunu veya işlem hızını kanıtlamaz.

## Veri ve iş yükü

Kurgusal veri %80 eğitim, %10 doğrulama, %10 test olarak ayrılır. Temsili örnekler aynı soru şablonlarını farklı vaka kimlikleriyle kullanır; ayrı kimlikler anlamsal bağımsızlık kanıtı değildir. Tekrarlar eğitim bölümünde tutulur. Filtreler yalnız eğitim satırlarını değiştirir; doğrulama ve test bankaları sabittir. Kasıtlı sızıntı, test kimliklerinin %20’sini eğitime kopyalar ve kabul kapısını başarısız kılar.

Gürültü, çelişki, ilgisizlik, eksik hedef, benzersiz çeşitlilik, zorluk ve beş görevdeki kapsam ayrı özelliklerdir. Temizleme hem boyutu hem kapsamı değiştirebilir. Çelişki filtresi yalnız kurguda işaretlenmiş satırları kaldırır; gerçek veride tüm çelişkileri bulduğu iddia edilmez.

Her örnek için temsili ortalama uzunluk 2048 tokendır. Hesaplanan token maruziyeti = hazırlanmış eğitim satırı × min(2048, dizi sınırı) × epoch. Dizi sınırının ortalamayı aşması bilgi eklemez; aktivasyon tahmini yine seçili sınırı ayırır. Gerçek tokenizer yoktur; arayüzdeki sözcük parçaları token kimlikleri değildir.

Bir epoch eğitim bölümünü bir kez dolaşır. Tek cihazda etkin yığın = mikro yığın × birikim adımı. Son kısmi yığın/güncelleme hesaba katılır. Gradyan birikimi güncelleme sayısını değiştirir; bellekteki aktivasyonları birikim sayısıyla çarpmaz.

## Sentetik öğrenme modeli

Tohum, sınırlı ve tekrarlanabilir sapma üretir. Rank ve model boyutu kaynak hesabını etkiler; gerçek kalite tahmini sağlamaz. Başlangıç skorları görev 54, alan 48, talimat 70, biçim 72, ayrılmış veri 55, alan dışı yetenek koruma 82’dir. Bunlar kurgusal 0–100 ölçeğindedir.

Formüllerde e=epoch, c=ortalama görev kapsamı, n=gürültü, k=çelişki, i=ilgisizlik, m=eksik hedef, d=zorluk:

- Maruziyet x = 1 − exp(−e × oran); düşük öğrenme oranında oran=0,08, diğerlerinde 0,8.
- Aşırı uyum o = max(0, e − (3 − 3k)).
- Kazanç g = 32x(1−n)(1−k)(1−i)(0,6+0,4c)(1−0,15d).
- Tohum sapması j ±0,75 ile sınırlıdır. Yüksek öğrenme oranında u=16, diğerlerinde 0.
- Görev = 54 + 0,8g − 1,5o − u + j.
- Alan = 48 + g − 1,7o − u + j.
- Talimat = 70 + 0,35g − 20k − u.
- Biçim = 72 + 18x − 28n − 60m − 15k − u.
- Sızıntısız ayrılmış veri = 55 + 0,8g − 3,1o − 15(1−c) − u + j.
- Yetenek koruma = 82 − [9(1−c) + 1,1o + (Full FT için 3,5; adaptör için 1,5) + 10k].

Skorlar 0–100 aralığına sınırlanır. Sızıntı, gösterilen ayrılmış veri skoruna 12 puan ekler; sonuç en fazla 100 olur. Sızıntısız karşılık ayrıca gösterilir ve kapı her durumda başarısız olur. Boyutlar ortak terimler kullanır; istatistiksel bağımsızlık iddiası yoktur. Eğriler üstel azalma, geç aşırı uyum ve tohum sapması kullanır; kesin uygulama `src/core/evaluation.ts` içindedir. Rank değişimi bu sürümde sentetik kaliteyi değiştirmez.

## Olaylar ve hesap birimleri

Oynatım bir epoch’u en fazla 12 temsili güncelleme grubuna sıkıştırır: yığın → ileri geçiş → kayıp → geri yayılım → optimizer adımı. Sayılar son kısmi gruplar dahil yapılandırılmış tüm mikro yığın ve güncellemeleri kapsar. Sentetik adım GPU süresi değildir. Eğriler optimizer olaylarıyla ilerler; değerlendirme ayrı eylemdir. Ayar değişimi etkin deneyi geçersiz kılar; kaydedilen karşılaştırmalar eski ayarlarını korur.

Hesap indeksi = milyon eğitim tokenı × model/7B × yöntem çarpanı (Full FT 3, LoRA 2, QLoRA 2,3) × kontrol noktası çarpanı (açıkken 1,3; kapalıyken 1). Birimler kurgusaldır; FLOP, gecikme, para veya ölçülmüş hız değildir.

## Kabul sözleşmesi

Alan kazancı ≥8 puan, biçim ≥80, ayrılmış veri ≥65, yetenek kaybı ≤5 ve sızıntı olmaması gerekir. Altı başlangıç ve uyarlanmış skorun tamamı sayısal, sonlu ve 0–100 aralığında olmalıdır. Bütünlük sonucu açıkça sızıntı olmadığını bildirmelidir. Tamamlanmış eğitim hazır model anlamına gelmez. Geçen sonuç yalnız bu sentetik sözleşmenin sağlandığını gösterir. Gerçek projede geliştirme sonrası yeni, bağımsız son test gerekir.

## Öğrenme sistemindeki yeri

[aserdargun.com](https://aserdargun.com/tr/) içindeki USL kuramsal temeli, ADP uyarlama deneylerini, EVL değerlendirme sözleşmesini, DCL dağıtım seçimini, TFL model sunumunu, GEX yürütmeyi ele alır. Olağan bağlantılar yalnız dili taşır. Açık DCL aktarımı 7B/14B profillerinde model sınıfını, yöntemi, temel hassasiyetini, dizi uzunluğunu, tahmini eğitim belleğini ve kaynak/dönüş referanslarını URL’ye koyar. DCL ayrı çıkarım karşılaştırması ister; eğitim belleğini çıkarım belleği saymaz. Ağırlık, veri kaydı, skor veya olay izi taşınmaz.

## Birincil kaynaklar — kontrol: 2026-09-21

- Hu ve diğerleri, [LoRA](https://arxiv.org/abs/2106.09685): donmuş temel ağırlıklara düşük ranklı eğitilebilir güncellemeler.
- Dettmers ve diğerleri, [QLoRA](https://arxiv.org/abs/2305.14314): donmuş kuantize temel üzerinden adaptörlere geri yayılım.
- Hugging Face, [GPU bellek kullanımı](https://huggingface.co/docs/transformers/model_memory_anatomy): ağırlıklar, gradyanlar, optimizer durumları, aktivasyonlar ve geçici tahsisler.

Kaynaklar kavramları destekler; ADP’nin genel profillerini, sentetik skorlarını veya katsayılarını doğrulamaz.
