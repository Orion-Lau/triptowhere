const SUPABASE_URL = "https://inhlojckstflvillygtp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluaGxvamNrc3RmbHZpbGx5Z3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjE5MTgsImV4cCI6MjA5NDMzNzkxOH0.fahT4uIBu5IkV2OrE7AUaMrkLiZt1lC6xtCZ0-s_TGo";

const destinations = [
  { city: "布加勒斯特", country: "罗马尼亚" },
  { city: "索非亚", country: "保加利亚" },
  { city: "布达佩斯", country: "匈牙利" },
  { city: "维也纳", country: "奥地利" },
  { city: "釜山", country: "韩国" },
  { city: "札幌", country: "日本" },
  { city: "东京", country: "日本" },
  { city: "悉尼", country: "澳大利亚" },
  { city: "墨尔本", country: "澳大利亚" },
  { city: "伦敦", country: "英国" },
  { city: "雅典", country: "希腊" },
  { city: "高雄", country: "台湾" },
  { city: "台中", country: "台湾" },
  { city: "雷克雅未克", country: "冰岛" },
  { city: "胡志明", country: "越南" },
  { city: "金边", country: "柬埔寨" },
  { city: "伊斯坦布尔", country: "土耳其" },
  { city: "科希策", country: "斯洛伐克" },
  { city: "乌鲁木齐", country: "中国" },
  { city: "华沙", country: "波兰" },
  { city: "布拉格", country: "捷克" },
  { city: "斯德哥尔摩", country: "瑞典" },
  { city: "奥克兰", country: "新西兰" },
];

const destinationLabels = destinations.map(({ city, country }) => `${city}（${country}）`);

const colors = [
  "#e11d48",
  "#2563eb",
  "#f59e0b",
  "#7c3aed",
  "#16a34a",
  "#db2777",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#65a30d",
  "#be123c",
  "#0d9488",
  "#ca8a04",
  "#9333ea",
  "#15803d",
  "#dc2626",
  "#0284c7",
  "#c2410c",
  "#6d28d9",
  "#4d7c0f",
  "#9f1239",
  "#0369a1",
  "#a16207",
];

const canvas = document.querySelector("#wheel");
const ctx = canvas.getContext("2d");
const spinButton = document.querySelector("#spinButton");
const refreshButton = document.querySelector("#refreshButton");
const resultText = document.querySelector("#resultText");
const saveStatus = document.querySelector("#saveStatus");
const totalVotes = document.querySelector("#totalVotes");
const voteList = document.querySelector("#voteList");
const destinationTags = document.querySelector("#destinationTags");
const destinationCount = document.querySelector("#destinationCount");
const resultModal = document.querySelector("#resultModal");
const modalDestination = document.querySelector("#modalDestination");
const modalSpinButton = document.querySelector("#modalSpinButton");

const storageKey = "travel-wheel-local-votes";
const segmentAngle = (Math.PI * 2) / destinations.length;
let currentRotation = 0;
let isSpinning = false;

const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

function drawWheel() {
  const size = canvas.width;
  const radius = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(radius, radius);

  destinations.forEach((destination, index) => {
    const start = index * segmentAngle - Math.PI / 2;
    const end = start + segmentAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 8, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();

    ctx.save();
    ctx.rotate(start + segmentAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px 'Noto Sans SC', sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = 3;
    ctx.fillText(destination.city, radius - 54, 10);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius - 10, 0, Math.PI * 2);
  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.stroke();

  ctx.restore();
}

function renderDestinations() {
  destinationCount.textContent = `${destinations.length} 个`;
  destinationTags.innerHTML = destinations
    .map((destination) => `<span>${destination.city}（${destination.country}）</span>`)
    .join("");
}

function getLocalVotes() {
  const stored = window.localStorage.getItem(storageKey);
  const parsed = stored ? JSON.parse(stored) : {};
  return destinationLabels.reduce((votes, destination) => {
    votes[destination] = Number(parsed[destination] || 0);
    return votes;
  }, {});
}

function saveLocalVote(destination) {
  const votes = getLocalVotes();
  votes[destination] += 1;
  window.localStorage.setItem(storageKey, JSON.stringify(votes));
}

async function saveVote(destination) {
  if (!supabaseClient) {
    saveLocalVote(destination);
    saveStatus.textContent = "当前使用本机演示统计。";
    return;
  }

  const { error } = await supabaseClient.from("travel_wheel_votes").insert({ destination });
  if (error) {
    saveStatus.textContent = `保存失败：${error.message}`;
    return;
  }

  saveStatus.textContent = `已为 ${destination} 记 1 票。`;
}

async function fetchVotes() {
  if (!supabaseClient) {
    return getLocalVotes();
  }

  const { data, error } = await supabaseClient.from("travel_wheel_votes").select("destination");
  if (error) {
    saveStatus.textContent = `读取统计失败：${error.message}`;
    return getLocalVotes();
  }

  return destinationLabels.reduce((votes, destination) => {
    votes[destination] = data.filter((row) => row.destination === destination).length;
    return votes;
  }, {});
}

async function renderVotes() {
  const votes = await fetchVotes();
  const total = Object.values(votes).reduce((sum, score) => sum + score, 0);
  const countryVotes = destinations.reduce((ranking, destination) => {
    const label = `${destination.city}（${destination.country}）`;
    ranking[destination.country] = (ranking[destination.country] || 0) + (votes[label] || 0);
    return ranking;
  }, {});
  const rankedCountries = Object.entries(countryVotes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
  const maxVotes = Math.max(1, ...Object.values(countryVotes));

  totalVotes.textContent = total.toLocaleString("zh-CN");
  voteList.innerHTML = rankedCountries
    .map(([country, score], index) => {
      const width = Math.max(3, Math.round((score / maxVotes) * 100));
      const color = colors[index % colors.length];

      return `
        <li class="vote-item">
          <span class="vote-name">${country}</span>
          <span class="vote-score">${score} 票</span>
          <span class="bar" aria-hidden="true">
            <span style="--bar-width:${width}%; --bar-color:${color}"></span>
          </span>
        </li>
      `;
    })
    .join("");
}

function getWinningDestination(rotationDegrees) {
  const normalized = ((rotationDegrees % 360) + 360) % 360;
  const pointerDegrees = (360 - normalized) % 360;
  const index = Math.floor(pointerDegrees / (360 / destinations.length)) % destinations.length;
  const destination = destinations[index];
  return `${destination.city}（${destination.country}）`;
}

function showResult(destination) {
  modalDestination.textContent = destination;
  resultModal.classList.add("is-open");
  resultModal.setAttribute("aria-hidden", "false");
}

function hideResult() {
  resultModal.classList.remove("is-open");
  resultModal.setAttribute("aria-hidden", "true");
}

async function spin() {
  if (isSpinning) return;

  hideResult();
  isSpinning = true;
  spinButton.disabled = true;
  saveStatus.textContent = "正在旋转...";

  const extraTurns = 5 + Math.floor(Math.random() * 3);
  const randomLanding = Math.random() * 360;
  currentRotation += extraTurns * 360 + randomLanding;
  canvas.style.transform = `rotate(${currentRotation}deg)`;

  window.setTimeout(async () => {
    const destination = getWinningDestination(currentRotation);
    resultText.textContent = destination;
    showResult(destination);
    await saveVote(destination);
    await renderVotes();
    spinButton.disabled = false;
    isSpinning = false;
  }, 5100);
}

drawWheel();
renderDestinations();
renderVotes();

spinButton.addEventListener("click", spin);
refreshButton.addEventListener("click", renderVotes);
modalSpinButton.addEventListener("click", spin);
resultModal.addEventListener("click", (event) => {
  if (event.target === resultModal) {
    hideResult();
  }
});
