from PIL import Image, ImageOps, ImageDraw, ImageFont
import os

static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
source_icon = os.path.join(static_dir, 'ai.jpg')

# 1. Generate 192x192 and 512x512 PNG Icons
if os.path.exists(source_icon):
    img = Image.open(source_icon).convert("RGBA")
    
    # 192x192 standard icon
    icon_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(static_dir, 'icon-192.png'), 'PNG')
    
    # 512x512 standard icon
    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(static_dir, 'icon-512.png'), 'PNG')
    
    # Maskable icons (with 10% safe zone padding)
    def create_maskable(base_img, size):
        bg = Image.new("RGBA", (size, size), (30, 45, 60, 255))
        inner_size = int(size * 0.8)
        inner = base_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (size - inner_size) // 2
        bg.paste(inner, (offset, offset), inner)
        return bg

    maskable_192 = create_maskable(img, 192)
    maskable_192.save(os.path.join(static_dir, 'icon-maskable-192.png'), 'PNG')

    maskable_512 = create_maskable(img, 512)
    maskable_512.save(os.path.join(static_dir, 'icon-maskable-512.png'), 'PNG')

    print("Generated 192x192, 512x512 and maskable PNG icons.")

# 2. Generate Desktop Screenshot (1280x720)
source_home = os.path.join(static_dir, 'homepage.jpg')
if os.path.exists(source_home):
    desk_img = Image.open(source_home).convert("RGB")
    desk_ss = desk_img.resize((1280, 720), Image.Resampling.LANCZOS)
    desk_ss.save(os.path.join(static_dir, 'screenshot-desktop.png'), 'PNG')
    print("Generated desktop screenshot (1280x720).")

# 3. Generate Mobile Screenshot (750x1334)
source_implant = os.path.join(static_dir, 'implant.jpg')
if os.path.exists(source_implant):
    mob_img = Image.open(source_implant).convert("RGB")
    mob_ss = mob_img.resize((750, 1334), Image.Resampling.LANCZOS)
    mob_ss.save(os.path.join(static_dir, 'screenshot-mobile.png'), 'PNG')
    print("Generated mobile screenshot (750x1334).")
