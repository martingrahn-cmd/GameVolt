const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function loadOneLineFunction(name){
  const match=source.match(new RegExp(`function ${name}\\([^\\n]+\\}`));
  assert.ok(match,`${name} is present`);
  const context={Boolean};
  vm.runInNewContext(`${match[0]}this.fn=${name};`,context);
  return context.fn;
}

test('only a score above the previous best is announced as a new record',()=>{
  const isNewHighScore=loadOneLineFunction('isNewHighScore');
  assert.equal(isNewHighScore(1201,1200),true);
  assert.equal(isNewHighScore(1200,1200),false);
  assert.equal(isNewHighScore(1199,1200),false);
  assert.match(source,/const previousBest=Number\(hdData\.bestScore\)\|\|0;\s*checkEndgameAch\(\)/);
  assert.match(source,/const isNewBest=isNewHighScore\(finalScore,previousBest\)/);
  assert.doesNotMatch(source,/finalScore>=bestScore/);
});

test('the full visible barrel roll is safe and protection ends at zero',()=>{
  const isSpinCollisionSafe=loadOneLineFunction('isSpinCollisionSafe');
  assert.equal(isSpinCollisionSafe(true,.000001),true);
  assert.equal(isSpinCollisionSafe(true,0),false);
  assert.equal(isSpinCollisionSafe(true,-.000001),false);
  assert.equal(isSpinCollisionSafe(false,.35),false);
  assert.doesNotMatch(source,/SPIN_INVULN/);
  assert.equal((source.match(/isSpinCollisionSafe\(spinActive,spinTimer\)/g)||[]).length,2);
  assert.match(source,/if\(spinTimer<=0\)\{\s*spinActive=false;spinTimer=0;spinAngle=0;/);
});
