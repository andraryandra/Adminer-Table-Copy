#!/bin/bash

# Script untuk mempersiapkan file extension untuk publish ke Chrome Web Store

echo "🚀 Mempersiapkan extension untuk publish..."

# Nama file ZIP
ZIP_NAME="adminer-table-copy.zip"

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
    -x "README.md" \
    -x ".gitignore"

# Cek apakah ZIP berhasil dibuat
if [ -f "$ZIP_NAME" ]; then
    echo "✅ ZIP file berhasil dibuat: $ZIP_NAME"
    echo "📊 Ukuran file: $(du -h "$ZIP_NAME" | cut -f1)"
    echo ""
    echo "📋 File yang disertakan:"
    unzip -l "$ZIP_NAME" | grep -E "\.(js|html|json|png)$" | head -20
    echo ""
    echo "🎉 Siap untuk upload ke Chrome Web Store!"
    echo "   Buka: https://chrome.google.com/webstore/devconsole"
else
    echo "❌ Gagal membuat ZIP file"
    exit 1
fi
