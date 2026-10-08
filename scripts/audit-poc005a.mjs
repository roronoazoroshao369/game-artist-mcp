#!/usr/bin/env node
import { auditEvidence } from '../src/benchmark/evidence-audit.mjs';

if (process.argv.length !== 3 || !process.argv[2]) {
  process.stderr.write('Usage: node scripts/audit-poc005a.mjs <evidence-directory>\n');
  process.exitCode = 2;
} else {
  const report = await auditEvidence(process.argv[2]);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.ok) process.exitCode = 1;
}
