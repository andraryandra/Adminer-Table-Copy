# Adminer Table Copy

Browser extension untuk menyalin data tabel dari Adminer dengan format rapi dan fitur filter kolom.

## ✨ Fitur

- 📋 **Copy Table Data**: Salin data tabel dengan format CSV, TSV, atau HTML
- 🎯 **Column Filtering**: Pilih kolom yang ingin di-copy
- 🔍 **Row Preview**: Preview detail setiap baris dengan modal yang menarik
- 📖 **Auto Expand**: Auto-expand data panjang saat copy untuk memastikan data lengkap
- 🎨 **JSON Formatter**: Auto-format JSON dengan indentasi rapi
- 🎨 **Modern UI**: Desain modern dengan Tailwind CSS, tanpa gradient
- ✅ **Toast Notification**: Notifikasi sukses/error dengan informasi kolom yang di-copy

## 🚀 Instalasi

### Chrome/Edge

1. Download atau clone repository ini
2. Buka `chrome://extensions/` atau `edge://extensions/`
3. Aktifkan "Developer mode"
4. Klik "Load unpacked"
5. Pilih folder extension

### Firefox

1. Download atau clone repository ini
2. Buka `about:debugging`
3. Klik "This Firefox"
4. Klik "Load Temporary Add-on"
5. Pilih file `manifest.json` dari folder extension

## 📦 Build

Extension menggunakan Tailwind CSS untuk styling. Untuk rebuild CSS:

```bash
npm install
npm run build:css
```

Atau untuk watch mode (auto rebuild):

```bash
npm run watch:css
```

## 🛠️ Teknologi

- **Manifest V3**: Browser extension standard
- **Tailwind CSS**: Utility-first CSS framework
- **Vanilla JavaScript**: No framework dependencies

## 📝 Lisensi

ISC

## 👤 Author

andraryandra
