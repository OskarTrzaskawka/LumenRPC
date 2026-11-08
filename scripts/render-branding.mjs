// Renders branding/*.svg into the PNG/BMP files used by the README, GitHub and installers.
// Usage: node scripts/render-branding.mjs
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => join(root, "branding", f);

function render(svgFile, width) {
  const svg = readFileSync(src(svgFile), "utf8");
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" },
  });
  return r.render();
}

function out(path, data) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
  console.log("wrote", path);
}

/** 24-bit bottom-up BMP, which is what NSIS expects for header/sidebar images. */
function toBmp(img) {
  const { width: w, height: h, pixels } = img;
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const size = 54 + rowSize * h;
  const b = Buffer.alloc(size);
  b.write("BM", 0);
  b.writeUInt32LE(size, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(w, 18);
  b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(24, 28);
  b.writeUInt32LE(rowSize * h, 34);
  for (let y = 0; y < h; y++) {
    const row = 54 + (h - 1 - y) * rowSize;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = pixels[i + 3] / 255; // composite on white
      b[row + x * 3] = Math.round(pixels[i + 2] * a + 255 * (1 - a));
      b[row + x * 3 + 1] = Math.round(pixels[i + 1] * a + 255 * (1 - a));
      b[row + x * 3 + 2] = Math.round(pixels[i] * a + 255 * (1 - a));
    }
  }
  return b;
}

out("branding/png/logo-1024.png", render("logo.svg", 1024).asPng());
out("branding/png/logo-256.png", render("logo.svg", 256).asPng());
out("branding/png/banner.png", render("banner.svg", 2560).asPng());
out("branding/png/social-preview.png", render("social-preview.svg", 1280).asPng());
out("src-tauri/installer/nsis-sidebar.bmp", toBmp(render("installer-sidebar.svg", 164)));
out("src-tauri/installer/nsis-header.bmp", toBmp(render("installer-header.svg", 150)));
out("public/lumen.svg", readFileSync(src("logo.svg")));
