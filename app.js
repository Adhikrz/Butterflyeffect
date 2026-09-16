"use strict";

/* =========================================================
   BUTTERFLYEFFECT — MAIN APP
   Works with either:
   filters/filters.js
   OR root filters.js
   ========================================================= */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------- 110 FILTER FALLBACK ---------- */

const FILTER_NAMES = [
  "X-Ray Scan","Banknote Engraving","Wire Photo","Giallo Gels",
  "Two-Strip","Aerochrome","Slow Shutter","Full Stitch",
  "Aura Gradient","Night Vision","Blue Negative","LED Matrix",
  "Chemical Frost","Ink Bloom","Photogram","Heat Trace",
  "Scan Lines","Film Soup","Cyanotype","Fogged Glass",
  "Dead Pixels","Low Poly","256 Colors","Blue Flood",
  "Herbarium","Density Map","Thermal Print","Paint By Number",
  "Encyclopedia Plate","Ransom Collage","Wet Emulsion","Desktop 98",
  "Cursor Swarm","Cutout Redaction","Scribble Riot","Paper Crumple",
  "Solarized Print","Marker Makeup","Deadpan Toon","Chirashi Flyer",
  "Street Poster","Cross Stitch","Blind Emboss","Overprint",
  "Sticker Bomb","Bubble Wrapped","Liquid Chrome","Specimen Sheet",
  "Misprint Echo","Camcorder HUD","VHS Chrome","Split Halftone",
  "Indexed Dither","Stencil Fluoro","Sabattier Push","Voxel Relief",
  "Amber Glamour","Screen Engraving","Thermal Liquid","Fog Silhouette",
  "Pink Bloom","Rescreen","Teletext","Redscale Flash",
  "Heat Negative","Chromatography","Vector Dissect","Dragged Shutter",
  "Screen Clash","Chemigram","Expired Tungsten","Pastel Thermal",
  "Paste-Up Collage","Overexposure Bloom","Slit Scan","Platen Drag",
  "Blacklight","Forensic Photo","Lenticular","Pinscreen",
  "Electron Scan","Daguerreotype","Autochrome","Jacquard Weave",
  "4-Shade LCD","Dye Halo","Light Painted","Edge Trace",
  "VCR OSD","Surveillance Dossier","Thermal Mask","Projector Burn",
  "Riso Bloom","Radiograph Zine","Pixel Sort","Archive Rot",
  "Three Inks","Scrap Stitched","Bleach Dye","Stitch Chart",
  "Dot Interference","Cyber Sigil","Chrome Rorschach","Heat Contour",
  "Pixel Lace","Pink Phosphor","Dropped Stitch","Hyper Slice",
  "Bio HUD","Poison Copy"
];

/* If filters/filters.js loaded correctly, use it.
   Otherwise create the 110 filters here. */

if (!Array.isArray(window.DEFAULT_FILTERS)) {
  window.DEFAULT_FILTERS = FILTER_NAMES.map((name, i) => ({
    id: `f${i + 1}`,
    name,
    category: "Original 110"
  }));
}

/* ---------- STATE ---------- */

let filters = [...window.DEFAULT_FILTERS];

let selected = 0;
let image = null;
let intensity = 100;
let ratio = "3/4";
let playlist = [];

/* ---------- DOM ---------- */

const canvas = $("#canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const filterList = $("#filterList");
const selectedName = $("#selectedName");

/* ---------- SAFETY ---------- */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

/* ---------- CUSTOM FILTERS ---------- */

function loadCustomFilters() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("butterfly_custom_filters") || "[]"
    );

    if (Array.isArray(saved)) {
      filters.push(...saved);
    }
  } catch (e) {
    console.warn("Could not load custom filters.");
  }
}

loadCustomFilters();

/* ---------- FILTER LIST ---------- */

function renderList() {
  if (!filterList) return;

  const search = ($("#search")?.value || "").toLowerCase().trim();

  filterList.innerHTML = "";

  filters.forEach((filter, index) => {

    if (!filter.name.toLowerCase().includes(search)) return;

    const button = document.createElement("button");

    button.className =
      "filterItem" + (index === selected ? " active" : "");

    button.innerHTML = `
      <span>${escapeHtml(filter.name)}</span>
      <span class="num">${String(index + 1).padStart(3, "0")}</span>
    `;

    button.addEventListener("click", () => {
      selected = index;

      if (selectedName) {
        selectedName.textContent = filter.name;
      }

      renderList();
      draw();
    });

    filterList.appendChild(button);
  });

  if ($("#count")) {
    $("#count").textContent = filters.length;
  }

  if ($("#skinCount")) {
    $("#skinCount").textContent = filters.length;
  }
}

/* ---------- IMAGE LOADING ---------- */

function loadFile(file) {

  if (!file || !file.type.startsWith("image/")) {
    alert("Please choose an image.");
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {

    image = new Image();

    image.onload = () => {

      $("#dropzone")?.classList.add("hasImage");

      const empty = $("#emptyState");

      if (empty) {
        empty.style.display = "none";
      }

      draw();
    };

    image.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

/* ---------- CSS FILTER ENGINE ---------- */

function cssFor(name, amount, recipe) {

  if (recipe) {
    return recipe;
  }

  const n = name.toLowerCase();
  const x = amount / 100;

  if (
    n.includes("x-ray") ||
    n.includes("negative") ||
    n.includes("radiograph")
  ) {
    return "invert(1) contrast(1.4) grayscale(.25)";
  }

  if (
    n.includes("night") ||
    n.includes("blacklight") ||
    n.includes("phosphor")
  ) {
    return "brightness(.75) contrast(1.5) hue-rotate(85deg) saturate(1.8)";
  }

  if (
    n.includes("thermal") ||
    n.includes("heat") ||
    n.includes("chromatography")
  ) {
    return "contrast(1.45) saturate(2.2) hue-rotate(-30deg)";
  }

  if (
    n.includes("cyanotype") ||
    n.includes("blue")
  ) {
    return "grayscale(.3) hue-rotate(165deg) saturate(1.8) contrast(1.25)";
  }

  if (
    n.includes("redscale") ||
    n.includes("amber") ||
    n.includes("giallo")
  ) {
    return "sepia(.6) saturate(1.8) hue-rotate(-12deg) contrast(1.15)";
  }

  if (n.includes("solarized")) {
    return "invert(.8) contrast(1.4) saturate(1.4)";
  }

  if (
    n.includes("vhs") ||
    n.includes("camcorder") ||
    n.includes("vcr")
  ) {
    return "contrast(1.2) saturate(1.45) hue-rotate(-10deg)";
  }

  if (
    n.includes("pastel") ||
    n.includes("pink") ||
    n.includes("aura") ||
    n.includes("bloom")
  ) {
    return "brightness(1.12) saturate(1.45) contrast(.9)";
  }

  if (
    n.includes("daguerreotype") ||
    n.includes("expired") ||
    n.includes("archive")
  ) {
    return "grayscale(.7) sepia(.55) contrast(1.15)";
  }

  if (
    n.includes("dither") ||
    n.includes("256") ||
    n.includes("lcd") ||
    n.includes("teletext")
  ) {
    return "saturate(.65) contrast(1.5)";
  }

  if (
    n.includes("chrome") ||
    n.includes("liquid")
  ) {
    return "contrast(1.55) saturate(1.5) brightness(1.05)";
  }

  if (
    n.includes("toon") ||
    n.includes("low poly") ||
    n.includes("stencil")
  ) {
    return "contrast(1.65) saturate(1.5)";
  }

  return `
    contrast(${1 + 0.35 * x})
    saturate(${1 + 0.55 * x})
    brightness(${1 + 0.08 * x})
  `;
}

/* ---------- CANVAS EFFECTS ---------- */

function drawOverlay(name) {

  if (!ctx || !canvas) return;

  const n = name.toLowerCase();
  const w = canvas.width;
  const h = canvas.height;
  const x = intensity / 100;

  /* scan lines */

  if (
    n.includes("scan") ||
    n.includes("matrix") ||
    n.includes("hud") ||
    n.includes("teletext") ||
    n.includes("osd")
  ) {

    ctx.save();

    ctx.globalAlpha = 0.16 * x;
    ctx.strokeStyle = "#b9ff62";
    ctx.lineWidth = 1;

    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* dots / print texture */

  if (
    n.includes("dither") ||
    n.includes("halftone") ||
    n.includes("engraving") ||
    n.includes("stitch") ||
    n.includes("weave")
  ) {

    ctx.save();

    ctx.globalAlpha = 0.2 * x;
    ctx.fillStyle = "#ffffff";

    const gap = Math.max(4, 9 - x * 5);

    for (let y = 0; y < h; y += gap) {

      for (let xx = 0; xx < w; xx += gap) {

        if (Math.random() > 0.5) {
          ctx.fillRect(xx, y, 1.5, 1.5);
        }
      }
    }

    ctx.restore();
  }

  /* glitch */

  if (
    n.includes("misprint") ||
    n.includes("split") ||
    n.includes("screen clash") ||
    n.includes("pixel sort") ||
    n.includes("hyper slice")
  ) {

    ctx.save();

    for (let i = 0; i < 10 * x; i++) {

      const y = Math.random() * h;
      const height = 2 + Math.random() * 15;
      const shift = Math.random() * 25 - 12;

      ctx.globalAlpha = 0.25;

      ctx.drawImage(
        canvas,
        0,
        y,
        w,
        height,
        shift,
        y,
        w,
        height
      );
    }

    ctx.restore();
  }

  /* redaction */

  if (
    n.includes("redaction") ||
    n.includes("forensic") ||
    n.includes("dossier")
  ) {

    ctx.save();

    ctx.globalAlpha = 0.7 * x;
    ctx.fillStyle = "#08090d";

    for (let i = 0; i < 7; i++) {

      ctx.fillRect(
        w * 0.1 + Math.random() * w * 0.7,
        Math.random() * h,
        w * 0.12,
        8 + Math.random() * 18
      );
    }

    ctx.restore();
  }

  /* cyber scribbles */

  if (
    n.includes("scribble") ||
    n.includes("riot") ||
    n.includes("cyber sigil")
  ) {

    ctx.save();

    ctx.globalAlpha = 0.45 * x;
    ctx.strokeStyle = "#b9ff62";
    ctx.lineWidth = 2;

    for (let i = 0; i < 10; i++) {

      ctx.beginPath();

      ctx.moveTo(
        Math.random() * w,
        Math.random() * h
      );

      ctx.lineTo(
        Math.random() * w,
        Math.random() * h
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  /* grain */

  if (
    n.includes("film") ||
    n.includes("emulsion") ||
    n.includes("soup") ||
    n.includes("rot")
  ) {

    ctx.save();

    const amount = Math.floor(800 * x);

    for (let i = 0; i < amount; i++) {

      const px = Math.random() * w;
      const py = Math.random() * h;

      ctx.globalAlpha = Math.random() * 0.15;
      ctx.fillStyle =
        Math.random() > 0.5 ? "#ffffff" : "#000000";

      ctx.fillRect(px, py, 1, 1);
    }

    ctx.restore();
  }
}

/* ---------- DRAW ---------- */

function draw() {

  if (!image || !canvas || !ctx) return;

  const [rw, rh] = ratio.split("/").map(Number);

  const max = 1600;

  let width = image.naturalWidth;
  let height = image.naturalHeight;

  const targetRatio = rw / rh;

  if (width / height > targetRatio) {
    height = Math.round(width / targetRatio);
  } else {
    width = Math.round(height * targetRatio);
  }

  const scale = Math.min(
    max / width,
    max / height,
    1
  );

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const filter = filters[selected];

  ctx.save();

  ctx.filter = cssFor(
    filter.name,
    intensity,
    filter.recipe || ""
  );

  ctx.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.restore();

  drawOverlay(filter.name);
}

/* ---------- DOWNLOAD ---------- */

function downloadImage() {

  if (!image) {
    alert("Choose an image first.");
    return;
  }

  const filename =
    filters[selected].name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

  const link = document.createElement("a");

  link.download =
    `butterflyeffect-${filename}.png`;

  link.href =
    canvas.toDataURL("image/png");

  link.click();
}

/* ---------- IMAGE INPUT ---------- */

$("#chooseBtn")?.addEventListener(
  "click",
  () => $("#fileInput")?.click()
);

$("#fileInput")?.addEventListener(
  "change",
  (e) => loadFile(e.target.files[0])
);

$("#dropzone")?.addEventListener(
  "click",
  (e) => {

    if (e.target === canvas) return;

    $("#fileInput")?.click();
  }
);

$("#dropzone")?.addEventListener(
  "dragover",
  (e) => {
    e.preventDefault();
    $("#dropzone")?.classList.add("drag");
  }
);

$("#dropzone")?.addEventListener(
  "dragleave",
  () => {
    $("#dropzone")?.classList.remove("drag");
  }
);

$("#dropzone")?.addEventListener(
  "drop",
  (e) => {

    e.preventDefault();

    $("#dropzone")?.classList.remove("drag");

    loadFile(e.dataTransfer.files[0]);
  }
);

/* ---------- SEARCH ---------- */

$("#search")?.addEventListener(
  "input",
  renderList
);

/* ---------- INTENSITY ---------- */

$("#intensity")?.addEventListener(
  "input",
  (e) => {

    intensity = Number(e.target.value);

    if ($("#intensityValue")) {
      $("#intensityValue").textContent =
        `${intensity}%`;
    }

    draw();
  }
);

/* ---------- ASPECT ---------- */

$$(".ratio").forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      $$(".ratio").forEach(
        (b) => b.classList.remove("active")
      );

      button.classList.add("active");

      ratio = button.dataset.ratio;

      draw();
    }
  );
});

/* ---------- PREVIOUS / NEXT ---------- */

$("#prevBtn")?.addEventListener(
  "click",
  () => {

    selected =
      (selected - 1 + filters.length) %
      filters.length;

    if (selectedName) {
      selectedName.textContent =
        filters[selected].name;
    }

    renderList();
    draw();
  }
);

$("#nextBtn")?.addEventListener(
  "click",
  () => {

    selected =
      (selected + 1) %
      filters.length;

    if (selectedName) {
      selectedName.textContent =
        filters[selected].name;
    }

    renderList();
    draw();
  }
);

/* ---------- EXPORT ---------- */

$("#downloadBtn")?.addEventListener(
  "click",
  downloadImage
);

/* ---------- FULLSCREEN ---------- */

$("#fullscreenBtn")?.addEventListener(
  "click",
  () => {

    if ($("#dropzone")?.requestFullscreen) {
      $("#dropzone").requestFullscreen();
    }
  }
);

/* ---------- THEME ---------- */

$("#themeBtn")?.addEventListener(
  "click",
  () => document.body.classList.toggle("light")
);

/* ---------- TABS ---------- */

$$(".tab").forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      $$(".tab").forEach(
        (b) => b.classList.remove("active")
      );

      button.classList.add("active");

      $$(".tabPage").forEach(
        (page) => page.classList.remove("active")
      );

      const target =
        $("#" + button.dataset.tab);

      target?.classList.add("active");
    }
  );
});

/* ---------- PLAYLIST ---------- */

function renderPlaylist() {

  const container = $("#playlistItems");

  if (!container) return;

  if (!playlist.length) {

    container.innerHTML =
      "<p>No skins added yet.</p>";

    return;
  }

  container.innerHTML =
    playlist.map((index) => `
      <div class="playlistRow">
        <span>
          ${escapeHtml(filters[index].name)}
        </span>

        <button
          data-remove="${index}"
          type="button"
        >
          Remove
        </button>
      </div>
    `).join("");

  container
    .querySelectorAll("[data-remove]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(button.dataset.remove);

          playlist =
            playlist.filter(
              (x) => x !== index
            );

          renderPlaylist();
        }
      );
    });
}

/* ---------- ADD FILTER ---------- */

$("#addFilterBtn")?.addEventListener(
  "click",
  () => {
    $("#modal")?.classList.remove("hidden");
  }
);

$("#closeModal")?.addEventListener(
  "click",
  () => {
    $("#modal")?.classList.add("hidden");
  }
);

/* ---------- CUSTOM FILTER ---------- */

$("#newIntensity")?.addEventListener(
  "input",
  (e) => {

    if ($("#newIntensityValue")) {
      $("#newIntensityValue").textContent =
        `${e.target.value}%`;
    }
  }
);

$("#saveFilter")?.addEventListener(
  "click",
  () => {

    const name =
      $("#newName")?.value.trim();

    if (!name) {
      alert("Give the filter a name.");
      return;
    }

    const recipe =
      $("#newRecipe")?.value.trim() ||
      "contrast(1.2) saturate(1.3)";

    const custom = {
      id: `custom-${Date.now()}`,
      name,
      category:
        $("#newCategory")?.value ||
        "Experimental",
      recipe
    };

    let customs = [];

    try {
      customs = JSON.parse(
        localStorage.getItem(
          "butterfly_custom_filters"
        ) || "[]"
      );

      if (!Array.isArray(customs)) {
        customs = [];
      }
    } catch {
      customs = [];
    }

    customs.push(custom);

    localStorage.setItem(
      "butterfly_custom_filters",
      JSON.stringify(customs)
    );

    filters = [
      ...window.DEFAULT_FILTERS,
      ...customs
    ];

    selected =
      filters.length - 1;

    if (selectedName) {
      selectedName.textContent =
        name;
    }

    renderList();

    $("#modal")?.classList.add("hidden");

    if ($("#newName")) {
      $("#newName").value = "";
    }

    if ($("#newRecipe")) {
      $("#newRecipe").value = "";
    }

    draw();
  }
);

/* ---------- EXPORT CUSTOM FILTER PACK ---------- */

$("#exportPack")?.addEventListener(
  "click",
  () => {

    const customs =
      filters.filter(
        (f) =>
          String(f.id).startsWith("custom-")
      );

    const blob =
      new Blob(
        [JSON.stringify(customs, null, 2)],
        { type: "application/json" }
      );

    const link =
      document.createElement("a");

    link.href =
      URL.createObjectURL(blob);

    link.download =
      "butterflyeffect-custom-filters.json";

    link.click();

    URL.revokeObjectURL(link.href);
  }
);

/* ---------- IMPORT CUSTOM FILTER PACK ---------- */

$("#importPack")?.addEventListener(
  "click",
  () => $("#packInput")?.click()
);

$("#packInput")?.addEventListener(
  "change",
  (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      try {

        const incoming =
          JSON.parse(reader.result);

        if (!Array.isArray(incoming)) {
          throw new Error();
        }

        const old =
          filters.filter(
            (f) =>
              String(f.id)
                .startsWith("custom-")
          );

        const added =
          incoming
            .filter((f) => f.name)
            .map((f) => ({
              ...f,
              id:
                `custom-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2)}`
            }));

        const merged =
          [...old, ...added];

        localStorage.setItem(
          "butterfly_custom_filters",
          JSON.stringify(merged)
        );

        filters = [
          ...window.DEFAULT_FILTERS,
          ...merged
        ];

        renderList();

        alert(
          `${added.length} filter(s) imported.`
        );

      } catch {
        alert(
          "Invalid filter pack."
        );
      }
    };

    reader.readAsText(file);

    e.target.value = "";
  }
);

/* ---------- INITIALIZE ---------- */

renderList();

if (selectedName && filters.length) {
  selectedName.textContent =
    filters[0].name;
}

console.log(
  `Butterflyeffect loaded: ${filters.length} filters`
);