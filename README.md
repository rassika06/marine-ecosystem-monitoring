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

## Real-time camera analysis (new)

**After updating your repository, download a FRESH ZIP**. Files extracted from yesterday's ZIP do not update automatically.

1. Double-click **RUN_DEMO.bat**. Keep its Command Prompt window open. Your dashboard opens at **http://localhost:5500**.
2. In a **second** Command Prompt window, double-click:
   - **RUN_API.bat** for real image preprocessing and webcam **quality measurements** (no detection weights), or
   - **RUN_REAL_AI.bat** for *experimental real object detection*. This installs Ultralytics and loads **YOLO-World**. On the first use, pretrained weights and a CLIP text encoder must be downloaded. Git and internet access are required. Installation/downloads can take several minutes. Keep this window open.
3. In the dashboard, click **Live camera → Start camera**. Grant camera access in your browser.
4. Click **Start live analysis**. Frames are sampled periodically and analyzed sequentially; if model inference is slow, updates will also be slow. The last processed frame is displayed with its actual predictions.
5. The panel shows **Frames analyzed**, **Inference time**, **Brightness**, **Contrast**, and model-predicted categories when available.
6. Click **Stop analysis** to stop processing, or **Stop camera** to release the camera. You can still choose **Capture & analyze** to send a single frame to Analysis Studio.

**Important limitations:** The webcam sees what your camera actually sees. If you point a laptop webcam into an ordinary room, there may be no fish or coral to find. To test the detector with marine objects, upload a real underwater image in **Analysis Studio**, or use a connected underwater video camera. The demo reef/debris/fish-health drawings remain **scripted** and are clearly labeled. With no detector or on model failure, continuous monitoring shows **measured image quality only** and will **not fabricate bounding boxes**.

**This is sampled live detection, not guaranteed 30 FPS.** Speed depends on computer, image content, model startup, and CPU/GPU. A pretrained general-purpose detector is not a validated marine species or fish-disease classifier.

## Run both services with Docker Desktop

From the repository folder, run:

```bash
docker compose up --build
```

Open **http://localhost:5500** for the dashboard and **http://localhost:8000/docs** for the API. The default container configuration is quality-only (no pretend ML results).

## Run the optional Python API

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
| Experimental (one-click Windows) | `MODEL_MODE=yoloworld` / **RUN_REAL_AI.bat** | Pretrained YOLO-World open-vocabulary bounding boxes for candidate fish, coral and debris; validation required |
| Custom | `MODEL_MODE=yolo` and `YOLO_WEIGHTS=...` | Bounding boxes from **your own marine-trained** YOLO model; output quality depends on your training |

**Optional OWLv2**: `pip install torch transformers`, then set `MODEL_MODE=owlv2` before starting the server. The first run downloads large public model weights and may be slow on CPUs. Internet access required on first run. This is zero-shot object detection, **not** a project-trained YOLOv11 or Mask R-CNN.

**Experimental YOLO-World**: The [official Ultralytics YOLO-World documentation](https://docs.ultralytics.com/models/yolo-world/) describes `YOLOWorld("yolov8s-worldv2.pt")` and `set_classes(...)`, used here with candidate marine labels. The initial model and CLIP text-encoder setup may need an internet connection and Git; CPU inference is generally slower than a webcam's video FPS. YOLO-World returns **bounding boxes, not Mask R-CNN segmentation masks**. Predictions are research-only and may fail on some underwater conditions. Review Ultralytics licensing if distributing/deploying beyond an educational prototype.

**Custom YOLO**: `pip install ultralytics`, place **your own trained** weights in `models/marine_best.pt`, set `MODEL_MODE=yolo`. Neither the model nor training images are included. For best marine specificity, train the detector with properly labeled fish, coral, debris, and fish-health data and externally validate results.

**Optional local LLM**: Install [Ollama](https://ollama.com/), run `ollama pull llama3.2:3b`, and set `LLM_MODE=ollama` before starting the API. When a detection model is running, the backend can send only detected labels/confidence and descriptive quality metrics to the local Ollama server (not image pixels). By default, or when Ollama fails, summaries remain transparently **rule-based**. Model-generated explanations may be wrong and must be checked against detector output.

## Implemented features

- Responsive marine monitoring dashboard (no frontend build/install required)
- Four monitoring modules: fish, coral, debris and health observations
- JPG/PNG/WebP drag/drop uploads (up to 12 MB)
- Image visualization, basic enhancement and descriptive quality metrics
- Three **clearly scripted** illustrated example scenarios with overlays
- Optional OWLv2, YOLO-World or compatible custom YOLO detection weights
- Contextual text explanation, cautious scientific labeling
- Live camera capture **and continuous sequential frame sampling** from a webcam or supported underwater USB camera
- Real-time frame quality metrics and (when a model is active) experimental object bounding boxes
- Browser-local history (up to 12 items)
- JPG annotated image, JSON and TXT report export
- FastAPI `/docs` Swagger API, automated basic smoke tests

## Project structure

```text
marine-ecosystem-monitoring/
├── index.html                  # complete browser dashboard
├── assets/
│   ├── styles.css              # responsive ocean theme
│   ├── app.js                  # uploads, demo drawing, camera, exports
│   └── live.js                 # sequential frame inference + overlay
├── backend/
│   ├── __init__.py
│   └── app.py                  # FastAPI image processing + optional ML
├── tests/
│   └── test_api.py             # API smoke tests
├── requirements.txt            # core light Python dependencies
├── .env.example                # optional model flags (load as env vars)
├── RUN_DEMO.bat                # Windows frontend startup
├── RUN_API.bat                 # Windows quality-only API startup
├── RUN_REAL_AI.bat             # Windows pretrained YOLO-World API setup
└── .github/workflows/ci.yml    # tests on each push
```

## Research methodology vs implemented prototype

| Slide proposal | Status |
|---|---|
| Underwater image capture/upload | Implemented |
| Contrast enhancement, normalization | Basic enhancement implemented |
| CNN feature extraction | Optional via pretrained OWLv2, YOLO-World or custom YOLO |
| Mask R-CNN segmentation | **Not implemented** (requires segmentation model and weights) |
| YOLOv11 detection | **Only if custom compatible marine-trained YOLO weights supplied** |
| Fish species and fish disease identification | **Not validated or production ready** |
| LLM semantic interpretation | Optional **local Ollama** model; rule-based fallback by default |
| Results dashboard and downloadable reports | Implemented |
| Real-time video analysis | **Sequential sampled frame analysis implemented**; experimental bounding-box detection requires a model. Continuous 30 FPS not guaranteed |

No accuracy, health-index percentage, or precision/recall metrics are claimed: these require held-out labeled datasets and experimental evaluation.

## For your paper presentation

1. Open **Overview** and introduce the four monitoring modules.
2. Open **Analysis studio** and select **Plastic pollution** → **Run analysis**.
3. Explain that the drawn image and bounding boxes demonstrate the *target interface*, not trained-model evaluation.
4. Run **RUN_REAL_AI.bat** in a second terminal (first-time setup may be slow), upload a real underwater image and show actual **experimental** bounding-box detections when the model is ready, or quality metrics only if not. You may also use **Live camera → Start camera → Start live analysis**.
5. Explain the proposed flow: capture → preprocessing → candidate detection/segmentation → semantic interpretation → dashboard.
6. Discuss future work: marine datasets, Mask R-CNN, YOLOv11 model training, verified fish pathology labels, LLM grounding, and real-time hardware testing.

## License / credits

Educational prototype built around the authors' own research presentation. No third-party training dataset or pre-trained model binary is bundled. Do not use for environmental enforcement, fish health decisions, or safety-critical tasks without expert validation.
