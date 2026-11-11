import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformWithEsbuild } from 'vite';

async function loadTs(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = await transformWithEsbuild(source, path, { loader: 'ts' });
  return import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));
}
const { rallyConcepts } = await loadTs('../app/catalog.ts');
const { createWorkingResult, answeredInputs } = await loadTs('../app/rally-results.ts');
const filler = /the material you provide|your timing and constraints|your priorities|Not answered|the context you provided|your first weak area|your second weak area|the hardest concept/;

for (const concept of rallyConcepts) {
  test(concept.slug + ': blank inputs produce only static guidance', () => {
    const blank = Object.fromEntries(concept.inputs.map(label => [label, '  \n ']));
    const result = createWorkingResult(concept, blank);
    assert.doesNotMatch(JSON.stringify(result), filler);
    assert.deepEqual(result, createWorkingResult(concept, {}));
    assert.deepEqual(answeredInputs(concept, blank), []);
    for (const section of result.sections) {
      assert.ok(section.items.length > 0);
      assert.ok(section.items.every(item => item.trim().length > 0));
    }
    const content = [result.summary, ...result.sections.flatMap(section => section.items)].join('\n');
    for (const label of concept.inputs) assert.ok(!content.includes(label));
  });
  for (let index = 0; index < concept.inputs.length; index++) {
    test(concept.slug + ': only input ' + index + ' supplied', () => {
      const label = concept.inputs[index];
      const answers = { [label]: '  UNIQUE_SUPPLIED_DETAIL  ' };
      const result = createWorkingResult(concept, answers);
      assert.doesNotMatch(JSON.stringify(result), filler);
      assert.ok(JSON.stringify(result).includes('UNIQUE_SUPPLIED_DETAIL'));
      assert.deepEqual(answeredInputs(concept, answers), [{ label, value: 'UNIQUE_SUPPLIED_DETAIL' }]);
      const content = [result.summary, ...result.sections.flatMap(section => section.items)].join('\n');
      for (const missing of concept.inputs.filter(item => item !== label)) assert.ok(!content.includes(missing));
    });
  }
}

test('workspace outcome export uses supplied inputs only', () => {
  const source = readFileSync(new URL('../app/rally/market/[slug]/RallyWorkspace.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('answeredInputs(concept, answers).map'));
  assert.ok(!source.includes('Not answered'));
});
