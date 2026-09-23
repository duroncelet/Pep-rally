import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenAssignments } from '../app/rally/garden/assignments.ts';
test('two containers never silently add crops and surface the unplaced choice', () => {
  assert.deepEqual(gardenAssignments(['Tomatoes','Herbs','Lettuce'],2), {slots:['Tomatoes','Herbs'],unassigned:['Lettuce']});
});
test('edited assignments and intentionally empty spaces are respected', () => {
  assert.deepEqual(gardenAssignments(['Tomatoes','Herbs','Lettuce'],2,{0:'Lettuce',1:''}), {slots:['Lettuce',''],unassigned:['Tomatoes','Herbs']});
});
test('removed crops do not survive in assignments; invalid counts produce no spaces', () => {
  assert.deepEqual(gardenAssignments(['Herbs'],2,{0:'Tomatoes'}), {slots:['',''],unassigned:['Herbs']});
  assert.equal(gardenAssignments(['Herbs'],-1).slots.length,0);
  assert.equal(gardenAssignments(['Herbs'],2.5).slots.length,0);
  assert.equal(gardenAssignments(['Herbs'],31).slots.length,30);
});
