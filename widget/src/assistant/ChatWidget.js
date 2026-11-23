/**
 * Shaker & Nada — floating chat controller.
 *
 * Keeps the existing CSS hooks, custom events, backend contract, robot drag
 * behavior, immersive layout, and conversation-session isolation intact.
 */
export function createChatWidget(robotRoot) {
  if (!robotRoot) {
    throw new Error('Robot container was not found');
  }

  const API_URL = '/api/chat';

  let currentGender = 'male';
  let conversationId = null;
  let currentProfile = null;
  let sending = false;
  let sessionVersion = 0;
  let robotAnimationTimer = null;

  // -------------------------------------------------------------------------
  // DOM elements
  // -------------------------------------------------------------------------
  const panel = document.createElement('section');
  panel.className = 'sn-chat-panel';
  panel.hidden = true;
  panel.dir = 'rtl';
  panel.innerHTML = `
    <header class="sn-chat-header">
      <div class="sn-chat-identity">
        <span class="sn-chat-status-dot"></span>
        <div>
          <h2 id="sn-chat-title">شاكر</h2>
          <p>مساعدك الرياضي الذكي</p>
        </div>
      </div>
      <button type="button" class="sn-chat-close" aria-label="إغلاق المحادثة">×</button>
    </header>

    <div class="sn-chat-messages" role="log" aria-live="polite"
         aria-label="رسائل المحادثة"></div>

    <form class="sn-chat-form">
      <input class="sn-chat-input" type="text"
             placeholder="اسأل عن التمارين والتغذية..."
             maxlength="2000" autocomplete="off" required />
      <button class="sn-chat-send" type="submit">إرسال</button>
    </form>
  `;
  document.body.appendChild(panel);

  const backdrop = document.createElement('div');
  backdrop.className = 'sn-chat-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(backdrop, panel);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sn-robot-trigger';
  trigger.setAttribute('aria-label', 'فتح محادثة المساعد');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.style.touchAction = 'none';
  robotRoot.appendChild(trigger);

  const closeButton = panel.querySelector('.sn-chat-close');
  const title = panel.querySelector('#sn-chat-title');
  const messages = panel.querySelector('.sn-chat-messages');
  const form = panel.querySelector('.sn-chat-form');
  const input = panel.querySelector('.sn-chat-input');
  const sendButton = panel.querySelector('.sn-chat-send');


  // Smart Popups: contextual messages outside the Gemini chat.
  const smartPopup = document.createElement('div');
  smartPopup.className = 'sn-smart-popup';
  smartPopup.hidden = true;
  smartPopup.setAttribute('role', 'status');
  smartPopup.setAttribute('aria-live', 'polite');
  document.body.appendChild(smartPopup);

  const POPUP_API_URL = '/api/smart-popup';
  let popupRequestId = 0;
  let popupAbortController = null;

  let popupTimer = null;
  let popupFrame = 0;

  function positionSmartPopup() {
    if (smartPopup.hidden) return;

    const robot = robotRoot.getBoundingClientRect();

    const width = Math.min(
      window.innerWidth <= 640 ? 360 : 480,
      window.innerWidth - 24
    );

    const desiredLeft = robot.left >= width + 24
      ? robot.left - width - 12
      : robot.right + 12;

    smartPopup.style.width = `${width}px`;
    smartPopup.style.left = `${Math.max(
      12,
      Math.min(desiredLeft, window.innerWidth - width - 12)
    )}px`;

    smartPopup.style.top = `${Math.max(
      12,
      Math.min(
        robot.top + 20,
        window.innerHeight - smartPopup.offsetHeight - 12
      )
    )}px`;
  }

  function hideSmartPopup() {
    smartPopup.hidden = true;
    clearTimeout(popupTimer);
    cancelAnimationFrame(popupFrame);
    popupFrame = 0;
  }

  function followSmartPopup() {
    if (smartPopup.hidden) return;
    positionSmartPopup();
    popupFrame = requestAnimationFrame(followSmartPopup);
  }

  function cancelPendingPopup() {
    popupRequestId++;
    popupAbortController?.abort();
    popupAbortController = null;
    hideSmartPopup();
  }


  window.addEventListener('assistant:page-change', async (event) => {
    cancelPendingPopup();

    const requestId = popupRequestId;
    const detail = event.detail ?? {};

    if (
      !panel.hidden ||
      sending ||
      typeof detail.page !== 'string' ||
      !detail.page.trim()
    ) {
      return;
    }

    const controller = new AbortController();
    popupAbortController = controller;

    try {
      const response = await fetch(POPUP_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          page: detail.page,
          event: detail.event || 'page_entered',
          gender: currentGender,
          context: detail.context ?? {}
        })
      });

      if (!response.ok) {
        throw new Error('Smart Popup HTTP ' + response.status);
      }

      const data = await response.json();

      if (
        controller.signal.aborted ||
        requestId !== popupRequestId ||
        !panel.hidden ||
        sending
      ) {
        return;
      }

      if (
        typeof data.message !== 'string' ||
        !data.message.trim()
      ) {
        throw new Error('Invalid Smart Popup response');
      }

      smartPopup.textContent = data.message;

      smartPopup.style.setProperty(
        '--smart-popup-accent',
        currentGender === 'female'
          ? '255, 121, 189'
          : '97, 169, 255'
      );

      smartPopup.hidden = false;
      followSmartPopup();

      if (
        ['idle', 'happy', 'thinking'].includes(data.robot_state)
      ) {
        setRobotState(data.robot_state);
      }

      const seconds = Math.max(
        3,
        Math.min(9, Number(data.display_seconds) || 5)
      );

      popupTimer = setTimeout(() => {
        hideSmartPopup();

        if (!sending && panel.hidden) {
          setRobotState('idle');
        }
      }, seconds * 1000);

    } catch (error) {
      if (!controller.signal.aborted) {
        console.warn('AI Smart Popup failed:', error);
      }
    } finally {
      if (popupAbortController === controller) {
        popupAbortController = null;
      }
    }
  });


  // -------------------------------------------------------------------------
  // Robot feedback and conversation state
  // -------------------------------------------------------------------------
  function setRobotState(state) {
    clearTimeout(robotAnimationTimer);

    window.dispatchEvent(new CustomEvent('assistant:chat-state', {
      detail: { state }
    }));

    if (state === 'happy') {
      robotAnimationTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('assistant:chat-state', {
          detail: { state: 'idle' }
        }));
        robotAnimationTimer = null;
      }, 1600);
    }
  }

  function setSendingState(isSending) {
    sending = isSending;
    input.disabled = isSending;
    sendButton.disabled = isSending;
    sendButton.textContent = isSending ? 'جاري...' : 'إرسال';
  }

  function resetConversation() {
    conversationId = null;
    sessionVersion++;
    setRobotState('idle');
    setSendingState(false);
    messages.replaceChildren();
  }

  function addMessage(sender, content) {
    const element = document.createElement('div');
    element.className = `sn-chat-message sn-chat-message-${sender}`;
    // Text is never inserted as HTML (only the trusted typing indicator is).
    element.textContent = content;
    messages.appendChild(element);
    messages.scrollTop = messages.scrollHeight;
    return element;
  }

  // Run after the browser has laid out a newly populated message bubble.
  function scrollToLatestMessage() {
    requestAnimationFrame(() => {
      messages.scrollTo({
        top: messages.scrollHeight,
        behavior: 'smooth'
      });
    });
  }

  window.addEventListener('assistant:profile-submitted', (event) => {
    const profile = event.detail?.profile;
    if (!profile) return;

    const birthDate = new Date(`${profile.date_of_birth}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (!Number.isFinite(age) || age < 13 || age > 120) {
      addMessage('assistant', 'يرجى إدخال تاريخ ميلاد صحيح لعمر بين 13 و120 سنة.');
      return;
    }

    currentProfile = {
      age,
      height_cm: Number(profile.height_cm),
      weight_kg: Number(profile.weight_kg),
      fitness_goal: profile.fitness_goal,
      activity_level: profile.activity_level
    };

    resetConversation();
    addMessage(
      'assistant',
      `تم استلام بياناتك! عمرك ${age} سنة، ` +
      `طولك ${currentProfile.height_cm} سم، ` +
      `ووزنك ${currentProfile.weight_kg} كغ. ` +
      'كيف بقدر أساعدك؟'
    );
  });

  window.addEventListener('assistant:gender-change', (event) => {
    const gender = event.detail?.gender;
    if (!['male', 'female'].includes(gender) || gender === currentGender) {
      return;
    }

    cancelPendingPopup();
    currentGender = gender;
    currentProfile = null;
    title.textContent = gender === 'male' ? 'شاكر' : 'ندى';
    resetConversation();
    addMessage(
      'assistant',
      gender === 'male'
        ? 'أهلاً! أنا شاكر. كيف بقدر أساعدك؟'
        : 'أهلاً! أنا ندى. كيف بقدر أساعدك؟'
    );
  });

  // -------------------------------------------------------------------------
  // Floating message positioning (CSS custom properties are retained)
  // -------------------------------------------------------------------------
  function updateFloatingMessagesPosition() {
    if (panel.hidden || !panel.classList.contains('sn-chat-panel--immersive')) {
      return;
    }

    const robotRect = robotRoot.getBoundingClientRect();
    const composerRect = form.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const margin = 12;
    const gap = 18;

    let left;
    let top;
    let width;

    if (screenWidth <= 640) {
      // Mobile: messages below the robot and above the bottom composer.
      width = screenWidth - 24;
      left = 12;
      top = Math.max(
        margin,
        Math.min(robotRect.bottom + 12, composerRect.top - 150)
      );
    } else {
      const leftSpace = Math.max(0, robotRect.left - gap - margin);
      const rightSpace = Math.max(0, screenWidth - robotRect.right - gap - margin);
      const placeOnLeft = leftSpace >= 260 || leftSpace >= rightSpace;
      const availableSpace = placeOnLeft ? leftSpace : rightSpace;

      width = Math.min(520, Math.max(180, availableSpace));
      width = Math.min(width, screenWidth - margin * 2);
      left = placeOnLeft
        ? robotRect.left - gap - width
        : robotRect.right + gap;
      left = Math.max(margin, Math.min(left, screenWidth - width - margin));
      top = Math.max(
        margin,
        Math.min(robotRect.top + 20, composerRect.top - 170)
      );
    }

    const maxHeight = Math.max(
      100,
      Math.min(500, composerRect.top - top - 12)
    );

    messages.style.setProperty('--sn-floating-left', `${Math.round(left)}px`);
    messages.style.setProperty('--sn-floating-top', `${Math.round(top)}px`);
    messages.style.setProperty('--sn-floating-width', `${Math.round(width)}px`);
    messages.style.setProperty('--sn-floating-height', `${Math.round(maxHeight)}px`);
  }

  function updateChatPosition() {
    if (panel.classList.contains('sn-chat-panel--immersive')) {
      for (const property of ['left', 'right', 'top', 'bottom', 'width']) {
        panel.style.removeProperty(property);
      }

      const viewportWidth = window.innerWidth;
      if (viewportWidth > 640) {
        const isTablet = viewportWidth <= 900;
        panel.style.setProperty('left', 'auto', 'important');
        panel.style.setProperty('top', 'auto', 'important');
        panel.style.setProperty(
          'right',
          isTablet ? 'calc(34vw + 68px)' : 'clamp(390px, 28vw, 470px)',
          'important'
        );
        panel.style.setProperty(
          'bottom',
          isTablet ? '20px' : 'clamp(16px, 4vh, 50px)',
          'important'
        );
        panel.style.setProperty(
          'width',
          isTablet
            ? 'calc(66vw - 84px)'
            : 'min(400px, calc(100vw - clamp(390px, 28vw, 470px) - 20px))',
          'important'
        );
      }

      updateFloatingMessagesPosition();
      return;
    }

    if (window.innerWidth <= 640) {
      for (const property of ['left', 'right', 'top', 'bottom']) {
        panel.style.removeProperty(property);
      }
      return;
    }

    const robotRect = robotRoot.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const gap = 12;

    let left = robotRect.left - panelWidth - gap;
    if (left < gap) {
      left = robotRect.right + gap;
    }
    left = Math.max(gap, Math.min(left, window.innerWidth - panelWidth - gap));

    let top = robotRect.bottom - panelHeight;
    top = Math.max(gap, Math.min(top, window.innerHeight - panelHeight - gap));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  // -------------------------------------------------------------------------
  // Immersive mode (blur backdrop, robot zoom, and follow animations)
  // -------------------------------------------------------------------------
  function openChat() {
    cancelPendingPopup();
    panel.hidden = false;
    panel.classList.add('sn-chat-panel--immersive');
    robotRoot.classList.add('sn-robot--immersive');
    updateChatPosition();

    const zoomStartedAt = performance.now();
    function followRobotDuringZoom() {
      if (panel.hidden) return;
      updateFloatingMessagesPosition();
      if (performance.now() - zoomStartedAt < 500) {
        requestAnimationFrame(followRobotDuringZoom);
      }
    }
    requestAnimationFrame(followRobotDuringZoom);

    document.documentElement.classList.add('sn-immersive-open');
    trigger.setAttribute('aria-expanded', 'true');
    if (!sending) setRobotState('happy');
    input.focus();
  }

  function closeChat() {
    panel.hidden = true;
    panel.classList.remove('sn-chat-panel--immersive');
    robotRoot.classList.remove('sn-robot--immersive');
    document.documentElement.classList.remove('sn-immersive-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (!sending) setRobotState('idle');
    trigger.focus();
  }

  backdrop.addEventListener('click', () => {
    if (!panel.hidden) closeChat();
  });
  closeButton.addEventListener('click', closeChat);

  // -------------------------------------------------------------------------
  // Drag and fatigue gestures
  // -------------------------------------------------------------------------
  let isDragging = false;
  let hasMoved = false;
  let activeDragMs = 0;
  let lastActiveMoveTime = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let tiredDuringDrag = false;
  let tiredResetTimer = null;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  trigger.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const rect = robotRoot.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;
    isDragging = true;
    hasMoved = false;
    activeDragMs = 0;
    lastActiveMoveTime = null;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    tiredDuringDrag = false;

    if (tiredResetTimer !== null) {
      clearTimeout(tiredResetTimer);
      tiredResetTimer = null;
      if (!sending) setRobotState('idle');
    }

    trigger.setPointerCapture(event.pointerId);
  });

  trigger.addEventListener('pointermove', (event) => {
    if (!isDragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!hasMoved && Math.hypot(dx, dy) < 6) return;
    hasMoved = true;

    const stepDistance = Math.hypot(
      event.clientX - lastPointerX,
      event.clientY - lastPointerY
    );
    const now = performance.now();

    if (stepDistance >= 2) {
      if (lastActiveMoveTime !== null) {
        const gap = now - lastActiveMoveTime;
        if (gap > 0 && gap <= 250) activeDragMs += gap;
      }
      lastActiveMoveTime = now;
    }

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    if (activeDragMs >= 1000 && !tiredDuringDrag && !sending) {
      tiredDuringDrag = true;
      setRobotState('tired');
    }

    const rect = robotRoot.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - rect.width);
    const maxTop = Math.max(0, window.innerHeight - rect.height);
    const newLeft = Math.min(maxLeft, Math.max(0, initialLeft + dx));
    const newTop = Math.min(maxTop, Math.max(0, initialTop + dy));
    const transformOffsetX = rect.left - robotRoot.offsetLeft;
    const transformOffsetY = rect.top - robotRoot.offsetTop;

    robotRoot.style.left = `${newLeft - transformOffsetX}px`;
    robotRoot.style.top = `${newTop - transformOffsetY}px`;
    robotRoot.style.right = 'auto';
    robotRoot.style.bottom = 'auto';

    if (!panel.hidden) updateChatPosition();
  });

  function finishDragging() {
    isDragging = false;
    if (tiredDuringDrag) {
      clearTimeout(tiredResetTimer);
      tiredResetTimer = setTimeout(() => {
        if (!sending) setRobotState('idle');
        tiredResetTimer = null;
      }, 3000);
    }
  }

  trigger.addEventListener('pointerup', finishDragging);
  trigger.addEventListener('pointercancel', finishDragging);
  trigger.addEventListener('click', () => {
    if (hasMoved) {
      hasMoved = false;
      return;
    }
    panel.hidden ? openChat() : closeChat();
  });

  window.addEventListener('resize', () => {
    if (!panel.hidden) updateChatPosition();
  });

  // -------------------------------------------------------------------------
  // FastAPI / Gemini request; preserve request-version and conversation memory
  // -------------------------------------------------------------------------
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || sending) return;

    const requestVersion = sessionVersion;
    setSendingState(true);
    input.value = '';
    setRobotState('thinking');
    addMessage('user', message);

    const responseBubble = addMessage('assistant', '');
    responseBubble.innerHTML = `
      <span class="sn-typing-dots" role="status" aria-label="جارٍ إعداد الإجابة">
        <span></span><span></span><span></span>
      </span>
    `;
    scrollToLatestMessage();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          gender: currentGender,
          conversation_id: conversationId,
          profile: currentProfile
        })
      });
      const data = await response.json();

      // Replies from a previous gender/profile session must be ignored.
      if (requestVersion !== sessionVersion) return;

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('وصلنا لحد طلبات Gemini. جرّب لاحقاً.');
        }
        if (response.status === 503) {
          throw new Error('خدمة Gemini غير متاحة مؤقتاً.');
        }
        throw new Error(`فشل الطلب. رمز الخطأ: ${response.status}`);
      }
      if (!data.reply || !data.conversation_id) {
        throw new Error('استجابة غير مكتملة من السيرفر.');
      }

      conversationId = data.conversation_id;
      responseBubble.textContent = data.reply;
      scrollToLatestMessage();
      setRobotState('happy');
    } catch (error) {
      if (requestVersion !== sessionVersion) return;
      console.error('Chat request failed:', error);
      setRobotState('idle');
      responseBubble.textContent =
        `تعذّر إرسال الرسالة: ${error.message}`;
      scrollToLatestMessage();
    } finally {
      if (requestVersion === sessionVersion) {
        setSendingState(false);
        input.focus();
      }
    }
  });

  addMessage(
    'assistant',
    'أهلاً! أنا شاكر، مساعدك الرياضي الذكي. كيف بقدر أساعدك؟'
  );

  return { panel, addMessage, openChat, closeChat };
}
