let language = 'en';
try { language = localStorage.getItem('bioagent-world-language') === 'zh' ? 'zh' : 'en'; } catch {}
const languageToggle = document.querySelector('#language-toggle');
const heroVideo = document.querySelector('#hero-video');
const heroToggle = document.querySelector('#hero-play-toggle');
const demoVideos = [...document.querySelectorAll('.recording-frame video')];
const labOpen = document.querySelector('#lab-open');
const labWindow = document.querySelector('#lab-window');
const labMount = document.querySelector('#lab-frame-mount');
const labFullscreen = document.querySelector('#lab-fullscreen');
let labFrame = null;
let backbone = 0;
// Manuscript Table 1: successes out of 20, ordered as π0.5, Diffusion Policy, LingBot-VA.
const skills = [
  { en:'Open the six-well plate', zh:'打开六孔板', counts:[[16,15],[11,9],[16,16]] },
  { en:'Grasp a centrifuge tube', zh:'抓取离心管', counts:[[14,13],[12,11],[18,16]] },
  { en:'Heat the centrifuge tube in a water bath', zh:'在水浴中加热离心管', counts:[[13,10],[8,6],[14,13]] },
  { en:'Retrieve the medium-containing tube from the water bath', zh:'从水浴中取出培养基试管', counts:[[18,18],[10,10],[17,16]] },
  { en:'Return the centrifuge tube to the rack', zh:'将离心管放回试管架', counts:[[16,16],[9,8],[15,15]] },
  { en:'Uncap the medium-containing tube', zh:'打开培养基试管盖', counts:[[12,9],[6,3],[13,11]] },
  { en:'Aspirate fresh medium', zh:'吸取新鲜培养基', counts:[[17,16],[9,7],[16,15]] },
  { en:'Dispense fresh medium into the six-well plate', zh:'将新鲜培养基分装至六孔板', counts:[[19,19],[10,11],[18,18]] },
  { en:'Recap the centrifuge tube', zh:'重新盖上离心管盖', counts:[[13,11],[7,4],[15,12]] },
  { en:'Regrasp the six-well plate lid', zh:'重新抓取六孔板盖', counts:[[19,16],[13,13],[20,20]] },
  { en:'Replace the six-well plate lid', zh:'放回六孔板盖', counts:[[10,7],[4,2],[12,11]] }
];
function renderSkills() {
  const rows = skills.map((skill, index) => {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row'; name.textContent = `${String(index + 1).padStart(2,'0')}  ${skill[language]}`; row.append(name);
    skill.counts[backbone].forEach((count, source) => {
      const cell = document.createElement('td');
      if (source === 1) cell.className = 'accent-cell';
      cell.textContent = `${count}/20 (${count * 5}%)`; row.append(cell);
    });
    return row;
  });
  document.querySelector('#skill-table-body').replaceChildren(...rows);
}
function updatePlayButton() {
  heroToggle.innerHTML = `<span aria-hidden="true">${heroVideo.paused ? '▶' : 'Ⅱ'}</span>`;
  heroToggle.setAttribute('aria-label', language === 'zh' ? (heroVideo.paused ? '播放概览视频' : '暂停概览视频') : (heroVideo.paused ? 'Play overview video' : 'Pause overview video'));
}
function setLanguage(next) {
  language = next;
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-en][data-zh]').forEach(el => el.textContent = el.dataset[next]);
  languageToggle.textContent = next === 'en' ? '中文' : 'EN';
  languageToggle.setAttribute('aria-label', next === 'en' ? 'Switch to Chinese' : '切换到英文');
  document.title = next === 'en' ? 'BioAgent-world — Interactive Digital Twins for Scalable Robot Skill Learning' : 'BioAgent-world — 用于规模化机器人技能学习的可交互数字孪生';
  try { localStorage.setItem('bioagent-world-language', next); } catch {}
  if (labFrame) {
    labFrame.title = next === 'zh' ? '可交互的 3D 实验室' : 'Interactive 3D laboratory';
    labFrame.contentWindow?.postMessage({type:'bioagent:language',language:next}, location.origin);
  }
  renderSkills(); updatePlayButton();
}
function openLab({scroll = false} = {}) {
  if (labFrame) return;
  if (scroll) { heroVideo.pause(); demoVideos.forEach(video => video.pause()); }
  labOpen.hidden = true; labOpen.setAttribute('aria-expanded','true'); labWindow.hidden = false;
  labFrame = document.createElement('iframe');
  labFrame.id = 'lab-frame'; labFrame.className = 'lab-frame';
  labFrame.title = language === 'zh' ? '可交互的 3D 实验室' : 'Interactive 3D laboratory';
  labFrame.allow = 'fullscreen'; labFrame.allowFullscreen = true;
  labFrame.loading = scroll ? 'eager' : 'lazy';
  const url = new URL('scene/',location.href); url.searchParams.set('embedded','1'); url.searchParams.set('lang',language);
  labFrame.src = url.href;
  labFrame.addEventListener('load', () => labFrame?.contentWindow?.postMessage({type:'bioagent:language',language},location.origin));
  labMount.replaceChildren(labFrame);
  if (scroll) labWindow.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
labOpen.addEventListener('click', () => openLab({scroll:true}));
document.querySelector('#lab-close').addEventListener('click', async () => {
  if (document.fullscreenElement === labWindow) await document.exitFullscreen();
  labFrame?.remove(); labFrame = null;
  labWindow.hidden = true; labOpen.hidden = false; labOpen.setAttribute('aria-expanded','false');
  labOpen.focus({preventScroll:true});
});
labFullscreen.hidden = !document.fullscreenEnabled;
labFullscreen.addEventListener('click', async () => {
  try { if (document.fullscreenElement === labWindow) await document.exitFullscreen(); else await labWindow.requestFullscreen(); } catch {}
});
document.addEventListener('fullscreenchange', () => {
  const label = labFullscreen.querySelector('[data-en]');
  label.dataset.en = document.fullscreenElement === labWindow ? 'Exit full screen' : 'Full screen';
  label.dataset.zh = document.fullscreenElement === labWindow ? '退出全屏' : '全屏浏览';
  label.textContent = label.dataset[language];
});
languageToggle.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
heroToggle.addEventListener('click', async () => {
  if (heroVideo.paused) { try { await heroVideo.play(); } catch {} } else heroVideo.pause();
  updatePlayButton();
});
heroVideo.addEventListener('play', updatePlayButton);
heroVideo.addEventListener('pause', updatePlayButton);
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { heroVideo.autoplay = false; heroVideo.pause(); }
demoVideos.forEach(video => video.addEventListener('play', () => {
  heroVideo.pause();
  demoVideos.filter(other => other !== video).forEach(other => other.pause());
}));
const tabs = [...document.querySelectorAll('[data-backbone]')];
function selectBackbone(tab, focus = false) {
  backbone = Number(tab.dataset.backbone);
  tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
  document.querySelector('#skill-table-panel').setAttribute('aria-labelledby', tab.id);
  renderSkills(); if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectBackbone(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectBackbone(tabs[next], true); }
  });
});
setLanguage(language);
openLab();
