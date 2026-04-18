const DISCORD_USER_ID = "853310319002517524";

function switchTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  const btn = document.getElementById("nav-" + id);
  if (btn) btn.classList.add("active");
  const mBtn = document.getElementById("mnav-" + id);
  if (mBtn) mBtn.classList.add("active");
  lucide.createIcons();
}

const STATUS_STYLES = {
  online:  { bg: "rgba(93,186,126,0.12)",  border: "rgba(93,186,126,0.25)",  dot: "#5dba7e", text: "online"  },
  idle:    { bg: "rgba(250,166,26,0.12)",  border: "rgba(250,166,26,0.25)",  dot: "#faa61a", text: "idle"    },
  dnd:     { bg: "rgba(224,92,92,0.12)",   border: "rgba(224,92,92,0.25)",   dot: "#e05c5c", text: "dnd"     },
  offline: { bg: "rgba(128,128,128,0.1)", border: "rgba(128,128,128,0.2)", dot: "#777",    text: "offline" },
};

let ws;
function connectLanyard() {
  ws = new WebSocket("wss://api.lanyard.rest/socket");
  ws.onopen    = () => ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
    if (msg.op === 0) updatePresence(msg.d);
  };
  ws.onclose = () => setTimeout(connectLanyard, 3000);
}

let allActivities = [];
let currentActivityIndex = 0;

function resolveImg(raw, appId) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("mp:external/")) return "https://media.discordapp.net/external/" + raw.slice("mp:external/".length);
  if (raw.startsWith("spotify:")) return "https://i.scdn.co/image/" + raw.slice("spotify:".length);
  return `https://cdn.discordapp.com/app-assets/${appId}/${raw}.png`;
}

function buildIconCandidates(act) {
  const id = act.application_id;
  return [
    act.assets?.large_image && resolveImg(act.assets.large_image, id),
    id && `https://cdn.discordapp.com/app-assets/${id}/icon.png`,
    id && `https://cdn.discordapp.com/app-icons/${id}/icon.png`,
    act.assets?.small_image && resolveImg(act.assets.small_image, id),
  ].filter(Boolean);
}

function displayActivity(index) {
  if (!allActivities.length) return;
  currentActivityIndex = Math.max(0, Math.min(index, allActivities.length - 1));
  const act = allActivities[currentActivityIndex];

  const content = document.querySelector(".activity-content");
  content.style.animation = "none";
  setTimeout(() => { content.style.animation = "fadeInActivity 0.3s ease"; }, 10);

  document.getElementById("activityName").textContent  = act.name    || "";
  document.getElementById("activityState").textContent = act.details || act.state || "";

  const icon = document.getElementById("activityIcon");
  const candidates = buildIconCandidates(act);
  const tryNext = (i) => {
    if (i >= candidates.length) { icon.style.visibility = "hidden"; return; }
    icon.style.visibility = "visible";
    icon.onerror = () => tryNext(i + 1);
    icon.src = candidates[i];
  };
  candidates.length ? tryNext(0) : (icon.style.visibility = "hidden");

  document.getElementById("activityPrev").classList.toggle("disabled", currentActivityIndex === 0);
  document.getElementById("activityNext").classList.toggle("disabled", currentActivityIndex === allActivities.length - 1);
  document.getElementById("activityCounter").textContent = `${currentActivityIndex + 1}/${allActivities.length}`;

  lucide.createIcons();
}

function navigateActivity(dir) {
  const next = currentActivityIndex + dir;
  if (next >= 0 && next < allActivities.length) displayActivity(next);
}

function applyDominantColorFromAvatar(imgSrc) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 128) continue; 
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
    if (!count) return;
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    const darken = (v, f) => Math.max(0, Math.min(255, Math.round(v * f)));
    const bgR = darken(r, 0.15), bgG = darken(g, 0.15), bgB = darken(b, 0.15);
    const bg2R = darken(r, 0.22), bg2G = darken(g, 0.22), bg2B = darken(b, 0.22);
    const cardR = darken(r, 0.28), cardG = darken(g, 0.28), cardB = darken(b, 0.28);
    const amberR = Math.min(255, r + 40), amberG = Math.min(255, g + 40), amberB = Math.min(255, b + 40);
    const root = document.documentElement;
    root.style.setProperty("--bg",   `rgb(${bgR},${bgG},${bgB})`);
    root.style.setProperty("--bg2",  `rgb(${bg2R},${bg2G},${bg2B})`);
    root.style.setProperty("--card", `rgb(${cardR},${cardG},${cardB})`);
    root.style.setProperty("--card-hover", `rgb(${darken(r,0.35)},${darken(g,0.35)},${darken(b,0.35)})`);
    root.style.setProperty("--border",  `rgba(${r},${g},${b},0.15)`);
    root.style.setProperty("--border2", `rgba(${r},${g},${b},0.28)`);
    root.style.setProperty("--amber",     `rgb(${amberR},${amberG},${amberB})`);
    root.style.setProperty("--amber-dim",  `rgba(${r},${g},${b},0.13)`);
    root.style.setProperty("--amber-dim2", `rgba(${r},${g},${b},0.24)`);
    root.style.setProperty("--banner-tint", `rgba(${r},${g},${b},0.85)`);
  };
  img.src = imgSrc;
}

function updatePresence(d) {
  const u = d.discord_user;
  const avatarEl = document.getElementById("avatarBig");
  const mobileAvatarEl = document.getElementById("mobileAvatar");
  const avatarHash = u.avatar;
  const avatarExt = avatarHash && avatarHash.startsWith("a_") ? "gif" : "png";
  const avatarSrc = avatarHash
    ? `https://cdn.discordapp.com/avatars/${u.id}/${avatarHash}.${avatarExt}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id) >> 22n) % 6n}.png`;
  if (avatarEl && avatarEl.src !== avatarSrc) {
    avatarEl.src = avatarSrc;
    applyDominantColorFromAvatar(avatarSrc);
  }
  if (mobileAvatarEl && mobileAvatarEl.src !== avatarSrc) mobileAvatarEl.src = avatarSrc;
  document.getElementById("username").textContent = u.global_name || u.username;

  const decorEl = document.getElementById("avatarDecoration");
  if (decorEl) {
    const decoData = u.avatar_decoration_data;
    if (decoData && decoData.asset) {
      decorEl.src = `https://cdn.discordapp.com/avatar-decoration-presets/${decoData.asset}.png`;
      decorEl.style.display = "";
    } else {
      decorEl.style.display = "none";
    }
  }

  const guildTagEl  = document.getElementById("guildTag");
  const guildIconEl = document.getElementById("guildIcon");
  const wrapEl      = document.getElementById("guildTagWrap");
  const guild = u.primary_guild;

  if (guild && guild.tag) {
    if (guildTagEl) { guildTagEl.textContent = guild.tag; guildTagEl.style.display = ""; }
    if (wrapEl) wrapEl.style.display = "";
    if (guildIconEl) {
      const iconHash = guild.badge;
      const guildId  = guild.identity_guild_id;
      if (iconHash && guildId) {
        guildIconEl.src = `https://cdn.discordapp.com/clan-badges/${guildId}/${iconHash}.png?size=32`;
        guildIconEl.style.display = "";
        guildIconEl.onerror = () => { guildIconEl.style.display = "none"; };
      } else {
        guildIconEl.style.display = "none";
      }
    }
  } else {
    if (guildTagEl) guildTagEl.style.display = "none";
    if (guildIconEl) guildIconEl.style.display = "none";
    if (wrapEl) wrapEl.style.display = "none";
  }

  const s = STATUS_STYLES[d.discord_status] || STATUS_STYLES.offline;
  const pill = document.getElementById("statusPill");
  pill.style.background   = s.bg;
  pill.style.borderColor  = s.border;
  pill.style.color        = s.dot;
  document.getElementById("statusDot").style.background = s.dot;
  document.getElementById("statusText").textContent     = s.text;

  let activities = d.activities?.filter(a => a.type === 0 || a.type === 2) || [];

  if (d.spotify && !activities.find(a => a.type === 2 && a.name === "Spotify")) {
    const sp = d.spotify;
    activities = [{
      name: "Spotify", details: sp.song, state: sp.artist,
      type: 2, assets: { large_image: sp.album_art_url },
    }, ...activities];
  }

  const card = document.getElementById("activityCard");
  if (activities.length) {
    allActivities = activities;
    currentActivityIndex = 0;
    card.classList.remove("hidden");
    displayActivity(0);
  } else {
    card.classList.add("hidden");
    allActivities = [];
  }
}

connectLanyard();

function openSettings()  { document.getElementById("settingsModal").classList.add("open"); }
function closeSettings() { document.getElementById("settingsModal").classList.remove("open"); }
document.getElementById("settingsModal").addEventListener("click", e => {
  if (e.target.id === "settingsModal") closeSettings();
});

const projectData = {
  "AW : Heart Of The Unreturned": {
    lang: "// lua",
    intro: "A Roblox fan game based on Abyss World. Built with a team.",
    description: "Heart Of The Unreturned is a Parkour Roblox fan game inspired by Abyss World. Currently in active development — I mostly did bug fixes",
    images: [
      "images/hotu1.png",
      "images/hotu2.png",
      "images/hotu3.png",
      "images/hotu4.png",
    ],
    action: { label: "Play on Roblox", href: "https://www.roblox.com/games/132429881613824/ABYSS-WORLD-HOTU" },
    roadmap: [
      { cat: "Movement",   title: "Core Gameplay", desc: "Everything related to player control and movement.",       items: ["Press and hold jumping system", "Momentum system and checkpoint system"], status: "done" },
      { cat: "Environment", title: "Zones",  desc: "Different layers of the map.",         items: ["Multiple terrain themes", "Lighting setup and map variation"],                          status: "done" },
      { cat: "Art",         title: "Enemy Roster",  desc: "Sculpt and rig all enemy types.",     items: ["Multiple enemy variants with rigs", "Texturing and polish work"],                       status: "wip"  },
      { cat: "GUI",         title: "Upgrade Menu",  desc: "Card-based tower upgrade system.",    items: ["Card-based upgrade UI", "Tier 1–4 management"],                                         status: "wip"  },
    ],
  },
  "nigbot": {
    lang: "// python · discord",
    intro: "A Discord bot that nukes channels on a set schedule.",
    description: "nigbot is a selfbot/Discord bot that deletes and recreates channels at whatever interval you set. built it for fun, runs off a simple config. does what it says on the tin.",
    images: [
      "https://opengraph.githubassets.com/1/aexdm/nigbot",
    ],
    action: { label: "View on GitHub", href: "https://github.com/aexdm/nigbot" },
    roadmap: [],
    botAvatarId: "1309568330397761596", 
  },
};

function openProjectModal(projectName) {
  const data = projectData[projectName] || {};
  const placeholder = "https://tr.rbxcdn.com/180DAY-d6495b95d4dd31b15c745e4c72610278/930/480/Image/Png/noFilter";
  const images = data.images?.length ? data.images : [placeholder, placeholder, placeholder, placeholder];

  document.getElementById("pModalLang").textContent        = data.lang        || "// project";
  document.getElementById("pModalTitle").textContent       = projectName;
  document.getElementById("pModalIntro").textContent       = data.intro        || "";
  document.getElementById("pModalDescription").textContent = data.description  || "";

  const mainImg = document.getElementById("pModalImgMain");
  mainImg.src = images[0];
  document.querySelectorAll(".pmodal-thumb").forEach((thumb, i) => {
    thumb.src           = images[i] || images[0];
    thumb.style.display = images[i] ? "block" : "none";
    thumb.classList.toggle("active", i === 0);
    thumb.onclick = () => {
      mainImg.style.opacity = "0";
      setTimeout(() => { mainImg.src = images[i]; mainImg.style.opacity = "1"; }, 150);
      document.querySelectorAll(".pmodal-thumb").forEach(x => x.classList.remove("active"));
      thumb.classList.add("active");
    };
  });

  document.getElementById("pModalActionLabel").textContent = data.action?.label || "View Project";
  document.getElementById("pModalAction").href             = data.action?.href  || "#";

  const tabBtns        = document.getElementById("pModalTabBtns");
  const roadmapContent = document.getElementById("pModalRoadmapContent");
  tabBtns.innerHTML        = "";
  roadmapContent.innerHTML = "";

  const roadmap = data.roadmap || [];
  if (!roadmap.length) {
    roadmapContent.innerHTML = `<p style="font-family:var(--mono);font-size:11.5px;color:var(--muted);">// no roadmap yet</p>`;
  } else {
    roadmap.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.className = "pmodal-tab-btn" + (i === 0 ? " active" : "");
      btn.textContent = item.cat;
      btn.onclick = () => {
        tabBtns.querySelectorAll(".pmodal-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        roadmapContent.querySelectorAll(".pmodal-roadmap-panel").forEach(p => p.classList.remove("active"));
        document.getElementById(`pRoadmapPanel-${i}`).classList.add("active");
      };
      tabBtns.appendChild(btn);

      const statusClass = item.status === "done" ? "pmodal-status-done" : "pmodal-status-wip";
      const statusText  = item.status === "done" ? "done" : "in progress";
      const panel = document.createElement("div");
      panel.className = "pmodal-roadmap-panel" + (i === 0 ? " active" : "");
      panel.id = `pRoadmapPanel-${i}`;
      panel.innerHTML = `
        <div class="pmodal-roadmap-card">
          <div class="pmodal-roadmap-card-title">${item.title}</div>
          <div class="pmodal-roadmap-card-desc">${item.desc}</div>
          <ul>${item.items.map(li => `<li>${li}</li>`).join("")}</ul>
          <span class="${statusClass}">${statusText}</span>
        </div>`;
      roadmapContent.appendChild(panel);
    });
  }

  document.getElementById("projectModal").classList.add("open");
  lucide.createIcons();
}

function closeProjectModal() { document.getElementById("projectModal").classList.remove("open"); }
document.getElementById("projectModal").addEventListener("click", e => {
  if (e.target.id === "projectModal") closeProjectModal();
});

document.querySelectorAll(".project-row, .project-card").forEach(row => {
  row.addEventListener("click", e => {
    e.preventDefault();
    const name = row.dataset.project || row.querySelector(".project-name, .project-card-name")?.textContent?.trim() || "";
    openProjectModal(name);
  });
});

const cycleWords = [
  "MY BED I LOVE IT", "money", "roblox", "art", "my friends", "code",
  "my phone", "drawing", "fashion", "chaos", "summer",
  "Tyler The Creator", "anime", "memes", "food", "sleep",
  "cats", "the vibe", "aidenhub.dev",
];
let wordIndex = 0;
setInterval(() => {
  const el = document.getElementById("aboutWord");
  if (!el) return;
  el.style.opacity   = "0";
  el.style.transform = "translateY(-5px)";
  setTimeout(() => {
    el.textContent     = cycleWords[wordIndex];
    el.style.opacity   = "1";
    el.style.transform = "translateY(0)";
    wordIndex = (wordIndex + 1) % cycleWords.length;
  }, 220);
}, 1800);

const themes = {
  midnight: {
    "--bg": "#070a14", "--bg2": "#0d1120", "--card": "#111827", "--card-hover": "#1a2540",
    "--border": "rgba(99,130,255,0.1)", "--border2": "rgba(99,130,255,0.2)",
    "--text": "#e8ecff", "--muted": "rgba(180,190,255,0.45)",
    "--amber": "#6384ff", "--amber-dim": "rgba(99,130,255,0.12)", "--amber-dim2": "rgba(99,130,255,0.22)",
    "--green": "#4dd8ad", "--green-dim": "rgba(77,216,173,0.12)",
  },
  orange: {
    "--bg": "#0c0c0b", "--bg2": "#111110", "--card": "#161614", "--card-hover": "#1c1c19",
    "--border": "rgba(255,245,210,0.08)", "--border2": "rgba(255,245,210,0.15)",
    "--text": "#f5f0e8", "--muted": "rgba(245,240,232,0.4)",
    "--amber": "#e8a030", "--amber-dim": "rgba(232,160,48,0.1)", "--amber-dim2": "rgba(232,160,48,0.18)",
    "--green": "#5dba7e", "--green-dim": "rgba(93,186,126,0.12)",
  },
  red:      { "--amber": "#ff4d4d" },
  blue:     { "--amber": "#4da6ff" },
  green:    { "--amber": "#5dba7e" },
  purple:   { "--amber": "#d946ef" },
  pink:     { "--amber": "#ec4899" },
  cyan:     { "--amber": "#06b6d4" },
  rose: {
    "--bg": "#120a0d", "--bg2": "#1e1015", "--card": "#2a1520", "--card-hover": "#361a28",
    "--border": "rgba(251,113,133,0.1)", "--border2": "rgba(251,113,133,0.2)",
    "--text": "#ffe8ed", "--muted": "rgba(255,180,195,0.45)",
    "--amber": "#fb7185", "--amber-dim": "rgba(251,113,133,0.12)", "--amber-dim2": "rgba(251,113,133,0.22)",
    "--green": "#f472b6", "--green-dim": "rgba(244,114,182,0.12)",
  },
};

function setTheme(name) {
  const root     = document.documentElement;
  const base     = themes.midnight;
  const selected = themes[name] || base;

  for (const key in base) root.style.setProperty(key, base[key]);
  for (const key in selected) root.style.setProperty(key, selected[key]);

  localStorage.setItem("theme", name);
}

function updateThemeButtons() {
  const saved = localStorage.getItem("theme") || "default";
  document.querySelectorAll(".theme-grid button").forEach(btn => {
    btn.classList.remove("active-theme");
  });
  const active = document.querySelector(`.theme-grid button[onclick*="setTheme('${saved}')"]`);
  if (active) active.classList.add("active-theme");
}

const eggSounds = ["amogus1", "amogus2", "amogus3"];
document.getElementById("easterEgg").addEventListener("click", () => {
  const id    = eggSounds[Math.floor(Math.random() * eggSounds.length)];
  const audio = document.getElementById(id);
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {}); 
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("theme") || "midnight";
  setTheme(saved);
  setTimeout(updateThemeButtons, 100);
});
