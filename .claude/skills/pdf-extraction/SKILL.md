---
name: pdf-extraction
description: Extraction de texte PDF avec positions precises pour citations. Utiliser quand on travaille avec l'ingestion de PDF, l'extraction de texte, ou le parsing de documents academiques.
---

# PDF Extraction Skill

## Objectif
Extraire le texte d'un PDF avec les positions exactes de chaque element pour permettre des citations fiables.

## Dependances Python
- PyMuPDF (fitz)
- pdfplumber

## Installation
```bash
pip install pymupdf pdfplumber
```

## Processus d'Extraction (Python)

### 1. Chargement du PDF
```python
import fitz  # PyMuPDF

doc = fitz.open(pdf_path)
for page_num, page in enumerate(doc):
    text = page.get_text()
    # ...
```

### 2. Extraction avec positions
```python
def extract_text_with_positions(pdf_path: str) -> list[dict]:
    """Extract text blocks with their positions."""
    doc = fitz.open(pdf_path)
    pages_data = []

    for page_num, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        text_items = []
        full_text = ""

        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"]
                        bbox = span["bbox"]  # (x0, y0, x1, y1)

                        # Normalize coordinates (0-1)
                        rect = page.rect
                        text_items.append({
                            "str": text,
                            "x": bbox[0] / rect.width,
                            "y": bbox[1] / rect.height,
                            "width": (bbox[2] - bbox[0]) / rect.width,
                            "height": (bbox[3] - bbox[1]) / rect.height,
                            "startOffset": len(full_text),
                            "endOffset": len(full_text) + len(text)
                        })
                        full_text += text + " "

        pages_data.append({
            "pageNumber": page_num + 1,
            "textContent": full_text.strip(),
            "textItems": text_items,
            "width": rect.width,
            "height": rect.height
        })

    return pages_data
```

### 3. Format de sortie obligatoire
```python
@dataclass
class TextItem:
    str: str           # Le texte
    x: float           # 0-1 normalise
    y: float           # 0-1 normalise
    width: float       # 0-1 normalise
    height: float      # 0-1 normalise
    startOffset: int   # Position dans text_content
    endOffset: int

@dataclass
class PageData:
    pageNumber: int
    textContent: str
    textItems: list[TextItem]
    width: float
    height: float
    hasText: bool
```

## Attention aux coordonnees
- PyMuPDF utilise l'origine haut-gauche (plus simple que pdf.js)
- Toujours normaliser entre 0 et 1
- Valider les limites avant stockage

## Detection pages sans texte (OCR necessaire)
```python
if len(text_content) < 100:
    has_text = False
    # Declencher OCR si necessaire
```

## Extraction d'images
```python
def extract_images(page) -> list[dict]:
    """Extract images from a PDF page."""
    images = []
    for img_index, img in enumerate(page.get_images()):
        xref = img[0]
        base_image = doc.extract_image(xref)
        images.append({
            "index": img_index,
            "data": base_image["image"],
            "ext": base_image["ext"]
        })
    return images
```
