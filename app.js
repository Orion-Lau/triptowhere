const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

const destinations = [
  "东京",
  "首尔",
  "清迈",
  "巴厘岛",
  "巴黎",
  "罗马",
  "冰岛",
  "纽约",
  "开罗",
  "悉尼",
];

const colors = [
  "#f9735b",
  "#f5b84b",
  "#48a868",
  "#6aa9ff",
  "#7c6ee6",
  "#be5d8b",
  "#14b8a6",
  "#ef4444",
  "#84cc16",
  "#38bdf8",
];

const canvas = document.querySelector("#wheel");
const ctx = canvas.getContext("2d");
const spinButton = document.querySelector("#spinButton");
const refreshButton = document.querySelector("#refreshButton");
const resultText = document.querySelector("#resultText");
const saveStatus = document.querySelector("#saveStatus");
const voteList = document.querySelector("#voteList");
const destinationTags = document.querySelector("#destinationTags");
const destinationCount = document.querySelector("#destinationCount");

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
    ctx.font = "700 32px 'Noto Sans SC', sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = 3;
    ctx.fillText(destination, radius - 54, 10);
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
  destinationTags.innerHTML = destinations.map((item) => `<span>${item}</span>`).join("");
}

function getLocalVotes() {
  const stored = window.localStorage.getItem(storageKey);
  const parsed = stored ? JSON.parse(stored) : {};
  return destinations.reduce((votes, destination) => {
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
    saveStatus.textContent = "当前使用本机演示统计；配置 Supabase 后可收集所有人的票数。";
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

  return destinations.reduce((votes, destination) => {
    votes[destination] = data.filter((row) => row.destination === destination).length;
    return votes;
  }, {});
}

async function renderVotes() {
  const votes = await fetchVotes();
  const maxVotes = Math.max(1, ...Object.values(votes));

  voteList.innerHTML = destinations
    .map((destination, index) => {
      const score = votes[destination] || 0;
      const width = Math.max(3, Math.round((score / maxVotes) * 100));
      const color = colors[index % colors.length];

      return `
        <li class="vote-item">
          <span class="vote-name">${destination}</span>
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
  return destinations[index];
}

async function spin() {
  if (isSpinning) return;

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
