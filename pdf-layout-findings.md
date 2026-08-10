# PDF yerleşim inceleme notları

Şablon `/tmp/sablon.pdf`, örnek `/tmp/ornek.pdf` olarak görsel karşılaştırıldı.

Görülen sorunlar:

- Üst başlık alanı gereğinden fazla beyaz dikdörtgenle kapatılmış; başlık ve üst bilgi metinleri üstteki talimat bölgesine taşmış.
- Lokasyon ve plaka bilgileri tablo başlığının hemen üstünde, yanlış yükseklikte yer alıyor; şablonun başlık/üst bilgi hücrelerine yazılmalı.
- Tarih ve plaka verileri tablo başlıklarının üzerine taşıyor. Örnek çıktıda `10.08.2026` ve `404` başlıklarla çakışıyor.
- İlk veri satırı için kullanılan `rowTop = 137` çok erken; veri metinleri kontrol başlıkları/başlık satırlarıyla çakışıyor.
- İlk veri satırında bazı alanlar doğru sütunlara yakın olsa da tarih, plaka ve kontrol alanları hücre sınırlarını bozuyor.
- Satır yüksekliği ve satır başlangıçları şablondaki gerçek boş veri satırlarıyla eşleşmiyor. Görsel şablonda tablo başlığının altındaki ilk boş satır yaklaşık y=230 px civarında başlıyor; PDF point koordinatıyla daha aşağı bir `top` değeri gerekiyor.
- `coverCell` ile arka planı beyaza boyamak çizgileri/zemin hücre renklerini kısmen bozuyor. Veri alanlarında beyaz kaplama yerine yalnızca metnin mevcut boş hücrelere yazılması veya küçük, hücre içi kaplama kullanılmalı.
- Kontrol kutularının üzerine ayrıca kontrol metni yazmak mevcut şablon kutularını bozuyor; kontrol sütunlarına ekstra yazı eklenmemeli.
