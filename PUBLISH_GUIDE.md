# Panduan Publish Extension ke Chrome Web Store

## Persiapan

### 1. Pastikan Semua File Lengkap

Extension ini sudah memiliki:
- ✅ `manifest.json` - Konfigurasi extension
- ✅ `content.js` - Script utama
- ✅ `popup.html` & `popup.js` - Popup interface
- ✅ `icons/` - Icon extension (16x16, 48x48, 128x128)

### 2. Update Informasi di manifest.json

Pastikan informasi berikut sudah benar:
- **name**: Nama extension (maks 45 karakter)
- **version**: Versi extension (format: X.Y.Z)
- **description**: Deskripsi singkat (maks 132 karakter)

### 3. Buat File ZIP

**PENTING**: Hanya sertakan file yang diperlukan, JANGAN sertakan:
- ❌ File development (`.git/`, `node_modules/`, dll)
- ❌ File temporary atau backup
- ❌ File dokumentasi yang tidak diperlukan

**File yang HARUS disertakan:**
- ✅ `manifest.json`
- ✅ `content.js`
- ✅ `popup.html`
- ✅ `popup.js`
- ✅ `icons/` (folder dengan semua icon)
- ✅ File lain yang direferensikan di manifest

**Cara membuat ZIP:**
```bash
# Di terminal, masuk ke folder extension
cd /home/aryand/secret/project/penelitian/adminer-ext

# Buat ZIP (exclude file yang tidak perlu)
zip -r adminer-table-copy.zip \
  manifest.json \
  content.js \
  popup.html \
  popup.js \
  icons/ \
  -x "*.git*" "*.md" "*.txt" "*create-icons*" "*generate-icons*" "*adminer-detection.js" "*data-extraction.js" "*utils.js"
```

Atau gunakan script `prepare-publish.sh` yang sudah disediakan.

## Langkah-langkah Publish

### Langkah 1: Daftar Chrome Web Store Developer

1. Buka: https://chrome.google.com/webstore/devconsole
2. Login dengan Google Account
3. Bayar **one-time fee $5 USD** (untuk developer account)
4. Isi informasi developer (nama, alamat, dll)

### Langkah 2: Upload Extension

1. Klik **"New Item"** di dashboard
2. Upload file ZIP yang sudah dibuat
3. Tunggu proses upload selesai

### Langkah 3: Isi Store Listing

#### Informasi Dasar:
- **Name**: Adminer Table Copy (atau nama yang diinginkan)
- **Summary**: Deskripsi singkat (132 karakter)
  - Contoh: "Copy data tabel dari Adminer dengan format rapi, filter kolom, dan preview data"
- **Description**: Deskripsi lengkap (maks 16,000 karakter)

  **Template Description:**
  ```
  Adminer Table Copy adalah extension yang memudahkan Anda untuk menyalin data tabel dari Adminer dengan format yang rapi dan terstruktur.

  Fitur Utama:
  ✨ Copy data tabel dengan format rapi
  ✨ Filter kolom yang ingin di-copy
  ✨ Preview data sebelum copy
  ✨ Support untuk data panjang (JSON, array, object)
  ✨ Expand/collapse untuk data yang panjang
  ✨ Copy individual value dari preview
  ✨ Hide/show kolom untuk tampilan yang lebih bersih

  Cara Penggunaan:
  1. Buka halaman Adminer dengan tabel data
  2. Extension akan otomatis menambahkan tombol "Copy" dan "Preview" di setiap row
  3. Klik "Preview" untuk melihat detail data
  4. Pilih kolom yang ingin di-copy
  5. Klik "Copy Selected" untuk menyalin data

  Catatan:
  - Extension ini hanya bekerja di halaman Adminer
  - Tidak mengirim data ke server eksternal
  - Semua proses dilakukan di browser Anda
  ```

#### Kategori:
- **Category**: Productivity (atau sesuai kategori)
- **Language**: Indonesian (atau English)

#### Icon & Screenshot:
- **Icon**: Upload icon 128x128 (sudah ada di `icons/icon128.png`)
- **Screenshots**: 
  - Minimal 1 screenshot (1280x800 atau 640x400)
  - Maksimal 5 screenshot
  - Screenshot harus menunjukkan extension bekerja

#### Privacy:
- **Privacy Policy**: 
  - Jika extension tidak mengumpulkan data, bisa gunakan:
    "Extension ini tidak mengumpulkan, menyimpan, atau mengirim data ke server eksternal. Semua proses dilakukan secara lokal di browser Anda."
  - Atau buat halaman privacy policy sederhana

#### Informasi Tambahan:
- **Website**: (opsional) URL website jika ada
- **Support Email**: Email untuk support
- **Single Purpose**: Ya (extension hanya untuk Adminer)

### Langkah 4: Submit untuk Review

1. Klik **"Submit for Review"**
2. Tunggu proses review (biasanya 1-3 hari kerja)
3. Google akan mengecek:
   - Apakah extension sesuai dengan kebijakan
   - Apakah tidak mengandung malware
   - Apakah berfungsi dengan baik

### Langkah 5: Setelah Approved

1. Extension akan otomatis publish ke Chrome Web Store
2. User bisa install dari: https://chrome.google.com/webstore
3. Anda akan mendapat notifikasi email

## Tips & Best Practices

### 1. Screenshot yang Baik
- Tunjukkan extension bekerja di Adminer
- Tunjukkan fitur utama (copy, preview, filter)
- Gunakan data dummy yang jelas

### 2. Deskripsi yang Jelas
- Jelaskan fitur utama
- Sertakan cara penggunaan
- Sebutkan batasan (hanya untuk Adminer)

### 3. Privacy Policy
- Jika tidak mengumpulkan data, jelaskan dengan jelas
- Jika mengumpulkan data, buat privacy policy lengkap

### 4. Update Extension
- Setelah publish, Anda bisa update dengan upload ZIP baru
- Update version di `manifest.json` sebelum upload
- Google akan review update juga (biasanya lebih cepat)

## Troubleshooting

### Error: "Invalid manifest"
- Pastikan `manifest.json` valid JSON
- Pastikan semua field required ada
- Cek versi manifest (3)

### Error: "Missing icon"
- Pastikan semua icon size ada (16, 48, 128)
- Pastikan path icon benar di manifest

### Error: "Content script not found"
- Pastikan semua file JS yang direferensikan ada
- Pastikan path file benar

### Review Ditolak
- Baca alasan penolakan dari Google
- Perbaiki masalah yang disebutkan
- Submit ulang setelah diperbaiki

## Checklist Sebelum Publish

- [ ] Semua file diperlukan sudah ada
- [ ] `manifest.json` sudah benar dan valid
- [ ] Version sudah di-update
- [ ] Icon sudah ada (16, 48, 128)
- [ ] ZIP file sudah dibuat (tanpa file tidak perlu)
- [ ] Screenshot sudah disiapkan
- [ ] Deskripsi sudah ditulis
- [ ] Privacy policy sudah disiapkan
- [ ] Extension sudah di-test di Chrome
- [ ] Tidak ada error di console

## Update Extension

Setelah extension publish, untuk update:

1. Update version di `manifest.json` (misal: 1.0.0 → 1.0.1)
2. Buat ZIP baru dengan file yang di-update
3. Upload di Chrome Web Store Developer Dashboard
4. Submit untuk review (update biasanya lebih cepat)

## Referensi

- Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Chrome Extension Documentation: https://developer.chrome.com/docs/extensions/
- Chrome Web Store Policies: https://developer.chrome.com/docs/webstore/program-policies/
