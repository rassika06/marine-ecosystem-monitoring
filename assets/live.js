/* Continuous webcam analysis: a new frame is sampled ONLY after the prior one finishes.
   Illustrative scenarios are never mixed with these real camera observations. */
"use strict";
(() => {
  const liveCanvas = $("liveOverlay");
  const liveContext = liveCanvas.getContext("2d");
  const liveStart = $("startLive");
  const liveStop = $("stopLive");
  const video = $("cameraVideo");
  const modeTag = $("liveMode");
  const frameCount = $("liveFrames");
  const latency = $("liveLatency");
  const brightness = $("liveBrightness");
  const contrast = $("liveContrast");
  const observations = $("liveObjects");
  const narrative = $("liveNarrative");
  const colors = {fish:"#3edbf6",coral:"#ff8aaa",debris:"#ffbd72",disease:"#ff7474",other:"#aaa9f7"};
  const FRAME_INTERVAL_MS = 1800; // never overlapping requests
  const MAX_CAMERA_EDGE = 640;
  let active = false;
  let generation = 0;
  let timer = null;
  let requestController = null;
  let processed = 0;
  let last = null;
  let hasApiError = false;

  function mode(message) {
    modeTag.textContent = message;
  }

  function setRunning(running) {
    active = running;
    liveStart.disabled = running || !state.camera;
    liveStop.disabled = !running;
    liveStart.textContent = running ? "Analyzing live frames…" : "◉ Start live analysis";
  }

  function clearOverlay() {
    const ctx = liveContext;
    ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
    liveCanvas.classList.remove("active");
    last = null;
  }

  function cameraAvailable() {
    return !!(state.camera &&
      state.camera.getVideoTracks().some(t => t.readyState === "live") &&
      video.videoWidth > 0 && video.videoHeight > 0);
  }

  function captureFrame() {
    const w = video.videoWidth;
    const h = video.videoHeight;
    const factor = Math.min(1, MAX_CAMERA_EDGE / Math.max(w,h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * factor));
    canvas.height = Math.max(1, Math.round(h * factor));
    canvas.getContext("2d", {willReadFrequently:true}).drawImage(video,0,0,canvas.width,canvas.height);
    return canvas;
  }

  function transparentQuality(frame, detail="") {
    const quality = imageMetrics(frame);
    const notes = [];
    if(quality.low_light) notes.push("Low light may affect detection.");
    if(quality.low_contrast) notes.push("Low contrast may reduce object visibility.");
    return {
      status:"quality_only", width:frame.width, height:frame.height,
      quality, detections:[], counts:{}, inference_ms:0,
      explanation:"Live webcam frame measured: brightness "+quality.brightness+
        " and contrast "+quality.contrast+". No AI object detections were performed. "+
        notes.join(" ") + (detail ? " "+detail : ""),
      disclaimer:"Quality statistics only; fish, coral, debris and disease are NOT detected."
    };
  }

  function resizedCanvas() {
    const shell = liveCanvas.parentElement;
    if(!shell)return {width:0,height:0};
    const rect = shell.getBoundingClientRect();
    const width = Math.max(1,Math.round(rect.width));
    const height = Math.max(1,Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    liveCanvas.width = Math.round(width*dpr);
    liveCanvas.height = Math.round(height*dpr);
    liveContext.setTransform(dpr,0,0,dpr,0,0);
    return {width,height};
  }

  function paint(frame, detections, data) {
    const {width,height} = resizedCanvas();
    if(!width || !height)return;
    liveCanvas.classList.add("active");
    const ctx = liveContext;
    ctx.fillStyle = "#061b2b";
    ctx.fillRect(0,0,width,height);
    const scale = Math.min(width/frame.width,height/frame.height);
    const dx = (width-frame.width*scale)/2;
    const dy = (height-frame.height*scale)/2;
    ctx.drawImage(frame,dx,dy,frame.width*scale,frame.height*scale);

    if(data.status === "model_inference") {
      for(const d of detections) {
        if(!Array.isArray(d.box) || d.box.length !== 4)continue;
        const [x1,y1,x2,y2] = d.box.map(Number);
        const safe = [x1,y1,x2,y2].every(Number.isFinite);
        if(!safe)continue;
        const sourceScaleX = frame.width / (data.width || frame.width);
        const sourceScaleY = frame.height / (data.height || frame.height);
        const px = dx+x1*sourceScaleX*scale;
        const py = dy+y1*sourceScaleY*scale;
        const pw = (x2-x1)*sourceScaleX*scale;
        const ph = (y2-y1)*sourceScaleY*scale;
        const color = colors[d.category] || colors.other;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px,py,pw,ph);
        const text = String(d.label || "object")+" "+Math.round((Number(d.confidence)||0)*100)+"%";
        ctx.font = "bold 12px sans-serif";
        const tw = ctx.measureText(text).width;
        const labelY = Math.max(0,py-22);
        ctx.fillStyle = color;
        ctx.fillRect(Math.max(0,px),labelY,tw+12,21);
        ctx.fillStyle = "#071c2e";
        ctx.fillText(text,Math.max(0,px)+6,labelY+14);
      }
    }
    const statusLabel = data.status === "model_inference" ? "UNVALIDATED MODEL BOXES" : "IMAGE-QUALITY MEASUREMENT · NO AI DETECTION";
    ctx.font = "bold 11px sans-serif";
    const labelWidth = Math.min(width-18,ctx.measureText(statusLabel).width+20);
    ctx.fillStyle = "#05243fe6";
    ctx.fillRect(10,Math.max(10,height-40),labelWidth,25);
    ctx.fillStyle = "#e2faf8";
    ctx.fillText(statusLabel,18,Math.max(27,height-23));
    last = {frame,detections,data};
  }

  function showData(frame,data){
    processed++;
    frameCount.textContent = String(processed);
    latency.textContent = data.inference_ms ? Math.round(data.inference_ms)+" ms" : "quality only";
    brightness.textContent = data.quality ? String(data.quality.brightness) : "—";
    contrast.textContent = data.quality ? String(data.quality.contrast) : "—";
    observations.replaceChildren();
    if(data.status !== "model_inference"){
      mode("LIVE · QUALITY ONLY");
      observations.textContent = "No detection model is operating. Fish, coral, debris and disease counts are unavailable.";
    } else {
      mode("LIVE · EXPERIMENTAL AI");
      if(!data.detections?.length){
        observations.textContent = "No candidate objects above the model confidence threshold in this frame.";
      }else{
        const groups = new Map();
        for(const det of data.detections) {
          const key = det.label || "other";
          const existing = groups.get(key) || {count:0,confidence:0};
          existing.count++;existing.confidence = Math.max(existing.confidence,Number(det.confidence)||0);
          groups.set(key,existing);
        }
        for(const [label,item] of groups){
          const row = document.createElement("div");
          row.className = "live-object";
          const left = document.createElement("span");
          left.textContent = label+" × "+item.count;
          const right = document.createElement("strong");
          right.textContent = Math.round(item.confidence*100)+"%";
          row.append(left,right);observations.append(row);
        }
      }
    }
    narrative.textContent=data.explanation || "No explanatory text received.";
    paint(frame,data.detections||[],data);
  }

  async function inferRemote(frame) {
    const blob = await new Promise(resolve=>frame.toBlob(resolve,"image/jpeg",.76));
    if(!blob)throw Error("Camera frame encoding failed");
    const form = new FormData();
    form.append("file",blob,"live-camera.jpg");
    requestController=new AbortController();
    const timeout=setTimeout(()=>requestController.abort(),45000);
    try{
      const response=await fetch(state.apiUrl+"/api/analyze-frame",{
        method:"POST",body:form,signal:requestController.signal,
      });
      if(!response.ok){
        let detail="API error: "+response.status;
        try{const body=await response.json();detail=String(body.detail||detail)}catch{}
        throw Error(detail);
      }
      const data=await response.json();
      if(!["quality_only","model_inference"].includes(data.status))throw Error("Unexpected API result");
      return data;
    } finally {
      clearTimeout(timeout);
      requestController=null;
    }
  }

  function waitForNext(ms,cycle){
    if(!active || cycle!==generation)return;
    timer=setTimeout(()=>runFrame(cycle),ms);
  }

  async function runFrame(cycle){
    if(!active || cycle!==generation)return;
    if(!cameraAvailable()){waitForNext(500,cycle);return}
    const start=performance.now();
    let frame;
    try{
      frame=captureFrame();
      mode(state.apiOnline && !hasApiError ? "ANALYZING LIVE FRAME…" : "MEASURING LIVE FRAME…");
      let data;
      if(state.apiOnline && !hasApiError){
        try {
          data=await inferRemote(frame);
        }catch(e){
          if(!active || cycle!==generation)return;
          hasApiError=true;
          const message=String(e.message).slice(0,120);
          toast("Detection API unavailable. Continuing quality-only monitoring. "+message);
          data=transparentQuality(frame,"The detection API failed: "+message);
        }
      }else{
        data=transparentQuality(frame,"Start the optional detection API for model predictions.");
      }
      if(!active || cycle!==generation)return;
      showData(frame,data);
    }catch(err){
      if(active && cycle===generation){
        toast("Frame analysis failed: "+err.message);
        mode("LIVE · ERROR");
      }
    }finally{
      if(active && cycle===generation){
        const elapsed=performance.now()-start;
        waitForNext(Math.max(350,FRAME_INTERVAL_MS-elapsed),cycle);
      }
    }
  }

  function stopAnalysis({silent=false}={}){
    if(!active)return;
    generation++;
    active=false;
    clearTimeout(timer);timer=null;
    if(requestController){requestController.abort();requestController=null}
    setRunning(false);
    clearOverlay();
    mode(state.camera?"CAMERA ACTIVE · ANALYSIS PAUSED":"WAITING FOR CAMERA");
    if(!silent)toast("Live analysis stopped. Camera feed remains available.");
  }

  liveStart.addEventListener("click",async()=>{
    if(active)return;
    if(!cameraAvailable()){toast("Start the camera first and allow browser access.");return}
    setRunning(true);
    processed=0;
    hasApiError=false;
    frameCount.textContent="0";
    latency.textContent="—";
    brightness.textContent="—";
    contrast.textContent="—";
    observations.textContent="Waiting for first live camera frame…";
    narrative.textContent="Connecting to the local analysis API.";
    mode("CONNECTING…");
    generation++;
    const cycle=generation;
    try { await checkAPI(); } catch {}
    if(!active||cycle!==generation)return;
    if(!state.apiOnline){
      narrative.textContent="API is offline. Live quality measurements will still operate locally in your browser; no AI detections will be shown.";
      toast("Live camera quality measurements started. Run RUN_API.bat for API analysis.");
    }
    runFrame(cycle);
  });
  liveStop.addEventListener("click",()=>stopAnalysis());
  $("stopCamera").addEventListener("click",()=>{stopAnalysis({silent:true});liveStart.disabled=true;mode("WAITING FOR CAMERA")});
  $("captureCamera").addEventListener("click",()=>stopAnalysis({silent:true}));
  for(const button of document.querySelectorAll("[data-nav]")){
    button.addEventListener("click",()=>{
      if(button.dataset.nav!=="camera")stopAnalysis({silent:true});
    });
  }
  // The original camera handler toggles the button's disabled attribute on permission success.
  const observer=new MutationObserver(()=>{
    if(!active)liveStart.disabled=!state.camera;
    if(state.camera&&!active&&modeTag.textContent==="WAITING FOR CAMERA")mode("READY TO ANALYZE");
  });
  observer.observe($("startCamera"),{attributes:true,attributeFilter:["disabled"]});
  window.addEventListener("resize",()=>{if(active && last)paint(last.frame,last.detections,last.data)});
  window.addEventListener("beforeunload",()=>stopAnalysis({silent:true}));
})();
