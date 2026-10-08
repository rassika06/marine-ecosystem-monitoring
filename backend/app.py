"""Marine Ecosystem Monitoring API.

HONEST MODES:
- MODEL_MODE=none (default): real image quality checks, no AI detection.
- MODEL_MODE=owlv2: pretrained zero-shot box detection (experimental; CPU-heavy).
- MODEL_MODE=yolo: user-supplied, marine-trained YOLO weights (recommended for accuracy).

Fish disease and fine-grained species labels require task-specific validated weights.
"""
from __future__ import annotations

import base64
import io
import os
import threading
from collections import Counter
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
from pydantic import BaseModel

MAX_BYTES = 12 * 1024 * 1024
MAX_PIXELS = 20_000_000
MODE = os.getenv("MODEL_MODE", "none").lower()
WEIGHTS = os.getenv("YOLO_WEIGHTS", "models/marine_best.pt")
CONFIDENCE = float(os.getenv("CONFIDENCE_THRESHOLD", "0.22"))
OWL_LABELS = [
    "fish", "coral", "sea turtle", "plastic bottle", "plastic bag",
    "fishing net", "metal can", "trash", "crab", "jellyfish",
]
COLORS = {
    "fish": "#37c9fa", "coral": "#ff6b9d", "debris": "#f5b95e",
    "disease": "#ff7171", "other": "#998cf8",
}
app = FastAPI(title="Marine Ecosystem Monitoring API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
_inference_lock = threading.Lock()


class InterpretationRequest(BaseModel):
    detections: list[dict[str, Any]] = []
    quality: dict[str, Any] = {}
    mode: str = "quality_only"


def categorize(name: str) -> str:
    lower = name.lower()
    if any(w in lower for w in ("disease", "lesion", "ulcer", "infection", "white spot", "parasite")):
        return "disease"
    if any(w in lower for w in ("plastic", "trash", "debris", "bottle", "net", "litter", "can", "waste", "rope")):
        return "debris"
    if "coral" in lower or "reef" in lower:
        return "coral"
    if any(w in lower for w in ("fish", "shark", "tuna", "salmon", "clownfish", "snapper")):
        return "fish"
    return "other"


def quality_metrics(im: Image.Image) -> dict[str, Any]:
    small = np.asarray(im.convert("RGB").resize((min(256, im.width), min(256, im.height))))
    brightness = float(np.mean(small))
    grayscale = np.mean(small.astype(float), axis=2)
    # A descriptive proxy, not a scientifically validated underwater visibility score.
    contrast = float(np.std(grayscale))
    color_cast = [round(float(x), 1) for x in small.mean(axis=(0, 1))]
    return {
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "rgb_mean": color_cast,
        "note": "Descriptive image statistics only; not a water-quality or visibility measurement.",
        "low_light": brightness < 65,
        "low_contrast": contrast < 30,
    }


def enhance(im: Image.Image) -> Image.Image:
    # Deterministic preprocessing for visualization. Does not improve all inputs.
    im = ImageOps.autocontrast(im.convert("RGB"), cutoff=1)
    im = ImageEnhance.Color(im).enhance(1.08)
    im = ImageEnhance.Contrast(im).enhance(1.12)
    return im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=85, threshold=3))


@lru_cache(maxsize=1)
def load_model():
    if MODE == "owlv2":
        from transformers import pipeline
        return pipeline("zero-shot-object-detection", model="google/owlv2-base-patch16-ensemble", device=-1)
    if MODE == "yolo":
        from ultralytics import YOLO
        if not Path(WEIGHTS).is_file():
            raise FileNotFoundError(f"Marine-trained weights missing: {WEIGHTS}")
        return YOLO(WEIGHTS)
    return None


def infer(image: Image.Image) -> tuple[list[dict[str, Any]], str]:
    if MODE == "none":
        return [], "quality_only"
    with _inference_lock:
        model = load_model()
        detections = []
        if MODE == "owlv2":
            results = model(image, candidate_labels=OWL_LABELS, threshold=CONFIDENCE)
            for result in results:
                box = result["box"]
                detections.append({
                    "label": str(result["label"]),
                    "category": categorize(str(result["label"])),
                    "confidence": round(float(result["score"]), 3),
                    "box": [round(float(box[k])) for k in ("xmin", "ymin", "xmax", "ymax")],
                })
        elif MODE == "yolo":
            for result in model.predict(source=image, conf=CONFIDENCE, verbose=False):
                for b in result.boxes:
                    class_id = int(b.cls.item())
                    label = str(result.names[class_id])
                    detections.append({
                        "label": label, "category": categorize(label),
                        "confidence": round(float(b.conf.item()), 3),
                        "box": [round(float(v)) for v in b.xyxy[0].tolist()],
                    })
        return detections[:75], "model_inference"


def annotated_jpeg(image: Image.Image, detections: list[dict[str, Any]]) -> str:
    canvas = image.copy()
    draw = ImageDraw.Draw(canvas)
    stroke = max(2, round(max(canvas.size) / 300))
    for item in detections:
        x1, y1, x2, y2 = item["box"]
        color = COLORS.get(item["category"], COLORS["other"])
        draw.rectangle((x1, y1, x2, y2), outline=color, width=stroke)
        caption = f'{item["label"]}  {item["confidence"]:.0%}'
        bounds = draw.textbbox((x1, y1), caption)
        draw.rectangle((x1, max(0, y1 - (bounds[3] - bounds[1]) - 8), x1 + bounds[2] + 12, y1), fill=color)
        draw.text((x1 + 6, max(0, y1 - (bounds[3] - bounds[1]) - 6)), caption, fill="#001526")
    output = io.BytesIO()
    canvas.save(output, "JPEG", quality=84, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode()


def interpret(detections: list[dict[str, Any]], quality: dict[str, Any], mode: str) -> str:
    if mode != "model_inference":
        return ("Image preprocessing and quality statistics are complete. AI object identification "
                "is not available until a compatible detection model is configured. No fish species, "
                "disease, coral or debris conclusions can be made from this image.")
    counts = Counter(x.get("category", "other") for x in detections)
    if not detections:
        intro = "The detector returned no objects above its confidence threshold."
    else:
        intro = "Preliminary detections: " + ", ".join(f"{v} {k}" for k, v in counts.items()) + "."
    caveat = (" These are unverified model predictions, not a biological survey or diagnosis."
              " Verify unusual findings with a marine specialist.")
    if counts["debris"]:
        caveat += " Potential debris should be checked before any cleanup action."
    if quality.get("low_light") or quality.get("low_contrast"):
        caveat += " Low lighting or contrast may reduce reliability."
    return intro + caveat


@app.get("/api/health")
def health():
    available = MODE in ("owlv2", "yolo")
    return {
        "ok": True, "model_mode": MODE, "model_configured": available,
        "disease_model_validated": False, "species_model_validated": False,
        "label": "Experimental object detection" if available else "Quality-only mode",
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image exceeds the 12 MB upload limit.")
    try:
        image = Image.open(io.BytesIO(data))
        image.verify()
        image = Image.open(io.BytesIO(data))
        if image.width * image.height > MAX_PIXELS:
            raise HTTPException(413, "Image dimensions are too large.")
        image = ImageOps.exif_transpose(image).convert("RGB")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, "Please upload a valid JPG, PNG, or WebP image.") from exc
    # Resize for predictable CPU memory and annotated output.
    image.thumbnail((1280, 1280))
    processed = enhance(image)
    metrics = quality_metrics(image)
    try:
        detections, status = infer(processed)
    except Exception as exc:
        raise HTTPException(
            503, f"Model initialization/inference failed: {str(exc)[:250]}. "
                 "Set MODEL_MODE=none to use quality-only analysis."
        ) from exc
    return {
        "status": status, "model_mode": MODE, "width": image.width, "height": image.height,
        "quality": metrics, "detections": detections,
        "counts": dict(Counter(d["category"] for d in detections)),
        "explanation": interpret(detections, metrics, status),
        "annotated_image": annotated_jpeg(processed, detections),
        "disclaimer": "Models are not validated for species/disease diagnosis; use for research demonstrations only.",
    }


@app.post("/api/explain")
def explain(payload: InterpretationRequest):
    # Grounded deterministic semantic interpretation, not represented as an LLM.
    return {
        "explanation": interpret(payload.detections, payload.quality, payload.mode),
        "engine": "deterministic rule-based summary",
        "llm_enabled": False,
    }


@app.get("/")
def root():
    return {"service": "Marine Ecosystem Monitoring API", "docs": "/docs", "health": "/api/health"}
