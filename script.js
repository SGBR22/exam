const state = { files: [] };
const labels = { glb: '3D-модель', gif: 'Анимация', svg: 'График' };
const modelTitle = { 'магнитопровод_с_подписями.glb': 'Магнитопровод с подписями' };
const gifTitle = { 'heat_1.1_sec.gif': 'Нагрев контактора', 'Heat_5.1_hours.gif': 'Длительный нагрев', 'magneto3.gif': 'Магнитное поле' };
const plotTitle = { 'graf-1.svg': 'График 1', 'graf-2.svg': 'График 2' };
const sectionEls = { gif: document.querySelector('#gifSection'), svg: document.querySelector('#svgSection'), glb: document.querySelector('#glbSection') };
const dialog = document.querySelector('#viewerDialog');
const content = document.querySelector('#dialogContent');
let plotState = { scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 };

function titleFor(file) {
  return gifTitle[file.name] || plotTitle[file.name] || modelTitle[file.name] || file.name;
}
function subtitleFor(file) {
  if (file.type === 'gif') return file.name.toLowerCase().includes('magneto') ? 'Визуализация магнитного поля' : 'Изменение состояния во времени';
  if (file.type === 'svg') return 'График по результатам моделирования';
  return 'Модель доступна для вращения и масштабирования';
}
function isVisibleFile(file) {
  if (!['gif', 'svg', 'glb'].includes(file.type)) return false;
  if (file.type === 'glb') return file.name.toLocaleLowerCase('ru-RU').replaceAll('_', ' ').includes('с подписями');
  return true;
}
function safeUrl(url) { return url.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'); }
function createCard(file) {
  const card = document.createElement('article');
  card.className = `result-card ${file.type}-card ${file.type === 'svg' ? 'plot-card' : ''}`;
  card.tabIndex = 0;
  card.addEventListener('click', () => open(file));
  card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(file); } });
  const figure = document.createElement('figure');
  if (file.type === 'glb') {
    figure.className = 'model-card';
    figure.innerHTML = `<model-viewer src="${safeUrl(file.url)}" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1" alt="${file.name}"></model-viewer>`;
  } else {
    const image = document.createElement('img');
    image.src = file.url;
    image.alt = titleFor(file);
    image.loading = 'lazy';
    figure.append(image);
  }
  const caption = document.createElement('figcaption');
  const title = document.createElement('strong');
  title.textContent = titleFor(file);
  const subtitle = document.createElement('span');
  subtitle.textContent = subtitleFor(file);
  caption.append(title, subtitle);
  figure.append(caption);
  card.append(figure);
  return card;
}
function render() {
  Object.entries(sectionEls).forEach(([type, section]) => section.replaceChildren(...state.files.filter((file) => file.type === type).map(createCard)));
}
function setPlotTransform(viewer, image) {
  image.style.transform = `translate(${plotState.x}px, ${plotState.y}px) scale(${plotState.scale})`;
  const label = viewer.querySelector('.zoom-value');
  if (label) label.textContent = `${Math.round(plotState.scale * 100)}%`;
}
function setPlotScale(viewer, delta) {
  plotState.scale = Math.min(5, Math.max(.6, plotState.scale + delta));
  setPlotTransform(viewer, viewer.querySelector('img'));
}
function resetPlot(viewer) {
  plotState = { ...plotState, scale: 1, x: 0, y: 0 };
  setPlotTransform(viewer, viewer.querySelector('img'));
}
function makePlotViewer(file) {
  const viewer = document.createElement('div');
  viewer.className = 'plot-viewer';
  const image = document.createElement('img');
  image.src = file.url;
  image.alt = titleFor(file);
  image.draggable = false;
  const controls = document.createElement('div');
  controls.className = 'plot-controls';
  controls.innerHTML = '<button type="button" data-action="out" aria-label="Уменьшить">−</button><span class="zoom-value">100%</span><button type="button" data-action="in" aria-label="Увеличить">+</button><button type="button" data-action="reset">Сбросить</button>';
  viewer.append(image, controls);
  viewer.addEventListener('wheel', (event) => { event.preventDefault(); setPlotScale(viewer, event.deltaY < 0 ? .12 : -.12); }, { passive: false });
  controls.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.action;
    if (action === 'in') setPlotScale(viewer, .2);
    if (action === 'out') setPlotScale(viewer, -.2);
    if (action === 'reset') resetPlot(viewer);
  });
  image.addEventListener('pointerdown', (event) => {
    plotState.dragging = true; plotState.startX = event.clientX; plotState.startY = event.clientY;
    plotState.originX = plotState.x; plotState.originY = plotState.y;
    image.setPointerCapture(event.pointerId); image.classList.add('dragging');
  });
  image.addEventListener('pointermove', (event) => {
    if (!plotState.dragging) return;
    plotState.x = plotState.originX + event.clientX - plotState.startX;
    plotState.y = plotState.originY + event.clientY - plotState.startY;
    setPlotTransform(viewer, image);
  });
  const stop = () => { plotState.dragging = false; image.classList.remove('dragging'); };
  image.addEventListener('pointerup', stop); image.addEventListener('pointercancel', stop);
  return viewer;
}
function open(file) {
  document.querySelector('#dialogType').textContent = labels[file.type] || 'Результат';
  document.querySelector('#dialogTitle').textContent = titleFor(file);
  content.replaceChildren();
  if (file.type === 'glb') {
    const stage = document.createElement('div');
    stage.className = 'model-stage';
    stage.innerHTML = `<model-viewer src="${safeUrl(file.url)}" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1" alt="${file.name}"></model-viewer>`;
    content.append(stage);
  } else if (file.type === 'svg') {
    plotState = { ...plotState, scale: 1, x: 0, y: 0, dragging: false };
    content.append(makePlotViewer(file));
  }
  else {
    const image = document.createElement('img');
    image.src = file.url; image.alt = titleFor(file); content.append(image);
  }
  dialog.showModal();
}
function close() { dialog.close(); content.replaceChildren(); }
document.querySelector('#closeViewer').addEventListener('click', close);
dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
dialog.addEventListener('close', () => content.replaceChildren());

async function init() {
  try {
    let response;
    try {
      response = await fetch('/api/files');
      if (!response.ok) throw new Error('API недоступен');
    } catch (apiError) {
      response = await fetch('/data/files.json');
    }
    if (!response.ok) throw new Error('Не удалось получить список результатов');
    const data = await response.json();
    const seen = new Set();
    state.files = data.files.filter((file) => {
      if (!isVisibleFile(file) || seen.has(file.name)) return false;
      seen.add(file.name); return true;
    });
    render();
  } catch (error) { document.querySelector('main').insertAdjacentHTML('beforeend', `<p style="color:#c53030">${error.message}</p>`); }
}
init();
