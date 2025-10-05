// ======== Utilidades ========
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); } // compatible con Safari/iOS

// ======== Datos base (seed) ========
const DEFAULT_DB = {
vehicles: [
{year:2016, make:"Toyota", model:"Corolla", engine:"1.8L 2ZR-FE", id:"2016-Toyota-Corolla"},
{year:2012, make:"Honda", model:"Civic", engine:"1.8L R18Z1", id:"2012-Honda-Civic"}
],
topics: [
{vid:"2016-Toyota-Corolla", section:"Mantenimiento", title:"Cambio de aceite",
steps:["Eleva el vehículo de forma segura","Drena el aceite","Cambia el filtro","Rellena con 0W-20 (4.2 L)","Verifica fugas"]},
{vid:"2016-Toyota-Corolla", section:"Especificaciones",
specs: {"Aceite motor":"0W-20, 4.2 L","Torque tapón cárter":"27 N·m","Bujías":"Iridio 0.7-0.8 mm"} },
{vid:"2016-Toyota-Corolla", section:"Procedimientos", title:"Cambio de bujías",
steps:["Desconecta bobinas","Retira bujías con dado de 14 mm","Instala a 18 N·m (aprox.)","Conecta bobinas y prueba"],
images:[]},
],
diagrams:[
{vid:"2016-Toyota-Corolla", title:"Esquema básico batería/alternador (placeholder)",
type:"svg",
data:`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'>
<rect width='1200' height='800' fill='#0b1020'/>
<g stroke='#ef4444' stroke-width='4' fill='none'>
<rect x='80' y='320' width='160' height='120' rx='12' stroke='#fff'/>
<text x='160' y='385' fill='#fff' text-anchor='middle' font-family='Arial' font-size='18'>Batería</text>
<line x1='240' y1='380' x2='520' y2='380'/>
<circle cx='520' cy='380' r='10' fill='#ef4444'/>
<rect x='540' y='320' width='200' height='120' rx='12' stroke='#fff'/>
<text x='640' y='385' fill='#fff' text-anchor='middle' font-family='Arial' font-size='18'>Alternador</text>
<line x1='740' y1='380' x2='1040' y2='380'/>
<rect x='1040' y='340' width='100' height='80' rx='8' stroke='#fff'/>
<text x='1090' y='385' fill='#fff' text-anchor='middle' font-family='Arial' font-size='16'>ECM</text>
</g>
</svg>`}
],
dtc: [
{code:"P0300", title:"Fallo de encendido aleatorio", notes:"Posibles: bujías, bobinas, inyectores, fugas de vacío, presión de combustible"},
{code:"P0171", title:"Mezcla pobre (Banco 1)", notes:"Posibles: MAF sucio, fugas de admisión, bomba de combustible débil"}
]
};
const DB_KEY = "autotech.db.pro";

// ======== Helpers de almacenamiento (con fallback) ========
function getDB(){
const raw = localStorage.getItem(DB_KEY);
if(!raw){ localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB)); return deepClone(DEFAULT_DB); }
try{ return JSON.parse(raw); }catch(e){ return deepClone(DEFAULT_DB); }
}
function setDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

// ======== DOM ready (evita correr antes de que exista el HTML) ========
document.addEventListener('DOMContentLoaded', () => {

// Utilidad corta
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ======== SPA ========
const PAGES = ["finder","results","viewer","admin","help"];
function go(p){
$$('.nav button').forEach(b=> b.classList.toggle('active', b.dataset.page===p));
PAGES.forEach(id => $("#page-"+id).classList.toggle('hidden', id!==p));
}
$("#year").textContent = new Date().getFullYear();

// ======== Estado ========
let DB = getDB();
let currentVID = null;
let currentTab = "Mantenimiento";
let currentViewItem = null; // topic o diagrama

// ======== Finder ========
function unique(arr){ return [...new Set(arr)]; }
function fillFinder(){
const years = unique(DB.vehicles.map(v=>v.year)).sort((a,b)=>b-a);
$("#selYear").innerHTML = `<option value="">Selecciona</option>` + years.map(y=>`<option>${y}</option>`).join('');
$("#selMake").innerHTML = `<option value="">Selecciona</option>`;
$("#selModel").innerHTML = `<option value="">Selecciona</option>`;
}
fillFinder();

$("#selYear").addEventListener('change', e=>{
const y = +e.target.value;
const makes = unique(DB.vehicles.filter(v=>v.year===y).map(v=>v.make)).sort();
$("#selMake").innerHTML = `<option value="">Selecciona</option>` + makes.map(m=>`<option>${m}</option>`).join('');
$("#selModel").innerHTML = `<option value="">Selecciona</option>`;
});
$("#selMake").addEventListener('change', e=>{
const y = +$("#selYear").value; const m = e.target.value;
const models = unique(DB.vehicles.filter(v=>v.year===y && v.make===m).map(v=>v.model)).sort();
$("#selModel").innerHTML = `<option value="">Selecciona</option>` + models.map(mo=>`<option>${mo}</option>`).join('');
});

$("#btnReset").onclick = ()=>{ fillFinder(); };
$("#btnSelect").onclick = ()=>{
const y = +$("#selYear").value, m=$("#selMake").value, mo=$("#selModel").value;
if(!y||!m||!mo) return alert("Selecciona Año, Marca y Modelo");
const v = DB.vehicles.find(v=>v.year===y && v.make===m && v.model===mo);
if(!v) return alert("No encontrado en la base local");
currentVID = v.id;
$("#vehicleInfo").textContent = `${v.year} ${v.make} ${v.model} — ${v.engine}`;
go("results");
renderResults();
};

// ======== Results / Tabs ========
const tabsEl = document.querySelector(".tabs");
if (tabsEl) {
tabsEl.addEventListener('click', e=>{
if(e.target.tagName!=='BUTTON') return;
$$(".tabs button").forEach(b=>b.classList.toggle('active', b===e.target));
currentTab = e.target.dataset.tab;
renderResults();
});
}

function renderResults(){
const area = $("#resultList");
area.innerHTML = "";
if(!currentVID) return;

if(currentTab==="DTC"){
const box = document.createElement('div');
box.innerHTML = `<div class="pill">Códigos DTC genéricos (texto original)</div>
<ul>${DB.dtc.map(d=>`<li><b>${d.code}</b> — ${d.title}<br><small>${d.notes||""}</small></li>`).join("")}</ul>`;
area.appendChild(box); return;
}

if(currentTab==="Diagramas"){
const diagrams = DB.diagrams?.filter(d=>d.vid===currentVID) || [];
if(!diagrams.length){ area.innerHTML = `<div class="pill">Sin diagramas para este vehículo. Añade en Admin.</div>`; return; }
const ul = document.createElement('ul'); ul.style.listStyle='none'; ul.style.padding=0;
diagrams.forEach((dg,i)=>{
const li=document.createElement('li'); li.className='card';
li.innerHTML = `<h3 style="margin:0 0 6px">${dg.title}</h3><button class="ghost" data-open-diag="${i}">Abrir diagrama</button>`;
ul.appendChild(li);
});
area.appendChild(ul);
$$("[data-open-diag]").forEach(btn=>{
btn.onclick = ()=>{
const index = +btn.dataset.openDiag;
const list = DB.diagrams.filter(d=>d.vid===currentVID);
currentViewItem = list[index];
openDiagram(currentViewItem);
};
});
return;
}

// Mantenimiento / Especificaciones / Procedimientos
const items = DB.topics.filter(t=>t.vid===currentVID && t.section===currentTab);
if(!items.length){ area.innerHTML = `<div class="pill">Sin contenido en ${currentTab} para este vehículo.</div>`; return; }
const ul = document.createElement('ul'); ul.style.listStyle='none'; ul.style.padding=0;
items.forEach((it,i)=>{
const li=document.createElement('li'); li.className='card';
li.innerHTML = `<h3 style="margin:0 0 6px">${it.title || it.section}</h3><button class="ghost" data-open="${i}">Abrir</button>`;
ul.appendChild(li);
});
area.appendChild(ul);
$$('[data-open]').forEach(btn=>{
btn.onclick = ()=>{
const index = +btn.dataset.open;
const list = DB.topics.filter(t=>t.vid===currentVID && t.section===currentTab);
currentViewItem = list[index];
openTopic(currentViewItem);
};
});
}

// ======== Viewer: topics ========
function openTopic(item){
$("#viewTitle").textContent = item.title || item.section;
const body = $("#viewBody"); body.innerHTML = "";
$("#diagramToolbar").classList.add("hidden");

if(item.steps){
const ol=document.createElement('ol');
item.steps.forEach(s=>{ const li=document.createElement('li'); li.textContent=s; ol.appendChild(li); });
body.appendChild(ol);
}
if(item.specs){
const table=document.createElement('table'); table.className='spec';
table.innerHTML = Object.keys(item.specs).map(k=>`<tr><td>${k}</td><td>${item.specs[k]}</td></tr>`).join('');
body.appendChild(table);
}
if(item.images && item.images.length){
item.images.forEach(img=>{
const el = document.createElement('img');
el.src = img.data; el.alt = img.name||'img';
el.style.maxWidth='100%'; el.style.marginTop='8px';
el.style.border='1px solid var(--outline)'; el.style.borderRadius='8px';
body.appendChild(el);
});
}
go("viewer");
}

// ======== Visor de diagramas (pan/zoom) ========
let panZoom = {scale:1, tx:0, ty:0};
function openDiagram(dg){
$("#viewTitle").textContent = dg.title;
$("#diagramToolbar").classList.remove("hidden");
const body = $("#viewBody"); body.innerHTML = "";

const wrap = document.createElement('div'); wrap.className='viewerWrap';
const inner = document.createElement('div'); inner.className='viewerCanvas';
inner.style.transform = 'translate(0px,0px) scale(1)';

if(dg.type==='svg' || (dg.type==='auto' && dg.data.trim().startsWith('<svg'))){
inner.innerHTML = dg.data; // SVG inline
} else {
const img = document.createElement('img'); img.className='viewerImg'; img.src = dg.data; // PNG/JPG dataURL
inner.appendChild(img);
}

wrap.appendChild(inner); body.appendChild(wrap);
const caption = document.createElement('div'); caption.className='imgCaption';
caption.textContent = 'Consejo: rueda para zoom, arrastra para mover. Botones arriba para ajustar.';
body.appendChild(caption);

panZoom = {scale:1, tx:0, ty:0};

let dragging=false, sx=0, sy=0;
function apply(){ inner.style.transform = `translate(${panZoom.tx}px, ${panZoom.ty}px) scale(${panZoom.scale})`; }
wrap.addEventListener('wheel', (e)=>{
e.preventDefault();
const delta = e.deltaY<0 ? 1.1 : 0.9;
const rect = wrap.getBoundingClientRect();
const cx = e.clientX - rect.left - panZoom.tx;
const cy = e.clientY - rect.top - panZoom.ty;
panZoom.tx = e.clientX - rect.left - cx*delta;
panZoom.ty = e.clientY - rect.top - cy*delta;
panZoom.scale *= delta;
panZoom.scale = Math.max(0.2, Math.min(8, panZoom.scale));
apply();
}, {passive:false});
wrap.addEventListener('mousedown', e=>{ dragging=true; sx=e.clientX - panZoom.tx; sy=e.clientY - panZoom.ty; });
window.addEventListener('mousemove', e=>{ if(!dragging) return; panZoom.tx = e.clientX - sx; panZoom.ty = e.clientY - sy; apply(); });
window.addEventListener('mouseup', ()=> dragging=false);

$("#zIn").onclick = ()=>{ panZoom.scale=Math.min(8, panZoom.scale*1.1); apply(); };
$("#zOut").onclick = ()=>{ panZoom.scale=Math.max(0.2, panZoom.scale*0.9); apply(); };
$("#zFit").onclick = ()=>{ panZoom.scale=1; panZoom.tx=0; panZoom.ty=0; apply(); };

go("viewer");
}

// ======== Admin ========
$("#fileJson").addEventListener('change', async (e)=>{
const f = e.target.files[0]; if(!f) return;
try{
const text = await f.text();
const data = JSON.parse(text);
if(!data.vehicles || !data.topics || !data.dtc) throw new Error("Estructura inválida");
if(!data.diagrams) data.diagrams = [];
setDB(data); DB = getDB(); fillFinder();
alert("Base de datos importada.");
}catch(err){ alert("Error al importar: "+err.message); }
});
$("#btnExport").onclick = ()=>{
const blob = new Blob([JSON.stringify(DB,null,2)], {type:"application/json"});
const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "autotech_db.json"; a.click();
};

$("#btnAddVeh").onclick = ()=>{
const y = +$("#vYear").value, mk=$("#vMake").value.trim(), md=$("#vModel").value.trim(), en=$("#vEngine").value.trim();
if(!y||!mk||!md) return alert("Completa Año, Marca y Modelo");
const id = `${y}-${mk}-${md}`.replace(/\s+/g,'-');
DB.vehicles.push({year:y, make:mk, model:md, engine:en||"", id});
setDB(DB); fillFinder(); alert("Vehículo añadido: "+id);
};

$("#btnAddContent").onclick = ()=>{
const vid=$("#cVID").value.trim(), sec=$("#cSection").value.trim(), title=$("#cTitle").value.trim();
if(!vid||!sec) return alert("VID y Sección son obligatorios");
let payload = {};
try{ payload = JSON.parse($("#cPayload").value || "{}"); }catch(e){ return alert("JSON de contenido inválido"); }
const entry = {vid, section:sec};
if(title) entry.title = title;
Object.assign(entry, payload);
DB.topics.push(entry);
setDB(DB); alert("Contenido añadido a "+vid);
};

async function fileToDataURL(file){
const array = await file.arrayBuffer();
let mime = file.type || 'application/octet-stream';
if(!mime && file.name.endsWith('.svg')) mime = 'image/svg+xml';
const b64 = btoa(String.fromCharCode(...new Uint8Array(array)));
return `data:${mime};base64,${b64}`;
}
$("#btnAddDiagram").onclick = async ()=>{
const vid=$("#dVID").value.trim();
const title=$("#dTitle").value.trim();
const typeSel=$("#dType").value;
const file=$("#dFile").files[0];
if(!vid||!title||!file) return alert("VID, título y archivo son requeridos");
const dataUrl = await fileToDataURL(file);
let type = typeSel;
if(typeSel==='auto'){
if(dataUrl.startsWith('data:image/svg+xml')) type='svg';
else if(dataUrl.startsWith('data:image/png')) type='png';
else type='jpg';
}
DB.diagrams = DB.diagrams || [];
DB.diagrams.push({vid,title,type,data: (type==='svg' ? atob(dataUrl.split(',',2)[1]) : dataUrl)});
setDB(DB);
alert("Diagrama añadido.");
};

// ======== Nav ========
const navEl = document.querySelector('.nav');
if (navEl) {
navEl.addEventListener('click', e=>{
if(e.target.tagName!=='BUTTON') return;
go(e.target.dataset.page);
});
}
});
