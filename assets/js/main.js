// 3rd3ye — site behaviour. Plain JS, no build step, no framework.
(function () {
  "use strict";

  /* ---------- theme ---------- */
  var THEME_KEY = "3rd3ye-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll(".theme-toggle button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.theme === t);
    });
  }
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var t = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(t);
    document.querySelectorAll(".theme-toggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        localStorage.setItem(THEME_KEY, b.dataset.theme);
        applyTheme(b.dataset.theme);
      });
    });
  }

  /* ---------- mobile nav ---------- */
  function initNav() {
    var burger = document.querySelector(".nav-burger");
    var links = document.querySelector(".nav-links");
    if (!burger || !links) return;
    burger.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- activity feed (data/activity.json) ---------- */
  // Add entries to data/activity.json as you publish — newest first.
  // { "kind": "Post published", "title": "...", "date": "2026-07-20", "meta": "6 min read", "href": "writing.html" }
  function initActivity() {
    var mount = document.getElementById("activity-list");
    if (!mount) return;
    fetch("data/activity.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!items || !items.length) {
          mount.innerHTML = '<p class="empty-state">No recent activity yet — this list fills in as new posts, lab notes and CTF writeups go live.</p>';
          return;
        }
        mount.innerHTML = items.slice(0, 8).map(function (it) {
          return '<div class="activity-item reveal in">' +
            '<div class="kind">' + esc(it.kind || "") + '</div>' +
            '<h6>' + (it.href ? '<a href="' + esc(it.href) + '" style="color:inherit;text-decoration:none">' + esc(it.title) + '</a>' : esc(it.title)) + '</h6>' +
            '<div class="when">' + esc(it.date || "") + (it.meta ? " · " + esc(it.meta) : "") + '</div>' +
            '</div>';
        }).join("");
      })
      .catch(function () {
        mount.innerHTML = '<p class="empty-state">No recent activity yet.</p>';
      });
  }

  /* ---------- threat feed (client-side RSS via rss2json) ---------- */
  var FEEDS = [
    { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
    { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
    { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" }
  ];
  function fetchViaRss2json(f) {
    var api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(f.url) + "&count=5";
    return fetch(api).then(function (r) { return r.json(); }).then(function (data) {
      if (data.status !== "ok" || !data.items || !data.items.length) throw new Error("rss2json empty");
      return data.items.map(function (it) {
        return {
          source: f.name, title: it.title, link: it.link,
          date: it.pubDate ? it.pubDate.split(" ")[0] : "",
          snippet: stripHtml(it.description || "").slice(0, 130)
        };
      });
    });
  }
  function fetchViaAllOrigins(f) {
    var api = "https://api.allorigins.win/raw?url=" + encodeURIComponent(f.url);
    return fetch(api).then(function (r) { return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var nodes = Array.prototype.slice.call(doc.querySelectorAll("item")).slice(0, 5);
      if (!nodes.length) throw new Error("allorigins empty");
      return nodes.map(function (node) {
        var get = function (tag) { var el = node.querySelector(tag); return el ? el.textContent : ""; };
        var pub = get("pubDate");
        return {
          source: f.name, title: get("title"), link: get("link"),
          date: pub ? new Date(pub).toISOString().slice(0, 10) : "",
          snippet: stripHtml(get("description")).slice(0, 130)
        };
      });
    });
  }
  /* ---------- threat feed: prefer prebuilt data/threat-feed.json (via GitHub Action), ---------- */
  /* fall back to live client-side fetch through public RSS proxies if it's missing/stale.        */
  function initThreatFeed() {
    var mount = document.getElementById("threat-feed");
    if (!mount) return;
    fetch("data/threat-feed.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (items) {
        if (!items || !items.length) return Promise.reject();
        renderFeed(mount, items);
      })
      .catch(function () { fetchLiveFeed(mount); });
  }
  function fetchLiveFeed(mount) {
    Promise.all(FEEDS.map(function (f) {
      return fetchViaRss2json(f).catch(function () { return fetchViaAllOrigins(f); }).catch(function () { return []; });
    })).then(function (groups) {
      var items = [].concat.apply([], groups);
      if (!items.length) { renderFeedFallback(mount); return; }
      items.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
      renderFeed(mount, items.slice(0, 6));
    }).catch(function () { renderFeedFallback(mount); });
  }
  function renderFeed(mount, items) {
    mount.innerHTML = items.slice(0, 6).map(function (it) {
      return '<div class="feed-item reveal in">' +
        '<div class="src">' + esc(it.source) + '</div>' +
        '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' +
        '<h6>' + esc(it.title) + '</h6>' +
        '<p>' + esc(it.snippet) + (it.snippet && it.snippet.length >= 130 ? "…" : "") + '</p>' +
        '</a>' +
        '<div class="feed-meta">' + esc(it.date) + '</div>' +
        '</div>';
    }).join("");
  }
  function renderFeedFallback(mount) {
    mount.innerHTML = '<p class="feed-state">Live feed unavailable right now — both proxies are rate-limited at the moment. <a href="https://feeds.feedburner.com/TheHackersNews" target="_blank" rel="noopener">Read The Hacker News directly →</a></p>';
  }
  function stripHtml(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || d.innerText || "").trim();
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- forms (Formspree — replace YOUR_FORM_ID, see README) ---------- */
  function initForms() {
    document.querySelectorAll("form[data-ajax-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        var action = form.getAttribute("action") || "";
        var keyField = form.querySelector('[name="access_key"]');
        if (keyField && keyField.value === "YOUR_WEB3FORMS_ACCESS_KEY") return; // not configured yet
        e.preventDefault();
        var success = form.parentElement.querySelector(".form-success");
        var data = new FormData(form);
        fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (r.ok) {
              form.reset();
              if (success) success.classList.add("show");
            } else {
              alert("Something went wrong — please try again or email me directly.");
            }
          })
          .catch(function () { alert("Something went wrong — please try again or email me directly."); });
      });
    });
  }

  /* ---------- writing index filter chips ---------- */
  function initFilters() {
    var bar = document.querySelector("[data-filter-bar]");
    if (!bar) return;
    var cards = document.querySelectorAll("[data-tags]");
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter]");
      if (!btn) return;
      bar.querySelectorAll("[data-filter]").forEach(function (b) { b.classList.remove("tag-accent"); b.classList.add("tag-outline"); });
      btn.classList.remove("tag-outline"); btn.classList.add("tag-accent");
      var f = btn.dataset.filter;
      cards.forEach(function (c) {
        c.style.display = (f === "all" || (c.dataset.tags || "").indexOf(f) !== -1) ? "" : "none";
      });
    });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
    initReveal();
    initActivity();
    initThreatFeed();
    initForms();
    initFilters();
    initYear();
  });
})();
