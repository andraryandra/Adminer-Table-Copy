#!/bin/bash

# Script untuk mempersiapkan extension untuk distribusi via GitHub Releases (GRATIS)

echo "📦 Mempersiapkan extension untuk GitHub Releases..."

# Nama file ZIP
ZIP_NAME="adminer-table-copy-v1.0.0.zip"

# Hapus ZIP lama jika ada
if [ -f "$ZIP_NAME" ]; then
    echo "🗑️  Menghapus ZIP lama..."
    rm "$ZIP_NAME"
fi

# Buat ZIP dengan file yang diperlukan
echo "📦 Membuat ZIP file..."

zip -r "$ZIP_NAME" \
    manifest.json \
    content.js \
    popup.html \
    popup.js \
    icons/ \
    -x "*.git*" \
    -x "*.md" \
    -x "*.txt" \
    -x "*create-icons*" \
    -x "*generate-icons*" \
    -x "*adminer-detection.js" \
    -x "*data-extraction.js" \
    -x "*utils.js" \
    -x "*.sh" \
    -x "PUBLISH_GUIDE.md" \
    -x "PUBLISH_FREE.md" \
    -x "README.md" \
    -x ".gitignore"

# Buat file INSTALL.md
cat > INSTALL.md << 'EOF'
# Cara Install Extension (Manual)

## Untuk Chrome/Edge/Brave:

1. **Download Extension**
   - Download file ZIP dari Releases
   - Extract ZIP file ke folder

2. **Buka Chrome/Edge/Brave**
   - Buka: `chrome://extensions/` (Chrome/Brave) atau `edge://extensions/` (Edge)

3. **Aktifkan Developer Mode**
   - Toggle "Developer mode" di pojok kanan atas

4. **Load Extension**
   - Klik "Load unpacked"
   - Pilih folder extension yang sudah di-extract
   - Extension akan terinstall

5. **Selesai!**
   - Extension siap digunakan di halaman Adminer

## Untuk Firefox:

1. **Download Extension**
   - Download file ZIP dari Releases
   - Extract ZIP file ke folder

2. **Buka Firefox**
   - Buka: `about:debugging`

3. **Load Extension**
   - Klik "This Firefox"
   - Klik "Load Temporary Add-on"
   - Pilih file `manifest.json` dari folder extension

4. **Selesai!**
   - Extension siap digunakan (temporary, perlu reload setelah restart browser)

## Update Extension

Untuk update extension:
1. Download versi baru dari Releases
2. Extract ke folder yang sama (replace file lama)
3. Buka halaman extensions
4. Klik tombol reload pada extension

## Troubleshooting

- **Extension tidak muncul**: Pastikan Developer mode aktif
- **Error saat load**: Pastikan semua file ada di folder
- **Extension tidak bekerja**: Refresh halaman Adminer
EOF

# Cek apakah ZIP berhasil dibuat
if [ -f "$ZIP_NAME" ]; then
    echo "✅ ZIP file berhasil dibuat: $ZIP_NAME"
    echo "📊 Ukuran file: $(du -h "$ZIP_NAME" | cut -f1)"
    echo ""
    echo "📝 File INSTALL.md sudah dibuat"
    echo ""
    echo "🎉 Siap untuk upload ke GitHub Releases!"
    echo ""
    echo "📝 Langkah selanjutnya:"
    echo "   1. Buat repository di GitHub"
    echo "   2. Upload semua file ke repository"
    echo "   3. Buat Release baru"
    echo "   4. Upload file: $ZIP_NAME"
    echo "   5. Copy link download untuk share"
else
    echo "❌ Gagal membuat ZIP file"
    exit 1
fi
