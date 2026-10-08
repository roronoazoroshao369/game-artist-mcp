import { validateDocument } from "./validate.mjs";
import {renderStyledDocument} from "./render-appearance.mjs";

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function style(node) {
  const attrs = [
    `fill="${esc(node.fill ?? "none")}"`,
    `stroke="${esc(node.stroke ?? "none")}"`,
    `stroke-width="${esc(node.strokeWidth ?? 0)}"`,
    `stroke-linecap="${esc(node.lineCap ?? "round")}"`,
    `stroke-linejoin="${esc(node.lineJoin ?? "round")}"`,
    `opacity="${esc(node.opacity ?? 1)}"`
  ];
  if (node.transform) attrs.push(`transform="${esc(node.transform)}"`);
  return attrs.join(" ");
}

function renderNode(node) {
  if (node.type === "path") {
    return `  <path id="${esc(node.id)}" d="${esc(node.d)}" ${style(node)} />`;
  }

  if (node.type === "ellipse") {
    return `  <ellipse id="${esc(node.id)}" cx="${node.cx}" cy="${node.cy}" rx="${node.rx}" ry="${node.ry}" ${style(node)} />`;
  }

  if (node.type === "polygon") {
    const points = node.points.map(([x, y]) => `${x},${y}`).join(" ");
    return `  <polygon id="${esc(node.id)}" points="${points}" ${style(node)} />`;
  }

  throw new Error(`unsupported node type: ${node.type}`);
}

export function renderSvg(document) {
  const validation = validateDocument(document);
  if (!validation.ok) {
    throw new Error(`invalid art document: ${validation.errors.join("; ")}`);
  }

  if(document.nodes.some(node=>node.appearance!==undefined))return renderStyledDocument(document);

  const { width, height } = document.canvas;
  const body = document.nodes.map(renderNode).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    body,
    "</svg>",
    ""
  ].join("\n");
}
