const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let filters=[...window.DEFAULT_FILTERS];
try{const saved=JSON.parse(localStorage.getItem("butterfly_custom_filters")||"[]"); filters.push(...saved)}catch{}
let selected=0, image=null, intensity=100, ratio="3/4", playlist=[];
const canvas=$("#canvas"), ctx=canvas.getContext("2d");
const filterList=$("#filterList"), selectedName=$("#selectedName");

function renderList(){
  const q=$("#search").value.toLowerCase().trim();
  filterList.innerHTML="";
  filters.forEach((f,i)=>{if(!f.name.toLowerCase().includes(q))return;
    const b=document.createElement("button"); b.className="filterItem"+(i===selected?" active":"");
    b.innerHTML=`<span>${escapeHtml(f.name)}</span><span class="num">${String(i+1).padStart(3,"0")}</span>`;
    b.onclick=()=>{selected=i; selectedName.textContent=f.name; renderList(); draw();};
    filterList.appendChild(b);
  });
  $("#count").textContent=filters.length; $("#skinCount").textContent=filters.length;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function loadFile(file){
  if(!file||!file.type.startsWith("image/"))return;
  const r=new FileReader(); r.onload=e=>{image=new Image();image.onload=()=>{$("#dropzone").classList.add("hasImage");$("#emptyState").style.display="none";draw()};image.src=e.target.result};r.readAsDataURL(file);
}
function draw(){
 if(!image)return;
 const [rw,rh]=ratio.split("/").map(Number), max=1600;
 let w=image.naturalWidth,h=image.naturalHeight, ar=rw/rh;
 if(w/h>ar) h=Math.round(w/ar); else w=Math.round(h*ar);
 const scale=Math.min(max/w,max/h,1); canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.save();
 const f=filters[selected];
 ctx.filter=cssFor(f.name, intensity, f.recipe||"");
 ctx.drawImage(image,0,0,canvas.width,canvas.height); ctx.restore();
 overlay(f.name);
}
function cssFor(name, I, recipe){
 if(recipe)return recipe.replace(/\b(\d+(?:\.\d+)?)\b/g,(m,n)=>n); 
 const x=I/100, n=name.toLowerCase();
 let s="none";
 if(n.includes("negative")||n.includes("x-ray")||n.includes("radiograph")) s="invert(1) contrast(1.25) grayscale(.35)";
 else if(n.includes("night")||n.includes("blacklight")||n.includes("phosphor")) s="brightness(.75) contrast(1.35) hue-rotate(85deg) saturate(1.7)";
 else if(n.includes("thermal")||n.includes("heat")||n.includes("chromatography")) s="contrast(1.4) saturate(2.1) hue-rotate(-28deg)";
 else if(n.includes("cyanotype")||n.includes("blue")) s="grayscale(.35) sepia(.15) hue-rotate(165deg) saturate(1.8) contrast(1.2)";
 else if(n.includes("redscale")||n.includes("amber")||n.includes("giallo")) s="sepia(.55) saturate(1.8) hue-rotate(-12deg) contrast(1.1)";
 else if(n.includes("solarized")) s="invert(.8) contrast(1.3) saturate(1.4)";
 else if(n.includes("vhs")||n.includes("camcorder")||n.includes("vcr")) s="contrast(1.15) saturate(1.35) hue-rotate(-8deg)";
 else if(n.includes("pastel")||n.includes("pink")||n.includes("aura")||n.includes("bloom")) s="brightness(1.12) saturate(1.35) contrast(.9)";
 else if(n.includes("daguerreotype")||n.includes("expired")||n.includes("archive")) s="grayscale(.7) sepia(.5) contrast(1.15)";
 else if(n.includes("dither")||n.includes("256")||n.includes("lcd")||n.includes("teletext")) s="saturate(.6) contrast(1.45)";
 else if(n.includes("chrome")||n.includes("liquid")) s="contrast(1.5) saturate(1.4) brightness(1.05)";
 else if(n.includes("toon")||n.includes("low poly")||n.includes("stencil")) s="contrast(1.55) saturate(1.45)";
 else s=`contrast(${1+.35*x}) saturate(${1+.55*x}) brightness(${1+.08*x})`;
 return s;
}
function overlay(name){
 const n=name.toLowerCase(), w=canvas.width,h=canvas.height,x=intensity/100;
 if(n.includes("scan")||n.includes("matrix")||n.includes("hud")||n.includes("teletext")||n.includes("osd")){
   ctx.save();ctx.globalAlpha=.18*x;ctx.strokeStyle="#b9ff62";ctx.lineWidth=1;
   for(let y=0;y<h;y+=4)ctx.beginPath(),ctx.moveTo(0,y),ctx.lineTo(w,y),ctx.stroke();
   ctx.restore();
 }
 if(n.includes("dither")||n.includes("halftone")||n.includes("engraving")||n.includes("stitch")||n.includes("weave")){
   ctx.save();ctx.globalAlpha=.18*x;ctx.fillStyle="#fff";let gap=Math.max(3,8-x*5);
   for(let y=0;y<h;y+=gap)for(let xx=0;xx<w;xx+=gap){if(((xx+y)/gap)%2<1)ctx.fillRect(xx,y,1,1)}ctx.restore();
 }
 if(n.includes("glitch")||n.includes("misprint")||n.includes("split")||n.includes("screen clash")||n.includes("pixel sort")||n.includes("hyper slice")){
   ctx.save();for(let i=0;i<8*x;i++){let y=Math.random()*h,hh=2+Math.random()*12;ctx.globalAlpha=.25;ctx.drawImage(canvas,Math.random()*18-9,y,w,hh,Math.random()*14-7,y,w,hh)}ctx.restore();
 }
 if(n.includes("redaction")||n.includes("forensic")||n.includes("dossier")){ctx.save();ctx.globalAlpha=.75*x;ctx.fillStyle="#08090d";for(let i=0;i<7;i++)ctx.fillRect(w*.1+Math.random()*w*.7,Math.random()*h,w*.12,8+Math.random()*18);ctx.restore()}
 if(n.includes("scribble")||n.includes("riot")||n.includes("cyber sigil")){ctx.save();ctx.globalAlpha=.5*x;ctx.strokeStyle="#b9ff62";for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(Math.random()*w,Math.random()*h);ctx.lineTo(Math.random()*w,Math.random()*h);ctx.stroke()}ctx.restore()}
}
function download(){
 if(!image)return alert("Choose an image first.");
 const a=document.createElement("a");a.download=`butterflyeffect-${filters[selected].name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.png`;a.href=canvas.toDataURL("image/png");a.click();
}
$("#chooseBtn").onclick=()=>$("#fileInput").click(); $("#dropzone").onclick=e=>{if(e.target===canvas)return;$("#fileInput").click()};
$("#fileInput").onchange=e=>loadFile(e.target.files[0]);
$("#dropzone").ondragover=e=>{e.preventDefault();$("#dropzone").classList.add("drag")};
$("#dropzone").ondragleave=()=>$("#dropzone").classList.remove("drag");
$("#dropzone").ondrop=e=>{e.preventDefault();$("#dropzone").classList.remove("drag");loadFile(e.dataTransfer.files[0])};
$("#search").oninput=renderList;
$("#intensity").oninput=e=>{intensity=+e.target.value;$("#intensityValue").textContent=intensity+"%";draw()};
$$(".ratio").forEach(b=>b.onclick=()=>{$$(".ratio").forEach(x=>x.classList.remove("active"));b.classList.add("active");ratio=b.dataset.ratio;draw()});
$("#prevBtn").onclick=()=>{selected=(selected-1+filters.length)%filters.length;selectedName.textContent=filters[selected].name;renderList();draw()};
$("#nextBtn").onclick=()=>{selected=(selected+1)%filters.length;selectedName.textContent=filters[selected].name;renderList();draw()};
$("#downloadBtn").onclick=download;
$("#fullscreenBtn").onclick=()=>$("#dropzone").requestFullscreen?.();
$("#themeBtn").onclick=()=>document.body.classList.toggle("light");

$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".tabPage").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.tab).classList.add("active")});

function addToPlaylist(i){if(!playlist.includes(i))playlist.push(i);renderPlaylist()}
function renderPlaylist(){const el=$("#playlistItems");el.innerHTML=playlist.length?playlist.map(i=>`<div class="playlistRow"><span>${escapeHtml(filters[i].name)}</span><button onclick="playlist=playlist.filter(x=>x!==${i});renderPlaylist()">Remove</button></div>`).join(""):"<p>No skins added yet. Use the browser console or add-to-playlist from a future update.</p>"}
$("#addFilterBtn").onclick=()=>$("#modal").classList.remove("hidden");
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#newIntensity").oninput=e=>$("#newIntensityValue").textContent=e.target.value+"%";
$("#saveFilter").onclick=()=>{
 const name=$("#newName").value.trim(); if(!name)return alert("Give the filter a name.");
 const custom={id:"custom-"+Date.now(),name,category:$("#newCategory").value,recipe:$("#newRecipe").value.trim()||"contrast(1.2) saturate(1.3)"};
 const customs=filters.filter(f=>f.id.startsWith("custom-"));customs.push(custom);localStorage.setItem("butterfly_custom_filters",JSON.stringify(customs));
 filters=[...window.DEFAULT_FILTERS,...customs];selected=filters.length-1;selectedName.textContent=name;renderList();$("#modal").classList.add("hidden");$("#newName").value="";$("#newRecipe").value="";draw();
};
$("#exportPack").onclick=()=>{const c=filters.filter(f=>f.id.startsWith("custom-"));const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(c,null,2)],{type:"application/json"}));a.download="butterflyeffect-custom-filters.json";a.click()};
$("#importPack").onclick=()=>$("#packInput").click();
$("#packInput").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const incoming=JSON.parse(r.result).filter(x=>x.name);const old=filters.filter(f=>f.id.startsWith("custom-"));const merged=[...old,...incoming.map(x=>({...x,id:"custom-"+Date.now()+"-"+Math.random()}))];localStorage.setItem("butterfly_custom_filters",JSON.stringify(merged));filters=[...window.DEFAULT_FILTERS,...merged];renderList()}catch{alert("Invalid filter pack.")}};r.readAsText(file)};

renderList();selectedName.textContent=filters[0].name;
