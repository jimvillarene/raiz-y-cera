#!/usr/bin/env python3
"""
Module: extract_catalog_assets
Description: Object-oriented extractor and optimizer for embedded high-resolution
             brand, hero, and product imagery from PDF catalogs using PyMuPDF.

Author: Antigravity AI Agent
License: Proprietary / Internal

Version History:
- v1.0.0 | 2026-11-20 | Initial OOP implementation for PDF catalog image extraction
"""

from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import pymupdf


@dataclass(frozen=True)
class AssetExtractionRule:
    """Data contract describing a single embedded PDF image extraction rule.

    Attributes:
        source_key: Logical identifier of the PDF document source.
        xref: Internal PDF cross-reference table ID for the image object.
        target_subpath: Relative path under the destination assets directory.
        max_dimension: Optional maximum pixel width/height for web optimization.
    """

    source_key: str
    xref: int
    target_subpath: str
    max_dimension: Optional[int] = 1200


class CatalogAssetExtractor:
    """Encapsulates PDF binary image extraction and macOS sips web optimization.

    This class parses configured PDF sources, extracts embedded raster objects
    by cross-reference ID without re-compression loss, writes them to the target
    asset hierarchy, and optionally downscales oversized textures for web delivery.
    """

    def __init__(self, pdf_sources: Dict[str, Path], output_base_dir: Path) -> None:
        """Initializes the CatalogAssetExtractor instance.

        Args:
            pdf_sources: Mapping of logical source keys to absolute PDF file paths.
            output_base_dir: Base directory where extracted assets will be stored.

        Raises:
            FileNotFoundError: If any configured PDF source does not exist.
        """
        self._pdf_sources: Dict[str, Path] = {}
        for key, path in pdf_sources.items():
            resolved = path.expanduser().resolve()
            if not resolved.exists():
                raise FileNotFoundError(f"Catalog PDF source not found: {resolved}")
            self._pdf_sources[key] = resolved

        self._output_base_dir: Path = output_base_dir.expanduser().resolve()

    @property
    def output_base_dir(self) -> Path:
        """Returns the resolved base directory for extracted image assets."""
        return self._output_base_dir

    def extract_all(self, rules: List[AssetExtractionRule]) -> List[Path]:
        """Executes a batch of extraction rules across the configured PDF sources.

        Args:
            rules: Ordered collection of AssetExtractionRule specifications.

        Returns:
            List of absolute file paths to the extracted and optimized image files.

        Raises:
            KeyError: If a rule references an unregistered PDF source key.
            ValueError: If an xref does not yield valid image bytes.
        """
        extracted_paths: List[Path] = []
        rules_by_source: Dict[str, List[AssetExtractionRule]] = {}

        for rule in rules:
            if rule.source_key not in self._pdf_sources:
                raise KeyError(f"Unknown PDF source key: {rule.source_key}")
            rules_by_source.setdefault(rule.source_key, []).append(rule)

        for source_key, source_rules in rules_by_source.items():
            pdf_path = self._pdf_sources[source_key]
            document = pymupdf.open(str(pdf_path))
            try:
                smask_map: Dict[int, int] = {}
                for page in document:
                    for img_tuple in page.get_images(full=True):
                        if img_tuple[1] > 0:
                            smask_map[img_tuple[0]] = img_tuple[1]

                for rule in source_rules:
                    target_path = self._output_base_dir / rule.target_subpath
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    smask_xref = smask_map.get(rule.xref, 0)

                    if smask_xref > 0:
                        base_pix = pymupdf.Pixmap(document, rule.xref)
                        mask_pix = pymupdf.Pixmap(document, smask_xref)
                        rgba_pix = pymupdf.Pixmap(base_pix, mask_pix)
                        rgba_pix.save(str(target_path))
                    else:
                        info = document.extract_image(rule.xref)
                        if not info or "image" not in info:
                            raise ValueError(
                                f"Failed to extract xref {rule.xref} from {pdf_path}"
                            )
                        target_path.write_bytes(info["image"])

                    if rule.max_dimension is not None:
                        self._optimize_dimension(target_path, rule.max_dimension)

                    extracted_paths.append(target_path)
            finally:
                document.close()

        return extracted_paths

    @staticmethod
    def _optimize_dimension(image_path: Path, max_dimension: int) -> None:
        """Resizes an image in-place using macOS sips if its largest side exceeds max_dimension.

        Args:
            image_path: Path to the extracted raster file.
            max_dimension: Maximum pixel dimension on the longest axis.
        """
        subprocess.run(
            ["sips", "-Z", str(max_dimension), str(image_path)],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def load_rules_from_manifest(manifest_path: Path) -> tuple[Dict[str, Path], List[AssetExtractionRule]]:
    """Loads PDF sources and extraction rules from a JSON manifest file.

    Args:
        manifest_path: Path to the JSON configuration manifest.

    Returns:
        A tuple containing the source dictionary and list of AssetExtractionRule items.
    """
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources: Dict[str, Path] = {
        k: Path(v) for k, v in payload.get("sources", {}).items()
    }
    rules: List[AssetExtractionRule] = [
        AssetExtractionRule(
            source_key=item["source_key"],
            xref=int(item["xref"]),
            target_subpath=item["target_subpath"],
            max_dimension=item.get("max_dimension", 1100),
        )
        for item in payload.get("rules", [])
    ]
    return sources, rules


def main() -> None:
    """CLI entry point for catalog asset extraction."""
    parser = argparse.ArgumentParser(
        description="Extract embedded product and brand images from PDF catalogs."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        required=True,
        help="Path to JSON extraction manifest.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Target directory for extracted assets.",
    )
    args = parser.parse_args()

    sources, rules = load_rules_from_manifest(args.manifest)
    extractor = CatalogAssetExtractor(pdf_sources=sources, output_base_dir=args.output_dir)
    extracted = extractor.extract_all(rules)
    print(f"Successfully extracted and optimized {len(extracted)} assets into {extractor.output_base_dir}")


if __name__ == "__main__":
    main()
