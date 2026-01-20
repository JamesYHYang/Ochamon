#!/usr/bin/env python3
"""
Generate placeholder product images for Matcha Trading Platform.
Creates professional-looking gradient images with product names.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

# Output directory
OUTPUT_DIR = "/home/claude/matcha-setup/images"

# Product data matching the seed.ts file
PRODUCTS = [
    {"slug": "premium-ceremonial-uji", "name": "Premium Ceremonial Uji", "grade": "Ceremonial"},
    {"slug": "organic-culinary-nishio", "name": "Organic Culinary Nishio", "grade": "Culinary"},
    {"slug": "classic-usucha-blend", "name": "Classic Usucha Blend", "grade": "Premium"},
    {"slug": "first-harvest-shincha", "name": "First Harvest Shincha", "grade": "Ceremonial"},
    {"slug": "daily-matcha-kagoshima", "name": "Daily Matcha Kagoshima", "grade": "Culinary"},
    {"slug": "competition-grade-uji", "name": "Competition Grade Uji", "grade": "Competition"},
    {"slug": "organic-ceremonial-kyoto", "name": "Organic Ceremonial Kyoto", "grade": "Ceremonial"},
    {"slug": "cafe-blend-matcha", "name": "Cafe Blend Matcha", "grade": "Culinary"},
]

# Color palettes for different grades (matcha green variations)
GRADE_COLORS = {
    "Ceremonial": {
        "primary": (76, 140, 74),      # Deep matcha green
        "secondary": (144, 190, 109),   # Light matcha
        "accent": (45, 90, 39),         # Dark forest
    },
    "Premium": {
        "primary": (85, 150, 80),
        "secondary": (160, 200, 120),
        "accent": (50, 100, 45),
    },
    "Culinary": {
        "primary": (100, 160, 90),
        "secondary": (170, 210, 130),
        "accent": (60, 110, 50),
    },
    "Competition": {
        "primary": (60, 120, 60),       # Premium deep green
        "secondary": (130, 180, 100),
        "accent": (35, 80, 30),
    },
}


def create_gradient(width, height, color1, color2, direction="diagonal"):
    """Create a gradient image."""
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    
    for y in range(height):
        for x in range(width):
            if direction == "diagonal":
                # Diagonal gradient
                ratio = (x + y) / (width + height)
            elif direction == "vertical":
                ratio = y / height
            else:  # horizontal
                ratio = x / width
            
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            
            draw.point((x, y), fill=(r, g, b))
    
    return image


def draw_matcha_powder_circle(draw, center_x, center_y, radius, color):
    """Draw a stylized matcha powder circle with texture."""
    # Main circle
    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=color,
        outline=None
    )
    
    # Add some texture dots for powder effect
    import random
    random.seed(42)  # Consistent texture
    lighter = tuple(min(255, c + 30) for c in color)
    darker = tuple(max(0, c - 20) for c in color)
    
    for _ in range(50):
        angle = random.uniform(0, 2 * math.pi)
        dist = random.uniform(0, radius * 0.8)
        x = center_x + dist * math.cos(angle)
        y = center_y + dist * math.sin(angle)
        size = random.randint(2, 5)
        dot_color = lighter if random.random() > 0.5 else darker
        draw.ellipse([x - size, y - size, x + size, y + size], fill=dot_color)


def draw_tea_leaves(draw, x, y, size, color):
    """Draw stylized tea leaves."""
    # Simplified leaf shape using ellipses
    leaf_color = tuple(max(0, c - 30) for c in color)
    
    # Main leaf
    draw.ellipse([x, y, x + size * 2, y + size], fill=leaf_color)
    # Stem
    draw.line([(x + size, y + size//2), (x + size, y + size + 10)], fill=leaf_color, width=2)


def generate_product_image(product, size=(800, 800)):
    """Generate a product image for a matcha product."""
    width, height = size
    grade = product["grade"]
    colors = GRADE_COLORS.get(grade, GRADE_COLORS["Premium"])
    
    # Create gradient background
    image = create_gradient(width, height, colors["secondary"], colors["primary"], "diagonal")
    draw = ImageDraw.Draw(image)
    
    # Draw matcha powder circle in center
    center_x, center_y = width // 2, height // 2 - 50
    powder_radius = min(width, height) // 4
    draw_matcha_powder_circle(draw, center_x, center_y, powder_radius, colors["accent"])
    
    # Draw decorative tea leaves
    draw_tea_leaves(draw, width * 0.1, height * 0.1, 30, colors["primary"])
    draw_tea_leaves(draw, width * 0.8, height * 0.15, 25, colors["primary"])
    draw_tea_leaves(draw, width * 0.15, height * 0.8, 20, colors["primary"])
    draw_tea_leaves(draw, width * 0.75, height * 0.85, 28, colors["primary"])
    
    # Add product name text
    try:
        # Try to use a nice font, fall back to default
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Product name
    name = product["name"]
    bbox = draw.textbbox((0, 0), name, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_x = (width - text_width) // 2
    text_y = height - 150
    
    # Text shadow
    draw.text((text_x + 2, text_y + 2), name, font=font_large, fill=(0, 0, 0, 128))
    # Main text
    draw.text((text_x, text_y), name, font=font_large, fill=(255, 255, 255))
    
    # Grade label
    grade_text = f"Grade: {grade}"
    bbox = draw.textbbox((0, 0), grade_text, font=font_small)
    grade_width = bbox[2] - bbox[0]
    grade_x = (width - grade_width) // 2
    draw.text((grade_x, text_y + 50), grade_text, font=font_small, fill=(255, 255, 255, 200))
    
    # Add subtle border
    border_color = colors["accent"]
    draw.rectangle([0, 0, width-1, height-1], outline=border_color, width=3)
    
    return image


def main():
    """Generate all product images."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Generating product images...")
    
    for product in PRODUCTS:
        # Generate main image
        image = generate_product_image(product, (800, 800))
        filename = f"{product['slug']}.jpg"
        filepath = os.path.join(OUTPUT_DIR, filename)
        image.save(filepath, "JPEG", quality=90)
        print(f"  ✓ Created: {filename}")
        
        # Generate thumbnail
        thumbnail = image.copy()
        thumbnail.thumbnail((400, 400))
        thumb_filename = f"{product['slug']}-thumb.jpg"
        thumb_filepath = os.path.join(OUTPUT_DIR, thumb_filename)
        thumbnail.save(thumb_filepath, "JPEG", quality=85)
        print(f"  ✓ Created: {thumb_filename}")
    
    # Create a placeholder for missing images
    placeholder = create_gradient(800, 800, (200, 200, 200), (150, 150, 150), "diagonal")
    draw = ImageDraw.Draw(placeholder)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 48)
    except:
        font = ImageFont.load_default()
    
    text = "Image Coming Soon"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    draw.text(((800 - text_width) // 2, 380), text, font=font, fill=(100, 100, 100))
    
    placeholder.save(os.path.join(OUTPUT_DIR, "placeholder.jpg"), "JPEG", quality=85)
    print("  ✓ Created: placeholder.jpg")
    
    print(f"\n✅ Generated {len(PRODUCTS) * 2 + 1} images in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
