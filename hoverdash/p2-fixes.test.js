const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function slice(startText,endText){
  const start=source.indexOf(startText),end=source.indexOf(endText,start);
  assert.ok(start>=0&&end>start,`source section ${startText} is present`);
  return source.slice(start,end);
}

function pad({id='Controller',mapping='standard',buttons=[],axes=[0,0],connected=true}={}){
  return {id,mapping,connected,axes,buttons:Array.from({length:17},(_,index)=>({pressed:buttons.includes(index),value:buttons.includes(index)?1:0}))};
}

test('saw clearance uses one geometry-derived rule at the swept contact plane',()=>{
  const context={OT:{LOW_SAW:1,HIGH_SAW:2},SHIP_Y0:.6,Math};
  const sawSource=slice('const SAW_TOOTH_SCALE','let onRamp=');
  vm.runInNewContext(sawSource+'\nthis.saw={clear:sawActionClears,advance:advanceDuckScale,minJump:SAW_MIN_JUMP_CLEARANCE,duckRatio:SAW_DUCK_CLEAR_RATIO};',context);
  const saw=context.saw;
  assert.ok(saw.minJump>1.3&&saw.minJump<1.5,'jump height follows the visible tooth radius');
  assert.equal(saw.clear(1,saw.minJump-.001,1),false);
  assert.equal(saw.clear(1,saw.minJump,1),true);
  assert.equal(saw.clear(2,0,.7),false,'logical ducking alone is not enough before the model compresses');
  assert.equal(saw.clear(2,0,saw.duckRatio),true);
  assert.equal(saw.clear(2,.35,.45),false,'the same air-height limit applies to every saw check');
  const afterTime=fps=>Array.from({length:fps*.4}).reduce(value=>saw.advance(value,true,1/fps),1);
  const scales=[30,60,120].map(afterTime);
  assert.ok(Math.max(...scales)-Math.min(...scales)<1e-12,'duck clearance is frame-rate independent');
  assert.ok(scales.every(scale=>saw.clear(2,0,scale)));
  assert.match(source,/sawCrossedContact=movingSaw&&prevObsZ<SHIP_Z&&o\.position\.z>=SHIP_Z/);
  assert.doesNotMatch(source,/SAW_INPUT_GRACE|sawPendingHit|sawHitTimer/);
  assert.equal((source.match(/sawActionClears\(t2,jumpY,duckScaleRatio\)/g)||[]).length,1);
  assert.equal((source.match(/sawActionClears\(t,jumpY,duckScaleRatio\)/g)||[]).length,2);
});

test('ducking visibly lowers, flattens and pitches the ship using the collision animation state',()=>{
  assert.match(source,/const duckProgress=Math\.max\(0,Math\.min\(1,\(1-duckScaleRatio\)\/\(1-\.45\)\)\)/);
  assert.match(source,/ship\.position\.y=SHIP_Y0\+jumpY\+hoverBob-duckEase\*\.10/);
  assert.match(source,/shipBaseScale\*\(1\+duckEase\*\.08\)[\s\S]*shipBaseScale\*duckScaleRatio[\s\S]*shipBaseScale\*\(1\+duckEase\*\.04\)/);
  assert.match(source,/else if\(duckEase>\.01\) pitch=\.18\*duckEase/);
  assert.match(source,/underGlow\.material\.opacity=[^\n]+\(1\+duckEase\*1\.4\)/);
});

test('wave rewards read the highest completed wave and reset it for each run',()=>{
  const clearGoals=[...source.matchAll(/desc:'Clear Wave \d+'[^\n]+stat:'([^']+)'/g)].map(match=>match[1]);
  assert.deepEqual(clearGoals,['clearedWaveNum','clearedWaveNum','clearedWaveNum']);
  assert.match(source,/goal:'Clear Wave 3',\s*stat:'clearedWaveNum'/);
  assert.match(source,/waveRestDur=0;clearedWaveNum=0/);
  assert.match(source,/if\(waveTimer>=6&&wavePhrasesResolved\(\)\)\{\s*clearedWaveNum=Math\.max\(clearedWaveNum,waveNum\);checkInstantAch\(\);/);
  assert.doesNotMatch(source,/beginWave\(waveNum\+1\)[^\n]+checkInstantAch/);
});

test('wall steering lock and collision share the rendered wall depth',()=>{
  assert.match(source,/const WALL_GATE_DEPTH=38,WALL_GATE_COLLISION_HALF_DEPTH=WALL_GATE_DEPTH\/2\+1/);
  assert.match(source,/wallD=WALL_GATE_DEPTH/);
  assert.match(source,/zFront=t===OT\.WALL_GATE\?SHIP_Z\+WALL_GATE_COLLISION_HALF_DEPTH/);
  assert.match(source,/zBack=t===OT\.WALL_GATE\?SHIP_Z-WALL_GATE_COLLISION_HALF_DEPTH/);
  assert.match(source,/o\.position\.z<=SHIP_Z\+WALL_GATE_COLLISION_HALF_DEPTH/);
  assert.match(source,/WALL_GATE\?WALL_GATE_COLLISION_HALF_DEPTH\+\.25:2\.1/);
});

test('migrated HoverDash scores use the live vx9 leaderboard mode',()=>{
  const configStart=source.indexOf('GameVolt.save.registerMigration(')+'GameVolt.save.registerMigration('.length;
  const configEnd=source.indexOf('\n  });\n  // Cross-device',configStart);
  const helpers=slice('function mergeHDScores','// GameVolt SDK integration');
  const context={Set,Number,Object,Array,Math};
  vm.runInNewContext(helpers,context);
  const config=vm.runInNewContext('('+source.slice(configStart,configEnd+4).trim()+')',context);
  assert.deepEqual(JSON.parse(JSON.stringify(config.getScores({hd_data:{scores:[{score:99}]}}))),[{score:99,mode:'vx9'}]);
});

test('settings survive blocked localStorage through the in-memory fallback',()=>{
  const context={
    Object,String,
    localStorage:{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}
  };
  const helpers=slice('const hdMemoryStorage','function defaultHDData');
  vm.runInNewContext(helpers+'\nthis.storage={get:safeStorageGet,set:safeStorageSet};',context);
  assert.equal(context.storage.get('hd_music'),null);
  assert.equal(context.storage.set('hd_music','0'),false);
  assert.equal(context.storage.get('hd_music'),'0');
  const withoutHelpers=source.replace(helpers,'');
  assert.doesNotMatch(withoutHelpers,/localStorage\.(?:getItem|setItem|removeItem)/);
});

test('gamepad selection rejects media devices and follows an active capable controller',()=>{
  const gamepadSource=slice('function isHoverDashController','function pollGamepad');
  const context={Array,String,Number,Math};
  vm.runInNewContext('var preferredGamepadIndex=null;'+gamepadSource+'\nthis.gamepads={valid:isHoverDashController,select:selectHoverDashGamepad};',context);
  const audio=pad({id:'Wireless Headset Audio',buttons:[0]});
  const idle=pad({id:'Idle Standard Pad'});
  const activeLegacy=pad({id:'Legacy USB Pad',mapping:'',buttons:[0]});
  assert.equal(context.gamepads.valid(audio),false);
  assert.equal(context.gamepads.valid(activeLegacy),true);
  assert.equal(context.gamepads.select([audio,idle,activeLegacy]).id,'Legacy USB Pad');
  assert.equal(context.gamepads.select([audio,idle,pad({id:'Legacy USB Pad',mapping:''})]).id,'Legacy USB Pad','preferred controller stays selected while idle');
});
