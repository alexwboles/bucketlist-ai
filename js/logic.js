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
  var target = (dream && dream.targetDate || "").trim();
  if (target && !/^\d{4}-\d{2}-\d{2}$/.test(target)) throw new Error("Target date must be YYYY-MM-DD");
  var next = (dreams || []).slice();
  next.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    title: title,
    cat: cat,
    cost: [1, 2, 3].indexOf(cost) >= 0 ? cost : 2,
    effort: [1, 2, 3].indexOf(effort) >= 0 ? effort : 2,
    state: "dreaming",
    memory: "",
    completedOn: "",
    targetDate: target,
    addedAt: new Date().toISOString()
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

/* ---------- new: sort, search, target dates, backup, journal ---------- */

// Sort dreams within their state groups. key: title|cost|effort|target|added (default: added, oldest first).
function sortDreams(dreams, key) {
  var arr = (dreams || []).slice();
  function byTarget(a, b) {
    var ta = a.targetDate || "", tb = b.targetDate || "";
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  }
  arr.sort(function (a, b) {
    if (key === "title") return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
    if (key === "cost") return (a.cost - b.cost) || (a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1);
    if (key === "effort") return (a.effort - b.effort) || (a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1);
    if (key === "target") return byTarget(a, b);
    if (key === "added-new") return (b.addedAt || "") < (a.addedAt || "") ? -1 : 1;
    return (a.addedAt || "") < (b.addedAt || "") ? -1 : 1; // added (oldest first)
  });
  return arr;
}

// Text search over dream titles.
function searchDreams(dreams, q) {
  var s = String(q == null ? "" : q).trim().toLowerCase();
  if (!s) return (dreams || []).slice();
  return (dreams || []).filter(function (d) { return d.title.toLowerCase().indexOf(s) >= 0; });
}

// Set (or clear with "") a target date on a dream. Validates YYYY-MM-DD.
function setTargetDate(dreams, id, date) {
  var t = String(date == null ? "" : date).trim();
  if (t && !/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("Target date must be YYYY-MM-DD");
  return (dreams || []).map(function (d) {
    if (d.id !== id) return d;
    var c = {}; for (var k in d) c[k] = d[k];
    c.targetDate = t;
    return c;
  });
}

// Due status of a dream relative to refDate (YYYY-MM-DD, defaults to today).
// Returns: "none" | "later" | "soon" (within 30 days) | "overdue".
function dueStatus(dream, refDate) {
  if (!dream || dream.state === "done" || !dream.targetDate) return "none";
  var ref = refDate || new Date().toISOString().slice(0, 10);
  if (dream.targetDate < ref) return "overdue";
  var ms = Date.parse(dream.targetDate + "T12:00:00Z") - Date.parse(ref + "T12:00:00Z");
  return ms <= 30 * 864e5 ? "soon" : "later";
}

function fmtTarget(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[parseInt(m[2], 10) - 1] + " " + parseInt(m[3], 10) + ", " + m[1];
}

// Completion timeline: done dreams grouped by completion month (YYYY-MM), newest first.
// Dreams without a completion date land in the last group, labeled "No date logged".
function completionTimeline(dreams) {
  var groups = {};
  (dreams || []).forEach(function (d) {
    if (d.state !== "done") return;
    var key = /^\d{4}-\d{2}/.test(d.completedOn || "") ? d.completedOn.slice(0, 7) : "nodate";
    (groups[key] = groups[key] || []).push(d);
  });
  return Object.keys(groups).sort(function (a, b) {
    if (a === "nodate") return 1;
    if (b === "nodate") return -1;
    return a < b ? 1 : -1;
  }).map(function (k) {
    var label = k === "nodate" ? "No date logged" :
      (function () {
        var p = k.split("-");
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return months[parseInt(p[1], 10) - 1] + " " + p[0];
      })();
    return { month: k, label: label, dreams: groups[k] };
  });
}

// Backup: serialize dreams to a JSON string. Restore: parse + validate + normalize.
function backupToJSON(dreams) {
  return JSON.stringify({ app: "bucketlist-ai", version: 1, exportedAt: new Date().toISOString(), dreams: dreams || [] }, null, 2);
}

function restoreFromJSON(text) {
  var obj;
  try { obj = JSON.parse(String(text || "")); }
  catch (e) { throw new Error("That file is not valid JSON."); }
  var arr = Array.isArray(obj) ? obj : obj.dreams;
  if (!Array.isArray(arr)) throw new Error("Backup does not contain a dream list.");
  return arr.map(function (d, i) {
    var title = String(d.title || "").trim();
    if (!title) throw new Error("Dream #" + (i + 1) + " has no title.");
    var cat = String(d.cat || "travel").toLowerCase();
    if (!validCategory(cat)) throw new Error("Dream \"" + title + "\" has unknown category: " + d.cat);
    var st = STATES.indexOf(d.state) >= 0 ? d.state : "dreaming";
    var cost = [1, 2, 3].indexOf(parseInt(d.cost, 10)) >= 0 ? parseInt(d.cost, 10) : 2;
    var effort = [1, 2, 3].indexOf(parseInt(d.effort, 10)) >= 0 ? parseInt(d.effort, 10) : 2;
    var target = String(d.targetDate || "").trim();
    if (target && !/^\d{4}-\d{2}-\d{2}$/.test(target)) throw new Error("Dream \"" + title + "\" has a bad target date.");
    return {
      id: d.id || (Date.now().toString(36) + "-" + i),
      title: title, cat: cat, cost: cost, effort: effort, state: st,
      memory: String(d.memory || ""), completedOn: String(d.completedOn || ""),
      targetDate: target, addedAt: d.addedAt || new Date().toISOString()
    };
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STATES, STATE_LABELS, validCategory, addDream, removeDream,
    advanceState, setMemory, filterIdeas, surpriseMe, stats,
    costLabel, effortLabel,
    sortDreams, searchDreams, setTargetDate, dueStatus, fmtTarget,
    completionTimeline, backupToJSON, restoreFromJSON
  };
}
