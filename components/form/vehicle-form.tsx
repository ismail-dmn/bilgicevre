'use client';

import { useState } from 'react';
// Kullanmakta olduğunuz UI kütüphanesi bileşenleri veya HTML form tagleri

export default function VehicleForm() {
  const [isLoading, setIsLoading] = useState(false);

  // Form verileriniz (react-hook-form kullanıyorsanız handleSubmit içine ekleyin)
  const onSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Dosya indirilemedi');
      }

      // Dosyayı Blob (ikili veri) olarak alıyoruz
      const blob = await response.blob();

      // Dosyayı tarayıcıda indirmek için geçici bir link oluşturuyoruz
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Arac_Kullanim_${new Date().getTime()}.xlsx`; // Dosya adı
      document.body.appendChild(a);
      a.click();

      // Temizlik
      a.remove();
      window.URL.revokeObjectURL(url);

      alert("Form başarıyla Excel olarak indirildi!");

    } catch (error) {
      console.error("Hata:", error);
      alert("Form gönderilirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); /* form data alma işlemleri */ }}>
      {/* Form Alanlarınız (Sürücü Adı, Plaka vs.) */}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'İndiriliyor...' : 'Gönder ve İndir'}
      </button>
    </form>
  );
}