/* BucketList AI — UI glue. localStorage key: bucketlist.v1 */
(function () {
  "use strict";
  var KEY = "bucketlist.v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  var state = Object.assign({ dreams: [], tab: "mine", fCat: "all", fCost: "", fEffort: "", fQ: "" }, load());
  function persist() { save(state); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function catLabel(c) {
    return (typeof CATEGORY_LABELS !== "undefined" && CATEGORY_LABELS[c]) ? CATEGORY_LABELS[c] : c;
  }

  function renderHeader() {
    var s = stats(state.dreams);
    document.getElementById("dreamHead").innerHTML =
      '<div class="hero-stats">' +
      '<div class="stat"><span class="stat-num">' + s.total + '</span><span class="stat-lbl">dreams</span></div>' +
      '<div class="stat"><span class="stat-num">' + s.done + '</span><span class="stat-lbl">completed</span></div>' +
      '<div class="stat"><span class="stat-num">' + s.pct + '%</span><span class="stat-lbl">done</span></div>' +
      "</div>" +
      '<div class="progress"><div class="progress-fill" style="width:' + s.pct + '%"></div></div>';
  }

  function dreamCard(d, showActions) {
    var html = '<div class="card dream state-' + d.state + '">' +
      '<div class="dream-head"><strong>' + esc(d.title) + "</strong> " +
      '<span class="pill">' + esc(catLabel(d.cat)) + "</span> " +
      '<span class="pill">' + esc(costLabel(d.cost)) + '</span> ' +
      '<span class="pill">' + esc(effortLabel(d.effort)) + "</span> " +
      '<span class="pill state">' + esc(STATE_LABELS[d.state]) + "</span></div>";
    if (d.state === "done") {
      if (d.completedOn) html += '<div class="muted small">Completed ' + esc(d.completedOn) + "</div>";
      html += '<div class="memory">' + (d.memory ? esc(d.memory) : '<span class="muted">No memory logged yet — add one below.</span>') + "</div>";
      html += '<div class="row"><input data-mem="' + d.id + '" placeholder="Log the memory…" value="' + esc(d.memory || "") + '" maxlength="500">' +
        '<button data-savemem="' + d.id + '">Save memory</button></div>';
    }
    if (showActions) {
      html += '<div class="row">';
      if (d.state !== "done") {
        var next = d.state === "dreaming" ? "Start planning →" : "Mark done ✓";
        html += '<button data-adv="' + d.id + '">' + next + "</button>";
      }
      html += '<button class="danger" data-del="' + d.id + '">Remove</button></div>';
    }
    return html + "</div>";
  }

  function renderMine() {
    var host = document.getElementById("tab-mine");
    var cats = (typeof IDEA_CATEGORIES !== "undefined") ? IDEA_CATEGORIES : [];
    var html = '<form id="dreamForm" class="card form-grid">' +
      '<input id="dreamTitle" placeholder="My dream (e.g. See the Northern Lights)" required maxlength="120">' +
      '<select id="dreamCat">' + cats.map(function (c) { return '<option value="' + c + '">' + esc(catLabel(c)) + "</option>"; }).join("") + "</select>" +
      '<select id="dreamCost"><option value="1">$ — cheap</option><option value="2" selected>$$ — moderate</option><option value="3">$$$ — splurge</option></select>' +
      '<select id="dreamEffort"><option value="1">Easy</option><option value="2" selected>Moderate</option><option value="3">Epic</option></select>' +
      '<button type="submit">Add dream</button></form>';

    var order = { planning: 0, dreaming: 1, done: 2 };
    var dreams = state.dreams.slice().sort(function (a, b) { return order[a.state] - order[b.state]; });
    if (!dreams.length) {
      html += '<p class="muted">No dreams yet — add one above, or grab ideas from the <strong>Idea bank</strong> tab.</p>';
    } else {
      ["planning", "dreaming", "done"].forEach(function (st) {
        var group = dreams.filter(function (d) { return d.state === st; });
        if (!group.length) return;
        html += "<h3>" + esc(STATE_LABELS[st]) + " (" + group.length + ")</h3>";
        group.forEach(function (d) { html += dreamCard(d, true); });
      });
    }
    host.innerHTML = html;

    document.getElementById("dreamForm").addEventListener("submit", function (e) {
      e.preventDefault();
      try {
        state.dreams = addDream(state.dreams, {
          title: document.getElementById("dreamTitle").value,
          cat: document.getElementById("dreamCat").value,
          cost: document.getElementById("dreamCost").value,
          effort: document.getElementById("dreamEffort").value
        });
        persist(); renderHeader(); renderMine();
      } catch (err) { alert(err.message); }
    });
    host.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.dreams = removeDream(state.dreams, btn.getAttribute("data-del"));
        persist(); renderHeader(); renderMine();
      });
    });
    host.querySelectorAll("[data-adv]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-adv");
        var mem = null, on = null;
        var d = state.dreams.filter(function (x) { return x.id === id; })[0];
        if (d && d.state === "planning") {
          mem = prompt("You did it! Log the memory:", "") || "";
          var today = new Date();
          on = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
        }
        state.dreams = advanceState(state.dreams, id, mem, on);
        persist(); renderHeader(); renderMine();
      });
    });
    host.querySelectorAll("[data-savemem]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-savemem");
        var input = host.querySelector('input[data-mem="' + id + '"]');
        state.dreams = setMemory(state.dreams, id, input.value);
        persist(); renderMine();
      });
    });
  }

  function renderIdeas() {
    var host = document.getElementById("tab-ideas");
    var cats = (typeof IDEA_CATEGORIES !== "undefined") ? IDEA_CATEGORIES : [];
    var html = '<div class="card form-grid">' +
      '<input id="fQ" placeholder="Search ideas…" value="' + esc(state.fQ) + '">' +
      '<select id="fCat"><option value="all">All categories</option>' +
      cats.map(function (c) { return '<option value="' + c + '"' + (state.fCat === c ? " selected" : "") + ">" + esc(catLabel(c)) + "</option>"; }).join("") + "</select>" +
      '<select id="fCost"><option value="">Any cost</option>' +
      [1, 2, 3].map(function (c) { return '<option value="' + c + '"' + (String(state.fCost) === String(c) ? " selected" : "") + ">" + esc(costLabel(c)) + "</option>"; }).join("") + "</select>" +
      '<select id="fEffort"><option value="">Any effort</option>' +
      [1, 2, 3].map(function (e) { return '<option value="' + e + '"' + (String(state.fEffort) === String(e) ? " selected" : "") + ">" + esc(effortLabel(e)) + "</option>"; }).join("") + "</select>" +
      '<button id="surprise">Surprise me</button></div>';

    var ideas = filterIdeas({ cat: state.fCat, maxCost: state.fCost ? parseInt(state.fCost, 10) : 0, maxEffort: state.fEffort ? parseInt(state.fEffort, 10) : 0, q: state.fQ });
    html += '<p class="muted">' + ideas.length + ' ideas</p><div class="ideagrid">';
    ideas.forEach(function (it, i) {
      html += '<div class="card idea"><div><strong>' + esc(it.t) + "</strong></div>" +
        '<div class="muted small">' + esc(catLabel(it.cat)) + " · " + esc(costLabel(it.cost)) + " · " + esc(effortLabel(it.effort)) + "</div>" +
        '<button data-addidea="' + i + '">＋ Add to my list</button></div>';
    });
    html += "</div>";
    host.innerHTML = html;
    host._ideas = ideas;

    ["fQ", "fCat", "fCost", "fEffort"].forEach(function (id) {
      document.getElementById(id).addEventListener(id === "fQ" ? "input" : "change", function (e) {
        state[{ fQ: "fQ", fCat: "fCat", fCost: "fCost", fEffort: "fEffort" }[id]] = e.target.value;
        persist();
        if (id !== "fQ") renderIdeas();
        else {
          clearTimeout(host._t);
          host._t = setTimeout(renderIdeas, 350);
        }
      });
    });
    document.getElementById("surprise").addEventListener("click", function () {
      var picks = surpriseMe(3);
      alert("How about…\n\n" + picks.map(function (p, i) { return (i + 1) + ". " + p.t + " (" + catLabel(p.cat) + ")"; }).join("\n"));
    });
    host.querySelectorAll("[data-addidea]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var it = host._ideas[parseInt(btn.getAttribute("data-addidea"), 10)];
        state.dreams = addDream(state.dreams, { title: it.t, cat: it.cat, cost: it.cost, effort: it.effort });
        state.tab = "mine"; persist(); renderHeader(); renderTabs(); renderMine();
      });
    });
  }

  function renderTabs() {
    ["mine", "ideas"].forEach(function (t) {
      document.getElementById("tabbtn-" + t).classList.toggle("active", state.tab === t);
      document.getElementById("tab-" + t).classList.toggle("hidden", state.tab !== t);
    });
  }

  function renderAll() { renderHeader(); renderTabs(); renderMine(); renderIdeas(); }

  document.addEventListener("DOMContentLoaded", function () {
    ["mine", "ideas"].forEach(function (t) {
      document.getElementById("tabbtn-" + t).addEventListener("click", function () {
        state.tab = t; persist(); renderTabs();
      });
    });
    document.getElementById("resetAll").addEventListener("click", function () {
      if (confirm("Clear all dreams and start over?")) {
        state = { dreams: [], tab: "mine", fCat: "all", fCost: "", fEffort: "", fQ: "" };
        persist(); renderAll();
      }
    });
    renderAll();
  });
})();
