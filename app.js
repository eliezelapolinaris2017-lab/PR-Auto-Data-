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
      steps:["Desconecta bobinas","Retira bujías con dado de 14 mm","Instala a 18 N·m (aprox.)","Conecta bobinas y prueba"]},
  ],
  dtc: [
    {code:"P0300", title:"Fallo de encendido aleatorio", notes:"Posibles: bujías, bobinas, inyectores, fugas de vacío, presión de combustible"},
    {code:"P0171", title:"Mezcla pobre (Banco 1)", notes:"Posibles: MAF sucio, fugas de admisión, bomba de combustible débil"}
  ]
};
const DB_KEY = "autotech.db";

function getDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw){ localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB)); return structuredClone(DEFAULT_DB); }
  try{ return JSON.parse(raw); }catch(e){ return structuredClone(DEFAULT_DB); }
}
function setDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

// ======== SPA ========
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const PAGES = ["finder","results","viewer","admin","help"];
function go(p){
  $$('.nav button').forEach(b=> b.classList.toggle('active', b.dataset.page===p));
  PAGES.forEach(id => $("#page-"+id).classList.toggle('hidden', id!==p));
}
$("#year").textContent = new Date().getFullYear();

// ======== Finder ========
let DB = getDB();
let currentVID = null;
let currentTab = "Mantenimiento";
let currentViewItem = null;

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
$(".tabs").addEventListener('click', e=>{
  if(e.target.tagName!=='BUTTON') return;
  $$(".tabs button").forEach(b=>b.classList.toggle('active', b===e.target));
  currentTab = e.target.dataset.tab;
  renderResults();
});

function renderResults(){
  const area = $("#resultList");
  area.innerHTML = "";
  if(!currentVID) return;
  if(currentTab==="DTC"){
    const box = document.createElement('div');
    box.innerHTML = `
      <div class="pill">Códigos DTC genéricos (texto original)</div>
      <ul>${DB.dtc.map(d=>`<li><b>${d.code}</b> — ${d.title}<br><small>${d.notes||""}</small></li>`).join("")}</ul>`;
    area.appendChild(box);
    return;
  }
  const items = DB.topics.filter(t=>t.vid===currentVID && t.section===currentTab);
  if(!items.length){ area.innerHTML = `<div class="pill">Sin contenido en ${currentTab} para este vehículo.</div>`; return; }
  const ul = document.createElement('ul');
  ul.style.listStyle='none'; ul.style.padding=0;
  items.forEach((it,i)=>{
    const li=document.createElement('li');
    li.className='card';
    li.innerHTML = `<h3 style="margin:0 0 6px">${it.title || it.section}</h3>
      <button class="ghost" data-open="${i}">Abrir</button>`;
    ul.appendChild(li);
  });
  area.appendChild(ul);

  // open handlers
  $$('[data-open]').forEach(btn=>{
    btn.onclick = ()=>{
      const index = +btn.dataset.open;
      currentViewItem = items[index];
      openViewer(currentViewItem);
    };
  });
}

// ======== Viewer ========
function openViewer(item){
  $("#viewTitle").textContent = item.title || item.section;
  const body = $("#viewBody"); body.innerHTML = "";
  if(item.steps){
    const ol=document.createElement('ol');
    item.steps.forEach(s=>{ const li=document.createElement('li'); li.textContent=s; ol.appendChild(li); });
    body.appendChild(ol);
  } else if(item.specs){
    const table=document.createElement('table'); table.className='spec';
    table.innerHTML = Object.keys(item.specs).map(k=>`<tr><td>${k}</td><td>${item.specs[k]}</td></tr>`).join('');
    body.appendChild(table);
  } else {
    body.innerHTML = `<div class="pill">Contenido sin estructura (agrega steps o specs en Admin).</div>`;
  }
  go("viewer");
}
$("#btnBack").onclick = ()=> go("results");

// Exportar PDF (simple; sin libs externas)
$("#btnPDF").onclick = ()=>{
  const content = `${$("#viewTitle").textContent}\n\n` + $("#viewBody").innerText;
  const blob = new Blob([content], {type:"text/plain;charset=utf-8"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ($("#viewTitle").textContent.replace(/\s+/g,'_')) + ".txt"; // TXT simple (puedo integrar jsPDF si quieres)
  a.click();
};

// ======== Admin ========
$("#fileJson").addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const text = await f.text();
    const data = JSON.parse(text);
    if(!data.vehicles || !data.topics || !data.dtc) throw new Error("Estructura inválida");
    setDB(data); DB = getDB(); fillFinder();
    alert("Base de datos importada.");
  }catch(err){ alert("Error al importar: "+err.message); }
});
$("#btnExport").onclick = ()=>{
  const blob = new Blob([JSON.stringify(DB,null,2)], {type:"application/json"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "autotech_db.json";
  a.click();
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

// ======== Nav ========
document.querySelector('.nav').addEventListener('click', e=>{
  if(e.target.tagName!=='BUTTON') return;
  go(e.target.dataset.page);
});
