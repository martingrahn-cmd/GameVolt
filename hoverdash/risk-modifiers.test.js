const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function riskRules(){
  const start=source.indexOf('const RISK_CHOICE_TIMEOUT=');
  const end=source.indexOf('let activeRiskModifier=',start);
  assert.ok(start>=0&&end>start,'risk rules are present');
  const context={Object,Math};
  vm.runInNewContext(source.slice(start,end)+'\nthis.rules={modifiers:RISK_MODIFIERS,choices:riskChoicesForWave,bonus:riskBonusFor,timeout:RISK_CHOICE_TIMEOUT};',context);
  return context.rules;
}

test('successive waves offer two distinct risks and rotate through the full set',()=>{
  const rules=riskRules(),seen=new Set();
  assert.equal(rules.timeout,5);
  assert.deepEqual(Array.from(rules.modifiers,modifier=>modifier.id),['hyperdrive','sawstorm','glass-run','coin-rush']);
  for(let wave=2;wave<=9;wave++){
    const choices=rules.choices(wave);
    assert.equal(choices.length,2);
    assert.notEqual(choices[0].id,choices[1].id);
    choices.forEach(choice=>seen.add(choice.id));
  }
  assert.deepEqual([...seen].sort(),['coin-rush','glass-run','hyperdrive','sawstorm']);
});

test('risk multipliers add only the promised bonus and never reduce points',()=>{
  const rules=riskRules();
  for(const modifier of rules.modifiers){
    assert.equal(rules.bonus(100,modifier),100*(modifier.scoreMultiplier-1));
  }
  assert.equal(rules.bonus(100,null),0);
  assert.equal(rules.bonus(100,{scoreMultiplier:.5}),0);
});

test('distance, coins and style all feed the separate risk bonus total',()=>{
  assert.match(source,/riskBonusScore\+=riskBonusFor\(distanceGain,activeRiskModifier\)/);
  assert.match(source,/coinPoints\+=10;\s*riskBonusScore\+=riskBonusFor\(10,activeRiskModifier\)/);
  assert.match(source,/riskBonusScore\+=riskBonus;/);
  assert.match(source,/getStylePoints\(\)\+Math\.floor\(riskBonusScore\)/);
  assert.match(source,/risk_points:Math\.floor\(riskBonusScore\)/);
  assert.match(source,/riskBonusScore=0/);
});

test('each gameplay risk changes the next wave and is cleared before a new run',()=>{
  assert.match(source,/effectiveSpeed\(\)[^{]*\{return[^\n]+activeRiskModifier\?\.speedBonus/);
  assert.match(source,/activeRiskModifier\?\.extraSawPhrase&&wavePhrasesSpawned===wavePhraseTarget-1/);
  assert.match(source,/wavePhraseTarget=\(waveNum>=6\?3:2\)\+\(activeRiskModifier\?\.extraSawPhrase\?1:0\)/);
  assert.match(source,/activeRiskModifier\?\.noShield\?\[PU\.MAGNET,PU\.BOOST\]/);
  assert.match(source,/activeRiskModifier=null;pendingRiskModifier=null;riskChoiceOptions=\[\]/);
});

test('keyboard, gamepad, pointer and timeout can all complete a risk choice',()=>{
  assert.match(source,/if\(riskChoiceOpen\)\{[\s\S]*?confirmRiskChoice\(\);return;[\s\S]*?\}\s*switch\(e\.key\)/);
  assert.match(source,/else if\(riskChoiceOpen\)\{[\s\S]*?pressed\('left'\)[\s\S]*?pressed\('right'\)[\s\S]*?pressed\('accept'\)/);
  assert.match(source,/card\.addEventListener\('click',\(\)=>confirmRiskChoice/);
  assert.match(source,/riskChoiceOpen&&waveTimer>=RISK_CHOICE_TIMEOUT\) confirmRiskChoice\(\)/);
  assert.equal((source.match(/class="risk-card/g)||[]).length,2);
});
