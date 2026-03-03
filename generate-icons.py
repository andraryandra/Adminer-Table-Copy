#!/usr/bin/env python3
"""
Script sederhana untuk generate icon extension
Membutuhkan PIL/Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow tidak terinstall. Install dengan: pip install Pillow")
    exit(1)

import os

def create_icon(size):
    """Membuat icon dengan ukuran tertentu"""
    # Buat image dengan background hijau
    img = Image.new('RGB', (size, size), color='#4CAF50')
    draw = ImageDraw.Draw(img)
    
    # Buat border radius effect (manual)
    # Gambar clipboard sederhana
    padding = int(size * 0.15)
    width = size - (padding * 2)
    height = size - (padding * 2)
    
    # Clipboard body (putih)
    body_x = padding
    body_y = padding + int(size * 0.1)
    body_w = width
    body_h = height - int(size * 0.1)
    
    # Gambar clipboard body
    draw.rounded_rectangle(
        [body_x, body_y, body_x + body_w, body_y + body_h],
        radius=int(size * 0.1),
        fill='white'
    )
    
    # Clipboard top (putih)
    top_x = padding + int(size * 0.15)
    top_y = padding
    top_w = int(width * 0.7)
    top_h = int(size * 0.15)
    
    draw.rounded_rectangle(
        [top_x, top_y, top_x + top_w, top_y + top_h],
        radius=int(size * 0.05),
        fill='white'
    )
    
    # Garis-garis di clipboard (hijau)
    line_color = '#4CAF50'
    line_width = max(1, int(size * 0.03))
    for i in range(3):
        y = body_y + int(size * 0.2) + (i * int(size * 0.15))
        draw.line(
            [body_x + int(size * 0.1), y, body_x + body_w - int(size * 0.1), y],
            fill=line_color,
            width=line_width
        )
    
    return img

def main():
    """Generate semua icon yang diperlukan"""
    sizes = [16, 48, 128]
    icons_dir = 'icons'
    
    # Buat folder icons jika belum ada
    os.makedirs(icons_dir, exist_ok=True)
    
    print("Generating icons...")
    for size in sizes:
        icon = create_icon(size)
        filename = f'{icons_dir}/icon{size}.png'
        icon.save(filename, 'PNG')
        print(f"✓ Created {filename} ({size}x{size})")
    
    print("\nIcons berhasil dibuat!")

if __name__ == '__main__':
    main()
