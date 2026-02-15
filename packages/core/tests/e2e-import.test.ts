import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { InMemoryRepository } from '../src/memory-repo.js';
import { processImportFile } from '../src/import-flow.js';

describe('E2E import revolut csv', () => {
  it('creates import batch, inserts master rows, skips duplicates and marks transfers', async () => {
    const repo = new InMemoryRepository();
    const fixtureSamuel = readFileSync(join(process.cwd(), 'tests/fixtures/revolut_samuel.csv'));
    const fixtureAndrea = readFileSync(join(process.cwd(), 'tests/fixtures/revolut_andrea.csv'));

    const first = await processImportFile(repo, {
      uploaded_file_id: 'file-1',
      file_name: 'revolut_samuel.csv',
      content: fixtureSamuel
    });

    const second = await processImportFile(repo, {
      uploaded_file_id: 'file-2',
      file_name: 'revolut_andrea.csv',
      content: fixtureAndrea
    });

    const duplicate = await processImportFile(repo, {
      uploaded_file_id: 'file-3',
      file_name: 'revolut_samuel.csv',
      content: fixtureSamuel
    });

    expect(first.import_batch_id).toMatch(/^BATCH_/);
    expect(second.import_batch_id).toMatch(/^BATCH_/);
    expect(repo.imports.size).toBeGreaterThanOrEqual(3);
    expect(repo.master.size).toBeGreaterThan(0);
    expect(duplicate.skipped).toBeGreaterThan(0);

    const tagged = [...repo.master.values()].filter((tx) => tx.tags.includes('INTERNAL_TRANSFER'));
    expect(tagged.length).toBeGreaterThanOrEqual(2);
  });
});
