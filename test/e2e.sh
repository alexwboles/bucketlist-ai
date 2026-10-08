#!/usr/bin/env bash
# BucketList AI e2e tests — 12 flows exercising real logic in Node. Exit non-zero on failure.
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
  if(L.STATE_LABELS.done!=='Done'||L.STATE_LABELS.dreaming!=='Dreaming') throw new Error('state label');"

flow "sort + search: dreamer finds and orders their list" "
  const L=require('./js/logic.js');
  let d=[ ];
  d=L.addDream(d,{title:'Climb Kilimanjaro',cat:'adventure',cost:3,effort:3,targetDate:'2027-08-01'});
  d=L.addDream(d,{title:'Bake sourdough weekly',cat:'learn',cost:1,effort:1,targetDate:'2026-11-15'});
  d=L.addDream(d,{title:'Visit Kyoto in cherry season',cat:'travel',cost:2,effort:2,targetDate:'2027-04-01'});
  const hits=L.searchDreams(d,'kyoto');
  if(hits.length!==1||hits[0].title!=='Visit Kyoto in cherry season') throw new Error('search');
  const byTarget=L.sortDreams(d,'target').map(x=>x.title);
  if(byTarget[0]!=='Bake sourdough weekly'||byTarget[2]!=='Climb Kilimanjaro') throw new Error('sort target: '+byTarget);
  const byEffort=L.sortDreams(d,'effort').map(x=>x.effort).join(',');
  if(byEffort!=='1,2,3') throw new Error('sort effort: '+byEffort);"

flow "target-date journey: set -> due soon -> done clears due state" "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'Run a marathon',cat:'adventure'});
  d=L.setTargetDate(d,d[0].id,'2026-10-25');
  if(L.dueStatus(d[0],'2026-10-07')!=='soon') throw new Error('should be soon');
  d=L.setTargetDate(d,d[0].id,'2026-09-01');
  if(L.dueStatus(d[0],'2026-10-07')!=='overdue') throw new Error('should be overdue');
  d=L.advanceState(d,d[0].id); d=L.advanceState(d,d[0].id,'Finished!','2026-10-07');
  if(L.dueStatus(d[0],'2026-10-07')!=='none') throw new Error('done dreams never due');
  if(L.fmtTarget(d[0].targetDate)!=='Sep 1, 2026') throw new Error('fmtTarget');"

flow "backup/restore survives a full wipe" "
  const L=require('./js/logic.js');
  let d=[ ];
  d=L.addDream(d,{title:'Write a novel',cat:'create',cost:1,effort:3,targetDate:'2027-01-31'});
  d=L.addDream(d,{title:'See aurora',cat:'travel',cost:2,effort:2});
  d=L.advanceState(d,d[1].id); d=L.advanceState(d,d[1].id,'Green curtains of light','2026-02-20');
  const snap=L.backupToJSON(d);
  let wiped=[ ]; // user hits Start over
  wiped=L.restoreFromJSON(snap);
  if(wiped.length!==2) throw new Error('count');
  const aurora=wiped.filter(x=>x.title==='See aurora')[0];
  if(aurora.state!=='done'||aurora.memory!=='Green curtains of light'||aurora.completedOn!=='2026-02-20') throw new Error('aurora lost');
  const novel=wiped.filter(x=>x.title==='Write a novel')[0];
  if(novel.targetDate!=='2027-01-31') throw new Error('novel target lost');
  if(L.dueStatus(novel,'2026-10-07')!=='later') throw new Error('novel due state');"

flow "memory journal timeline orders completions newest-first" "
  const L=require('./js/logic.js');
  let d=[ ];
  const done=(t,date,mem)=>{ d=L.addDream(d,{title:t,cat:'travel'}); const id=d[d.length-1].id; d=L.advanceState(d,id); d=L.advanceState(d,id,mem,date); };
  done('Old hike','2025-05-01','muddy boots');
  done('Spring sail','2026-04-12','dolphins at dawn');
  done('Autumn trek','2026-09-30','golden larches');
  const tl=L.completionTimeline(d);
  const months=tl.map(g=>g.month).join(',');
  if(months!=='2026-09,2026-04,2025-05') throw new Error('order: '+months);
  if(tl[0].dreams[0].memory!=='golden larches') throw new Error('memory not attached');
  if(L.completionTimeline([ ]).length!==0) throw new Error('empty timeline');"

flow "restore rejects corrupt and non-bucketlist files" "
  const L=require('./js/logic.js');
  for(const badText of ['','{broken','[]'.slice(0,1),'{\"dreams\":{}}','[{\"title\":\"No cat\",\"cat\":\"zzz\"}]']){
    let threw=false;
    try{ L.restoreFromJSON(badText); }catch(e){ threw=true; }
    if(!threw) throw new Error('accepted garbage: '+badText.slice(0,24));
  }
  const okBack=L.restoreFromJSON(JSON.stringify([{title:'Plain dream'}]));
  if(okBack.length!==1||okBack[0].cat!=='travel'||okBack[0].state!=='dreaming') throw new Error('plain-array restore');"

echo "--- e2e: $pass passed, $fail failed ---"
exit $((fail>0))
