"use strict";
const $ = id => document.getElementById(id);
const state = {
  page:"home", kind:null, sourceBlob:null, sourceName:"", last:null, camera:null,
  apiUrl:(localStorage.getItem("marine_api_url") || "http://localhost:8000").replace(/\/$/,""),
  apiOnline:false, modelReady:false, scene:null, busy:false,
};
const palette={fish:"#39d7fb",coral:"#ff749d",debris:"#ffbe72",disease:"#ff7373",other:"#b69dff"};
function toast(message){const node=$("toast");node.textContent=message;node.classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove("visible"),4200)}
function navigate(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+page));
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.nav===page));
  state.page=page;$("pageCrumb").textContent=({home:"Overview",analyze:"Analysis studio",camera:"Live camera",history:"Analysis history",about:"About research"})[page];
  if(page==="history")renderHistory();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-nav]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.nav)));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.go)));
document.querySelectorAll(".module-card").forEach(btn=>btn.addEventListener("click",()=>{navigate("analyze");toast("Select an image to explore "+btn.dataset.module+" analysis.")}));
$("tryDemo").addEventListener("click",()=>{navigate("analyze");loadScene("reef")});
function clock(){const now=new Date();$("timeLabel").textContent=now.toLocaleString(undefined,{weekday:"short",hour:"2-digit",minute:"2-digit"});$("cameraClock").textContent=now.toLocaleTimeString()}clock();setInterval(clock,1000);

async function checkAPI(){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
  try{
    const response=await fetch(state.apiUrl+"/api/health",{signal:controller.signal});
    if(!response.ok)throw Error("HTTP "+response.status);
    const data=await response.json();if(!data.ok)throw Error("API not ready");
    state.apiOnline=true;state.modelReady=Boolean(data.model_configured);
    $("apiPulse").classList.add("online");$("apiState").textContent=state.modelReady?"Detection API connected":"API online · quality only";
    $("apiSubline").textContent=state.modelReady?"Mode: "+data.model_mode+" (experimental)":"No marine detector configured";
    $("modelReadiness").textContent=state.modelReady?"EXPERIMENTAL":"NOT CONFIGURED";
    $("modelReadiness").className=state.modelReady?"ready":"pending";
  }catch(e){
    state.apiOnline=false;state.modelReady=false;$("apiPulse").classList.remove("online");$("apiState").textContent="Browser demo ready";
    $("apiSubline").textContent="Optional Python API offline";$("modelReadiness").textContent="NOT CONFIGURED";$("modelReadiness").className="pending";
  }finally{clearTimeout(timer)}
}
$("configButton").addEventListener("click",()=>{$("apiUrl").value=state.apiUrl;$("settingsDialog").showModal()});
$("saveSettings").addEventListener("click",()=>{const url=$("apiUrl").value.trim();if(!/^https?:\/\//i.test(url)){toast("Enter an http:// or https:// API address.");return}$("settingsDialog").close();state.apiUrl=url.replace(/\/$/,"");localStorage.setItem("marine_api_url",state.apiUrl);checkAPI()});
checkAPI();

const input=$("inputCanvas"), ic=input.getContext("2d",{willReadFrequently:true});
const result=$("resultCanvas"), rc=result.getContext("2d");
function setInputCanvasSize(w,h){const ratio=Math.min(1,1100/Math.max(w,h));input.width=Math.round(w*ratio);input.height=Math.round(h*ratio)}
function putInput(image,w,h){setInputCanvasSize(w,h);ic.clearRect(0,0,input.width,input.height);ic.drawImage(image,0,0,input.width,input.height);$("emptyUpload").classList.add("hidden");input.classList.remove("hidden");$("analyzeButton").disabled=false}
function updateInputLabel(label,mode){$("filename").textContent=label;$("inputModeTag").textContent=mode}
function resetInput(){
  state.kind=null;state.sourceBlob=null;state.scene=null;state.sourceName="";
  input.classList.add("hidden");$("emptyUpload").classList.remove("hidden");$("fileInput").value="";
  $("analyzeButton").disabled=true;updateInputLabel("No image loaded","AWAITING IMAGE");
}
async function loadBlob(blob,name){
  if(!blob||!blob.type.startsWith("image/")){toast("Please choose a JPG, PNG or WebP image.");return}
  if(blob.size>12*1024*1024){toast("Please choose an image smaller than 12 MB.");return}
  try{
    const url=URL.createObjectURL(blob),im=new Image();
    await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=url});
    if(im.naturalWidth*im.naturalHeight>20_000_000){URL.revokeObjectURL(url);toast("Image dimensions are too large.");return}
    putInput(im,im.naturalWidth,im.naturalHeight);URL.revokeObjectURL(url);
    state.kind="upload";state.sourceBlob=blob;state.sourceName=name||"camera-capture.jpg";state.scene=null;
    updateInputLabel(state.sourceName,"REAL IMAGE · UNVERIFIED");navigate("analyze");
  }catch(e){toast("Could not read image: "+e.message)}
}
$("browseButton").addEventListener("click",()=>$("fileInput").click());
$("fileInput").addEventListener("change",e=>{if(e.target.files[0])loadBlob(e.target.files[0],e.target.files[0].name)});
$("clearButton").addEventListener("click",resetInput);
$("dropZone").addEventListener("click",()=>$("fileInput").click());
$("dropZone").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("fileInput").click()}});
for(const ev of ["dragenter","dragover"]){$("dropZone").addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();$("dropZone").classList.add("dragover")})}
for(const ev of ["dragleave","drop"]){$("dropZone").addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();$("dropZone").classList.remove("dragover")})}
$("dropZone").addEventListener("drop",e=>{if(e.dataTransfer.files[0])loadBlob(e.dataTransfer.files[0],e.dataTransfer.files[0].name)});
document.querySelectorAll(".scenario-btn").forEach(btn=>btn.addEventListener("click",()=>loadScene(btn.dataset.scene)));

function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
function fish(ctx,x,y,s,color,dir=1,spots=false){
  ctx.save();ctx.translate(x,y);ctx.scale(s*dir,s);
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-35,0);ctx.lineTo(-75,-30);ctx.lineTo(-74,30);ctx.closePath();ctx.fill();
  ellipse(ctx,0,0,47,25,color);ctx.fillStyle="#1b6b79";ctx.beginPath();ctx.moveTo(-14,-18);ctx.lineTo(12,-40);ctx.lineTo(20,-19);ctx.fill();
  ctx.fillStyle="#093347";ellipse(ctx,27,-6,4.5,4.5,"#082537");ellipse(ctx,28,-7,1.5,1.5,"white");
  ctx.strokeStyle="#ffffff55";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,-15);ctx.quadraticCurveTo(10,0,22,14);ctx.stroke();
  if(spots){for(const [sx,sy] of [[-21,-5],[-7,9],[0,-9],[12,2]])ellipse(ctx,sx,sy,4,3,"#f7d6a5")}
  ctx.restore();
}
function branch(ctx,x,y,length,angle,depth,color){
  if(depth<0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineCap="round";ctx.lineWidth=4+depth*2;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-length);ctx.stroke();
  if(depth>0){branch(ctx,0,-length,length*.74,-.47,depth-1,color);branch(ctx,0,-length,length*.75,.43,depth-1,color);if(depth>1)branch(ctx,0,-length,length*.65,.06,depth-1,color)}ctx.restore()
}
function bottle(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.rotate(-.3);ctx.fillStyle="#b8f0f466";ctx.strokeStyle="#b4f7f3";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-19,-44,38,100,8);ctx.fill();ctx.stroke();ctx.fillStyle="#47aee7";ctx.fillRect(-19,-8,38,26);ctx.fillStyle="#dadfe0";ctx.fillRect(-10,-57,20,14);ctx.restore()}
function drawScene(scene){
  const w=960,h=560;input.width=w;input.height=h;const ctx=ic;const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,scene==="debris"?"#134f63":"#126880");g.addColorStop(.58,"#0b536f");g.addColorStop(1,"#052638");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let j=0;j<9;j++){ctx.fillStyle="#b3ffff08";ctx.beginPath();ctx.moveTo(70+j*117,-20);ctx.lineTo(126+j*117,-20);ctx.lineTo(275+j*89,560);ctx.lineTo(195+j*87,560);ctx.fill()}
  for(let i=0;i<100;i++){const x=(i*197)%w,y=(i*97+19)%h,rad=1+(i%4);ellipse(ctx,x,y,rad,rad,"#9acde92f")}
  ctx.beginPath();ctx.moveTo(0,500);for(let x=0;x<=w;x+=22)ctx.lineTo(x,504+20*Math.sin(x/89));ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fillStyle="#124e59";ctx.fill();
  for(let i=0;i<14;i++){branch(ctx,(i*83+25)%w,550,24+i%4*9,(i%5-2)*.17,2,i%3===0?"#ef8ba0":"#1eab9e")}
  const detections=[];
  const add=(label,category,box,confidence)=>detections.push({label,category,box,confidence});
  if(scene==="reef"){
    fish(ctx,265,230,1.45,"#f6cc68");add("fish","fish",[157,166,334,296],0.93);
    fish(ctx,601,173,1.05,"#68e3df",-1,true);add("fish","fish",[546,120,680,226],0.89);
    fish(ctx,712,337,.91,"#eea8b9");add("fish","fish",[630,293,765,378],0.86);
    branch(ctx,435,524,75,0,4,"#f18c9f");add("coral formation","coral",[353,311,518,545],0.91);
    branch(ctx,835,540,66,0,3,"#ffbb76");add("coral formation","coral",[758,377,908,540],0.88);
  }else if(scene==="debris"){
    fish(ctx,212,218,1.3,"#d9cb86");add("fish","fish",[108,161,282,285],.84);
    bottle(ctx,632,275);add("plastic bottle","debris",[583,207,675,345],.96);
    ctx.strokeStyle="#b9c4d0";ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(312+i*27,314);ctx.lineTo(326+i*27,456);ctx.stroke()}for(let j=0;j<6;j++){ctx.beginPath();ctx.moveTo(315,318+j*27);ctx.lineTo(433,330+j*27);ctx.stroke()}
    add("fishing net","debris",[303,304,448,470],.91);
    ctx.save();ctx.translate(763,400);ctx.rotate(.35);ctx.fillStyle="#b1bcc1";ctx.fillRect(-25,-27,50,70);ctx.fillStyle="#6e828b";ctx.fillRect(-25,-28,50,9);ctx.restore();add("metal can","debris",[726,361,804,454],.89);
  }else{
    fish(ctx,490,265,2.95,"#8fb6a5",-1,true);add("fish","fish",[251,140,724,383],.93);
    ellipse(ctx,493,198,33,21,"#b24c54");ellipse(ctx,540,246,24,14,"#d78b82");ellipse(ctx,435,286,35,24,"#bb5a65");
    ctx.strokeStyle="#ff7c81";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(493,198,42,30,0,0,Math.PI*2);ctx.stroke();
    add("visible skin abnormality (illustrative)","disease",[439,164,545,233],.87);
  }
  ctx.fillStyle="#efffff";ctx.font="bold 14px system-ui";ctx.fillText("SCHEMATIC UNDERWATER SCENE · NOT A REAL PHOTOGRAPH",22,31);
  return detections;
}
const sceneNames={reef:"Reef biodiversity survey",debris:"Marine debris observation",disease:"Visible fish health observation"};
function loadScene(scene){
  const detections=drawScene(scene);state.kind="demo";state.scene={name:scene,detections};
  state.sourceBlob=null;state.sourceName=sceneNames[scene];$("emptyUpload").classList.add("hidden");input.classList.remove("hidden");$("analyzeButton").disabled=false;
  updateInputLabel(sceneNames[scene],"SCRIPTED DEMO · NOT AI");toast("Illustrative "+sceneNames[scene]+" loaded.");
}
function imageMetrics(canvas){
  const c=document.createElement("canvas");c.width=150;c.height=100;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(canvas,0,0,c.width,c.height);
  const data=x.getImageData(0,0,c.width,c.height).data;let sum=0,sumSquares=0,red=0,green=0,blue=0;
  for(let i=0;i<data.length;i+=4){const luminance=(data[i]+data[i+1]+data[i+2])/3;sum+=luminance;sumSquares+=luminance*luminance;red+=data[i];green+=data[i+1];blue+=data[i+2]}
  const n=data.length/4,brightness=sum/n,contrast=Math.sqrt(Math.max(0,sumSquares/n-brightness*brightness));
  return {brightness:+brightness.toFixed(1),contrast:+contrast.toFixed(1),rgb_mean:[red/n,green/n,blue/n].map(v=>+v.toFixed(1)),low_light:brightness<65,low_contrast:contrast<30,note:"Descriptive statistics, not water-quality measurements."}
}
function demoResult(){
  const d=state.scene.detections;
  const descriptions={
    reef:"Illustrative reef survey: fish and coral have been annotated using fixed, scripted labels. In a real deployment, a validated detection model would have to identify each object. No biological counts or coral health conditions have been measured.",
    debris:"Illustrative pollution scenario: a bottle, fishing net and can are marked at predefined locations. This demonstrates how a trained detector could support a debris inspection; it is not evidence of debris at an actual site.",
    disease:"Illustrative fish-health scenario: a visible skin abnormality is highlighted manually. It is NOT a disease diagnosis. Confirm health conditions through trained experts and validated fish pathology datasets."
  };
  return {status:"demo_scenario",model_mode:"scripted",detections:d,quality:imageMetrics(input),width:input.width,height:input.height,
    counts:Object.fromEntries(["fish","coral","debris","disease"].map(k=>[k,d.filter(x=>x.category===k).length])),
    explanation:descriptions[state.scene.name],disclaimer:"Scripted demonstration on a schematic drawing. Confidence percentages are illustrative values and are NOT model results.",annotated_image:null};
}
function qualityOnlyResult(reason){
  const q=imageMetrics(input);
  return {status:"quality_only",model_mode:"browser",detections:[],quality:q,width:input.width,height:input.height,counts:{},
    explanation:"Actual image loaded and descriptive image statistics calculated (brightness "+q.brightness+", contrast "+q.contrast+"). "+(q.low_light?"Low brightness may affect detection. ":"")+(q.low_contrast?"Low contrast may affect detection. ":"")+
    "No AI model processed this image. Fish species, coral formations, diseases and debris cannot be identified without a configured marine detection model."+ (reason?" "+reason:""),
    disclaimer:"No detection or diagnosis has been made. Quality statistics are descriptive proxies only.",annotated_image:null};
}
function paintResults(data,baseImage){
  return new Promise(resolve=>{
    const paint=img=>{
      result.width=data.width||input.width;result.height=data.height||input.height;rc.clearRect(0,0,result.width,result.height);
      rc.filter=data.status==="quality_only"?"contrast(1.10) saturate(1.06)":"none";
      rc.drawImage(img,0,0,result.width,result.height);rc.filter="none";
      if(!data.annotated_image){
        for(const det of data.detections||[]){
          const [x1,y1,x2,y2]=det.box;const color=palette[det.category]||palette.other;
          const scale=Math.max(1,result.width/960);rc.strokeStyle=color;rc.lineWidth=3*scale;rc.strokeRect(x1,y1,x2-x1,y2-y1);
          rc.font="bold "+Math.max(12,14*scale)+"px system-ui";const label=det.label+" · "+Math.round(det.confidence*100)+"%";
          const tw=rc.measureText(label).width;rc.fillStyle=color;rc.fillRect(x1,Math.max(0,y1-27*scale),tw+14*scale,26*scale);rc.fillStyle="#072335";rc.fillText(label,x1+7*scale,Math.max(14*scale,y1-8*scale));
        }
      }
      resolve();
    };
    if(data.annotated_image){const img=new Image();img.onload=()=>paint(img);img.onerror=()=>paint(baseImage);img.src=data.annotated_image}else paint(baseImage);
  });
}
async function renderResult(data){
  await paintResults(data,input);
  state.last={...data,sourceName:state.sourceName,date:new Date().toISOString()};
  $("resultEmpty").classList.add("hidden");$("resultContent").classList.remove("hidden");
  const statusLabel={demo_scenario:"ILLUSTRATIVE · SCRIPTED",quality_only:"QUALITY CHECK ONLY",model_inference:"EXPERIMENTAL AI OUTPUT"}[data.status]||"ANALYZED";
  $("resultState").textContent=statusLabel;$("resultWatermark").textContent=statusLabel;
  $("resultMeta").textContent=state.sourceName;$("resultDate").textContent=new Date().toLocaleTimeString();
  const counts=data.counts||{};
  for(const key of ["Fish","Coral","Debris","Disease"])$("count"+key).textContent=counts[key.toLowerCase()]||0;
  $("detectionList").replaceChildren();
  if(!data.detections?.length){const n=document.createElement("div");n.className="detection-item";n.textContent=data.status==="quality_only"?"No AI detection performed":"No objects detected";$("detectionList").append(n)}
  else for(const d of data.detections){
    const n=document.createElement("div");n.className="detection-item";
    const label=document.createElement("span");label.textContent="● "+d.label;label.style.color=palette[d.category]||palette.other;
    const score=document.createElement("small");score.textContent=Math.round(d.confidence*100)+"%"+(data.status==="demo_scenario"?" · scripted":"");
    n.append(label,score);$("detectionList").append(n);
  }
  $("explanation").textContent=data.explanation;$("disclaimer").textContent=data.disclaimer||"Research use only; review all findings.";
  storeHistory(data);toast("Analysis complete · "+statusLabel.toLowerCase());
}
$("analyzeButton").addEventListener("click",async()=>{
  if(state.busy||!state.kind)return;
  state.busy=true;$("analyzeButton").disabled=true;$("analyzeButton").textContent="Analyzing image…";
  try{
    if(state.kind==="demo"){await new Promise(r=>setTimeout(r,250));await renderResult(demoResult())}
    else if(state.apiOnline && state.sourceBlob){
      try{
        const form=new FormData();form.append("file",state.sourceBlob,state.sourceName);
        const response=await fetch(state.apiUrl+"/api/analyze",{method:"POST",body:form});
        if(!response.ok){let msg="Server "+response.status;try{const err=await response.json();msg=err.detail||msg}catch{}throw Error(msg)}
        await renderResult(await response.json());
      }catch(err){await renderResult(qualityOnlyResult("The API request failed: "+err.message))}
    }else await renderResult(qualityOnlyResult("Optional Python API is not running."));
  }catch(err){toast("Unable to analyze image: "+err.message)}
  finally{state.busy=false;$("analyzeButton").disabled=!state.kind;$("analyzeButton").innerHTML='◈ Run analysis <span>→</span>'}
});
function download(filename,blob){
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
function reportJSON(){if(!state.last)return null;const {annotated_image,...payload}=state.last;return payload}
$("saveJpeg").addEventListener("click",()=>result.toBlob(blob=>{if(blob)download("marine-annotated.jpg",blob)},"image/jpeg",.9));
$("saveJson").addEventListener("click",()=>download("marine-analysis.json",new Blob([JSON.stringify(reportJSON(),null,2)],{type:"application/json"})));
$("saveText").addEventListener("click",()=>{
  const d=state.last;const lines=["MARINE ECOSYSTEM MONITORING","Date: "+d.date,"Source: "+d.sourceName,"Mode: "+d.status,"","Detection results:"];
  for(const item of d.detections)lines.push(" - "+item.label+" ("+Math.round(item.confidence*100)+"%, "+item.category+")");
  if(!d.detections.length)lines.push(" - No detections provided");lines.push("","Summary:",d.explanation,"","Disclaimer:",d.disclaimer);
  download("marine-analysis.txt",new Blob([lines.join("\n")],{type:"text/plain"}))
});
function storeHistory(data){
  try{
    const hist=JSON.parse(localStorage.getItem("marine_history")||"[]");
    const thumb=document.createElement("canvas");thumb.width=280;thumb.height=170;
    thumb.getContext("2d").drawImage(result,0,0,thumb.width,thumb.height);
    hist.unshift({name:state.sourceName,mode:data.status,date:new Date().toISOString(),count:data.detections.length,thumb:thumb.toDataURL("image/jpeg",.52)});
    localStorage.setItem("marine_history",JSON.stringify(hist.slice(0,12)));
  }catch(e){console.warn("History storage unavailable",e)}
}
function renderHistory(){
  const node=$("historyList");node.replaceChildren();
  let hist=[];try{hist=JSON.parse(localStorage.getItem("marine_history")||"[]")}catch{}
  if(!hist.length){const empty=document.createElement("div");empty.className="history-empty";empty.innerHTML="<h3>No analyses saved yet</h3><p>Upload a photo or run a scenario to create your first record.</p>";node.append(empty);return}
  for(const item of hist){const card=document.createElement("div");card.className="history-card";const img=document.createElement("img");img.src=item.thumb;img.alt="Previous analysis thumbnail";
    const text=document.createElement("div");text.className="hist-main";const title=document.createElement("h3");title.textContent=item.name;
    const sub=document.createElement("p");sub.textContent=new Date(item.date).toLocaleString()+" · "+item.mode+" · "+item.count+" annotations";text.append(title,sub);card.append(img,text);node.append(card)}
}
$("clearHistory").addEventListener("click",()=>{localStorage.removeItem("marine_history");renderHistory();toast("Local analysis history cleared.")});
$("startCamera").addEventListener("click",async()=>{
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error("Camera requires localhost or HTTPS and a compatible browser.");
    if(state.camera)state.camera.getTracks().forEach(x=>x.stop());
    state.camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
    $("cameraVideo").srcObject=state.camera;$("cameraVideo").classList.add("active");$("cameraPlaceholder").classList.add("hidden");
    document.querySelector(".camera-overlay").classList.add("active");$("cameraState").textContent="CAMERA ACTIVE";
    $("startCamera").disabled=true;$("captureCamera").disabled=false;$("stopCamera").disabled=false;
  }catch(e){toast("Camera could not start: "+e.message)}
});
$("stopCamera").addEventListener("click",()=>{
  if(state.camera){state.camera.getTracks().forEach(t=>t.stop());state.camera=null}
  $("cameraVideo").srcObject=null;$("cameraVideo").classList.remove("active");$("cameraPlaceholder").classList.remove("hidden");
  document.querySelector(".camera-overlay").classList.remove("active");$("cameraState").textContent="STOPPED";
  $("startCamera").disabled=false;$("captureCamera").disabled=true;$("stopCamera").disabled=true;
});
$("captureCamera").addEventListener("click",async()=>{
  const v=$("cameraVideo");if(!v.videoWidth)return toast("Waiting for video frames.");
  const frame=document.createElement("canvas");frame.width=Math.min(v.videoWidth,1280);frame.height=Math.round(v.videoHeight*frame.width/v.videoWidth);
  frame.getContext("2d").drawImage(v,0,0,frame.width,frame.height);
  const blob=await new Promise(resolve=>frame.toBlob(resolve,"image/jpeg",.88));
  await loadBlob(blob,"camera-"+Date.now()+".jpg");$("analyzeButton").click();
});
window.addEventListener("beforeunload",()=>{if(state.camera)state.camera.getTracks().forEach(t=>t.stop())});
