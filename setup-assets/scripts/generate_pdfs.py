#!/usr/bin/env python3
"""
Generate PDF specification sheets for Matcha Trading Platform products.
Creates professional product spec documents with all relevant details.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import os
from datetime import datetime

# Output directory
OUTPUT_DIR = "/home/claude/matcha-setup/docs"

# Matcha green colors
MATCHA_GREEN = HexColor("#4C8C4A")
MATCHA_LIGHT = HexColor("#90BE6D")
MATCHA_DARK = HexColor("#2D5A27")

# Product data matching the seed.ts file
PRODUCTS = [
    {
        "slug": "premium-ceremonial-uji",
        "name": "Premium Ceremonial Uji",
        "grade": "Ceremonial",
        "region": "Uji, Kyoto",
        "origin": "Japan",
        "harvest": "First Harvest (Ichibancha)",
        "cultivation": "Shade-grown (20+ days)",
        "processing": "Stone-ground",
        "mesh": "1000+ mesh",
        "color": "Vibrant green",
        "flavor": "Rich umami, subtle sweetness, no bitterness",
        "aroma": "Fresh, grassy, vegetal",
        "caffeine": "~34mg per gram",
        "l_theanine": "~20mg per gram",
        "catechins": "~100mg per gram",
        "shelf_life": "12 months (unopened), 1 month (opened)",
        "storage": "Cool, dry place away from light. Refrigerate after opening.",
        "certifications": ["JAS Organic", "USDA Organic", "EU Organic"],
        "uses": ["Traditional tea ceremony", "Usucha preparation", "Premium beverages"],
        "moq": "5 kg",
        "lead_time": "14 days",
        "price_range": "$80-120 per kg",
    },
    {
        "slug": "organic-culinary-nishio",
        "name": "Organic Culinary Nishio",
        "grade": "Culinary",
        "region": "Nishio, Aichi",
        "origin": "Japan",
        "harvest": "Second/Third Harvest",
        "cultivation": "Shade-grown (14 days)",
        "processing": "Stone-ground",
        "mesh": "800 mesh",
        "color": "Yellow-green",
        "flavor": "Strong, slightly bitter, robust",
        "aroma": "Earthy, vegetal",
        "caffeine": "~32mg per gram",
        "l_theanine": "~14mg per gram",
        "catechins": "~120mg per gram",
        "shelf_life": "18 months (unopened), 2 months (opened)",
        "storage": "Cool, dry place away from light.",
        "certifications": ["JAS Organic", "USDA Organic"],
        "uses": ["Baking", "Smoothies", "Lattes", "Ice cream", "Cooking"],
        "moq": "10 kg",
        "lead_time": "10 days",
        "price_range": "$25-45 per kg",
    },
    {
        "slug": "classic-usucha-blend",
        "name": "Classic Usucha Blend",
        "grade": "Premium",
        "region": "Uji, Kyoto",
        "origin": "Japan",
        "harvest": "First Harvest (Ichibancha)",
        "cultivation": "Shade-grown (18 days)",
        "processing": "Stone-ground",
        "mesh": "900 mesh",
        "color": "Bright green",
        "flavor": "Balanced umami and sweetness",
        "aroma": "Fresh, slightly sweet",
        "caffeine": "~33mg per gram",
        "l_theanine": "~18mg per gram",
        "catechins": "~105mg per gram",
        "shelf_life": "12 months (unopened), 1 month (opened)",
        "storage": "Cool, dry place away from light. Refrigerate after opening.",
        "certifications": ["JAS Organic"],
        "uses": ["Daily usucha", "Premium lattes", "Desserts"],
        "moq": "5 kg",
        "lead_time": "12 days",
        "price_range": "$50-70 per kg",
    },
    {
        "slug": "first-harvest-shincha",
        "name": "First Harvest Shincha",
        "grade": "Ceremonial",
        "region": "Shizuoka",
        "origin": "Japan",
        "harvest": "First Harvest (Ichibancha) - Spring",
        "cultivation": "Shade-grown (21 days)",
        "processing": "Stone-ground, fresh processed",
        "mesh": "1000+ mesh",
        "color": "Brilliant emerald green",
        "flavor": "Exceptionally sweet, deep umami",
        "aroma": "Fresh spring grass, floral notes",
        "caffeine": "~35mg per gram",
        "l_theanine": "~22mg per gram",
        "catechins": "~95mg per gram",
        "shelf_life": "6 months (unopened), 2 weeks (opened)",
        "storage": "Refrigerate immediately. Consume quickly for best flavor.",
        "certifications": ["JAS Organic", "Single Origin"],
        "uses": ["Tea ceremony", "Special occasions", "Koicha preparation"],
        "moq": "2 kg",
        "lead_time": "7 days (seasonal availability)",
        "price_range": "$120-180 per kg",
    },
    {
        "slug": "daily-matcha-kagoshima",
        "name": "Daily Matcha Kagoshima",
        "grade": "Culinary",
        "region": "Kagoshima",
        "origin": "Japan",
        "harvest": "Second Harvest",
        "cultivation": "Partial shade (10 days)",
        "processing": "Stone-ground",
        "mesh": "600 mesh",
        "color": "Green with yellow tones",
        "flavor": "Mild, slightly astringent",
        "aroma": "Light, grassy",
        "caffeine": "~30mg per gram",
        "l_theanine": "~12mg per gram",
        "catechins": "~130mg per gram",
        "shelf_life": "24 months (unopened), 3 months (opened)",
        "storage": "Cool, dry place.",
        "certifications": [],
        "uses": ["Daily beverages", "Commercial food production", "Bulk cooking"],
        "moq": "25 kg",
        "lead_time": "7 days",
        "price_range": "$15-25 per kg",
    },
    {
        "slug": "competition-grade-uji",
        "name": "Competition Grade Uji",
        "grade": "Competition",
        "region": "Uji, Kyoto",
        "origin": "Japan",
        "harvest": "First Harvest, Hand-picked",
        "cultivation": "Traditional shade-grown (25+ days)",
        "processing": "Hand-picked, stone-ground by master",
        "mesh": "1200+ mesh (ultra-fine)",
        "color": "Deep vibrant jade green",
        "flavor": "Complex umami, natural sweetness, zero bitterness",
        "aroma": "Intensely fresh, complex vegetal notes",
        "caffeine": "~36mg per gram",
        "l_theanine": "~25mg per gram",
        "catechins": "~90mg per gram",
        "shelf_life": "6 months (unopened), 2 weeks (opened)",
        "storage": "Refrigerate. Use nitrogen-flushed container.",
        "certifications": ["JAS Organic", "Award Winner", "Single Estate"],
        "uses": ["Competition", "Tea ceremony masters", "Ultra-premium service"],
        "moq": "1 kg",
        "lead_time": "21 days (limited availability)",
        "price_range": "$200-400 per kg",
    },
    {
        "slug": "organic-ceremonial-kyoto",
        "name": "Organic Ceremonial Kyoto",
        "grade": "Ceremonial",
        "region": "Kyoto",
        "origin": "Japan",
        "harvest": "First Harvest (Ichibancha)",
        "cultivation": "Organic shade-grown (20 days)",
        "processing": "Stone-ground",
        "mesh": "1000 mesh",
        "color": "Vivid green",
        "flavor": "Smooth umami, gentle sweetness",
        "aroma": "Clean, fresh, slightly marine",
        "caffeine": "~34mg per gram",
        "l_theanine": "~19mg per gram",
        "catechins": "~98mg per gram",
        "shelf_life": "12 months (unopened), 1 month (opened)",
        "storage": "Cool, dry place away from light. Refrigerate after opening.",
        "certifications": ["JAS Organic", "USDA Organic", "EU Organic", "Kosher"],
        "uses": ["Tea ceremony", "Premium beverages", "Health-conscious consumers"],
        "moq": "5 kg",
        "lead_time": "14 days",
        "price_range": "$90-130 per kg",
    },
    {
        "slug": "cafe-blend-matcha",
        "name": "Cafe Blend Matcha",
        "grade": "Culinary",
        "region": "Nishio, Aichi",
        "origin": "Japan",
        "harvest": "Blended harvests",
        "cultivation": "Mixed cultivation",
        "processing": "Stone-ground, blended for consistency",
        "mesh": "700 mesh",
        "color": "Consistent green",
        "flavor": "Bold, stands up to milk and sweeteners",
        "aroma": "Robust, earthy",
        "caffeine": "~31mg per gram",
        "l_theanine": "~13mg per gram",
        "catechins": "~115mg per gram",
        "shelf_life": "18 months (unopened), 3 months (opened)",
        "storage": "Cool, dry place.",
        "certifications": ["Food Service Grade"],
        "uses": ["Cafe lattes", "Smoothies", "Commercial beverages", "Desserts"],
        "moq": "20 kg",
        "lead_time": "7 days",
        "price_range": "$20-35 per kg",
    },
]


def create_spec_sheet(product, output_path):
    """Create a professional PDF specification sheet for a product."""
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='ProductTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=MATCHA_DARK,
        spaceAfter=6,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=MATCHA_GREEN,
        spaceBefore=12,
        spaceAfter=6,
        borderColor=MATCHA_GREEN,
        borderWidth=1,
        borderPadding=3,
    ))
    
    styles.add(ParagraphStyle(
        name='GradeLabel',
        parent=styles['Normal'],
        fontSize=12,
        textColor=white,
        alignment=TA_CENTER,
        backColor=MATCHA_GREEN,
    ))
    
    styles.add(ParagraphStyle(
        name='SpecBodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
    ))
    
    styles.add(ParagraphStyle(
        name='SpecSmallText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.gray,
    ))
    
    story = []
    
    # Header with logo placeholder and title
    header_data = [
        [
            Paragraph("🍵", ParagraphStyle(name='Logo', fontSize=36, alignment=TA_CENTER)),
            Paragraph(f"<b>{product['name']}</b>", styles['ProductTitle']),
            Paragraph(f"<b>{product['grade']} Grade</b>", styles['GradeLabel']),
        ]
    ]
    header_table = Table(header_data, colWidths=[1*inch, 4.5*inch, 1.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'CENTER'),
        ('BACKGROUND', (2, 0), (2, 0), MATCHA_GREEN),
        ('TEXTCOLOR', (2, 0), (2, 0), white),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Subtitle with region and origin
    story.append(Paragraph(
        f"<i>Origin: {product['region']}, {product['origin']}</i>",
        ParagraphStyle(name='Subtitle', fontSize=11, textColor=colors.gray, alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 0.3*inch))
    
    # Product Overview Section
    story.append(Paragraph("PRODUCT OVERVIEW", styles['SectionHeader']))
    
    overview_data = [
        ["Harvest:", product['harvest']],
        ["Cultivation:", product['cultivation']],
        ["Processing:", product['processing']],
        ["Mesh Size:", product['mesh']],
    ]
    overview_table = Table(overview_data, colWidths=[1.5*inch, 5.5*inch])
    overview_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (0, 0), (0, -1), MATCHA_DARK),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Sensory Profile Section
    story.append(Paragraph("SENSORY PROFILE", styles['SectionHeader']))
    
    sensory_data = [
        ["Color:", product['color']],
        ["Flavor:", product['flavor']],
        ["Aroma:", product['aroma']],
    ]
    sensory_table = Table(sensory_data, colWidths=[1.5*inch, 5.5*inch])
    sensory_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (0, 0), (0, -1), MATCHA_DARK),
    ]))
    story.append(sensory_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Nutritional Information Section
    story.append(Paragraph("NUTRITIONAL INFORMATION (per gram)", styles['SectionHeader']))
    
    nutrition_data = [
        ["Caffeine", "L-Theanine", "Catechins"],
        [product['caffeine'], product['l_theanine'], product['catechins']],
    ]
    nutrition_table = Table(nutrition_data, colWidths=[2.33*inch, 2.33*inch, 2.34*inch])
    nutrition_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), MATCHA_LIGHT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, MATCHA_GREEN),
    ]))
    story.append(nutrition_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Storage & Shelf Life Section
    story.append(Paragraph("STORAGE & SHELF LIFE", styles['SectionHeader']))
    
    storage_data = [
        ["Shelf Life:", product['shelf_life']],
        ["Storage:", product['storage']],
    ]
    storage_table = Table(storage_data, colWidths=[1.5*inch, 5.5*inch])
    storage_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (0, 0), (0, -1), MATCHA_DARK),
    ]))
    story.append(storage_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Certifications Section
    if product['certifications']:
        story.append(Paragraph("CERTIFICATIONS", styles['SectionHeader']))
        certs = " • ".join(product['certifications'])
        story.append(Paragraph(f"✓ {certs}", styles['SpecBodyText']))
        story.append(Spacer(1, 0.2*inch))
    
    # Recommended Uses Section
    story.append(Paragraph("RECOMMENDED USES", styles['SectionHeader']))
    uses = " • ".join(product['uses'])
    story.append(Paragraph(uses, styles['SpecBodyText']))
    story.append(Spacer(1, 0.2*inch))
    
    # Ordering Information Section
    story.append(Paragraph("ORDERING INFORMATION", styles['SectionHeader']))
    
    order_data = [
        ["Minimum Order:", product['moq']],
        ["Lead Time:", product['lead_time']],
        ["Price Range:", product['price_range']],
    ]
    order_table = Table(order_data, colWidths=[1.5*inch, 5.5*inch])
    order_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (0, 0), (0, -1), MATCHA_DARK),
        ('BACKGROUND', (0, 0), (-1, -1), HexColor("#f5f5f5")),
        ('BOX', (0, 0), (-1, -1), 1, MATCHA_GREEN),
    ]))
    story.append(order_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Footer
    story.append(Paragraph(
        f"<i>Document generated: {datetime.now().strftime('%Y-%m-%d')} | Matcha Trading Platform</i>",
        styles['SpecSmallText']
    ))
    story.append(Paragraph(
        "<i>For the most current information, please contact your sales representative.</i>",
        styles['SpecSmallText']
    ))
    
    # Build the PDF
    doc.build(story)


def main():
    """Generate all product specification PDFs."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Generating PDF specification sheets...")
    
    for product in PRODUCTS:
        filename = f"{product['slug']}-spec.pdf"
        filepath = os.path.join(OUTPUT_DIR, filename)
        create_spec_sheet(product, filepath)
        print(f"  ✓ Created: {filename}")
    
    print(f"\n✅ Generated {len(PRODUCTS)} PDF specification sheets in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
