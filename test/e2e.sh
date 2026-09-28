#!/usr/bin/env bash
# BucketList AI e2e tests — 7 flows exercising real logic in Node. Exit non-zero on failure.
set -u
cd "$(dirname "$0")/.."
pass=0; fail=0
flow() { # $1 = description, $2 = node script
  if node -e "$2" >/dev/null 2>&1; then echo "PASS: $1"; pass=$((pass+1));
  else echo "FAIL: $1"; fail=$((fail+1)); fi
}

flow "addDream validates and defaults" "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'  See fjords  ',cat:'travel',cost:'9',effort:'0'});
  if(d[0].title!=='See fjords') throw new Error('not trimmed');
  if(d[0].cost!==2||d[0].effort!==2) throw new Error('bad defaults');
  if(d[0].state!=='dreaming') throw new Error('wrong initial state');
  try{ L.addDream([ ],{title:'   '}); throw new Error('blank accepted'); }catch(e){ if(!/title/i.test(e.message)) throw e; }
  try{ L.addDream([ ],{title:'x',cat:'nope'}); throw new Error('bad cat accepted'); }catch(e){ if(!/category/i.test(e.message)) throw e; }"

flow "state machine dreaming->planning->done sticks" "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'Skydive',cat:'adventure'});
  const id=d[0].id;
  d=L.advanceState(d,id);
  if(d[0].state!=='planning') throw new Error('not planning');
  d=L.advanceState(d,id,'Best day ever','2026-09-28');
  if(d[0].state!=='done') throw new Error('not done');
  if(d[0].memory!=='Best day ever') throw new Error('memory lost');
  if(d[0].completedOn!=='2026-09-28') throw new Error('date lost');
  d=L.advanceState(d,id);
  if(d[0].state!=='done') throw new Error('moved past done');"

flow "removeDream and setMemory" "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'A',cat:'learn'});
  d=L.addDream(d,{title:'B',cat:'learn'});
  d=L.setMemory(d,d[0].id,'note here');
  if(d[0].memory!=='note here') throw new Error('memory not set');
  d=L.removeDream(d,d[0].id);
  if(d.length!==1||d[0].title!=='B') throw new Error('remove failed');"

flow "filterIdeas by category, cost, effort, query" "
  const L=require('./js/logic.js');
  const adv=L.filterIdeas({cat:'adventure'});
  if(!adv.length||adv.some(i=>i.cat!=='adventure')) throw new Error('cat filter broken');
  const cheap=L.filterIdeas({maxCost:1});
  if(!cheap.length||cheap.some(i=>i.cost>1)) throw new Error('cost filter broken');
  const easy=L.filterIdeas({maxEffort:1});
  if(easy.some(i=>i.effort>1)) throw new Error('effort filter broken');
  const q=L.filterIdeas({q:'northern lights'});
  if(q.length!==1||q[0].t!=='See the Northern Lights') throw new Error('query broken: '+JSON.stringify(q));
  const all=L.filterIdeas({});
  if(all.length<100) throw new Error('unfiltered too small');"

flow "surpriseMe returns N unique ideas" "
  const L=require('./js/logic.js');
  const p=L.surpriseMe(5);
  if(p.length!==5) throw new Error('wrong count');
  if(new Set(p.map(i=>i.t)).size!==5) throw new Error('dupes returned');"

flow "stats computes completion pct" "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'A',cat:'give'});
  d=L.addDream(d,{title:'B',cat:'give'});
  d=L.advanceState(d,d[0].id); d=L.advanceState(d,d[0].id,'','2026-01-01');
  const s=L.stats(d);
  if(s.total!==2||s.done!==1||s.planning!==0) throw new Error('counts wrong: '+JSON.stringify(s));
  if(s.pct!==50) throw new Error('pct wrong');
  const e=L.stats([ ]);
  if(e.pct!==0||e.total!==0) throw new Error('empty stats wrong');"

flow "labels render correctly" "
  const L=require('./js/logic.js');
  const D=String.fromCharCode(36);
  if(L.costLabel(1)!==D||L.costLabel(3)!==D+D+D) throw new Error('cost labels');
  if(L.effortLabel(1)!=='Easy'||L.effortLabel(3)!=='Epic') throw new Error('effort labels');
  if(L.STATE_LABELS.done!=='\u2705 Done') throw new Error('state label');"

echo "--- e2e: $pass passed, $fail failed ---"
exit $((fail>0))
