// Site interactions — boots & tiles
(function () {
  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Subtle parallax for floating crystals
  const crystals = document.querySelectorAll('.crystal');
  if (crystals.length && window.matchMedia('(pointer:fine)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', (e) => {
      tx = (e.clientX / window.innerWidth  - 0.5) * 24;
      ty = (e.clientY / window.innerHeight - 0.5) * 24;
    });
    function raf() {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      crystals.forEach((c, i) => {
        const depth = 0.4 + (i % 3) * 0.25;
        c.style.translate = `${cx * depth}px ${cy * depth}px`;
      });
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Index — tile video lazy-load + autoplay on visibility
  function setupTileVideos() {
    const videos = document.querySelectorAll('.tile-video');
    if (!videos.length) return;
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (!v.dataset.loaded) {
            const src = v.dataset.src;
            if (src) {
              v.src = src;
              v.muted = true;
              v.defaultMuted = true;
              v.playsInline = true;
              v.load();
              v.dataset.loaded = 'true';
            }
          }
          const p = v.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    videos.forEach((v) => vio.observe(v));
  }
  setupTileVideos();
  window.addEventListener('pageshow', setupTileVideos);

  // Project hero — click to open modal
  window.openVideoModal = function () {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const heroVideo = document.getElementById('heroVideo');
    if (!modal || !modalVideo) return;
    modal.classList.add('video-modal--open');
    if (heroVideo) heroVideo.pause();
    const p = modalVideo.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };
  window.closeVideoModal = function (e) {
    const modal = document.getElementById('videoModal');
    if (e && e.target !== modal && !(e.target && e.target.classList && e.target.classList.contains('video-modal__close'))) return;
    const modalVideo = document.getElementById('modalVideo');
    const heroVideo = document.getElementById('heroVideo');
    if (!modal) return;
    modal.classList.remove('video-modal--open');
    if (modalVideo) modalVideo.pause();
    if (heroVideo) {
      const p = heroVideo.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('videoModal');
      if (modal && modal.classList.contains('video-modal--open')) {
        window.closeVideoModal({ target: modal });
      }
    }
  });
})();
