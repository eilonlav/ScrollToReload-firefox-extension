// Check if the page has scrollability - if not it won't implement ScrollToReload
function isDocumentScrollable() {
  return document.documentElement.scrollHeight > document.documentElement.clientHeight;
}

function reloadOnScroll() {
  // Few parameters - shadowscrolling is the amount that would have been scrolled if the page had any more to go through
  // The threshold determines home much scrolling is needed to fully trigger the reload
  // Pull distance is how much the small animation goes into the screen
  // Scrolling from the middle prevents a hasty scroll from the middle of the screen to trigger the reload (presumeably unintentionally)
  // Timer is responsible for reseting the progress of initiating a reload if it had been abandoned for the duration set
  let shadowScrollDistance = 0; 
  const SHADOW_SCROLL_THRESHOLD = 1900;
  const PULL_DISTANCE = 100;
  let scrollingFromMiddle = false;
  let timer

  // Creating a transparent container in which the small refresh animation resides
  // The graphic starts as a still image and only switchs to the gif once the reload is triggered 
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-60px';
  container.style.left = '50%';
  container.style.width = '60px';
  container.style.height = '60px';
  container.style.opacity = '0.2';
  container.style.zIndex = '1000';

  const pullToRefreshElement = document.createElement('img');
  pullToRefreshElement.src = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemE0MDlldnA2Nm9rY3B5OXd6MW56bDdnbHpqaHJ1MmZoaXU1cmtweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/0n42zDYBfPGOGSr8fk/giphy.gif';
  pullToRefreshElement.style.rotate = '-180deg';
  pullToRefreshElement.style.width = '100%';
  pullToRefreshElement.style.height = '100%';

  container.appendChild(pullToRefreshElement);
  document.body.appendChild(container);

  // Activation cooldown prevents consecutive reloads on a continuous up-scroll
  // It uses session storage to remember the state set before a reload
  // It checks if theres already a previous value in storage and if not - defaults to false - meaning theres no cooldown currently
  let activationCooldown = sessionStorage.getItem('activationCooldown') === 'true';
  if (sessionStorage.getItem('activationCooldown') === null) {
    sessionStorage.setItem('activationCooldown', 'false');
    activationCooldown = false;
  } else {
    activationCooldown = sessionStorage.getItem('activationCooldown') === 'true';
  }

  // The range of motion while the reload is almost triggered
  // The graphic emerges down from above the visible screen while doing a half rotation
  function animateReload() {
    container.style.transform = `translateY(${Math.floor((1 - Math.exp((-0.0015) * shadowScrollDistance)) * PULL_DISTANCE)}px)`;
    pullToRefreshElement.style.transform = `rotate(${Math.floor((1 - Math.exp((-0.0015) * shadowScrollDistance)) * 180)}deg)`;
    container.style.opacity = Math.max((shadowScrollDistance / 8) / (PULL_DISTANCE * 1.25), 0.2);
    resetTimer();
    //document.body.style.transform = `translateY(${Math.floor((1 - Math.exp((-0.0015) * shadowScrollDistance)) * PULL_DISTANCE)}px)`;
  }

  // Resets the animation back to initial state
  function abortAnimation() {
    container.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out'; // Change to ease-out
    container.style.transform = 'translateY(0)';
    container.style.opacity = 0.2
    pullToRefreshElement.style.transition = 'transform 0.5s ease-out';
    pullToRefreshElement.style.transform = `rotate(0deg)`;
    shadowScrollDistance = 0;
    //document.body.style.transition = 'transform 0.5s ease-out'; // Change to ease-out
    //document.body.style.transform = 'translateY(0)';
    
  }

  // After triggering the reload by exhausting the threshold - the image changes to gif, jumps up a little and after a delay - a page reload happens
  function executeReload() {
    activationCooldown = true;
    clearTimeout(timer);
    sessionStorage.setItem('activationCooldown', 'true');
    shadowScrollDistance = 0;
    container.style.transition = 'transform 0.6s cubic-bezier(.52,-0.76,.06,1.58)'; // Change to ease-out
    container.style.transform = `translateY(${0.7 * PULL_DISTANCE}px)`;
    //document.body.style.transition = 'transform 0.8s cubic-bezier(.52,-0.76,0,1.38)'; // Change to ease-out
    //document.body.style.transform = `translateY(${0.3 * PULL_DISTANCE}px)`;
    pullToRefreshElement.src = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXkxbThyNmhwdG9yaW51bm5oZjZqdWZvNmJtNnpwcG51ZXY3dWtyZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/qezYDvT4vkcrbFjUqo/giphy.gif';
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
  
  // The timer that make sure the action of triggering the reload is continuous and not abandoned - if it is - it calls abortAnimation
  function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      abortAnimation();
    }, 300);
  }
  
  //checking any scrollwheel action
  window.addEventListener('wheel', function(event) {
    // Only goes through if not on Activationcooldown
    if (!activationCooldown) {
      // This two checks flag scrolls that began when the page was not at its top to prevent them from triggering the reload
      if (event.deltaY < -20 && !scrollingFromMiddle && window.scrollY > 300) {
        scrollingFromMiddle = true
      }
      else {
        if (event.deltaY > -0.5 && scrollingFromMiddle === true) {
          scrollingFromMiddle = false
        }
      }
      
      // Collect all the up-scrolls that happen when the page is at thee top, while not on a scrollfrom middle, and above a certain sensitivity threshold
      if (event.deltaY < -0.7 && window.scrollY === 0 && !scrollingFromMiddle) {
        shadowScrollDistance -= Math.floor(event.deltaY);
        // This is for anything that progresses the reload but not triggering it yet
        if (shadowScrollDistance <= SHADOW_SCROLL_THRESHOLD) {
          animateReload();
        }
        // This is when the reload triggers
        if (shadowScrollDistance >= SHADOW_SCROLL_THRESHOLD) {
          executeReload();
        }
      }
      // down-scrolls abort the reload regardless of the timer
      else {
        if (event.deltaY > 0 && window.scrollY === 0) {
          abortAnimation();
          clearTimeout(timer);
        }
      }
    }
    // This part determines when its the end of a long up-scroll that managed to trigger a reload and flagged the cooldown - so it here it resets the flag back
    else {
      if (event.deltaY > -0.4 && activationCooldown) {
        activationCooldown = false;
        sessionStorage.setItem('activationCooldown', 'false');
      }
    }
  });
}

// Only executing the behaviour on pages with scrollability
if (isDocumentScrollable()) {
  reloadOnScroll();
}
