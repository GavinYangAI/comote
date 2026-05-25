import qrcode from "./vendor/qrcode-generator.js";

export function qrDataUrl(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const svg = qr.createSvgTag({
    cellSize: 5,
    margin: 4,
    scalable: true,
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
