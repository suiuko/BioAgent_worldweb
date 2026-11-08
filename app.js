let language = localStorage.getItem('bioagent-world-language') || 'en';
const languageToggle = document.querySelector('#language-toggle');
const heroVideo = document.querySelector('#hero-video');
const heroToggle = document.querySelector('#hero-play-toggle');
const fullVideo = document.querySelector('#full-video');
const objectRecords = {
  vessel: { en: ['Sample vessel', 'vessel_01', 'On the work surface'], zh: ['样品容器', 'vessel_01', '位于工作台表面'] },
  instrument: { en: ['Bench instrument', 'instrument_01', 'Beside the work surface'], zh: ['台式仪器', 'instrument_01', '位于工作台旁侧'] },
  storage: { en: ['Storage unit', 'storage_01', 'Along the rear wall'], zh: ['收纳柜', 'storage_01', '位于后方墙边'] }
};
let selectedObject = 'vessel';
function updateObject() {
  const record = objectRecords[selectedObject][language];
  ['object-name', 'object-id', 'object-location'].forEach((id, i) => document.getElementById(id).textContent = record[i]);
}
function updatePlayButton() {
  heroToggle.innerHTML = `<span aria-hidden="true">${heroVideo.paused ? '▶' : 'Ⅱ'}</span>`;
  heroToggle.setAttribute('aria-label', language === 'zh' ? (heroVideo.paused ? '播放背景视频' : '暂停背景视频') : (heroVideo.paused ? 'Play background video' : 'Pause background video'));
}
function setLanguage(next) {
  language = next;
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-en][data-zh]').forEach(el => el.textContent = el.dataset[next]);
  languageToggle.textContent = next === 'en' ? '中文' : 'EN';
  languageToggle.setAttribute('aria-label', next === 'en' ? 'Switch to Chinese' : '切换到英文');
  document.title = next === 'en' ? 'BioAgent-world — A world agents can understand' : 'BioAgent-world — 构建智能体可以理解的世界';
  localStorage.setItem('bioagent-world-language', next);
  updateObject();
  updatePlayButton();
}
languageToggle.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
heroToggle.addEventListener('click', async () => {
  if (heroVideo.paused) { try { await heroVideo.play(); } catch {} } else { heroVideo.pause(); }
  updatePlayButton();
});
heroVideo.addEventListener('play', updatePlayButton);
heroVideo.addEventListener('pause', updatePlayButton);
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  heroVideo.autoplay = false;
  heroVideo.pause();
}
const demoTabs = [...document.querySelectorAll('[data-tab]')];
function activateTab(tab, moveFocus = false) {
  demoTabs.forEach(button => {
    const active = button === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
  });
  if (tab.dataset.tab !== 'real') fullVideo.pause();
  if (moveFocus) tab.focus();
}
demoTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % demoTabs.length;
    if (event.key === 'ArrowLeft') target = (index - 1 + demoTabs.length) % demoTabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = demoTabs.length - 1;
    if (target !== undefined) { event.preventDefault(); activateTab(demoTabs[target], true); }
  });
});
document.querySelectorAll('[data-object]').forEach(button => button.addEventListener('click', () => {
  selectedObject = button.dataset.object;
  document.querySelectorAll('[data-object]').forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  updateObject();
}));
fullVideo.addEventListener('play', () => heroVideo.pause());
setLanguage(language);
