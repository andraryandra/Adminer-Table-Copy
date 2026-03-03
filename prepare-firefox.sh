#!/bin/bash

# Script untuk mempersiapkan extension untuk Firefox Add-ons (GRATIS)

echo "🦊 Mempersiapkan extension untuk Firefox Add-ons..."

# Nama file ZIP
ZIP_NAME="adminer-table-copy-firefox.zip"

# Hapus ZIP lama jika ada
if [ -f "$ZIP_NAME" ]; then
    echo "🗑️  Menghapus ZIP lama..."
    rm "$ZIP_NAME"
fi

# Buat manifest.json untuk Firefox (sama dengan Chrome, Manifest V3 sudah support)
echo "📝 Manifest sudah kompatibel dengan Firefox (Manifest V3)"

# Buat ZIP dengan file yang diperlukan
echo "📦 Membuat ZIP file untuk Firefox..."

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

# Cek apakah ZIP berhasil dibuat
if [ -f "$ZIP_NAME" ]; then
    echo "✅ ZIP file untuk Firefox berhasil dibuat: $ZIP_NAME"
    echo "📊 Ukuran file: $(du -h "$ZIP_NAME" | cut -f1)"
    echo ""
    echo "📋 File yang disertakan:"
    unzip -l "$ZIP_NAME" | grep -E "\.(js|html|json|png)$" | head -20
    echo ""
    echo "🎉 Siap untuk upload ke Firefox Add-ons!"
    echo "   Buka: https://addons.mozilla.org/developers/"
    echo ""
    echo "📝 Langkah selanjutnya:"
    echo "   1. Daftar di https://addons.mozilla.org/developers/ (GRATIS)"
    echo "   2. Klik 'Submit a New Add-on'"
    echo "   3. Upload file: $ZIP_NAME"
    echo "   4. Isi informasi store listing"
    echo "   5. Submit untuk review (1-2 hari)"
else
    echo "❌ Gagal membuat ZIP file"
    exit 1
fi
