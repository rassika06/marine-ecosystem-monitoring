# MarineScope — Marine Ecosystem Monitoring

**Paper title:** An LLM-Augmented CNN Framework for Real-Time Underwater Fish Species and Marine Debris Identification

An interactive student-research **prototype**, based on the IFET College of Engineering paper-presentation slides. A responsive dashboard for fish, coral, marine debris, and visible fish-health observations, with an optional FastAPI inference service.

> **Accuracy disclosure:** The default project does **not** contain trained marine-species, fish-disease, or Mask R-CNN weights. Scripted illustration scenarios are explicitly labeled. On real photos, the default mode measures image brightness/contrast and produces no fabricated species/disease detections. Real predictions require a model installation, appropriate training data, and evaluation.

## Demo in 1 minute (Windows)

1. Click **Code → Download ZIP** on GitHub and unzip the repository.
2. Double-click **RUN_DEMO.bat** in the extracted folder. It runs a local static web server and opens the browser at http://localhost:5500.
3. Click **Explore demo**, select **Reef survey**, **Plastic pollution**, or **Fish health**, then **Run analysis**.
4. See annotations, interpretation, counts, history, and JPG/JSON/TXT downloads. Each demo is **scripted on a schematic illustration**.
5. For your own images, choose an image and click **Run analysis**. With no API or model, the browser provides **actual descriptive quality statistics only**.

Alternatively, from the project root:

```bash
python -m http.server 5500
```

Visit **http://localhost:5500**. Using localhost (rather than a file:// page) also enables browser camera support.

## Run both services with Docker Desktop\n\nFrom the repository folder, run:\n\n```bash\ndocker compose up --build\n```\n\nOpen **http://localhost:5500** for the dashboard and **http://localhost:8000/docs** for the API. The default container configuration is quality-only (no pretend ML results).\n\n## Run the optional Python API

Use Python 3.10+.

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Or Windows: double-click **RUN_API.bat** (installs core dependencies the first time). The dashboard checks **http://localhost:8000/api/health** automatically; you can change the base URL using **Configure API** in the sidebar.

API documentation: http://localhost:8000/docs

## Detection configurations

| Mode | Configuration | What is genuinely supported |
|---|---|---|
| Default | `MODEL_MODE=none` | Image processing, brightness/contrast/RGB statistics, annotated processed image; **no object predictions** |
| Experimental | `MODEL_MODE=owlv2` | OWLv2 pre-trained zero-shot candidate bounding boxes for generic fish, coral, debris etc. No verified species or disease diagnosis |
| Custom | `MODEL_MODE=yolo` and `YOLO_WEIGHTS=...` | Bounding boxes from **your own marine-trained** YOLO model; output quality depends on your training |

**Optional OWLv2**: `pip install torch transformers`, then set `MODEL_MODE=owlv2` before starting the server. The first run downloads large public model weights and may be slow on CPUs. Internet access required on first run. This is zero-shot object detection, **not** a project-trained YOLOv11 or Mask R-CNN.

**Custom YOLO**: `pip install ultralytics`, place **your own trained** weights in `models/marine_best.pt`, set `MODEL_MODE=yolo`. Neither the model nor training images are included. For best marine specificity, train the detector with properly labeled fish, coral, debris, and fish-health data and externally validate results.

**Optional local LLM**: Install [Ollama](https://ollama.com/), run `ollama pull llama3.2:3b`, and set `LLM_MODE=ollama` before starting the API. When a detection model is running, the backend can send only detected labels/confidence and descriptive quality metrics to the local Ollama server (not image pixels). By default, or when Ollama fails, summaries remain transparently **rule-based**. Model-generated explanations may be wrong and must be checked against detector output.

## Implemented features

- Responsive marine monitoring dashboard (no frontend build/install required)
- Four monitoring modules: fish, coral, debris and health observations
- JPG/PNG/WebP drag/drop uploads (up to 12 MB)
- Image visualization, basic enhancement and descriptive quality metrics
- Three **clearly scripted** illustrated example scenarios with overlays
- Optional OWLv2 candidate bounding boxes or compatible custom YOLO weights
- Contextual text explanation, cautious scientific labeling
- Live camera capture from a webcam or supported underwater USB camera
- Browser-local history (up to 12 items)
- JPG annotated image, JSON and TXT report export
- FastAPI `/docs` Swagger API, automated basic smoke tests

## Project structure

```text
marine-ecosystem-monitoring/
├── index.html                  # complete browser dashboard
├── assets/
│   ├── styles.css              # responsive ocean theme
│   └── app.js                  # uploads, demo drawing, camera, exports
├── backend/
│   ├── __init__.py
│   └── app.py                  # FastAPI image processing + optional ML
├── tests/
│   └── test_api.py             # API smoke tests
├── requirements.txt            # core light Python dependencies
├── .env.example                # optional model flags (load as env vars)
├── RUN_DEMO.bat                # Windows frontend startup
├── RUN_API.bat                 # Windows API startup
└── .github/workflows/ci.yml    # tests on each push
```

## Research methodology vs implemented prototype

| Slide proposal | Status |
|---|---|
| Underwater image capture/upload | Implemented |
| Contrast enhancement, normalization | Basic enhancement implemented |
| CNN feature extraction | Optional via pretrained OWLv2 or custom YOLO |
| Mask R-CNN segmentation | **Not implemented** (requires segmentation model and weights) |
| YOLOv11 detection | **Only if custom compatible marine-trained YOLO weights supplied** |
| Fish species and fish disease identification | **Not validated or production ready** |
| LLM semantic interpretation | Optional **local Ollama** model; rule-based fallback by default |
| Results dashboard and downloadable reports | Implemented |
| Real-time video analysis | Camera frame capture implemented; **continuous frame-by-frame detection not implemented** |

No accuracy, health-index percentage, or precision/recall metrics are claimed: these require held-out labeled datasets and experimental evaluation.

## For your paper presentation

1. Open **Overview** and introduce the four monitoring modules.
2. Open **Analysis studio** and select **Plastic pollution** → **Run analysis**.
3. Explain that the drawn image and bounding boxes demonstrate the *target interface*, not trained-model evaluation.
4. Upload a real underwater image and show the real contrast/brightness quality-check output.
5. Explain the proposed flow: capture → preprocessing → candidate detection/segmentation → semantic interpretation → dashboard.
6. Discuss future work: marine datasets, Mask R-CNN, YOLOv11 model training, verified fish pathology labels, LLM grounding, and real-time hardware testing.

## License / credits

Educational prototype built around the authors' own research presentation. No third-party training dataset or pre-trained model binary is bundled. Do not use for environmental enforcement, fish health decisions, or safety-critical tasks without expert validation.
