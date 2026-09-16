const $ = id => document.getElementById(id);

const canvas = $("canvas");
const ctx = canvas.getContext("2d", {
  willReadFrequently: true
});

let filters = [...window.FILTERS];

let selected = 0;

let img = null;

let intensity = 1;

let before = false;


/* =========================================
   FILTER LIST
========================================= */

function renderList(query = "") {

  const list = $("filterList");

  list.innerHTML = "";

  filters.forEach((filter, index) => {

    if (
      query &&
      !filter.name
        .toLowerCase()
        .includes(query.toLowerCase())
    ) {
      return;
    }

    const item = document.createElement("div");

    item.className =
      "filter-item" +
      (index === selected ? " active" : "");

    item.innerHTML = `
      <span>${String(filter.id).padStart(2, "0")}</span>
      ${filter.name}
    `;

    item.onclick = () => {

      selected = index;

      before = false;

      $("beforeBtn").textContent = "BEFORE";

      renderList($("search").value);

      draw();

    };

    list.appendChild(item);

  });

  $("count").textContent = filters.length;

}


/* =========================================
   IMAGE
========================================= */

function loadImage(file) {

  if (!file) return;

  const image = new Image();

  image.onload = () => {

    img = image;

    $("empty").style.display = "none";

    draw();

  };

  image.src = URL.createObjectURL(file);

}


/* =========================================
   SIZE
========================================= */

function getSize() {

  const ratio =
    $("ratio")
      .value
      .split(":")
      .map(Number);

  const aspect = ratio[0] / ratio[1];

  let width = img.naturalWidth;

  let height = img.naturalHeight;

  if (width / height > aspect) {

    height = width / aspect;

  } else {

    width = height * aspect;

  }

  const maxWidth = 1200;

  const maxHeight = 750;

  const scale =
    Math.min(
      maxWidth / width,
      maxHeight / height,
      1
    );

  return [
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale))
  ];

}


/* =========================================
   HSV
========================================= */

function rgbToHsv(r, g, b) {

  r /= 255;
  g /= 255;
  b /= 255;

  const max =
    Math.max(r, g, b);

  const min =
    Math.min(r, g, b);

  const d = max - min;

  let h = 0;

  if (d !== 0) {

    if (max === r) {

      h =
        60 *
        (((g - b) / d) % 6);

    } else if (max === g) {

      h =
        60 *
        ((b - r) / d + 2);

    } else {

      h =
        60 *
        ((r - g) / d + 4);

    }

  }

  if (h < 0) h += 360;

  const s =
    max === 0 ? 0 : d / max;

  return [h, s, max];

}


/* =========================================
   HSV → RGB
========================================= */

function hsvToRgb(h, s, v) {

  const c = v * s;

  const x =
    c *
    (1 - Math.abs((h / 60) % 2 - 1));

  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {

    r = c;
    g = x;

  } else if (h < 120) {

    r = x;
    g = c;

  } else if (h < 180) {

    g = c;
    b = x;

  } else if (h < 240) {

    g = x;
    b = c;

  } else if (h < 300) {

    r = x;
    b = c;

  } else {

    r = c;
    b = x;

  }

  return [
    (r + m) * 255,
    (g + m) * 255,
    (b + m) * 255
  ];

}


/* =========================================
   HASH
========================================= */

function hash(text) {

  let h = 2166136261;

  for (let i = 0; i < text.length; i++) {

    h ^= text.charCodeAt(i);

    h =
      Math.imul(
        h,
        16777619
      );

  }

  return h >>> 0;

}


/* =========================================
   NOISE
========================================= */

function noise(x) {

  const value =
    Math.sin(x * 12.9898) *
    43758.5453;

  return value -
    Math.floor(value);

}


/* =========================================
   MAIN FILTER ENGINE
========================================= */

function processImage(data, name, power) {

  const pixels = data.data;

  const width = data.width;

  const height = data.height;

  const lower = name.toLowerCase();

  const seed = hash(name);


  for (
    let y = 0;
    y < height;
    y++
  ) {

    for (
      let x = 0;
      x < width;
      x++
    ) {

      const p =
        (y * width + x) * 4;


      const r = pixels[p];

      const g = pixels[p + 1];

      const b = pixels[p + 2];


      const luminance =
        0.2126 * r +
        0.7152 * g +
        0.0722 * b;


      let R = r;
      let G = g;
      let B = b;


      /* ===========================
         X-RAY
      =========================== */

      if (
        lower.includes("x-ray") ||
        lower.includes("radiograph")
      ) {

        const inverted =
          255 - luminance;

        R = inverted * 0.7;

        G = inverted * 1.1;

        B = inverted * 1.35;

      }


      /* ===========================
         THERMAL
      =========================== */

      if (
        lower.includes("thermal") ||
        lower.includes("heat")
      ) {

        const t =
          luminance / 255;

        if (t < 0.25) {

          R = 15;
          G = 10;
          B = 100 + t * 300;

        } else if (t < 0.5) {

          R = 30;
          G = 100 + t * 200;
          B = 255;

        } else if (t < 0.75) {

          R = 255;
          G = 180 + t * 80;
          B = 20;

        } else {

          R = 255;
          G = 40;
          B = 10;

        }

      }


      /* ===========================
         CYANOTYPE
      =========================== */

      if (
        lower.includes("cyanotype")
      ) {

        R = luminance * 0.08;

        G = luminance * 0.32;

        B = luminance * 0.65;

      }


      /* ===========================
         NIGHT VISION
      =========================== */

      if (
        lower.includes("night vision")
      ) {

        R = luminance * 0.08;

        G = luminance * 1.08;

        B = luminance * 0.10;

      }


      /* ===========================
         BLUE NEGATIVE
      =========================== */

      if (
        lower.includes("blue negative")
      ) {

        R = (255 - r) * 0.15;

        G = (255 - g) * 0.55;

        B = 255 - b;

      }


      /* ===========================
         REDSCALE
      =========================== */

      if (
        lower.includes("redscale")
      ) {

        R = luminance * 1.15;

        G = luminance * 0.45;

        B = luminance * 0.20;

      }


      /* ===========================
         PINK
      =========================== */

      if (
        lower.includes("pink")
      ) {

        R = Math.min(
          255,
          luminance * 1.4
        );

        G = luminance * 0.35;

        B = luminance * 0.8;

      }


      /* ===========================
         AMBER
      =========================== */

      if (
        lower.includes("amber")
      ) {

        R = luminance * 1.2;

        G = luminance * 0.7;

        B = luminance * 0.3;

      }


      /* ===========================
         SOLARIZED
      =========================== */

      if (
        lower.includes("solarized") ||
        lower.includes("sabattier")
      ) {

        if (luminance > 120) {

          R = 255 - r;
          G = 255 - g;
          B = 255 - b;

        }

      }


      /* ===========================
         LED MATRIX
      =========================== */

      if (
        lower.includes("led matrix")
      ) {

        const cell = 7;

        const gx =
          Math.floor(x / cell) *
          cell;

        const gy =
          Math.floor(y / cell) *
          cell;

        const gp =
          (gy * width + gx) * 4;

        const value =
          (
            pixels[gp] +
            pixels[gp + 1] +
            pixels[gp + 2]
          ) / 3;

        const active =
          (x % cell === 0) ||
          (y % cell === 0);

        if (active) {

          R = value * 0.25;

          G = value * 0.8;

          B = value * 0.55;

        } else {

          R = value;

          G = value;

          B = value;

        }

      }


      /* ===========================
         LOW POLY / VOXEL
      =========================== */

      if (
        lower.includes("low poly") ||
        lower.includes("voxel")
      ) {

        const block = 12;

        const bx =
          Math.floor(x / block) *
          block;

        const by =
          Math.floor(y / block) *
          block;

        const bp =
          (by * width + bx) * 4;

        R = pixels[bp];

        G = pixels[bp + 1];

        B = pixels[bp + 2];

      }


      /* ===========================
         HALFTONE
      =========================== */

      if (
        lower.includes("halftone") ||
        lower.includes("rescreen")
      ) {

        const size = 7;

        const cx =
          Math.floor(x / size) * size +
          size / 2;

        const cy =
          Math.floor(y / size) * size +
          size / 2;

        const distance =
          Math.hypot(
            x - cx,
            y - cy
          );

        const radius =
          (255 - luminance) /
          255 *
          4;

        if (distance > radius) {

          R = 12;
          G = 12;
          B = 12;

        }

      }


      /* ===========================
         DITHER
      =========================== */

      if (
        lower.includes("dither") ||
        lower.includes("dot interference")
      ) {

        const pattern =
          ((x * 13 +
            y * 17 +
            seed) %
            64);

        const value =
          luminance / 4 +
          pattern;

        if (value < 100) {

          R = 10;
          G = 10;
          B = 10;

        } else {

          R = 240;
          G = 240;
          B = 240;

        }

      }


      /* ===========================
         EDGE / ENGRAVING
      =========================== */

      if (
        lower.includes("edge trace") ||
        lower.includes("engraving") ||
        lower.includes("stencil")
      ) {

        const left =
          pixels[
            Math.max(
              0,
              p - 4
            )
          ];

        const right =
          pixels[
            Math.min(
              pixels.length - 4,
              p + 4
            )
          ];

        const edge =
          Math.abs(
            left - right
          );

        R = edge * 2;

        G = edge * 2;

        B = edge * 2;

      }


      /* ===========================
         STITCH
      =========================== */

      if (
        lower.includes("stitch") ||
        lower.includes("jacquard")
      ) {

        const size = 8;

        const grid =
          x % size < 2 ||
          y % size < 2;

        if (grid) {

          R = luminance * 0.4;

          G = luminance * 0.35;

          B = luminance * 0.3;

        } else {

          R = luminance;

          G = luminance * 0.85;

          B = luminance * 0.7;

        }

      }


      /* ===========================
         VHS / VCR
      =========================== */

      if (
        lower.includes("vhs") ||
        lower.includes("vcr") ||
        lower.includes("camcorder")
      ) {

        const shift =
          Math.floor(
            Math.sin(y * 0.08) * 5
          );

        const q =
          (
            y * width +
            Math.max(
              0,
              Math.min(
                width - 1,
                x + shift
              )
            )
          ) * 4;

        R = pixels[q];

        G = pixels[p + 1];

        B =
          pixels[
            Math.max(
              0,
              p - 5
            )
          ];

      }


      /* ===========================
         LIQUID CHROME
      =========================== */

      if (
        lower.includes("chrome")
      ) {

        const wave =
          Math.sin(
            x * 0.035 +
            y * 0.025
          );

        const metal =
          luminance +
          wave * 70;

        R = metal;

        G = metal;

        B = metal * 1.08;

      }


      /* ===========================
         FOG / BLOOM
      =========================== */

      if (
        lower.includes("fog") ||
        lower.includes("bloom") ||
        lower.includes("frost") ||
        lower.includes("halo")
      ) {

        const n =
          noise(
            x * 0.02 +
            y * 0.013 +
            seed
          );

        R = r + n * 60;

        G = g + n * 50;

        B = b + n * 70;

      }


      /* ===========================
         COLLAGE
      =========================== */

      if (
        lower.includes("collage") ||
        lower.includes("ransom") ||
        lower.includes("paste-up")
      ) {

        const blockX =
          Math.floor(x / 45);

        const blockY =
          Math.floor(y / 45);

        const block =
          (
            blockX +
            blockY +
            seed
          ) % 5;

        if (block === 0) {

          R = 20;
          G = 20;
          B = 20;

        }

      }


      /* ===========================
         TOON / MARKER
      =========================== */

      if (
        lower.includes("toon") ||
        lower.includes("marker")
      ) {

        const levels = 6;

        R =
          Math.round(
            r / 255 *
            levels
          ) *
          255 /
          levels;

        G =
          Math.round(
            g / 255 *
            levels
          ) *
          255 /
          levels;

        B =
          Math.round(
            b / 255 *
            levels
          ) *
          255 /
          levels;

      }


      /* ===========================
         NIGHT / BLACKLIGHT
      =========================== */

      if (
        lower.includes("blacklight")
      ) {

        R = luminance * 0.8;

        G = luminance * 0.1;

        B = luminance * 1.5;

      }


      /* ===========================
         AEROCHROME
      =========================== */

      if (
        lower.includes("aerochrome")
      ) {

        R = g * 1.25;

        G = r * 0.65;

        B = b * 1.1;

      }


      /* ===========================
         POISON COPY
      =========================== */

      if (
        lower.includes("poison")
      ) {

        R = luminance * 0.5;

        G = luminance * 1.25;

        B = luminance * 0.25;

      }


      /* ===========================
         MIX
      =========================== */

      pixels[p] =
        r + (R - r) * power;

      pixels[p + 1] =
        g + (G - g) * power;

      pixels[p + 2] =
        b + (B - b) * power;

    }

  }

  return data;

}


/* =========================================
   OVERLAYS
========================================= */

function drawOverlay(name) {

  const lower =
    name.toLowerCase();

  const w = canvas.width;

  const h = canvas.height;


  ctx.save();


  /* SCANLINES */

  if (
    lower.includes("scan") ||
    lower.includes("vhs") ||
    lower.includes("vcr") ||
    lower.includes("teletext")
  ) {

    ctx.strokeStyle = "#ffffff";

    ctx.globalAlpha = 0.12;

    for (
      let y = 0;
      y < h;
      y += 4
    ) {

      ctx.beginPath();

      ctx.moveTo(0, y);

      ctx.lineTo(w, y);

      ctx.stroke();

    }

  }


  /* HUD */

  if (
    lower.includes("hud") ||
    lower.includes("cyber") ||
    lower.includes("surveillance") ||
    lower.includes("dossier")
  ) {

    ctx.strokeStyle = "#ffffff";

    ctx.globalAlpha = 0.5;

    ctx.lineWidth = 1;

    const size =
      Math.min(w, h) * 0.07;


    const corners = [

      [12, 12, 1, 1],

      [w - 12, 12, -1, 1],

      [12, h - 12, 1, -1],

      [w - 12, h - 12, -1, -1]

    ];


    corners.forEach(
      ([x, y, sx, sy]) => {

        ctx.beginPath();

        ctx.moveTo(
          x,
          y + size * sy
        );

        ctx.lineTo(x, y);

        ctx.lineTo(
          x + size * sx,
          y
        );

        ctx.stroke();

      }
    );


    ctx.fillStyle = "#ffffff";

    ctx.font = "9px monospace";

    ctx.fillText(
      "BFX // " +
      name.toUpperCase(),
      14,
      28
    );

    ctx.fillText(
      new Date()
        .toISOString()
        .slice(11, 19),
      14,
      h - 14
    );

  }


  /* GRID */

  if (
    lower.includes("matrix") ||
    lower.includes("lcd") ||
    lower.includes("cyber")
  ) {

    ctx.globalAlpha = 0.08;

    ctx.strokeStyle = "#fff";

    for (
      let x = 0;
      x < w;
      x += 20
    ) {

      ctx.beginPath();

      ctx.moveTo(x, 0);

      ctx.lineTo(x, h);

      ctx.stroke();

    }

    for (
      let y = 0;
      y < h;
      y += 20
    ) {

      ctx.beginPath();

      ctx.moveTo(0, y);

      ctx.lineTo(w, y);

      ctx.stroke();

    }

  }


  /* RANDOM GLITCH */

  if (
    lower.includes("glitch") ||
    lower.includes("screen clash") ||
    lower.includes("hyper slice")
  ) {

    ctx.globalAlpha = 0.35;

    for (
      let i = 0;
      i < 10;
      i++
    ) {

      const y =
        Math.random() * h;

      const height =
        2 + Math.random() * 15;

      ctx.fillStyle =
        Math.random() > 0.5
          ? "#fff"
          : "#000";

      ctx.fillRect(
        Math.random() * w,
        y,
        Math.random() * w * 0.4,
        height
      );

    }

  }


  ctx.restore();

}


/* =========================================
   DRAW
========================================= */

function draw() {

  if (!img) return;


  const [w, h] =
    getSize();


  canvas.width = w;

  canvas.height = h;


  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  ctx.drawImage(
    img,
    0,
    0,
    w,
    h
  );


  if (!before) {

    const data =
      ctx.getImageData(
        0,
        0,
        w,
        h
      );


    processImage(
      data,
      filters[selected].name,
      intensity
    );


    ctx.putImageData(
      data,
      0,
      0
    );


    drawOverlay(
      filters[selected].name
    );

  }


  $("selectedName").textContent =
    filters[selected].name;


  $("selectedDesc").textContent =
    filters[selected].desc;


  $("skinNo").textContent =
    String(filters[selected].id)
      .padStart(2, "0");


  $("skinName").textContent =
    filters[selected].name.toUpperCase();


  $("status").textContent =
    before
      ? "BEFORE · ORIGINAL IMAGE"
      : "READY · " +
        filters[selected].name.toUpperCase();

}


/* =========================================
   EVENTS
========================================= */

$("fileInput").onchange =
  event =>
    loadImage(
      event.target.files[0]
    );


$("fileInput2").onchange =
  event =>
    loadImage(
      event.target.files[0]
    );


$("search").oninput =
  event =>
    renderList(
      event.target.value
    );


$("ratio").onchange =
  draw;


$("intensity").oninput =
  event => {

    intensity =
      event.target.value / 100;

    $("intensityOut").textContent =
      event.target.value + "%";

    draw();

  };


/* RANDOM */

$("randomBtn").onclick =
  () => {

    selected =
      Math.floor(
        Math.random() *
        filters.length
      );

    renderList(
      $("search").value
    );

    draw();

  };


/* BEFORE */

$("beforeBtn").onclick =
  () => {

    before = !before;

    $("beforeBtn").textContent =
      before
        ? "AFTER"
        : "BEFORE";

    draw();

  };


/* RESET */

$("resetBtn").onclick =
  () => {

    selected = 0;

    intensity = 1;

    $("intensity").value = 100;

    $("intensityOut").textContent =
      "100%";

    before = false;

    $("beforeBtn").textContent =
      "BEFORE";

    renderList();

    draw();

  };


/* DOWNLOAD */

$("downloadBtn").onclick =
  () => {

    if (!img) return;

    const link =
     document.createElement("a");

    link.download =
      "butterflyeffect-" +
      filters[selected]
        .name
        .toLowerCase()
        .replaceAll(" ", "-") +
      ".png";

    link.href =
      canvas.toDataURL(
        "image/png"
      );

    link.click();

  };


/* DRAG DROP */

$("dropzone").ondragover =
  event =>
    event.preventDefault();


$("dropzone").ondrop =
  event => {

    event.preventDefault();

    loadImage(
      event.dataTransfer.files[0]
    );

  };


/* =========================================
   FILTER CREATOR
========================================= */

$("creatorBtn").onclick =
  () => {

    $("creator")
      .classList
      .remove("hidden");


    $("customBase").innerHTML =
      filters
        .slice(0, 110)
        .map(
          (filter, index) =>
            `<option value="${index}">
              ${filter.name}
            </option>`
        )
        .join("");

  };


$("closeCreator").onclick =
  () => {

    $("creator")
      .classList
      .add("hidden");

  };


$("customIntensity").oninput =
  event => {

    $("customOut").textContent =
      event.target.value + "%";

  };


$("saveCustom").onclick =
  () => {

    const name =
      $("customName")
        .value
        .trim() ||
      "My Experimental Skin";


    const base =
      filters[
        Number(
          $("customBase").value
        )
      ];


    filters.push({

      id: filters.length + 1,

      name: name,

      desc:
        "Custom experimental blend based on " +
        base.name

    });


    renderList();


    selected =
      filters.length - 1;


    $("creator")
      .classList
      .add("hidden");


    draw();

  };
/* =========================================
   START
========================================= */

renderList();