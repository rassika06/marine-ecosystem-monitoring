# Marine Ecosystem Monitoring — Screenshot-matched Presentation UI

This is a carefully reconstructed **student-project interface**, following the four screenshots supplied by the presenters. The screenshot photos have been **cropped from the supplied screenshots** and reused in the five cards and the example result modals. Since the original project code, font files and original-resolution photos were not provided, pixel-perfect source reproduction cannot be guaranteed. The layout is tuned for a desktop browser around **1254 × 682** and is responsive at smaller widths.

## Open in Windows

1. Extract this ZIP.
2. Double-click **RUN_DEMO.bat**. Your browser opens at **http://localhost:5500**.
3. Explore the five dashboard cards, output stream, debris audit popup, and Live AI Camera Scanner.
4. To measure a real uploaded image (brightness/contrast), double-click **RUN_API.bat** in a **second** window, then reload the browser.
5. To attempt **experimental actual object detection**, close RUN_API.bat and run **RUN_REAL_AI.bat** instead. First-time model downloads and installation can take several minutes; internet access and sufficient disk space are needed. Do not run both API scripts simultaneously (both use port 8000).
6. Choose **Upload Image** on a card. Actual model predictions, if available, appear with bounding boxes and cautious explanations.
7. Open **Live Camera** → **Start Camera**, or **Use Video File** for an underwater MP4/WebM recording. **Capture & Diagnose Now** analyzes the current frame; **Auto Scan** repeats captures sequentially.
8. Result popups include downloadable annotated pictures, a real one-page PDF report and JSON.

## IMPORTANT: What is real and what is illustrative

- The dashboard screenshots are faithfully styled and use **the same pictures cropped from your references**, but these original photos are not supplied at full resolution.
- The preloaded results stream, debris audit and EUS screenshot diagnosis are explicitly **illustrative examples**. Their displayed counts, confidence values, clinical labels and pollution alerts are from screenshots, NOT fresh inferences.
- With `MODEL_MODE=none`, a real image receives real preprocessing and quality metrics, but **no fake object detection**.
- With `MODEL_MODE=yoloworld`, the Ultralytics pretrained YOLO-World detector returns **experimental boxes** for fish, coral and debris candidate classes. Underwater conditions may produce errors. This is *not* a validated fish species model.
- There is **no validated fish disease classifier, no Mask R-CNN instance segmentation, and no medically reliable treatments** in this package. This remains future project work.
- `MODEL_MODE=yolo` can use independently trained marine YOLO weights via `YOLO_WEIGHTS` (not supplied).
- The result summary is deterministic and cautionary, **not LLM-generated**. The proposed project title can still describe future LLM integration, but this package does not claim it.

## Folder structure

- `index.html` — redesigned page matching the screenshots
- `assets/classic.css` — layout, five cards, popups, responsive rules
- `assets/classic.js` — navigation, real uploads, PDF/image export, webcam/video capture, demo results
- `assets/reference/*.jpg` — crops extracted from user screenshots (same photos, screenshot-only quality)
- `backend/app.py` — FastAPI processing and optional pretrained YOLO-World
- `RUN_DEMO.bat`, `RUN_API.bat`, `RUN_REAL_AI.bat` — Windows setup

Use for demonstrations and research prototyping only. Do not present example screenshots as validated experiments or clinical findings.