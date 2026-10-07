import { validateDocument } from "./validate.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createAssetState(document) {
  const validation = validateDocument(document);
  if (!validation.ok) throw new Error(validation.errors.join("; "));
  return {
    revision: 0,
    document: clone(document),
    history: []
  };
}

function applyOperation(document, operation) {
  const nodes = document.nodes;

  switch (operation.type) {
    case "node.add": {
      if (nodes.some((node) => node.id === operation.node.id)) {
        throw new Error(`node already exists: ${operation.node.id}`);
      }
      nodes.push(clone(operation.node));
      return;
    }

    case "node.update": {
      const index = nodes.findIndex((node) => node.id === operation.id);
      if (index === -1) throw new Error(`node not found: ${operation.id}`);
      nodes[index] = { ...nodes[index], ...clone(operation.patch), id: nodes[index].id };
      return;
    }

    case "node.remove": {
      const index = nodes.findIndex((node) => node.id === operation.id);
      if (index === -1) throw new Error(`node not found: ${operation.id}`);
      nodes.splice(index, 1);
      return;
    }

    case "node.reorder": {
      const from = nodes.findIndex((node) => node.id === operation.id);
      if (from === -1) throw new Error(`node not found: ${operation.id}`);
      const to = Math.max(0, Math.min(nodes.length - 1, operation.index));
      const [node] = nodes.splice(from, 1);
      nodes.splice(to, 0, node);
      return;
    }

    default:
      throw new Error(`unsupported operation: ${operation.type}`);
  }
}

export function applyOperations(state, request) {
  if (request.expectedRevision !== state.revision) {
    throw new Error(`revision conflict: expected ${request.expectedRevision}, current ${state.revision}`);
  }
  if (!Array.isArray(request.operations) || request.operations.length === 0) {
    throw new Error("operations must be a non-empty array");
  }
  if (request.operations.length > 50) {
    throw new Error("POC transaction limit is 50 operations");
  }

  const nextDocument = clone(state.document);
  for (const operation of request.operations) applyOperation(nextDocument, operation);

  const validation = validateDocument(nextDocument);
  if (!validation.ok) {
    throw new Error(`transaction rejected: ${validation.errors.join("; ")}`);
  }

  const nextRevision = state.revision + 1;
  return {
    revision: nextRevision,
    document: nextDocument,
    history: [
      ...state.history,
      {
        revision: nextRevision,
        idempotencyKey: request.idempotencyKey ?? null,
        operations: clone(request.operations)
      }
    ]
  };
}
