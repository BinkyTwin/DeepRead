---
name: rag-citations
description: Generation de reponses avec citations fiables et validees. Utiliser pour le chat avec documents, les questions-reponses sur papers, ou quand des citations precises sont requises.
---

# RAG Citations Skill

## Objectif
Obtenir des reponses LLM avec citations verifiables (page + offsets dans le texte).

## Prompt Systeme Obligatoire

```
Tu es un assistant de recherche qui repond aux questions en se basant UNIQUEMENT sur le contexte fourni.

REGLES STRICTES:
1. Reponds UNIQUEMENT en JSON valide
2. Cite UNIQUEMENT le contexte fourni, jamais tes connaissances
3. Pour chaque affirmation, fournis une citation avec page et offsets

FORMAT DE REPONSE:
{
  "answer": "Ta reponse ici...",
  "citations": [
    {
      "page": 1,
      "start": 0,
      "end": 50,
      "quote": "Extrait exact du texte..."
    }
  ]
}

Si tu ne trouves pas l'information dans le contexte, reponds:
{
  "answer": "Je n'ai pas trouve cette information dans le document.",
  "citations": []
}
```

## Validation des Citations (OBLIGATOIRE)

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Citation:
    page: int
    start: int
    end: int
    quote: str
    verified: bool = False

async def validate_citations(
    paper_id: str,
    citations: list[dict],
    pages_data: list[dict]
) -> list[Citation]:
    """Validate citations against actual document text."""
    validated = []

    for citation in citations:
        # Verifier les champs requis
        if not all(k in citation for k in ['page', 'start', 'end']):
            continue

        page_num = citation['page']
        start = citation['start']
        end = citation['end']

        # Trouver la page
        page = next(
            (p for p in pages_data if p['pageNumber'] == page_num),
            None
        )
        if not page:
            continue

        text_content = page['textContent']

        # Verifier les limites
        if start < 0 or end > len(text_content) or start >= end:
            continue

        # Extraire le texte reel
        actual_text = text_content[start:end]

        validated.append(Citation(
            page=page_num,
            start=start,
            end=end,
            quote=actual_text[:100],
            verified=True
        ))

    return validated
```

## Conversion Offsets vers Rectangles

```python
def offsets_to_rects(
    start_offset: int,
    end_offset: int,
    text_items: list[dict]
) -> list[dict]:
    """Convert text offsets to highlight rectangles."""
    rects = []

    for item in text_items:
        item_start = item['startOffset']
        item_end = item['endOffset']

        # Skip items outside range
        if item_end <= start_offset:
            continue
        if item_start >= end_offset:
            break

        rects.append({
            'x': item['x'],
            'y': item['y'],
            'width': item['width'],
            'height': item['height']
        })

    return merge_adjacent_rects(rects)

def merge_adjacent_rects(rects: list[dict]) -> list[dict]:
    """Merge rectangles on the same line."""
    if not rects:
        return []

    merged = [rects[0]]
    for rect in rects[1:]:
        last = merged[-1]
        # Same line (similar y position)
        if abs(rect['y'] - last['y']) < 0.01:
            # Extend width
            last['width'] = rect['x'] + rect['width'] - last['x']
        else:
            merged.append(rect)

    return merged
```

## Gestion des Erreurs LLM

```python
import json

def parse_llm_response(response: str) -> dict:
    """Parse LLM response with fallback."""
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        # Essayer d'extraire le JSON
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass

        # Fallback
        return {
            "answer": response,
            "citations": []
        }
```

## Integration avec Claude API

```python
from anthropic import Anthropic

client = Anthropic()

async def ask_with_citations(
    question: str,
    context: str,
    pages_data: list[dict]
) -> dict:
    """Ask a question and get answer with validated citations."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=CITATION_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"CONTEXTE:\n{context}\n\nQUESTION: {question}"
        }]
    )

    result = parse_llm_response(response.content[0].text)

    # Valider les citations
    if result.get('citations'):
        result['citations'] = await validate_citations(
            paper_id,
            result['citations'],
            pages_data
        )

    return result
```
