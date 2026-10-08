# Marine Ecosystem Monitoring — Screenshot-matched Presentation UI

This is a carefully reconstructed **student-project interface**, following the four screenshots supplied by the presenters. The screenshot photos have been **cropped from the supplied screenshots** and reused in the five cards and the example result modals. Since the original project code, font files and original-resolution photos were not provided, pixel-perfect source reproduction cannot be guaranteed. The layout is tuned for a desktop browser around **1254 × 682** and is responsive at smaller widths.

## Open in Windows

1. Extract this ZIP.
2. Double-click **RUN_DEMO.bat**. The updated launcher **checks that the new UI and photos are present**, starts its own server on a free port, and opens the correct address automatically (example: **http://127.0.0.1:54321/?ui=screenshot-matched**). Do **not** manually type `localhost:5500` because an old MarineScope server may be running there.
3. Explore the five dashboard cards, output stream, debris audit popup, and Live AI Camera Scanner.
4. To measure a real uploaded image (brightness/contrast), double-click **RUN_API.bat** in a **second** window, then reload the browser.
5. To attempt **experimental actual object detection**, close RUN_API.bat and run **RUN_REAL_AI.bat** instead. First-time model downloads and installation can take several minutes; internet access and sufficient disk space are needed. Do not run both API scripts simultaneously (both use port 8000).
6. Choose **Upload Image** on a card. Actual model predictions, if available, appear with bounding boxes and cautious explanations.
7. Open **Live Camera** → **Start Camera**, or **Use Video File** for an underwater MP4/WebM recording. **Capture & Diagnose Now** analyzes the current frame; **Auto Scan** repeats captures sequentially.
8. Result popups include downloadable annotated pictures, a real one-page PDF report and JSON.

### If the old MarineScope UI still appears

You have either opened an old tab, an old ZIP, or an old `localhost:5500` server. **Download a fresh ZIP** from GitHub, extract it into a separate directory, and make sure `launch_demo.py`, `assets/classic.css`, and `assets/reference/hero.jpg` are present. Double-click that extracted folder's **RUN_DEMO.bat** and use ONLY the new tab it opens. The black window must say `Verified new classic.css / classic.js and ocean photo assets.` and show the random port it selected. If this verification fails, it stops and prints the missing file rather than showing the old interface.

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
- `RUN_DEMO.bat` + `launch_demo.py` — Windows launcher with asset verification, cache bypass and an available local port
- `RUN_API.bat`, `RUN_REAL_AI.bat` — Optional Python API setup

Use for demonstrations and research prototyping only. Do not present example screenshots as validated experiments or clinical findings.