const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function migrationConfig(){
  const source=read('index.html');
  const helperStart=source.indexOf('function mergeHDScores');
  const helperEnd=source.indexOf('\n// GameVolt SDK integration',helperStart);
  const call='GameVolt.save.registerMigration(';
  const configStart=source.indexOf(call)+call.length;
  const configEnd=source.indexOf('\n  });\n  // Cross-device',configStart);
  assert.ok(helperStart>=0&&helperEnd>helperStart,'merge helpers are present');
  assert.ok(configStart>=call.length&&configEnd>configStart,'migration config is present');
  const context={Set,Number,Object,Array,Math};
  vm.runInNewContext(source.slice(helperStart,helperEnd),context);
  return vm.runInNewContext('('+source.slice(configStart,configEnd+4).trim()+')',context);
}

test('service worker activation only removes older HoverDash caches',async()=>{
  const handlers={},deleted=[];
  const context={
    console,
    self:{
      addEventListener:(type,handler)=>{handlers[type]=handler;},
      skipWaiting:()=>Promise.resolve(),
      clients:{claim:()=>Promise.resolve()}
    },
    caches:{
      keys:()=>Promise.resolve(['hoverdash-v7','gamevolt-v20','hoverdash-v9','ink-v4','hoverdash-v8']),
      delete:key=>{deleted.push(key);return Promise.resolve(true);}
    }
  };
  vm.runInNewContext(read('sw.js'),context);
  let activation;
  handlers.activate({waitUntil:promise=>{activation=promise;}});
  await activation;
  assert.deepEqual(deleted,['hoverdash-v7','hoverdash-v8']);
});

test('save migration keeps the best local and cloud progress without duplicates',()=>{
  const config=migrationConfig();
  const duplicate={score:1200,meters:130,date:200};
  const local={hd_data:{
    totalGames:8,bestScore:1200,lastDailyDate:'2026-09-07',
    scores:[duplicate,{score:900,meters:100,date:100}],
    unlocked:{first_run:0,wave_rider:150}
  }};
  const cloud={
    totalGames:12,bestScore:2200,lastDailyDate:'2026-09-08',
    scores:[{score:2200,meters:210,date:300},duplicate,{score:1000,meters:110,date:150}],
    unlocked:{first_run:120,wave_rider:0,wave_5:175}
  };
  const merged=plain(config.merge(local,cloud));
  assert.equal(merged.totalGames,12);
  assert.equal(merged.bestScore,2200);
  assert.equal(merged.lastDailyDate,'2026-09-08');
  assert.deepEqual(merged.scores.map(entry=>entry.score),[2200,1200,1000,900]);
  assert.equal(merged.scores.filter(entry=>entry.score===1200).length,1);
  assert.deepEqual(merged.unlocked,{first_run:120,wave_rider:150,wave_5:175});
});

test('save migration validates dates and caps the merged score history at ten',()=>{
  const config=migrationConfig();
  const localScores=Array.from({length:7},(_,i)=>({score:200-i,meters:i,date:100+i}));
  const cloudScores=Array.from({length:7},(_,i)=>({score:300-i,meters:i,date:200+i}));
  const merged=plain(config.merge({hd_data:{scores:localScores,lastDailyDate:'not-a-date'}},{scores:cloudScores,lastDailyDate:'2026-09-08'}));
  assert.equal(merged.lastDailyDate,'2026-09-08');
  assert.equal(merged.scores.length,10);
  assert.deepEqual(merged.scores.map(entry=>entry.score),[300,299,298,297,296,295,294,200,199,198]);
});
