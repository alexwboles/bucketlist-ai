#!/usr/bin/env bash
# BucketList AI smoke tests — 18 checks. Exit non-zero on first failure.
set -u
cd "$(dirname "$0")/.."
pass=0; fail=0
check() { # $1 = description, rest = command
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "PASS: $desc"; pass=$((pass+1));
  else echo "FAIL: $desc"; fail=$((fail+1)); fi
}

check "index.html exists" test -f index.html
check "css/style.css exists" test -f css/style.css
check "js/ideabank.js exists" test -f js/ideabank.js
check "js/logic.js exists" test -f js/logic.js
check "js/app.js exists" test -f js/app.js
check "ideabank.js syntax valid" node --check js/ideabank.js
check "logic.js syntax valid" node --check js/logic.js
check "app.js syntax valid" node --check js/app.js
check "idea bank has 100+ ideas" node -e "
  const b=require('./js/ideabank.js').IDEA_BANK;
  if(b.length<100) throw new Error('only '+b.length);"
check "all 5 categories represented (15+ each)" node -e "
  const b=require('./js/ideabank.js');
  const counts={};
  for(const it of b.IDEA_BANK){ counts[it.cat]=(counts[it.cat]||0)+1; }
  for(const c of b.IDEA_CATEGORIES){ if((counts[c]||0)<15) throw new Error(c+' only '+counts[c]); }"
check "every idea has title/cat/cost1-3/effort1-3" node -e "
  const b=require('./js/ideabank.js').IDEA_BANK;
  for(const it of b){
    if(!it.t||!it.cat) throw new Error('bad idea: '+JSON.stringify(it));
    if(![1,2,3].includes(it.cost)||![1,2,3].includes(it.effort)) throw new Error('bad scale: '+it.t);
  }"
check "no duplicate idea titles" node -e "
  const b=require('./js/ideabank.js').IDEA_BANK;
  const seen=new Set();
  for(const it of b){ const k=it.t.toLowerCase(); if(seen.has(k)) throw new Error('dup: '+it.t); seen.add(k); }"

check "sortDreams orders by title/cost/target" node -e "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'Zulu trip',cat:'travel',cost:3,effort:1,targetDate:'2027-06-01'});
  d=L.addDream(d,{title:'Apple picking',cat:'give',cost:1,effort:1,targetDate:'2026-11-01'});
  d=L.addDream(d,{title:'Mango farm',cat:'learn',cost:2,effort:2});
  const byTitle=L.sortDreams(d,'title').map(x=>x.title).join('|');
  if(byTitle!=='Apple picking|Mango farm|Zulu trip') throw new Error('title sort: '+byTitle);
  const byCost=L.sortDreams(d,'cost').map(x=>x.cost).join(',');
  if(byCost!=='1,2,3') throw new Error('cost sort: '+byCost);
  const byTarget=L.sortDreams(d,'target').map(x=>x.title).join('|');
  if(byTarget!=='Apple picking|Zulu trip|Mango farm') throw new Error('target sort: '+byTarget);"

check "searchDreams is case-insensitive and empty-safe" node -e "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'See the Northern Lights',cat:'travel'});
  d=L.addDream(d,{title:'Learn to surf',cat:'adventure'});
  if(L.searchDreams(d,'northern').length!==1) throw new Error('miss');
  if(L.searchDreams(d,'LEARN').length!==1) throw new Error('case');
  if(L.searchDreams(d,'').length!==2) throw new Error('empty q');
  if(L.searchDreams(d,'zzz').length!==0) throw new Error('no-match');"

check "target dates: setTargetDate validates; dueStatus overdue/soon/later/none" node -e "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'A',cat:'travel',targetDate:'2026-10-20'});
  d=L.setTargetDate(d,d[0].id,'2026-10-05');
  if(d[0].targetDate!=='2026-10-05') throw new Error('not set');
  d=L.setTargetDate(d,d[0].id,'');
  if(d[0].targetDate!=='') throw new Error('not cleared');
  try{ L.setTargetDate(d,d[0].id,'10/05/2026'); throw new Error('bad format accepted'); }
  catch(e){ if(!/YYYY-MM-DD/.test(e.message)) throw e; }
  try{ L.addDream([ ],{title:'B',cat:'travel',targetDate:'soonish'}); throw new Error('bad target accepted'); }
  catch(e){ if(!/Target date/.test(e.message)) throw e; }
  const od={state:'dreaming',targetDate:'2026-10-01'};
  const so={state:'planning',targetDate:'2026-10-20'};
  const la={state:'dreaming',targetDate:'2027-05-01'};
  const dn={state:'done',targetDate:'2026-10-01'};
  const nt={state:'dreaming',targetDate:''};
  if(L.dueStatus(od,'2026-10-07')!=='overdue') throw new Error('overdue');
  if(L.dueStatus(so,'2026-10-07')!=='soon') throw new Error('soon');
  if(L.dueStatus(la,'2026-10-07')!=='later') throw new Error('later');
  if(L.dueStatus(dn,'2026-10-07')!=='none') throw new Error('done');
  if(L.dueStatus(nt,'2026-10-07')!=='none') throw new Error('no target');
  if(L.fmtTarget('2026-10-20')!=='Oct 20, 2026') throw new Error('fmtTarget: '+L.fmtTarget('2026-10-20'));"

check "backup/restore round-trips and rejects garbage" node -e "
  const L=require('./js/logic.js');
  let d=L.addDream([ ],{title:'Sail Greece',cat:'travel',cost:3,effort:3,targetDate:'2027-07-01'});
  d=L.advanceState(d,d[0].id); d=L.advanceState(d,d[0].id,'Sunset over Santorini','2026-09-15');
  const json=L.backupToJSON(d);
  const back=L.restoreFromJSON(json);
  if(back.length!==1||back[0].title!=='Sail Greece') throw new Error('round-trip lost dream');
  if(back[0].state!=='done'||back[0].memory!=='Sunset over Santorini') throw new Error('round-trip lost done state');
  if(back[0].targetDate!=='2027-07-01') throw new Error('round-trip lost target');
  if(back[0].addedAt!==d[0].addedAt) throw new Error('round-trip lost addedAt');
  for(const badJson of ['not json at all','{\"dreams\":\"nope\"}','[{\"title\":\"\"}]']){
    try{ L.restoreFromJSON(badJson); throw new Error('accepted: '+badJson.slice(0,20)); }
    catch(e){ if(/accepted/.test(e.message)) throw e; }
  }"

check "completionTimeline groups done dreams by month, newest first" node -e "
  const L=require('./js/logic.js');
  let x=[ ];
  x=L.addDream(x,{title:'A',cat:'travel'}); x=L.advanceState(x,x[0].id); x=L.advanceState(x,x[0].id,'','2026-03-10');
  x=L.addDream(x,{title:'B',cat:'travel'}); x=L.advanceState(x,x[1].id); x=L.advanceState(x,x[1].id,'','2026-09-15');
  x=L.addDream(x,{title:'C',cat:'travel'}); x=L.advanceState(x,x[2].id); x=L.advanceState(x,x[2].id,'mem only','');
  const tl=L.completionTimeline(x);
  if(tl.length!==3) throw new Error('groups: '+tl.length);
  if(tl[0].month!=='2026-09'||tl[0].dreams[0].title!=='B') throw new Error('newest first');
  if(tl[1].month!=='2026-03') throw new Error('middle');
  if(tl[2].month!=='nodate'||tl[2].label!=='No date logged') throw new Error('undated last');
  if(tl[0].label!=='September 2026') throw new Error('label: '+tl[0].label);"

check "new DOM ids present (dSearch/dSort in app.js; backup/restore in index.html)" node -e "
  const fs=require('fs');
  const app=fs.readFileSync('js/app.js','utf8'), html=fs.readFileSync('index.html','utf8');
  for(const id of ['dSearch','dSort']){ if(app.indexOf('id=\"'+id+'\"')<0) throw new Error('app.js missing #'+id); }
  for(const id of ['backupBtn','restoreBtn','restoreFile']){ if(html.indexOf('id=\"'+id+'\"')<0) throw new Error('index.html missing #'+id); }"

echo "--- smoke: $pass passed, $fail failed ---"
exit $((fail>0))
