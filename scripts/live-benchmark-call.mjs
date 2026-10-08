#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLiveRequest } from "../src/benchmark/live-run.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const request = JSON.parse(await readFile(resolve(root, ".game-artist/live-request.json"), "utf8"));
const response = await runLiveRequest({ root, ...request });
console.log(JSON.stringify(response));
if (response.isError) process.exitCode = 1;
