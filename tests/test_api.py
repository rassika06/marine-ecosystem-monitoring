"""Lightweight tests; no large ML model downloads needed."""
import io
import os

# Ensure CI validates predictable, honest no-model behavior.
os.environ["MODEL_MODE"] = "none"

from fastapi.testclient import TestClient
from PIL import Image

from backend.app import app, categorize, enhance, interpret, quality_metrics


client = TestClient(app)


def make_image():
    im = Image.new("RGB", (80, 60), (18, 90, 140))
    b = io.BytesIO()
    im.save(b, "PNG")
    return b.getvalue()


def test_health_default_mode():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["model_mode"] == "none"
    assert response.json()["model_configured"] is False
    assert response.json()["species_model_validated"] is False


def test_real_image_quality_without_fake_detections():
    response = client.post("/api/analyze", files={"file": ("sea.png", make_image(), "image/png")})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "quality_only"
    assert data["detections"] == []
    assert data["counts"] == {}
    assert data["width"] == 80 and data["height"] == 60
    assert data["annotated_image"].startswith("data:image/jpeg;base64,")
    assert "No fish species" in data["explanation"]


def test_non_image_rejected():
    response = client.post("/api/analyze", files={"file": ("x.txt", b"not a picture", "text/plain")})
    assert response.status_code == 400


def test_oversize_rejected():
    response = client.post("/api/analyze", files={"file": ("big.png", b"0" * (12*1024*1024+1), "image/png")})
    assert response.status_code == 413


def test_category_mapping():
    assert categorize("plastic bottle") == "debris"
    assert categorize("coral reef") == "coral"
    assert categorize("clownfish") == "fish"
    assert categorize("skin ulcer") == "disease"


def test_rule_summary_transparency():
    content = interpret([], {}, "quality_only")
    assert "not available" in content
    assert "No fish species" in content
    assert "not" in content.lower()
