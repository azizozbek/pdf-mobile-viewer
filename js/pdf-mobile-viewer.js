/**
 * PDF Mobile Viewer
 * Replaces WordPress File Block PDF embeds with a PDF.js canvas renderer on mobile.
 */

(function () {
  'use strict';

  function isMobile() {
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth < 1024
    );
  }

  if (!isMobile()) return;

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pmvConfig.workerSrc;
  }

  function findPdfBlocks() {
    return Array.from(document.querySelectorAll('.wp-block-file')).filter(
      (block) => getPdfUrl(block) !== null
    );
  }

  function getPdfUrl(block) {
    const obj = block.querySelector('object[data]');
    if (obj) {
      const url = obj.getAttribute('data');
      if (url && url.toLowerCase().includes('.pdf')) return url;
    }
    const embed = block.querySelector('embed[src]');
    if (embed) {
      const url = embed.getAttribute('src');
      if (url && url.toLowerCase().includes('.pdf')) return url;
    }
    for (const a of block.querySelectorAll('a:not(.wp-block-file__button)')) {
      const href = a.getAttribute('href') || '';
      if (href.toLowerCase().includes('.pdf')) return href;
    }
    return null;
  }

  async function replaceWithPdfJs(block) {
    const pdfUrl = getPdfUrl(block);
    if (!pdfUrl || block.dataset.pmvInit) return;
    block.dataset.pmvInit = '1';

    block.querySelectorAll('object, embed').forEach((el) => el.remove());

    // ── Build UI ──────────────────────────────────────────────────────────
    const wrapper    = document.createElement('div');
    wrapper.className = 'pmv-viewer';

    const toolbar    = document.createElement('div');
    toolbar.className = 'pmv-toolbar';

    const prevBtn    = makeBtn('&#8592;', 'Previous page');
    const pageInfo   = document.createElement('span');
    pageInfo.className = 'pmv-page-info';
    pageInfo.textContent = 'Loading…';
    const nextBtn    = makeBtn('&#8594;', 'Next page');
    const zoomOutBtn = makeBtn('&#8722;', 'Zoom out');
    const zoomInBtn  = makeBtn('&#43;',  'Zoom in');

    toolbar.append(prevBtn, pageInfo, nextBtn, zoomOutBtn, zoomInBtn);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'pmv-canvas-wrap';

    const canvas = document.createElement('canvas');
    canvas.className = 'pmv-canvas';
    canvasWrap.appendChild(canvas);

    wrapper.append(toolbar, canvasWrap);

    const downloadBtn = block.querySelector('.wp-block-file__button');
    downloadBtn ? block.insertBefore(wrapper, downloadBtn) : block.appendChild(wrapper);

    // ── State ─────────────────────────────────────────────────────────────
    let pdfDoc      = null;
    let currentPage = 1;
    let scale       = 1.0;
    let currentTask = null;

    // Capture the available width ONCE before any canvas resizing affects it.
    // Using wrapper.clientWidth so it is always stable regardless of canvas size.
    let baseContainerWidth = 0;

    async function renderPage(pageNum) {
      if (currentTask) {
        try { currentTask.cancel(); } catch (_) {}
        currentTask = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNum);

        // fitScale maps the PDF's natural width to the container at scale=1.
        // baseContainerWidth never changes, so fitScale stays correct on every zoom.
        const naturalViewport = page.getViewport({ scale: 1 });
        const fitScale        = baseContainerWidth / naturalViewport.width;
        const renderScale     = scale * fitScale;

        const viewport = page.getViewport({ scale: renderScale });

        // Account for device pixel ratio so the canvas is sharp on retina screens
        // and is never visually stretched by the browser scaling a low-res canvas up.
        const dpr = window.devicePixelRatio || 1;

        // Pixel dimensions of the canvas backing store
        canvas.width  = Math.floor(viewport.width  * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        // CSS display size — exactly the logical viewport size, no stretching
        canvas.style.width  = Math.floor(viewport.width)  + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale context to match DPR

        currentTask = page.render({ canvasContext: ctx, viewport });
        await currentTask.promise;
        currentTask = null;

        pageInfo.textContent = `${pageNum} / ${pdfDoc.numPages}`;
        prevBtn.disabled = pageNum <= 1;
        nextBtn.disabled = pageNum >= pdfDoc.numPages;
      } catch (err) {
        if (err && err.name === 'RenderingCancelledException') return;
        pageInfo.textContent = 'Error rendering page';
        console.error('PMV render error:', err);
      }
    }

    // ── Load PDF ──────────────────────────────────────────────────────────
    try {
      pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;

      // Read the stable container width now, before the canvas grows.
      // Subtract padding (12px each side = 24px) defined in .pmv-canvas-wrap.
      baseContainerWidth = (wrapper.clientWidth || window.innerWidth) - 24;

      await renderPage(currentPage);
    } catch (err) {
      pageInfo.textContent = 'Could not load PDF';
      console.error('PMV load error:', err);
      return;
    }

    // ── Controls ──────────────────────────────────────────────────────────
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) renderPage(--currentPage);
    });

    nextBtn.addEventListener('click', () => {
      if (currentPage < pdfDoc.numPages) renderPage(++currentPage);
    });

    zoomInBtn.addEventListener('click', () => {
      scale = Math.min(+(scale + 0.25).toFixed(2), 3);
      renderPage(currentPage);
    });

    zoomOutBtn.addEventListener('click', () => {
      scale = Math.max(+(scale - 0.25).toFixed(2), 0.5);
      renderPage(currentPage);
    });

    window.addEventListener('orientationchange', () => {
      // Recapture width after rotation then re-render
      setTimeout(() => {
        baseContainerWidth = (wrapper.clientWidth || window.innerWidth) - 24;
        renderPage(currentPage);
      }, 300);
    });
  }

  function makeBtn(html, label) {
    const btn = document.createElement('button');
    btn.className = 'pmv-btn';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = html;
    return btn;
  }

  function init() {
    if (typeof pdfjsLib === 'undefined') {
      setTimeout(init, 200);
      return;
    }
    findPdfBlocks().forEach(replaceWithPdfJs);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
