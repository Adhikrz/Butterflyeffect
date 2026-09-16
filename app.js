/* ============================================================
   BUTTERFLYEFFECT V3
   Procedural Photo Skin Engine
   ------------------------------------------------------------
   Pure browser JavaScript / Canvas
   No external libraries
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   DOM
------------------------------------------------------------ */

const sourceInput =
    document.getElementById("sourceInput") ||
    document.getElementById("fileInput") ||
    document.querySelector('input[type="file"]');

const sourceCanvas =
    document.getElementById("sourceCanvas") ||
    document.getElementById("previewCanvas") ||
    document.getElementById("canvas");

const outputCanvas =
    document.getElementById("outputCanvas") ||
    document.getElementById("resultCanvas") ||
    sourceCanvas;

const sourceCtx = sourceCanvas ? sourceCanvas.getContext("2d", { willReadFrequently: true }) : null;
const outputCtx = outputCanvas ? outputCanvas.getContext("2d", { willReadFrequently: true }) : null;

let originalImage = null;
let originalData = null;
let currentFilter = null;
let currentImageData = null;

let MAX_PREVIEW = 900;


/* ============================================================
   BASIC UTILITIES
============================================================ */

function clamp(v, min = 0, max = 255) {
    return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smoothstep(a, b, x) {
    x = clamp((x - a) / (b - a), 0, 1);
    return x * x * (3 - 2 * x);
}

function hash(x, y, seed = 1) {
    let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
}

function noise(x, y, seed = 1) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);

    const fx = x - x0;
    const fy = y - y0;

    const a = hash(x0, y0, seed);
    const b = hash(x0 + 1, y0, seed);
    const c = hash(x0, y0 + 1, seed);
    const d = hash(x0 + 1, y0 + 1, seed);

    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    return lerp(
        lerp(a, b, ux),
        lerp(c, d, ux),
        uy
    );
}

function cloneData(img) {
    return new ImageData(
        new Uint8ClampedArray(img.data),
        img.width,
        img.height
    );
}

function gray(r, g, b) {
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function createData(w, h) {
    return new ImageData(w, h);
}

function pixelIndex(x, y, w) {
    return (y * w + x) * 4;
}


/* ============================================================
   IMAGE DATA HELPERS
============================================================ */

function mapPixels(img, fn) {
    const out = cloneData(img);
    const d = img.data;
    const o = out.data;

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;

            const result = fn(
                d[i],
                d[i + 1],
                d[i + 2],
                x,
                y,
                img.width,
                img.height
            );

            o[i] = clamp(result[0]);
            o[i + 1] = clamp(result[1]);
            o[i + 2] = clamp(result[2]);
            o[i + 3] = d[i + 3];
        }
    }

    return out;
}

function blend(a, b, amount = 1) {
    amount = clamp(amount, 0, 1);

    const out = cloneData(a);

    for (let i = 0; i < a.data.length; i += 4) {
        out.data[i] =
            lerp(a.data[i], b.data[i], amount);

        out.data[i + 1] =
            lerp(a.data[i + 1], b.data[i + 1], amount);

        out.data[i + 2] =
            lerp(a.data[i + 2], b.data[i + 2], amount);

        out.data[i + 3] = 255;
    }

    return out;
}

function sample(img, x, y) {
    x = Math.round(clamp(x, 0, img.width - 1));
    y = Math.round(clamp(y, 0, img.height - 1));

    const i = (y * img.width + x) * 4;

    return [
        img.data[i],
        img.data[i + 1],
        img.data[i + 2]
    ];
}


/* ============================================================
   COLOUR PALETTES
============================================================ */

function palette(img, stops) {
    return mapPixels(img, (r, g, b) => {

        const v = gray(r, g, b) / 255;

        let a = stops[0];
        let z = stops[stops.length - 1];

        for (let i = 0; i < stops.length - 1; i++) {
            if (v >= stops[i][0] && v <= stops[i + 1][0]) {
                a = stops[i];
                z = stops[i + 1];
                break;
            }
        }

        const t = smoothstep(
            a[0],
            z[0],
            v
        );

        return [
            lerp(a[1][0], z[1][0], t),
            lerp(a[1][1], z[1][1], t),
            lerp(a[1][2], z[1][2], t)
        ];
    });
}

function thermal(img) {
    return palette(img, [
        [0.00, [8, 8, 30]],
        [0.20, [0, 50, 180]],
        [0.40, [0, 220, 255]],
        [0.58, [30, 255, 70]],
        [0.72, [255, 230, 0]],
        [0.86, [255, 80, 0]],
        [1.00, [255, 255, 255]]
    ]);
}

function cyanotype(img) {
    return palette(img, [
        [0.00, [4, 15, 30]],
        [0.35, [12, 55, 90]],
        [0.70, [40, 120, 170]],
        [1.00, [190, 235, 255]]
    ]);
}

function redscale(img) {
    return palette(img, [
        [0.00, [15, 0, 0]],
        [0.30, [100, 8, 5]],
        [0.65, [220, 35, 8]],
        [1.00, [255, 190, 90]]
    ]);
}

function poison(img) {
    return palette(img, [
        [0.00, [0, 8, 0]],
        [0.35, [5, 70, 20]],
        [0.70, [40, 190, 70]],
        [1.00, [190, 255, 150]]
    ]);
}

function pink(img) {
    return palette(img, [
        [0.00, [25, 0, 30]],
        [0.35, [100, 5, 100]],
        [0.70, [235, 30, 150]],
        [1.00, [255, 220, 245]]
    ]);
}

function amber(img) {
    return palette(img, [
        [0.00, [20, 5, 0]],
        [0.35, [100, 30, 0]],
        [0.70, [230, 120, 10]],
        [1.00, [255, 240, 160]]
    ]);
}


/* ============================================================
   NEGATIVE / CHANNEL EFFECTS
============================================================ */

function negative(img) {
    return mapPixels(img, (r, g, b) => [
        255 - r,
        255 - g,
        255 - b
    ]);
}

function blueNegative(img) {
    const n = negative(img);

    return mapPixels(n, (r, g, b) => [
        b * 0.25,
        g * 0.45,
        b
    ]);
}

function channelShift(img, amount = 12) {
    const out = createData(img.width, img.height);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {

            const r = sample(img, x - amount, y);
            const g = sample(img, x, y);
            const b = sample(img, x + amount, y);

            const i = pixelIndex(x, y, img.width);

            out.data[i] = r[0];
            out.data[i + 1] = g[1];
            out.data[i + 2] = b[2];
            out.data[i + 3] = 255;
        }
    }

    return out;
}


/* ============================================================
   EDGE / ENGRAVING
============================================================ */

function edgeMap(img) {
    const out = createData(img.width, img.height);

    for (let y = 1; y < img.height - 1; y++) {
        for (let x = 1; x < img.width - 1; x++) {

            const a = gray(...sample(img, x - 1, y - 1));
            const b = gray(...sample(img, x, y - 1));
            const c = gray(...sample(img, x + 1, y - 1));

            const d = gray(...sample(img, x - 1, y));
            const f = gray(...sample(img, x + 1, y));

            const g = gray(...sample(img, x - 1, y + 1));
            const h = gray(...sample(img, x, y + 1));
            const j = gray(...sample(img, x + 1, y + 1));

            const gx =
                -a + c -
                2 * d + 2 * f -
                g + j;

            const gy =
                -a - 2 * b - c +
                g + 2 * h + j;

            const e = clamp(Math.sqrt(gx * gx + gy * gy));

            const i = pixelIndex(x, y, img.width);

            out.data[i] = e;
            out.data[i + 1] = e;
            out.data[i + 2] = e;
            out.data[i + 3] = 255;
        }
    }

    return out;
}

function engraving(img) {

    const edges = edgeMap(img);
    const out = createData(img.width, img.height);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {

            const i = pixelIndex(x, y, img.width);

            const e = edges.data[i];
            const line =
                Math.sin(
                    (x * 0.13) +
                    (y * 0.045)
                );

            const darkness =
                e * 0.75 +
                Math.max(0, line) * 70;

            out.data[i] = clamp(235 - darkness);
            out.data[i + 1] = clamp(225 - darkness);
            out.data[i + 2] = clamp(195 - darkness);
            out.data[i + 3] = 255;
        }
    }

    return out;
}

function emboss(img) {

    const out = createData(img.width, img.height);

    for (let y = 1; y < img.height - 1; y++) {
        for (let x = 1; x < img.width - 1; x++) {

            const a = gray(...sample(img, x - 1, y - 1));
            const b = gray(...sample(img, x + 1, y + 1));

            const v = 128 + (a - b);

            const i = pixelIndex(x, y, img.width);

            out.data[i] = v;
            out.data[i + 1] = v;
            out.data[i + 2] = v;
            out.data[i + 3] = 255;
        }
    }

    return out;
}


/* ============================================================
   GEOMETRIC DISTORTION
============================================================ */

function warp(img, fn) {

    const out = createData(img.width, img.height);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {

            const p = fn(x, y, img.width, img.height);

            const c = sample(
                img,
                p[0],
                p[1]
            );

            const i = pixelIndex(x, y, img.width);

            out.data[i] = c[0];
            out.data[i + 1] = c[1];
            out.data[i + 2] = c[2];
            out.data[i + 3] = 255;
        }
    }

    return out;
}

function liquidWarp(img, strength = 25) {

    return warp(img, (x, y, w, h) => {

        const nx = x / w;
        const ny = y / h;

        const dx =
            Math.sin(ny * 18 + nx * 5) *
            strength;

        const dy =
            Math.cos(nx * 15 + ny * 7) *
            strength * 0.5;

        return [
            x + dx,
            y + dy
        ];
    });
}

function crumple(img) {

    return warp(img, (x, y, w, h) => {

        const n =
            noise(
                x * 0.018,
                y * 0.018,
                44
            );

        const dx =
            (n - 0.5) * 45;

        const dy =
            (noise(
                x * 0.015,
                y * 0.015,
                88
            ) - 0.5) * 45;

        return [
            x + dx,
            y + dy
        ];
    });
}

function slitScan(img) {

    const out = createData(img.width, img.height);

    for (let y = 0; y < img.height; y++) {

        const displacement =
            Math.sin(y * 0.035) * 90 +
            Math.sin(y * 0.11) * 25;

        for (let x = 0; x < img.width; x++) {

            const c =
                sample(
                    img,
                    x + displacement,
                    y
                );

            const i =
                pixelIndex(x, y, img.width);

            out.data[i] = c[0];
            out.data[i + 1] = c[1];
            out.data[i + 2] = c[2];
            out.data[i + 3] = 255;
        }
    }

    return out;
}

function lenticular(img) {

    return warp(img, (x, y, w, h) => {

        const shift =
            Math.sin(y * 0.22) * 9;

        return [
            x + shift,
            y
        ];
    });
}


/* ============================================================
   PIXEL SORT
============================================================ */

function pixelSort(img) {

    const out = cloneData(img);
    const w = img.width;

    const block = 28;

    for (let y = 0; y < img.height; y++) {

        for (let start = 0; start < w; start += block) {

            const end =
                Math.min(start + block, w);

            const pixels = [];

            for (let x = start; x < end; x++) {

                const i =
                    pixelIndex(x, y, w);

                pixels.push([
                    img.data[i],
                    img.data[i + 1],
                    img.data[i + 2]
                ]);
            }

            pixels.sort(
                (a, b) =>
                    gray(...a) - gray(...b)
            );

            for (let x = start; x < end; x++) {

                const p = pixels[x - start];

                const i =
                    pixelIndex(x, y, w);

                out.data[i] = p[0];
                out.data[i + 1] = p[1];
                out.data[i + 2] = p[2];
            }
        }
    }

    return out;
}


/* ============================================================
   DITHERING
============================================================ */

const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
];

function dither(img, levels = 4) {

    return mapPixels(img, (r, g, b, x, y) => {

        const threshold =
            (BAYER[y % 4][x % 4] / 16 - 0.5) * 255;

        const q = v =>
            Math.round(
                (v + threshold) /
                (255 / (levels - 1))
            ) *
            (255 / (levels - 1));

        return [
            q(r),
            q(g),
            q(b)
        ];
    });
}


/* ============================================================
   HALFTONE
============================================================ */

function halftone(img, cell = 8) {

    const out = createData(
        img.width,
        img.height
    );

    const ctx =
        document.createElement("canvas")
            .getContext("2d");

    const canvas = ctx.canvas;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
        0,
        0,
        img.width,
        img.height
    );

    ctx.fillStyle = "#050505";

    for (let y = 0; y < img.height; y += cell) {
        for (let x = 0; x < img.width; x += cell) {

            const c =
                sample(
                    img,
                    x + cell / 2,
                    y + cell / 2
                );

            const lum =
                gray(...c) / 255;

            const radius =
                (1 - lum) *
                cell *
                0.62;

            ctx.beginPath();

            ctx.arc(
                x + cell / 2,
                y + cell / 2,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }

    return ctx.getImageData(
        0,
        0,
        img.width,
        img.height
    );
}


/* ============================================================
   LED MATRIX
============================================================ */

function ledMatrix(img) {

    const out =
        document.createElement("canvas");

    out.width = img.width;
    out.height = img.height;

    const ctx = out.getContext("2d");

    ctx.fillStyle = "#020509";
    ctx.fillRect(
        0,
        0,
        img.width,
        img.height
    );

    const cell = 7;

    for (let y = 0; y < img.height; y += cell) {
        for (let x = 0; x < img.width; x += cell) {

            const c =
                sample(
                    img,
                    x,
                    y
                );

            const lum =
                gray(...c) / 255;

            const r =
                cell * 0.34 *
                (0.2 + lum);

            ctx.beginPath();

            ctx.fillStyle =
                `rgb(${c[0]},${c[1]},${c[2]})`;

            ctx.arc(
                x + cell / 2,
                y + cell / 2,
                r,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }

    return out.getContext("2d")
        .getImageData(
            0,
            0,
            img.width,
            img.height
        );
}


/* ============================================================
   CROSS STITCH
============================================================ */

function crossStitch(img, dropped = false) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle = "#e8dfcc";
    ctx.fillRect(
        0,
        0,
        img.width,
        img.height
    );

    const size = 9;

    for (let y = 0; y < img.height; y += size) {

        for (let x = 0; x < img.width; x += size) {

            if (
                dropped &&
                hash(x, y, 55) < 0.16
            ) continue;

            const c =
                sample(
                    img,
                    x + size / 2,
                    y + size / 2
                );

            ctx.strokeStyle =
                `rgb(${c[0]},${c[1]},${c[2]})`;

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.moveTo(x + 2, y + 2);
            ctx.lineTo(x + size - 2, y + size - 2);

            ctx.moveTo(x + size - 2, y + 2);
            ctx.lineTo(x + 2, y + size - 2);

            ctx.stroke();
        }
    }

    return canvas.getContext("2d")
        .getImageData(
            0,
            0,
            img.width,
            img.height
        );
}


/* ============================================================
   VOXEL RELIEF
============================================================ */

function voxel(img) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle = "#111";
    ctx.fillRect(
        0,
        0,
        img.width,
        img.height
    );

    const size = 14;

    for (let y = 0; y < img.height; y += size) {

        for (let x = 0; x < img.width; x += size) {

            const c =
                sample(
                    img,
                    x + size / 2,
                    y + size / 2
                );

            const lum =
                gray(...c) / 255;

            const depth =
                lum * 8;

            ctx.fillStyle =
                `rgb(${c[0]},${c[1]},${c[2]})`;

            ctx.fillRect(
                x,
                y - depth,
                size,
                size
            );

            ctx.fillStyle =
                `rgba(255,255,255,${lum * 0.25})`;

            ctx.beginPath();

            ctx.moveTo(
                x,
                y - depth
            );

            ctx.lineTo(
                x + size,
                y - depth
            );

            ctx.lineTo(
                x + size - 3,
                y - depth + 3
            );

            ctx.lineTo(
                x + 3,
                y - depth + 3
            );

            ctx.closePath();

            ctx.fill();
        }
    }

    return canvas.getContext("2d")
        .getImageData(
            0,
            0,
            img.width,
            img.height
        );
}


/* ============================================================
   PINSCREEN
============================================================ */

function pinscreen(img) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle = "#d7d7d0";

    ctx.fillRect(
        0,
        0,
        img.width,
        img.height
    );

    const size = 10;

    for (let y = 0; y < img.height; y += size) {

        for (let x = 0; x < img.width; x += size) {

            const c =
                sample(img, x, y);

            const lum =
                gray(...c) / 255;

            const radius =
                (1 - lum) *
                size *
                0.45;

            ctx.fillStyle =
                `rgb(${c[0]},${c[1]},${c[2]})`;

            ctx.beginPath();

            ctx.arc(
                x + size / 2,
                y + size / 2,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }

    return canvas.getContext("2d")
        .getImageData(
            0,
            0,
            img.width,
            img.height
        );
}


/* ============================================================
   CHROME
============================================================ */

function chrome(img) {

    let w = liquidWarp(img, 32);

    w = mapPixels(w, (r, g, b, x, y, width, height) => {

        const v =
            gray(r, g, b) / 255;

        const wave =
            Math.sin(
                y * 0.06 +
                x * 0.012
            );

        const shine =
            Math.pow(
                Math.max(0, wave),
                5
            );

        return [
            v * 130 + shine * 125,
            v * 140 + shine * 130,
            v * 155 + shine * 140
        ];
    });

    return w;
}


/* ============================================================
   RORSCHACH
============================================================ */

function rorschach(img) {

    const out =
        createData(
            img.width,
            img.height
        );

    const mid =
        img.width / 2;

    for (let y = 0; y < img.height; y++) {

        for (let x = 0; x < img.width; x++) {

            const mirroredX =
                x < mid
                    ? x
                    : img.width - x - 1;

            const c =
                sample(
                    img,
                    mirroredX,
                    y
                );

            const i =
                pixelIndex(
                    x,
                    y,
                    img.width
                );

            out.data[i] = c[0];
            out.data[i + 1] = c[1];
            out.data[i + 2] = c[2];
            out.data[i + 3] = 255;
        }
    }

    return chrome(out);
}


/* ============================================================
   DEAD PIXELS / DIGITAL ROT
============================================================ */

function deadPixels(img) {

    const out = cloneData(img);

    for (let y = 0; y < img.height; y++) {

        for (let x = 0; x < img.width; x++) {

            if (
                hash(
                    Math.floor(x / 5),
                    Math.floor(y / 5),
                    19
                ) > 0.985
            ) {

                const i =
                    pixelIndex(
                        x,
                        y,
                        img.width
                    );

                out.data[i] = 255;
                out.data[i + 1] = 0;
                out.data[i + 2] = 100;
            }
        }
    }

    return out;
}


/* ============================================================
   GLITCH SLICES
============================================================ */

function hyperSlice(img) {

    const out = cloneData(img);

    const sliceHeight = 8;

    for (
        let y = 0;
        y < img.height;
        y += sliceHeight
    ) {

        const shift =
            (hash(
                y,
                42,
                9
            ) - 0.5) * 180;

        for (
            let yy = y;
            yy < Math.min(
                y + sliceHeight,
                img.height
            );
            yy++
        ) {

            for (
                let x = 0;
                x < img.width;
                x++
            ) {

                const sx =
                    Math.round(
                        x + shift
                    );

                if (
                    sx < 0 ||
                    sx >= img.width
                ) continue;

                const a =
                    pixelIndex(
                        sx,
                        yy,
                        img.width
                    );

                const b =
                    pixelIndex(
                        x,
                        yy,
                        img.width
                    );

                out.data[b] =
                    img.data[a];

                out.data[b + 1] =
                    img.data[a + 1];

                out.data[b + 2] =
                    img.data[a + 2];
            }
        }
    }

    return channelShift(out, 7);
}

/* ============================================================
   FILM / NOISE
============================================================ */

function grain(img, amount = 20) {

    return mapPixels(
        img,
        (r, g, b, x, y) => {

            const n =
                (hash(x, y, 77) - 0.5) *
                amount;

            return [
                r + n,
                g + n,
                b + n
            ];
        }
    );
}

function filmSoup(img) {

    let out =
        crumple(img);

    out =
        grain(out, 32);

    return mapPixels(
        out,
        (r, g, b, x, y) => {

            const blot =
                noise(
                    x * 0.025,
                    y * 0.025,
                    120
                );

            return [
                r * (0.7 + blot * 0.5),
                g * (0.72 + blot * 0.45),
                b * (0.68 + blot * 0.55)
            ];
        }
    );
}


/* ============================================================
   FOG / BLOOM
============================================================ */

function blur(img, amount = 6) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.filter =
        `blur(${amount}px)`;

    ctx.putImageData(
        img,
        0,
        0
    );

    return ctx.getImageData(
        0,
        0,
        img.width,
        img.height
    );
}

function bloom(img) {

    const b =
        blur(img, 10);

    return blend(
        img,
        b,
        0.42
    );
}

function fog(img) {

    const b =
        blur(img, 16);

    return mapPixels(
        blend(img, b, 0.55),
        (r, g, b, x, y) => {

            const n =
                noise(
                    x * 0.008,
                    y * 0.008,
                    30
                );

            return [
                r + n * 40,
                g + n * 40,
                b + n * 45
            ];
        }
    );
}


/* ============================================================
   POSTER / PRINT
============================================================ */

function posterize(img, levels = 5) {

    const step =
        255 / (levels - 1);

    return mapPixels(
        img,
        (r, g, b) => [
            Math.round(r / step) * step,
            Math.round(g / step) * step,
            Math.round(b / step) * step
        ]
    );
}

function threeInks(img) {

    const p =
        posterize(img, 3);

    return palette(
        p,
        [
            [0, [15, 20, 25]],
            [0.35, [180, 20, 80]],
            [0.68, [20, 150, 170]],
            [1, [245, 230, 150]]
        ]
    );
}

function stencil(img) {

    const e =
        edgeMap(img);

    return mapPixels(
        img,
        (r, g, b) => {

            const v =
                gray(r, g, b);

            if (v < 100)
                return [10, 5, 30];

            return [
                255,
                20,
                190
            ];
        }
    );
}

/* ============================================================
   PAPER / COLLAGE
============================================================ */

function collage(img) {

    const out =
        cloneData(img);

    const block = 55;

    for (
        let y = 0;
        y < img.height;
        y += block
    ) {

        for (
            let x = 0;
            x < img.width;
            x += block
        ) {

            const shift =
                (hash(x, y, 66) - 0.5) *
                35;

            for (
                let yy = y;
                yy < Math.min(
                    y + block,
                    img.height
                );
                yy++
            ) {

                for (
                    let xx = x;
                    xx < Math.min(
                        x + block,
                        img.width
                    );
                    xx++
                ) {

                    const c =
                        sample(
                            img,
                            xx + shift,
                            yy
                        );

                    const i =
                        pixelIndex(
                            xx,
                            yy,
                            img.width
                        );

                    out.data[i] = c[0];
                    out.data[i + 1] = c[1];
                    out.data[i + 2] = c[2];
                }
            }
        }
    }

    return out;
}


/* ============================================================
   BUBBLE WRAP
============================================================ */

function bubbles(img) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.putImageData(
        img,
        0,
        0
    );

    const size = 22;

    for (
        let y = 0;
        y < img.height;
        y += size
    ) {

        for (
            let x = 0;
            x < img.width;
            x += size
        ) {

            ctx.strokeStyle =
                "rgba(255,255,255,.45)";

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.arc(
                x + size / 2,
                y + size / 2,
                size * 0.38,
                0,
                Math.PI * 2
            );

            ctx.stroke();
        }
    }

    return ctx.getImageData(
        0,
        0,
        img.width,
        img.height
    );
}

/* ============================================================
   JACQUARD / WEAVE
============================================================ */

function jacquard(img) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.putImageData(
        img,
        0,
        0
    );

    const size = 6;

    for (
        let y = 0;
        y < img.height;
        y += size
    ) {

        ctx.strokeStyle =
            "rgba(255,255,255,.22)";

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(img.width, y);

        ctx.stroke();
    }

    for (
        let x = 0;
        x < img.width;
        x += size
    ) {

        ctx.strokeStyle =
            "rgba(0,0,0,.25)";

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, img.height);

        ctx.stroke();
    }

    return ctx.getImageData(
        0,
        0,
        img.width,
        img.height
    );
}


/* ============================================================
   CONTOUR / SCIENTIFIC
============================================================ */

function contour(img) {

    const edges =
        edgeMap(img);

    return palette(
        edges,
        [
            [0, [0, 0, 0]],
            [0.3, [0, 50, 120]],
            [0.55, [0, 220, 255]],
            [0.75, [255, 220, 0]],
            [1, [255, 30, 20]]
        ]
    );
}


/* ============================================================
   SPECIAL EFFECTS
============================================================ */

function auraGradient(img) {

    return mapPixels(
        img,
        (r, g, b, x, y, w, h) => {

            const dx =
                x / w - 0.5;

            const dy =
                y / h - 0.5;

            const dist =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            const glow =
                Math.max(
                    0,
                    1 - dist * 1.7
                );

            return [
                r + glow * 55,
                g + glow * 20,
                b + glow * 80
            ];
        }
    );
}

function giallo(img) {

    return palette(img, [
        [0, [15, 5, 5]],
        [0.35, [110, 25, 5]],
        [0.65, [230, 130, 10]],
        [1, [255, 245, 120]]
    ]);
}

function twoStrip(img) {

    return palette(img, [
        [0, [10, 35, 45]],
        [0.5, [20, 130, 150]],
        [1, [255, 120, 50]]
    ]);
}

function aerochrome(img) {

    return mapPixels(
        img,
        (r, g, b) => [
            clamp(g * 1.3 + b * 0.15),
            clamp(r * 0.35 + g * 0.5),
            clamp(r * 1.15)
        ]
    );
}

function inkBloom(img) {

    return mapPixels(
        img,
        (r, g, b, x, y) => {

            const v =
                gray(r, g, b);

            const n =
                noise(
                    x * 0.025,
                    y * 0.025,
                    10
                ) * 80;

            const q =
                v + n;

            return q > 125
                ? [240, 235, 220]
                : [15, 20, 40];
        }
    );
}

function photogram(img) {

    return mapPixels(
        img,
        (r, g, b) => {

            const v =
                gray(r, g, b);

            return [
                v > 110 ? 245 : 20,
                v > 110 ? 240 : 25,
                v > 110 ? 220 : 35
            ];
        }
    );
}

function heatTrace(img) {

    return contour(
        edgeMap(img)
    );
}

function scanLines(img) {

    const out =
        cloneData(img);

    for (
        let y = 0;
        y < img.height;
        y++
    ) {

        const factor =
            y % 4 === 0
                ? 0.55
                : 1;

        for (
            let x = 0;
            x < img.width;
            x++
        ) {

            const i =
                pixelIndex(
                    x,
                    y,
                    img.width
                );

            out.data[i] *= factor;
            out.data[i + 1] *= factor;
            out.data[i + 2] *= factor;
        }
    }

    return out;
}

function herbarium(img) {

    return palette(img, [
        [0, [15, 25, 10]],
        [0.4, [70, 90, 35]],
        [0.75, [160, 150, 85]],
        [1, [235, 220, 160]]
    ]);
}

function densityMap(img) {

    return thermal(
        blur(img, 4)
    );
}

function paintByNumber(img) {

    const out =
        posterize(img, 5);

    const edges =
        edgeMap(img);

    return blend(
        out,
        edges,
        0.38
    );
}

function encyclopedia(img) {

    return blend(
        palette(img, [
            [0, [20, 25, 30]],
            [0.5, [90, 100, 100]],
            [1, [240, 225, 185]]
        ]),
        edgeMap(img),
        0.25
    );
}

function redaction(img) {

    const out =
        cloneData(img);

    const barHeight = 10;

    for (
        let y = 0;
        y < img.height;
        y++
    ) {

        if (
            hash(
                Math.floor(y / 25),
                9,
                21
            ) > 0.68
        ) {

            for (
                let yy = y;
                yy < Math.min(
                    y + barHeight,
                    img.height
                );
                yy++
            ) {

                for (
                    let x = 0;
                    x < img.width;
                    x++
                ) {

                    const i =
                        pixelIndex(
                            x,
                            yy,
                            img.width
                        );

                    out.data[i] = 5;
                    out.data[i + 1] = 5;
                    out.data[i + 2] = 5;
                }
            }
        }
    }

    return out;
}

function toon(img) {

    return blend(
        posterize(img, 6),
        edgeMap(img),
        0.4
    );
}

function sticker(img) {

    return blend(
        posterize(img, 5),
        edgeMap(img),
        0.3
    );
}

function specimen(img) {

    return encyclopedia(img);
}

function vhs(img) {

    return channelShift(
        scanLines(
            grain(img, 35)
        ),
        5
    );
}

function splitHalftone(img) {

    const h =
        halftone(img, 8);

    return channelShift(
        h,
        16
    );
}

function teletext(img) {

    return dither(
        posterize(img, 4),
        4
    );
}

function fogSilhouette(img) {

    return mapPixels(
        img,
        (r, g, b, x, y) => {

            const v =
                gray(r, g, b);

            const fog =
                noise(
                    x * 0.01,
                    y * 0.01,
                    77
                ) * 70;

            if (v + fog < 100)
                return [5, 5, 15];

            return [
                160 + fog,
                170 + fog,
                190 + fog
            ];
        }
    );
}

function forensic(img) {

    return blend(
        mapPixels(
            img,
            (r, g, b) => {
                const v =
                    gray(r, g, b);

                return [v, v, v];
            }
        ),
        edgeMap(img),
        0.5
    );
}

function autochrome(img) {

    const canvas =
        document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle = "#111";
    ctx.fillRect(
        0,
        0,
        img.width,
        img.height
    );

    const size = 6;

    for (
        let y = 0;
        y < img.height;
        y += size
    ) {

        for (
            let x = 0;
            x < img.width;
            x += size
        ) {

            const c =
                sample(img, x, y);

            const colors = [
                [c[0], 0, 0],
                [0, c[1], 0],
                [0, 0, c[2]]
            ];

            colors.forEach(
                (col, n) => {

                    ctx.fillStyle =
                        `rgb(${col[0]},${col[1]},${col[2]})`;

                    ctx.beginPath();

                    ctx.arc(
                        x +
                            size * 0.3 +
                            n * size * 0.2,
                        y + size / 2,
                        size * 0.22,
                        0,
                        Math.PI * 2
                    );

                    ctx.fill();
                }
            );
        }
    }

    return ctx.getImageData(
        0,
        0,
        img.width,
        img.height
    );
}

function bleach(img) {

    return mapPixels(
        img,
        (r, g, b) => {

            const v =
                gray(r, g, b);

            return [
                v > 130 ? 245 : v * 0.35,
                v > 130 ? 235 : v * 0.25,
                v > 130 ? 220 : v * 0.15
            ];
        }
    );
}

function dotInterference(img) {

    const out =
        cloneData(img);

    for (
        let y = 0;
        y < img.height;
        y++
    ) {

        for (
            let x = 0;
            x < img.width;
            x++
        ) {

            const interference =
                Math.sin(
                    x * 0.28 +
                    Math.sin(y * 0.05)
                );

            const i =
                pixelIndex(
                    x,
                    y,
                    img.width
                );

            const factor =
                interference > 0
                    ? 1.25
                    : 0.55;

            out.data[i] *= factor;
            out.data[i + 1] *= factor;
            out.data[i + 2] *= factor;
        }
    }

    return out;
}

function cyber(img) {

    return blend(
        OPS.neon(img),
        edgeMap(img),
        0.45
    );
}

function pixelLace(img) {

    const out =
        halftone(img, 5);

    return scanLines(out);
}

function bio(img) {

    return blend(
        cyanotype(
            edgeMap(img)
        ),
        img,
        0.35
    );
}

/* =========================
   DECORATIVE HUD
========================= */

function drawHUD(ctx, w, h, type = "scan") {
  ctx.save();

  const t = performance.now() * 0.001;

  // subtle technical frame
  ctx.lineWidth = 1;

  const pad = Math.min(w, h) * 0.045;

  // corner brackets
  const len = Math.min(w, h) * 0.065;

  ctx.beginPath();

  // top-left
  ctx.moveTo(pad + len, pad);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad, pad + len);

  // top-right
  ctx.moveTo(w - pad - len, pad);
  ctx.lineTo(w - pad, pad);
  ctx.lineTo(w - pad, pad + len);

  // bottom-left
  ctx.moveTo(pad, h - pad - len);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(pad + len, h - pad);

  // bottom-right
  ctx.moveTo(w - pad, h - pad - len);
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(w - pad - len, h - pad);

  ctx.stroke();

  /* scan line */

  if (type === "scan") {
    const y = ((t * 70) % (h + 100)) - 50;

    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, y, w, 2);

    ctx.globalAlpha = 0.07;
    ctx.fillRect(0, y - 8, w, 18);
  }

  /* targeting reticle */

  if (
    type === "target" ||
    type === "forensic" ||
    type === "bio"
  ) {
    const cx = w * 0.5;
    const cy = h * 0.45;

    const r = Math.min(w, h) * 0.12;

    ctx.globalAlpha = 0.65;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r - 18, cy);
    ctx.lineTo(cx - r + 5, cy);

    ctx.moveTo(cx + r - 5, cy);
    ctx.lineTo(cx + r + 18, cy);

    ctx.moveTo(cx, cy - r - 18);
    ctx.lineTo(cx, cy - r + 5);

    ctx.moveTo(cx, cy + r - 5);
    ctx.lineTo(cx, cy + r + 18);

    ctx.stroke();

    // rotating tick marks
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.35);

    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);

      ctx.beginPath();
      ctx.moveTo(r + 8, 0);
      ctx.lineTo(r + 18, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* technical coordinates */

  if (type === "forensic" || type === "bio") {
    ctx.globalAlpha = 0.7;

    ctx.font = `${Math.max(9, Math.floor(w * 0.018))}px monospace`;

    ctx.fillText(
      `X:${Math.floor(w * 0.314)}`,
      pad,
      h - pad - 20
    );

    ctx.fillText(
      `Y:${Math.floor(h * 0.618)}`,
      pad,
      h - pad - 6
    );

    ctx.textAlign = "right";

    ctx.fillText(
      `SCAN_${String(Math.floor(t * 4) % 999).padStart(3, "0")}`,
      w - pad,
      pad + 12
    );

    ctx.fillText(
      `FRAME_${String(Math.floor(t * 24) % 9999).padStart(4, "0")}`,
      w - pad,
      pad + 27
    );

    ctx.textAlign = "left";
  }

  ctx.restore();
}


/* =========================
   BIO HUD
========================= */

function drawBioHUD(ctx, w, h) {
  ctx.save();

  const t = performance.now() * 0.001;

  const cx = w * 0.5;
  const cy = h * 0.46;

  const base = Math.min(w, h);

  /* face detection box */

  const bw = base * 0.34;
  const bh = base * 0.43;

  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1;

  ctx.strokeRect(
    cx - bw / 2,
    cy - bh / 2,
    bw,
    bh
  );

  /* corner markers */

  const c = base * 0.035;

  const x1 = cx - bw / 2;
  const x2 = cx + bw / 2;

  const y1 = cy - bh / 2;
  const y2 = cy + bh / 2;

  ctx.beginPath();

  ctx.moveTo(x1, y1 + c);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 + c, y1);

  ctx.moveTo(x2 - c, y1);
  ctx.lineTo(x2, y1);
  ctx.lineTo(x2, y1 + c);

  ctx.moveTo(x1, y2 - c);
  ctx.lineTo(x1, y2);
  ctx.lineTo(x1 + c, y2);

  ctx.moveTo(x2 - c, y2);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2, y2 - c);

  ctx.stroke();

  /* tracking points */

  const points = [
    [-0.15, -0.15],
    [0.15, -0.15],
    [-0.17, 0],
    [0.17, 0],
    [-0.11, 0.17],
    [0.11, 0.17]
  ];

  ctx.fillStyle = "white";

  for (const [px, py] of points) {
    const pulse =
      2 +
      Math.sin(t * 5 + px * 10) * 1.2;

    ctx.beginPath();

    ctx.arc(
      cx + bw * px,
      cy + bh * py,
      pulse,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  /* rotating analysis ring */

  ctx.globalAlpha = 0.5;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    base * 0.23,
    t * 0.5,
    t * 0.5 + Math.PI * 0.65
  );

  ctx.stroke();

  /* analysis text */

  ctx.globalAlpha = 0.75;

  ctx.font =
    `${Math.max(9, Math.floor(base * 0.016))}px monospace`;

  ctx.fillText(
    "BIO_ANALYSIS",
    cx - bw / 2,
    y2 + 24
  );

  ctx.fillText(
    "TRACKING: ACTIVE",
    cx - bw / 2,
    y2 + 38
  );

  ctx.restore();
}
/* =========================
   CURSOR SWARM
========================= */

function drawCursors(ctx, w, h) {
  ctx.save();

  const t = performance.now() * 0.001;
  const count = 28;

  ctx.lineWidth = 1;

  for (let i = 0; i < count; i++) {

    const seed = i * 17.731;

    const x =
      (Math.sin(seed + t * 0.8) * 0.5 + 0.5) * w;

    const y =
      (Math.cos(seed * 1.37 + t * 0.6) * 0.5 + 0.5) * h;

    const size =
      5 + (i % 5);

    ctx.globalAlpha =
      0.3 + (i % 6) * 0.08;

    /* cursor arrow */

    ctx.beginPath();

    ctx.moveTo(x, y);

    ctx.lineTo(
      x,
      y + size * 3
    );

    ctx.lineTo(
      x + size,
      y + size * 2
    );

    ctx.lineTo(
      x + size * 2,
      y + size * 2.6
    );

    ctx.lineTo(
      x + size * 1.4,
      y + size * 1.7
    );

    ctx.closePath();

    ctx.stroke();

    /* tiny tracking trail */

    ctx.globalAlpha *= 0.35;

    ctx.beginPath();

    ctx.moveTo(
      x - size * 2,
      y - size * 2
    );

    ctx.lineTo(x, y);

    ctx.stroke();
  }

  ctx.restore();
}

/* =========================
   SCRIBBLE RIOT
========================= */

function drawScribbles(ctx, w, h) {
  ctx.save();

  const t = performance.now() * 0.001;

  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.globalAlpha = 0.42;

  const count = 24;

  for (let i = 0; i < count; i++) {

    const seed = i * 91.173;

    let x =
      (Math.sin(seed) * 0.5 + 0.5) * w;

    let y =
      (Math.cos(seed * 1.41) * 0.5 + 0.5) * h;

    ctx.beginPath();
    ctx.moveTo(x, y);

    /*
      Each scribble gets its own
      chaotic movement pattern.
    */

    const points = 25 + (i % 18);

    for (let j = 0; j < points; j++) {

      const angle =
        seed +
        j * 1.73 +
        Math.sin(t * 0.4 + i) * 0.5;

      const distance =
        5 +
        Math.sin(j * 2.1 + seed) * 9;

      x +=
        Math.cos(angle) * distance;

      y +=
        Math.sin(angle) * distance;

      ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  /*
    Extra aggressive scribble loops
  */

  ctx.globalAlpha = 0.25;

  for (let i = 0; i < 12; i++) {

    const cx =
      ((Math.sin(i * 13.7) + 1) / 2) * w;

    const cy =
      ((Math.cos(i * 9.3) + 1) / 2) * h;

    const radius =
      Math.min(w, h) *
      (0.04 + (i % 4) * 0.018);

    ctx.beginPath();

    for (
      let a = 0;
      a < Math.PI * 5;
      a += 0.15
    ) {

      const r =
        radius *
        (1 +
          Math.sin(a * 3 + i) * 0.28);

      const px =
        cx +
        Math.cos(a + t * 0.15) * r;

      const py =
        cy +
        Math.sin(a + t * 0.15) * r;

      if (a === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }
 
    ctx.restore();
}

/* =========================
   HUD SELECTOR
========================= */

function applyDecorativeHUD(ctx, w, h, name) {

  if (!name) return;

  const n = name.toLowerCase();

  /* SCAN / SCIENTIFIC */

  if (
    n.includes("scan lines") ||
    n.includes("x-ray scan") ||
    n.includes("electron scan") ||
    n.includes("radiograph")
  ) {
    drawHUD(ctx, w, h, "scan");
  }


  /* FORENSIC / SURVEILLANCE */

  if (
    n.includes("forensic photo") ||
    n.includes("surveillance dossier")
  ) {
    drawHUD(ctx, w, h, "forensic");
  }


  /* BIO HUD */

  if (n.includes("bio hud")) {
    drawBioHUD(ctx, w, h);
  }


  /* CURSOR SWARM */

  if (n.includes("cursor swarm")) {
    drawCursors(ctx, w, h);
  }


  /* SCRIBBLE RIOT */

  if (n.includes("scribble riot")) {
    drawScribbles(ctx, w, h);
  }
}


/* =========================
   RENDER
========================= */

function render() {

  if (!sourceImage) return;

  const name =
    currentFilterName ||
    selectedFilter ||
    "Original";

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;


  /* Draw original image */

  sourceCtx.clearRect(
    0,
    0,
    w,
    h
  );

  sourceCtx.drawImage(
    sourceImage,
    0,
    0,
    w,
    h
  );


  /* Get pixels */

  let img =
    sourceCtx.getImageData(
      0,
      0,
      w,
      h
    );


  /* Apply filter */

  try {

    img = applyFilter(
      img,
      name
    );

  } catch (error) {

    console.error(
      "Filter error:",
      name,
      error
    );

  }


  /* Draw processed image */

  outputCtx.clearRect(
    0,
    0,
    w,
    h
  );

  outputCtx.putImageData(
    img,
    0,
    0
  );


  /* Decorative layer */

  applyDecorativeHUD(
    outputCtx,
    w,
    h,
    name
  );
}


/* =========================
   IMAGE LOADING
========================= */

function loadImage(file) {

  if (!file) return;

  if (!file.type.startsWith("image/")) {

    console.warn(
      "Selected file is not an image."
    );

    return;
  }


  const reader =
    new FileReader();


  reader.onload = function (event) {

    const img =
      new Image();


    img.onload = function () {

      sourceImage = img;


      /* Keep processing reasonable
         on mobile devices */

      const MAX_SIZE = 1400;

      const scale =
        Math.min(
          1,
          MAX_SIZE /
          Math.max(
            img.width,
            img.height
          )
        );


      const width =
        Math.max(
          1,
          Math.floor(
            img.width * scale
          )
        );

      const height =
        Math.max(
          1,
          Math.floor(
            img.height * scale
          )
        );


      sourceCanvas.width =
        width;

      sourceCanvas.height =
        height;

      outputCanvas.width =
        width;

      outputCanvas.height =
        height;


      render();
    };


    img.onerror = function () {

      console.error(
        "Could not load image."
      );

    };


    img.src =
      event.target.result;
  };


  reader.onerror = function () {

    console.error(
      "Could not read image."
    );

  };


  reader.readAsDataURL(file);
}

/* =========================
   FILE INPUT
========================= */

const fileInput =
  document.querySelector(
    "#fileInput, #sourceInput, input[type='file']"
  );


if (fileInput) {

  fileInput.addEventListener(
    "change",
    function (event) {

      const file =
        event.target.files &&
        event.target.files[0];

      if (file) {
        loadImage(file);
      }

    }
  );

}


/* =========================
   DRAG + DROP
========================= */

const dropZone =
  document.querySelector(
    "#dropZone, .drop-zone, .upload-zone"
  );


if (dropZone) {

  dropZone.addEventListener(
    "dragover",
    function (event) {

      event.preventDefault();

      dropZone.classList.add(
        "dragging"
      );

    }
  );


  dropZone.addEventListener(
    "dragleave",
    function () {

      dropZone.classList.remove(
        "dragging"
      );

    }
  );


  dropZone.addEventListener(
    "drop",
    function (event) {

      event.preventDefault();

      dropZone.classList.remove(
        "dragging"
      );


      const file =
        event.dataTransfer &&
        event.dataTransfer.files &&
        event.dataTransfer.files[0];


      if (file) {
        loadImage(file);
      }

    }
  );

}


/* =========================
   DOWNLOAD
========================= */

function downloadResult() {

  if (!outputCanvas) {
    console.warn(
      "Output canvas not found."
    );

    return;
  }


  const link =
    document.createElement("a");


  link.download =
    "butterflyeffect-filter.png";


  link.href =
    outputCanvas.toDataURL(
      "image/png"
    );


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();
}


/* =========================
   DOWNLOAD BUTTON
========================= */

const downloadBtn =
  document.querySelector(
    "#downloadBtn, #download, .download-btn"
  );


if (downloadBtn) {

  downloadBtn.addEventListener(
    "click",
    downloadResult
  );

}


/* =========================
   INITIALIZE
========================= */

window.addEventListener(
  "load",
  function () {

    console.log(
      "Butterflyeffect initialized."
    );


    try {

      if (
        typeof updateFilterList ===
        "function"
      ) {

        updateFilterList();

      }

    } catch (error) {

      console.warn(
        "Filter list initialization failed:",
        error
      );

    }

  }
);