#!/usr/bin/env bash
# BucketList AI smoke tests — 12 checks. Exit non-zero on first failure.
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

echo "--- smoke: $pass passed, $fail failed ---"
exit $((fail>0))
