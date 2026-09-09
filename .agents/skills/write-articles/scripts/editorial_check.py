#!/usr/bin/env python3
"""Deterministic editorial signals for Markdown article drafts.

This is a review aid, not an AI-authorship detector. It reads a local file and
prints structural signals that help an editor spot repetition, uniform rhythm,
stock transitions, and accidental inclusion of non-public note sections.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import statistics
from collections import Counter
from pathlib import Path


STOPWORDS = {
    "aceasta",
    "acest",
    "aceste",
    "acestea",
    "acel",
    "acolo",
    "aici",
    "ale",
    "care",
    "când",
    "dacă",
    "dar",
    "de",
    "din",
    "după",
    "este",
    "fără",
    "fi",
    "fie",
    "în",
    "îl",
    "între",
    "la",
    "mai",
    "nici",
    "nu",
    "o",
    "ori",
    "pe",
    "pentru",
    "poate",
    "pot",
    "prin",
    "sau",
    "se",
    "și",
    "sunt",
    "un",
    "unei",
    "unui",
    "cu",
}

STOCK_PHRASES = (
    "în era digitală",
    "în lumea de astăzi",
    "mai mult ca niciodată",
    "în peisajul actual",
    "într-o lume în continuă schimbare",
    "este esențial",
    "joacă un rol crucial",
    "merită menționat",
    "în concluzie",
    "nu este doar",
    "nu doar că",
    "hai să explorăm",
    "să aprofundăm",
    "game changer",
)


def public_body(markdown: str, stop_heading: str) -> str:
    text = re.sub(r"\A---\s*\n.*?\n---\s*\n", "", markdown, flags=re.S)
    heading = re.compile(
        rf"(?m)^##\s+{re.escape(stop_heading)}\s*$", flags=re.IGNORECASE
    )
    match = heading.search(text)
    return text[: match.start()].strip() if match else text.strip()


def plain_text(markdown: str) -> str:
    text = re.sub(r"```.*?```", " ", markdown, flags=re.S)
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[\[([^]|]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s+", "", text)
    text = re.sub(r"(?m)^\s*(?:[-*+]|\d+\.)\s+", "", text)
    text = re.sub(r"[*_>`|]", " ", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def words(text: str) -> list[str]:
    return re.findall(r"[0-9A-Za-zĂÂÎȘȚăâîșț-]+", text, flags=re.UNICODE)


def sentences(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!?])(?:[”’\"']*)\s+(?=[A-ZĂÂÎȘȚ0-9„])", text)
    return [chunk.strip() for chunk in chunks if len(words(chunk)) >= 2]


def paragraph_texts(markdown: str) -> list[str]:
    blocks = re.split(r"\n\s*\n", markdown)
    result = []
    for block in blocks:
        stripped = block.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("|"):
            continue
        if re.match(r"^(?:[-*+]|\d+\.)\s+", stripped):
            continue
        cleaned = plain_text(stripped)
        if cleaned:
            result.append(cleaned)
    return result


def top_sentence_starts(items: list[str]) -> list[dict[str, object]]:
    starts = Counter()
    for sentence in items:
        tokens = [token.lower() for token in words(sentence)]
        if len(tokens) >= 3:
            starts[" ".join(tokens[:3])] += 1
    return [
        {"start": start, "count": count}
        for start, count in starts.most_common()
        if count >= 2
    ][:10]


def repeated_ngrams(tokens: list[str], size: int = 4) -> list[dict[str, object]]:
    normalized = [token.lower() for token in tokens]
    grams = Counter(
        tuple(normalized[index : index + size])
        for index in range(len(normalized) - size + 1)
    )
    return [
        {"phrase": " ".join(gram), "count": count}
        for gram, count in grams.most_common()
        if count >= 2 and not all(token in STOPWORDS for token in gram)
    ][:10]


def report(path: Path, stop_heading: str) -> dict[str, object]:
    markdown = path.read_text(encoding="utf-8")
    body = public_body(markdown, stop_heading)
    plain = plain_text(body)
    token_list = words(plain)
    sentence_list = sentences(plain)
    paragraphs = paragraph_texts(body)
    sentence_lengths = [len(words(item)) for item in sentence_list]
    paragraph_lengths = [len(words(item)) for item in paragraphs]
    normalized = plain.lower()
    content_words = Counter(
        token.lower()
        for token in token_list
        if len(token) > 3 and token.lower() not in STOPWORDS
    )

    return {
        "file": str(path),
        "sha256_public_body": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        "scope": f"frontmatter removed; content before H2 '{stop_heading}'",
        "counts": {
            "words": len(token_list),
            "sentences": len(sentence_list),
            "paragraphs": len(paragraphs),
            "questions": plain.count("?"),
            "h2_headings": len(re.findall(r"(?m)^##\s+", body)),
            "list_items": len(re.findall(r"(?m)^\s*(?:[-*+]|\d+\.)\s+", body)),
        },
        "rhythm": {
            "sentence_words_mean": round(statistics.mean(sentence_lengths), 1)
            if sentence_lengths
            else 0,
            "sentence_words_median": round(statistics.median(sentence_lengths), 1)
            if sentence_lengths
            else 0,
            "sentence_words_stdev": round(statistics.pstdev(sentence_lengths), 1)
            if len(sentence_lengths) > 1
            else 0,
            "sentence_words_min": min(sentence_lengths, default=0),
            "sentence_words_max": max(sentence_lengths, default=0),
            "paragraph_words_mean": round(statistics.mean(paragraph_lengths), 1)
            if paragraph_lengths
            else 0,
            "paragraph_words_min": min(paragraph_lengths, default=0),
            "paragraph_words_max": max(paragraph_lengths, default=0),
        },
        "repetition": {
            "top_content_words": [
                {"word": word, "count": count}
                for word, count in content_words.most_common(12)
            ],
            "repeated_sentence_starts": top_sentence_starts(sentence_list),
            "repeated_four_grams": repeated_ngrams(token_list),
        },
        "stock_phrases_found": [
            phrase for phrase in STOCK_PHRASES if phrase in normalized
        ],
        "notes": [
            "These are editorial signals, not pass/fail thresholds.",
            "Authorship cannot be inferred from this report.",
            "Review repeated language in context; necessary terminology may recur.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument(
        "--stop-heading",
        default="Surse și metodă",
        help="Exclude this H2 and everything after it (default: Surse și metodă).",
    )
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()

    result = report(args.file.expanduser().resolve(), args.stop_heading)
    print(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=None if args.compact else 2,
            sort_keys=False,
        )
    )


if __name__ == "__main__":
    main()
