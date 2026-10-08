import { validateAppearance } from "./appearance.mjs";

const NODE_TYPES = new Set(["path", "ellipse", "polygon"]);

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateDocument(document) {
  const errors = [];
  const warnings = [];

  if (!document || document.version !== 1) {
    errors.push("document.version must be 1");
    return { ok: false, errors, warnings };
  }

  const { canvas, nodes } = document;

  if (!canvas || !finite(canvas.width) || !finite(canvas.height) || canvas.width <= 0 || canvas.height <= 0) {
    errors.push("canvas width/height must be positive finite numbers");
  }

  if (!Array.isArray(nodes)) {
    errors.push("nodes must be an array");
    return { ok: false, errors, warnings };
  }

  const ids = new Set();
  const counts={marks:0,gradients:0,glows:0};
  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || node.id.length === 0) {
      errors.push("every node must have a non-empty string id");
      continue;
    }
    if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    ids.add(node.id);

    if (!NODE_TYPES.has(node.type)) errors.push(`unsupported node type for ${node.id}: ${node.type}`);
    const appearance=validateAppearance(node,canvas);
    errors.push(...appearance.errors.map(e=>`node ${node.id}: ${e}`));
    for(const key of Object.keys(counts))counts[key]+=appearance.metrics[key];
    if (node.opacity !== undefined && (!finite(node.opacity) || node.opacity < 0 || node.opacity > 1)) {
      errors.push(`opacity for ${node.id} must be between 0 and 1`);
    }
    if (node.strokeWidth !== undefined && (!finite(node.strokeWidth) || node.strokeWidth < 0)) {
      errors.push(`strokeWidth for ${node.id} must be >= 0`);
    }

    if (node.type === "path" && (typeof node.d !== "string" || node.d.trim().length === 0)) {
      errors.push(`path ${node.id} requires non-empty d`);
    }
    if (node.type === "ellipse") {
      for (const key of ["cx", "cy", "rx", "ry"]) {
        if (!finite(node[key])) errors.push(`ellipse ${node.id} requires finite ${key}`);
      }
      if (finite(node.rx) && node.rx <= 0) errors.push(`ellipse ${node.id} rx must be > 0`);
      if (finite(node.ry) && node.ry <= 0) errors.push(`ellipse ${node.id} ry must be > 0`);
    }
    if (node.type === "polygon") {
      if (!Array.isArray(node.points) || node.points.length < 3) {
        errors.push(`polygon ${node.id} requires at least 3 points`);
      } else {
        for (const [index, point] of node.points.entries()) {
          if (!Array.isArray(point) || point.length !== 2 || !finite(point[0]) || !finite(point[1])) {
            errors.push(`polygon ${node.id} has invalid point at index ${index}`);
          }
        }
      }
    }
  }

  if(counts.marks>128)errors.push("appearance document mark budget exceeded");
  if(counts.gradients>64)errors.push("appearance document gradient budget exceeded");
  if(counts.glows>32)errors.push("appearance document glow budget exceeded");
  if (nodes.length > 200) warnings.push("POC complexity budget exceeded: more than 200 nodes");

  return { ok: errors.length === 0, errors, warnings };
}
