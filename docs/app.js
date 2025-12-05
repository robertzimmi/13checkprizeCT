let cards = [];
let shown = 0;
const STEP = 60;

async function load() {
  const res = await fetch("cards.json");
  cards = await res.json();
  showMore();
}

function showMore() {
  const slice = cards.slice(shown, shown + STEP);
  shown += STEP;

  const grid = document.getElementById("grid");
  slice.forEach(card => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-3 col-lg-2";
    col.innerHTML = `
      <div class="card bg-secondary h-100">
        <img src="${card.image_url}" class="card-img-top">
        <div class="card-body p-2">
          <h6 class="card-title small">${card.name}</h6>
        </div>
      </div>`;
    grid.append(col);
  });
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    showMore();
  }
});

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  cards = cards.filter(c => c.name.toLowerCase().includes(q));
  shown = 0;
  document.getElementById("grid").innerHTML = "";
  showMore();
});

load();
