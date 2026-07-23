// Fetches a handful of security RSS feeds and writes data/threat-feed.json.
// Run by .github/workflows/fetch-threat-feed.yml on a schedule — no npm install needed (Node 20 built-in fetch).
const fs = require("fs");

const FEEDS = [
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" }
];

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").trim();
}
function stripHtml(s) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function parseItems(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 5)) {
    const title = tag(block, "title");
    const link = tag(block, "link");
    const pubDate = tag(block, "pubDate");
    const description = stripHtml(tag(block, "description")).slice(0, 140);
    let date = "";
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
    }
    items.push({ source, title, link, date, snippet: description });
  }
  return items;
}

async function main() {
  const all = [];
  for (const f of FEEDS) {
    try {
      const res = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (threat-feed-bot)" } });
      const xml = await res.text();
      all.push(...parseItems(xml, f.name));
    } catch (e) {
      console.error("Feed failed:", f.name, e.message);
    }
  }
  all.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/threat-feed.json", JSON.stringify(all.slice(0, 12), null, 2));
  console.log(`Wrote ${all.length} items to data/threat-feed.json`);
}

main();
