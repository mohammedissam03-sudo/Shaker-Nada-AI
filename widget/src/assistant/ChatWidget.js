
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

      <button
        type="button"
        class="sn-chat-close"
        aria-label="إغلاق المحادثة"
      >×</button>
    </header>

    <div
      class="sn-chat-messages"
      role="log"
      aria-live="polite"
      aria-label="رسائل المحادثة"
    ></div>

    <form class="sn-chat-form">
      <input
        class="sn-chat-input"
        type="text"
        placeholder="اسأل عن التمارين والتغذية..."
        maxlength="2000"
        autocomplete="off"
        required
      />

      <button class="sn-chat-send" type="submit">
        إرسال
      </button>
    </form>
  `;

  document.body.appendChild(panel);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sn-robot-trigger';
  trigger.setAttribute(
    'aria-label',
    'فتح محادثة المساعد'
  );
  trigger.setAttribute('aria-expanded', 'false');

  robotRoot.appendChild(trigger);

  const closeButton = panel.querySelector('.sn-chat-close');
  const title = panel.querySelector('#sn-chat-title');
  const messages = panel.querySelector('.sn-chat-messages');
  const form = panel.querySelector('.sn-chat-form');
  const input = panel.querySelector('.sn-chat-input');
  const sendButton = panel.querySelector('.sn-chat-send');

let robotAnimationTimer = null;

function setRobotState(state) {
  clearTimeout(robotAnimationTimer);

  window.dispatchEvent(
    new CustomEvent('assistant:chat-state', {
      detail: { state }
    })
  );

  if (state === 'happy') {
    robotAnimationTimer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('assistant:chat-state', {
          detail: { state: 'idle' }
        })
      );
      robotAnimationTimer = null;
    }, 1600);
  }
}

  function addMessage(sender, content) {
    const element = document.createElement('div');

    element.className =
      `sn-chat-message sn-chat-message-${sender}`;

    // Use textContent to prevent HTML injection.
    element.textContent = content;

    messages.appendChild(element);
    messages.scrollTop = messages.scrollHeight;

    return element;
  }

// Receive the user's fitness profile from the website.
window.addEventListener('assistant:profile-submitted', (event) => {
  const profile = event.detail?.profile;

  if (!profile) return;

  const birthDate = new Date(
    profile.date_of_birth + 'T00:00:00'
  );

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  if (
    today.getMonth() < birthDate.getMonth() ||
    (
      today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate()
    )
  ) {
    age--;
  }

  if (!Number.isFinite(age) || age < 13 || age > 120) {
    addMessage(
      'assistant',
      'يرجى إدخال تاريخ ميلاد صحيح لعمر بين 13 و120 سنة.'
    );
    return;
  }


currentProfile = {
  age,
  height_cm: Number(profile.height_cm),
  weight_kg: Number(profile.weight_kg),
  fitness_goal: profile.fitness_goal,
  activity_level: profile.activity_level
};


  // Start a fresh conversation with the updated profile.
  conversationId = null;
  sessionVersion++;
  setRobotState('idle');
  sending = false;

  input.disabled = false;
  sendButton.disabled = false;
  sendButton.textContent = 'إرسال';

  messages.replaceChildren();

  addMessage(
    'assistant',
    `تم استلام بياناتك! عمرك ${age} سنة، ` +
    `طولك ${currentProfile.height_cm} سم، ` +
    `ووزنك ${currentProfile.weight_kg} كغ. ` +
    'كيف بقدر أساعدك؟'
  );
});

function updateChatPosition() {
  // On mobile, keep the chat in its responsive position.
  if (window.innerWidth <= 640) {
    panel.style.removeProperty('left');
    panel.style.removeProperty('right');
    panel.style.removeProperty('top');
    panel.style.removeProperty('bottom');
    return;
  }

  const robotRect = robotRoot.getBoundingClientRect();
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const gap = 12;

  // Prefer displaying the chat to the left of the robot.
  let left = robotRect.left - panelWidth - gap;

  // Otherwise, display it to the right.
  if (left < gap) {
    left = robotRect.right + gap;
  }

  // Keep the chat inside the screen.
  left = Math.max(
    gap,
    Math.min(left, window.innerWidth - panelWidth - gap)
  );

  let top = robotRect.bottom - panelHeight;

  top = Math.max(
    gap,
    Math.min(top, window.innerHeight - panelHeight - gap)
  );

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
}


function openChat() {
  panel.hidden = false;
  updateChatPosition();
  trigger.setAttribute('aria-expanded', 'true');
  input.focus();
}


  function closeChat() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }


  // Drag & Drop for the 3D robot
  let isDragging = false;
  let hasMoved = false;

let dragDistance = 0;

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

  trigger.style.touchAction = 'none';

  trigger.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const rect = robotRoot.getBoundingClientRect();

    startX = event.clientX;
    startY = event.clientY;

    initialLeft = rect.left;
    initialTop = rect.top;


isDragging = true;
hasMoved = false;

// Reset movement tracking for this drag
dragDistance = 0;

activeDragMs = 0;
lastActiveMoveTime = null;

lastPointerX = event.clientX;
lastPointerY = event.clientY;
tiredDuringDrag = false;

// Cancel an unfinished fatigue animation
if (tiredResetTimer !== null) {
  clearTimeout(tiredResetTimer);
  tiredResetTimer = null;

  if (!sending) {
    setRobotState('idle');
  }
}


    trigger.setPointerCapture(event.pointerId);
  });

  trigger.addEventListener('pointermove', (event) => {
    if (!isDragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!hasMoved && Math.hypot(dx, dy) < 6) {
      return;
    }

    hasMoved = true;

// Measure total pointer movement
const stepDistance = Math.hypot(
  event.clientX - lastPointerX,
  event.clientY - lastPointerY
);

dragDistance += stepDistance;

// Count active movement time, excluding long pauses.
const now = performance.now();

if (stepDistance >= 2) {
  if (lastActiveMoveTime !== null) {
    const gap = now - lastActiveMoveTime;

    if (gap > 0 && gap <= 250) {
      activeDragMs += gap;
    }
  }

  lastActiveMoveTime = now;
}

lastPointerX = event.clientX;
lastPointerY = event.clientY;

// Trigger fatigue after substantial movement
if (
  activeDragMs >= 1000 &&
  !tiredDuringDrag &&
  !sending
) {
  tiredDuringDrag = true;
  setRobotState('tired');
}

    const maxLeft = Math.max(
      0,
      window.innerWidth - robotRoot.offsetWidth
    );

    const maxTop = Math.max(
      0,
      window.innerHeight - robotRoot.offsetHeight
    );

    const newLeft = Math.min(
      maxLeft,
      Math.max(0, initialLeft + dx)
    );

    const newTop = Math.min(
      maxTop,
      Math.max(0, initialTop + dy)
    );

    robotRoot.style.left = `${newLeft}px`;
    robotRoot.style.top = `${newTop}px`;

    robotRoot.style.right = 'auto';
    robotRoot.style.bottom = 'auto';


    robotRoot.style.right = 'auto';
    robotRoot.style.bottom = 'auto';

    // Update chat position while dragging
    if (!panel.hidden) {
      updateChatPosition();
    }
  });

  // Register the resize listener only once
  window.addEventListener('resize', () => {
    if (!panel.hidden) {
      updateChatPosition();
    }
  });



function finishDragging() {
  isDragging = false;

  if (tiredDuringDrag) {
    clearTimeout(tiredResetTimer);

    tiredResetTimer = setTimeout(() => {
      // Do not interrupt an active AI response
      if (!sending) {
        setRobotState('idle');
      }

      tiredResetTimer = null;
    }, 3000);
  }
}

trigger.addEventListener('pointerup', finishDragging);
trigger.addEventListener('pointercancel', finishDragging);


  // A click opens the chat; dragging does not.
  trigger.addEventListener('click', () => {
    if (hasMoved) {
      hasMoved = false;
      return;
    }

    panel.hidden ? openChat() : closeChat();
  });


  closeButton.addEventListener('click', closeChat);

  // Reset the conversation when the persona changes.
  window.addEventListener(
    'assistant:gender-change',
    (event) => {
      const gender = event.detail?.gender;

      if (!['male', 'female'].includes(gender)) return;
      if (gender === currentGender) return;

      currentGender = gender;
      conversationId = null;
      currentProfile = null;
      sessionVersion++;
      setRobotState('idle');
      sending = false;

      title.textContent =
        gender === 'male' ? 'شاكر' : 'ندى';

      input.disabled = false;
      sendButton.disabled = false;
      sendButton.textContent = 'إرسال';

      messages.replaceChildren();

      addMessage(
        'assistant',
        gender === 'male'
          ? 'أهلاً! أنا شاكر. كيف بقدر أساعدك؟'
          : 'أهلاً! أنا ندى. كيف بقدر أساعدك؟'
      );
    }
  );

  // Send messages to FastAPI.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = input.value.trim();

    if (!message || sending) return;

    const requestVersion = sessionVersion;

    sending = true;
    input.value = '';
    input.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'جاري...';

setRobotState('thinking');

    addMessage('user', message);

    const responseBubble = addMessage(
      'assistant',
      'لحظة، عم بفكّر بإجابتك...'
    );

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },

body: JSON.stringify({
  message,
  gender: currentGender,
  conversation_id: conversationId,
  profile: currentProfile
})

      });

      const data = await response.json();

      // Ignore a response from an old persona session.
      if (requestVersion !== sessionVersion) return;

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            'وصلنا لحد طلبات Gemini. جرّب لاحقاً.'
          );
        }

        if (response.status === 503) {
          throw new Error(
            'خدمة Gemini غير متاحة مؤقتاً.'
          );
        }

        throw new Error(
          `فشل الطلب. رمز الخطأ: ${response.status}`
        );
      }

      if (!data.reply || !data.conversation_id) {
        throw new Error('استجابة غير مكتملة من السيرفر.');
      }

      conversationId = data.conversation_id;
      responseBubble.textContent = data.reply;

setRobotState('happy');

    } catch (error) {
      if (requestVersion !== sessionVersion) return;

      console.error('Chat request failed:', error);

setRobotState('idle');

      responseBubble.textContent =
        `تعذّر إرسال الرسالة: ${error.message}`;

    } finally {
      if (requestVersion === sessionVersion) {
        sending = false;
        input.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'إرسال';
        input.focus();
      }
    }
  });

  addMessage(
    'assistant',
    'أهلاً! أنا شاكر، مساعدك الرياضي الذكي. كيف بقدر أساعدك؟'
  );

  return {
    panel,
    addMessage,
    openChat,
    closeChat
  };
}
