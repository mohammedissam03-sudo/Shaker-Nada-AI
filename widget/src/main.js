import './style.css';
import { createRobot3D } from './assistant/Robot3D.js';
import './assistant/robot3d.css';
import { createChatWidget } from './assistant/ChatWidget.js';
import './assistant/chat-widget.css';
const app = document.querySelector('#app');

app.innerHTML = `
  <main class="site">
    <header class="topbar">
      <div class="brand">FIT<span>COMPANION</span></div>
      <span class="project-label">AI FITNESS ASSISTANT</span>
    </header>

    <section class="layout">
      <div class="profile-card">
        <p class="eyebrow">FITNESS PROFILE</p>
        <h1>أهلاً فيك! خلينا نتعرف عليك</h1>
        <p class="description">
          حدد الجنس وأدخل بياناتك الأساسية لنبدأ
          بتجهيز تجربتك الرياضية.
        </p>

        <h2>اختر الجنس</h2>

        <div class="gender-switch" role="group"
             aria-label="اختيار الجنس">
          <button type="button"
                  class="gender-btn active"
                  data-gender="male"
                  aria-pressed="true">
            ذكر — Shaker
          </button>

          <button type="button"
                  class="gender-btn"
                  data-gender="female"
                  aria-pressed="false">
            أنثى — Nada
          </button>
        </div>

        <form id="fitness-form">
          <label for="dob">تاريخ الميلاد</label>
          <input id="dob" name="date_of_birth"
                 type="date" required />

          <div class="field-grid">
            <div>
              <label for="height">الطول (cm)</label>
              <input id="height" name="height_cm"
                     type="number" min="80" max="250"
                     step="0.1" placeholder="175" required />
            </div>

            <div>
              <label for="weight">الوزن (kg)</label>
              <input id="weight" name="weight_kg"
                     type="number" min="20" max="350"
                     step="0.1" placeholder="75" required />
            </div>
          </div>

<div class="field-grid">

  <div>
    <label for="fitness-goal">الهدف الرياضي</label>
    <select
      id="fitness-goal"
      name="fitness_goal"
      required
    >
      <option value="">اختر هدفك</option>
      <option value="muscle_gain">بناء العضلات</option>
      <option value="fat_loss">خسارة الدهون</option>
      <option value="general_fitness">تحسين اللياقة العامة</option>
    </select>
  </div>

  <div>
    <label for="activity-level">مستوى النشاط</label>
    <select
      id="activity-level"
      name="activity_level"
      required
    >
      <option value="">اختر مستواك</option>
      <option value="beginner">مبتدئ</option>
      <option value="intermediate">متوسط</option>
      <option value="advanced">متقدم</option>
    </select>
  </div>

</div>

          <button class="save-btn" type="submit">
            متابعة
          </button>
        </form>
      </div>


<aside class="assistant-panel">
  <h2 id="assistant-name">شاكر — Shaker</h2>

  <p class="assistant-role">
    Your AI Fitness Companion
  </p>

  <div
    class="speech-bubble"
    id="assistant-message"
    role="status"
    aria-live="polite"
  >
    مرحباً! أنا شاكر، رح أساعدك في رحلتك الرياضية.
  </div>
</aside>

    </section>
        <div id="optifit-robot3d-root"></div>

  </main>
`;


const robot3dRoot = document.querySelector('#optifit-robot3d-root');

// Start with Shaker
let currentRobotGender = 'male';

let robot3DInstance = createRobot3D(
  robot3dRoot,
  currentRobotGender
);

/**
 * Listen for chatbot activity and update
 * the current 3D robot animation.
 */


window.addEventListener('assistant:chat-state', (event) => {
  const state = event.detail?.state;

  if (!['idle', 'thinking', 'happy', 'tired'].includes(state)) {
    return;
  }

  robot3DInstance.setState(state);
});



const chatWidget = createChatWidget(robot3dRoot);

// Switch between Shaker and Nada
window.addEventListener('assistant:gender-change', (event) => {
  const newGender = event.detail?.gender;

  if (
    !['male', 'female'].includes(newGender) ||
    newGender === currentRobotGender
  ) {
    return;
  }

  // Remove the previous 3D robot
  robot3DInstance.destroy();

  // Create the selected robot
  robot3DInstance = createRobot3D(
    robot3dRoot,
    newGender
  );

  currentRobotGender = newGender;
});


let selectedGender = 'male';

const assistantName = document.querySelector('#assistant-name');
const assistantMessage = document.querySelector('#assistant-message');
const genderButtons = document.querySelectorAll('.gender-btn');
const form = document.querySelector('#fitness-form');
const dobInput = document.querySelector('#dob');

const today = new Date();
const localToday = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0')
].join('-');

dobInput.max = localToday;

function setGender(gender) {
  selectedGender = gender;
  const isMale = gender === 'male';

  document.documentElement.dataset.theme =
    isMale ? 'shaker' : 'nada';

  assistantName.textContent =
    isMale ? 'شاكر — Shaker' : 'ندى — Nada';

  assistantMessage.textContent = isMale
    ? 'مرحباً! أنا شاكر، رح أساعدك في رحلتك الرياضية.'
    : 'مرحباً! أنا ندى، جاهزة أساعدك تحققي أهدافك الرياضية.';

  genderButtons.forEach(button => {
    const active = button.dataset.gender === gender;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  window.dispatchEvent(new CustomEvent(
    'assistant:gender-change',
    { detail: { gender } }
  ));
}

genderButtons.forEach(button => {
  button.addEventListener('click', () => {
    setGender(button.dataset.gender);
  });
});

function calculateAge(dateOfBirth) {
  const birth = new Date(dateOfBirth + 'T00:00:00');
  const now = new Date();

  let age = now.getFullYear() - birth.getFullYear();

  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() &&
      now.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

form.addEventListener('submit', event => {
  event.preventDefault();

  if (!form.reportValidity()) return;


const profile = {
  gender: selectedGender,
  date_of_birth: dobInput.value,
  height_cm: Number(form.height_cm.value),
  weight_kg: Number(form.weight_kg.value),
  fitness_goal: form.elements.namedItem('fitness_goal').value,
  activity_level: form.elements.namedItem('activity_level').value
};


  const age = calculateAge(profile.date_of_birth);

  if (age < 0) {
    assistantMessage.textContent =
      'تأكد من تاريخ الميلاد المدخل.';
    return;
  }

  assistantMessage.textContent =
    'ممتاز! عمرك ' + age +
    ' سنة. استلمت بياناتك التجريبية، وخلينا نكمل!';

  window.dispatchEvent(new CustomEvent(
    'assistant:profile-submitted',
    { detail: { profile } }
  ));

  console.log('Demo profile submitted:', {
    gender: profile.gender,
    has_birth_date: Boolean(profile.date_of_birth)
  });
});

setGender('male');
