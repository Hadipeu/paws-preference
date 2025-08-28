    // CONFIG
    const TOTAL_CATS = 15; // change between 10-20 as you like
    const SWIPE_THRESHOLD = 120; // px to trigger a swipe
    const API_BASE = 'https://cataas.com/cat';

    // State
    let imageUrls = [];
    let currentIndex = 0; // index of top card in imageUrls
    let liked = [];

    const stack = document.getElementById('card-stack');
    const likedCountEl = document.getElementById('liked-count');
    const totalCountEl = document.getElementById('total-count');
    const loadingEl = document.getElementById('loading');
    const summaryEl = document.getElementById('summary');
    const likedGrid = document.getElementById('liked-grid');
    const summaryCount = document.getElementById('summary-count');

    // Utility to generate distinct Cataas URLs (cache-busting query)
    function makeCatUrl(i){
      // cataas returns images at /cat. We add a query param to avoid caching and to request different images
      // If you prefer a specific size: add e.g. '?width=600'
      return `${API_BASE}?cache=${Date.now()}_${i}`;
    }

    async function preloadImages(urls){
      const loaded = [];
      for(const u of urls){
        try{
          await new Promise((res,rej)=>{
            const img = new Image();
            img.onload = ()=>res();
            img.onerror = ()=>res(); // resolve on error - we still want to display placeholder later
            img.src = u;
          });
          loaded.push(u);
        }catch(e){
          // ignore errors; skip image
        }
      }
      return loaded;
    }

    async function init(){
      totalCountEl.textContent = TOTAL_CATS;
      // create candidate urls
      const cand = Array.from({length:TOTAL_CATS},(_,i)=>makeCatUrl(i));
      // preload to ensure smoothness
      const ok = await preloadImages(cand);
      imageUrls = ok.length ? ok : cand; // fallback to cand

      loadingEl.classList.add('hidden');
      renderStack();
    }

    function renderStack(){
      stack.innerHTML = '';
      currentIndex = 0;
      liked = [];
      likedCountEl.textContent = 0;
      summaryEl.classList.add('hidden');

      // add cards from end to start so first item is on top
      for(let i=imageUrls.length-1;i>=0;i--){
        const url = imageUrls[i];
        const card = document.createElement('div');
        card.className = 'card';
        card.style.backgroundImage = `url('${url}')`;
        card.dataset.idx = i;

        // badges
        const likeBadge = document.createElement('div');
        likeBadge.className = 'badge like';
        likeBadge.textContent = 'LIKE';
        card.appendChild(likeBadge);

        const nopeBadge = document.createElement('div');
        nopeBadge.className = 'badge nope';
        nopeBadge.textContent = 'NOPE';
        card.appendChild(nopeBadge);

        // meta area (optional)
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `<div style="font-weight:700">Cat #${i+1}</div><div style="font-size:12px;color:rgba(255,255,255,0.9)">Swipe right to like</div>`;
        card.appendChild(meta);

        addGesture(card, url);

        stack.appendChild(card);
      }
    }

    function addGesture(card,url){
      let startX=0,startY=0,dx=0,dy=0,isDragging=false;
      const likeBadge = card.querySelector('.badge.like');
      const nopeBadge = card.querySelector('.badge.nope');

      function setTransform(x,y,rot,scale=1){
        card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
      }

      card.addEventListener('pointerdown', (ev)=>{
        ev.target.setPointerCapture(ev.pointerId);
        startX = ev.clientX;
        startY = ev.clientY;
        isDragging = true;
        card.style.transition = 'none';
      });

      card.addEventListener('pointermove', (ev)=>{
        if(!isDragging) return;
        dx = ev.clientX - startX;
        dy = ev.clientY - startY;
        const rot = dx / 10; // rotate slightly based on horizontal movement
        setTransform(dx, dy, rot, 1);
        // badges opacity
        if(dx>0){
          likeBadge.style.opacity = Math.min(dx / SWIPE_THRESHOLD, 1);
          likeBadge.style.transform = `scale(${0.9 + Math.min(dx / SWIPE_THRESHOLD,1)*0.15})`;
          nopeBadge.style.opacity = 0;
        } else {
          nopeBadge.style.opacity = Math.min(-dx / SWIPE_THRESHOLD, 1);
          nopeBadge.style.transform = `scale(${0.9 + Math.min(-dx / SWIPE_THRESHOLD,1)*0.15})`;
          likeBadge.style.opacity = 0;
        }
      });

      card.addEventListener('pointerup', (ev)=>{
        if(!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 300ms cubic-bezier(.25,.8,.25,1), opacity 300ms ease';

        if(Math.abs(dx) > SWIPE_THRESHOLD){
          // swipe out
          const toRight = dx > 0;
          const screenX = (toRight ? window.innerWidth : -window.innerWidth) * 1.2;
          const rot = dx / 10;
          setTransform(screenX, dy*1.4, rot, 0.95);
          card.style.opacity = 0;

          // record
          setTimeout(()=>{
            card.remove();
            if(toRight){
              liked.push(url);
              likedCountEl.textContent = liked.length;
            }
            checkDone();
          }, 320);
        } else {
          // reset
          setTransform(0,0,0,1);
          likeBadge.style.opacity = 0;
          nopeBadge.style.opacity = 0;
        }
        dx = 0; dy = 0;
      });

      // pointercancel
      card.addEventListener('pointercancel', ()=>{
        isDragging = false;
        card.style.transition = 'transform 200ms ease';
        setTransform(0,0,0,1);
      });

      // accessibility: also support click-tap on the left/right half for quick tests
      card.addEventListener('click', (e)=>{
        // don't trigger if it was a drag
        if(Math.abs(dx) > 5) return;
      });
    }

    function checkDone(){
      // if all cards removed from DOM -> show summary
      const remaining = stack.querySelectorAll('.card').length;
      if(remaining === 0){
        showSummary();
      }
    }

    function showSummary(){
      summaryCount.textContent = liked.length;
      likedGrid.innerHTML = '';
      for(const url of liked){
        const t = document.createElement('div');
        t.className = 'thumb';
        t.style.backgroundImage = `url('${url}')`;
        likedGrid.appendChild(t);
      }
      summaryEl.classList.remove('hidden');
    }

    // buttons (programmatic swipe)
    document.getElementById('reloadBtn').addEventListener('click', ()=>location.reload());



    // Initialize
    init();
