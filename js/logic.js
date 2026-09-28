/* BucketList AI — pure list logic. Testable in Node (UMD). */

function getIdeas() {
  if (typeof IDEA_BANK !== "undefined" && IDEA_BANK) return IDEA_BANK;
  if (typeof require !== "undefined") return require("./ideabank.js").IDEA_BANK;
  return [];
}

var STATES = ["dreaming", "planning", "done"];
var STATE_LABELS = { dreaming: "Dreaming", planning: "Planning", done: "Done" };

function validCategory(cat) {
  var cats = (typeof IDEA_CATEGORIES !== "undefined") ? IDEA_CATEGORIES : ["travel", "adventure", "learn", "give", "create"];
  return cats.indexOf(cat) >= 0;
}

function addDream(dreams, dream) {
  var title = (dream && dream.title || "").trim();
  if (!title) throw new Error("Dream needs a title");
  var cat = (dream.cat || "travel").toLowerCase();
  if (!validCategory(cat)) throw new Error("Unknown category: " + dream.cat);
  var cost = parseInt(dream.cost, 10), effort = parseInt(dream.effort, 10);
  var next = (dreams || []).slice();
  next.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    title: title,
    cat: cat,
    cost: [1, 2, 3].indexOf(cost) >= 0 ? cost : 2,
    effort: [1, 2, 3].indexOf(effort) >= 0 ? effort : 2,
    state: "dreaming",
    memory: "",
    completedOn: ""
  });
  return next;
}

function removeDream(dreams, id) {
  return (dreams || []).filter(function (d) { return d.id !== id; });
}

/* Advance dreaming -> planning -> done (stays at done). */
function advanceState(dreams, id, memory, completedOn) {
  return (dreams || []).map(function (d) {
    if (d.id !== id) return d;
    var c = {}; for (var k in d) c[k] = d[k];
    var i = STATES.indexOf(c.state);
    if (i < STATES.length - 1) c.state = STATES[i + 1];
    if (c.state === "done") {
      if (memory != null) c.memory = String(memory);
      if (completedOn != null) c.completedOn = String(completedOn);
    }
    return c;
  });
}

function setMemory(dreams, id, memory) {
  return (dreams || []).map(function (d) {
    if (d.id !== id) return d;
    var c = {}; for (var k in d) c[k] = d[k];
    c.memory = String(memory == null ? "" : memory);
    return c;
  });
}

/* Filter the idea bank: {cat, maxCost, maxEffort, q} — all optional. */
function filterIdeas(opts) {
  var o = opts || {};
  var q = (o.q || "").trim().toLowerCase();
  return getIdeas().filter(function (it) {
    if (o.cat && o.cat !== "all" && it.cat !== o.cat) return false;
    if (o.maxCost && it.cost > o.maxCost) return false;
    if (o.maxEffort && it.effort > o.maxEffort) return false;
    if (q && it.t.toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

/* Pick N random ideas (Fisher-Yates, non-mutating). */
function surpriseMe(n) {
  var pool = getIdeas().slice();
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, Math.max(1, Math.min(n || 3, pool.length)));
}

function stats(dreams) {
  var s = { total: 0, dreaming: 0, planning: 0, done: 0, pct: 0 };
  (dreams || []).forEach(function (d) {
    s.total++;
    if (s[d.state] != null) s[d.state]++;
  });
  s.pct = s.total ? Math.round(s.done / s.total * 100) : 0;
  return s;
}

function costLabel(c) { return c === 1 ? "$" : c === 2 ? "$$" : "$$$"; }
function effortLabel(e) { return e === 1 ? "Easy" : e === 2 ? "Moderate" : "Epic"; }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STATES, STATE_LABELS, validCategory, addDream, removeDream,
    advanceState, setMemory, filterIdeas, surpriseMe, stats,
    costLabel, effortLabel
  };
}
