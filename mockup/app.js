const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");
const pageTitle = document.getElementById("page-title");

const pageTitles = {
  dashboard: "Dashboard",
  leads: "Leads",
  map: "Map",
  clusters: "Clusters",
  campaigns: "Campaigns",
  settings: "Settings",
};

const showPage = (target) => {
  pages.forEach((page) => {
    page.classList.toggle("is-visible", page.dataset.page === target);
  });
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.target === target);
  });
  pageTitle.textContent = pageTitles[target] || "Dashboard";
  console.log(`[mockup] page change: ${target}`);
};

navItems.forEach((item) => {
  item.addEventListener("click", () => showPage(item.dataset.target));
});

console.log("[mockup] loaded");
