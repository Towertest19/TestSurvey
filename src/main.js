import { computed, createApp, reactive, ref } from 'https://unpkg.com/vue@3.4.38/dist/vue.esm-browser.prod.js';

const DEFAULT_SURVEY_SOURCE = 'data/default-surveys.json';
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const fallbackSurveyCatalog = Object.freeze({
  surveys: Object.freeze([
    Object.freeze({
      id: 'javascript-basics-10',
      title: 'JavaScript basics questionnaire',
      description: 'A 10-question sample test covering JavaScript syntax, data handling, and browser fundamentals.',
      questions: Object.freeze([
        Object.freeze({
          prompt: 'Which keyword declares a block-scoped variable that can be reassigned?',
          explanation: 'let creates a block-scoped binding and allows reassignment. const is block-scoped but cannot be reassigned.',
          options: Object.freeze(['var', 'let', 'const', 'static']),
          correctIndex: 1,
        }),
        Object.freeze({
          prompt: 'What does JSON.parse do with valid JSON text?',
          explanation: 'JSON.parse converts valid JSON text into the equivalent JavaScript value, such as an object or array.',
          options: Object.freeze(['Converts it to a JavaScript value', 'Converts it to CSS', 'Always returns a string', 'Uploads it to a server']),
          correctIndex: 0,
        }),
        Object.freeze({
          prompt: 'Which array method creates a new array by transforming each item?',
          explanation: 'Array.prototype.map returns a new array containing the return value from each callback call.',
          options: Object.freeze(['push', 'map', 'forEach', 'includes']),
          correctIndex: 1,
        }),
        Object.freeze({
          prompt: 'What is the result of typeof null in JavaScript?',
          explanation: "typeof null returns 'object', which is a long-standing JavaScript behavior to remember for tests.",
          options: Object.freeze(['null', 'undefined', 'object', 'boolean']),
          correctIndex: 2,
        }),
        Object.freeze({
          prompt: 'Which operator checks both value and type equality?',
          explanation: 'The strict equality operator === compares values without type coercion.',
          options: Object.freeze(['=', '==', '===', '!=']),
          correctIndex: 2,
        }),
        Object.freeze({
          prompt: 'What does an async function return?',
          explanation: 'Calling an async function always returns a Promise, even when the function returns a plain value.',
          options: Object.freeze(['A Promise', 'A DOM node', 'A CSS selector', 'Only undefined']),
          correctIndex: 0,
        }),
        Object.freeze({
          prompt: 'Which method adds an item to the end of an array?',
          explanation: 'push appends one or more items to the end of an array and returns the new length.',
          options: Object.freeze(['shift', 'unshift', 'pop', 'push']),
          correctIndex: 3,
        }),
        Object.freeze({
          prompt: 'Which browser API selects the first matching element for a CSS selector?',
          explanation: 'document.querySelector returns the first Element that matches the provided CSS selector.',
          options: Object.freeze(['document.querySelector', 'document.createElement', 'window.setTimeout', 'JSON.stringify']),
          correctIndex: 0,
        }),
        Object.freeze({
          prompt: 'What does event.preventDefault usually do?',
          explanation: "preventDefault asks the browser not to run the event's default action, such as submitting a form normally.",
          options: Object.freeze(['Stops JavaScript from loading', 'Cancels the default browser action', 'Deletes the event target', 'Refreshes the page']),
          correctIndex: 1,
        }),
        Object.freeze({
          prompt: 'Which syntax creates an object literal?',
          explanation: "Curly braces with key-value pairs create an object literal, such as { name: 'Ada' }.",
          options: Object.freeze(["['name', 'Ada']", "{ name: 'Ada' }", 'function name() {}', '<name>Ada</name>']),
          correctIndex: 1,
        }),
      ]),
    }),
  ]),
});

let nextId = 1;

function newId(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function createOption(label = '') {
  return { id: newId('option'), label: String(label || '') };
}

function createQuestion(source = {}) {
  const sourceOptions = Array.isArray(source.options) ? source.options : [];
  const labels = sourceOptions.length >= MIN_OPTIONS ? sourceOptions : ['Yes', 'No'];
  const options = labels.slice(0, MAX_OPTIONS).map(createOption);
  const safeCorrectIndex = Math.min(Math.max(Number(source.correctIndex) || 0, 0), options.length - 1);

  return {
    id: newId('question'),
    prompt: String(source.prompt || 'New question'),
    explanation: String(source.explanation || 'Add a short explanation for learners.'),
    options,
    correctOptionId: options[safeCorrectIndex].id,
  };
}

function normalizeSurvey(rawSurvey = {}, fallbackId = 'default-survey') {
  const questions = Array.isArray(rawSurvey.questions) ? rawSurvey.questions : [];
  const normalizedQuestions = questions.length ? questions.map(createQuestion) : [createQuestion({ prompt: 'New question', options: ['Option A', 'Option B'] })];

  return {
    id: String(rawSurvey.id || fallbackId),
    title: String(rawSurvey.title || 'Untitled survey'),
    description: String(rawSurvey.description || 'Add a short description for this survey.'),
    questions: normalizedQuestions,
  };
}

function normalizeCatalog(rawCatalog = fallbackSurveyCatalog) {
  const rawSurveys = Array.isArray(rawCatalog.surveys) ? rawCatalog.surveys : fallbackSurveyCatalog.surveys;
  return rawSurveys.map((rawSurvey, index) => normalizeSurvey(rawSurvey, `default-survey-${index + 1}`));
}

function cloneSurveyTemplate(template) {
  return normalizeSurvey(
    {
      id: template.id,
      title: template.title,
      description: template.description,
      questions: template.questions.map((question) => ({
        prompt: question.prompt,
        explanation: question.explanation,
        options: question.options.map((option) => option.label),
        correctIndex: Math.max(
          question.options.findIndex((option) => option.id === question.correctOptionId),
          0,
        ),
      })),
    },
    template.id,
  );
}

async function loadSurveyCatalog() {
  try {
    const response = await fetch(DEFAULT_SURVEY_SOURCE, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load defaults: ${response.status}`);
    }
    return { source: 'local-json', surveys: normalizeCatalog(await response.json()) };
  } catch (error) {
    return { source: 'fallback', surveys: normalizeCatalog(fallbackSurveyCatalog), error };
  }
}

function validateSurvey(questions) {
  if (!questions.length) {
    return 'Add at least one question before taking the survey.';
  }

  for (const [index, question] of questions.entries()) {
    if (!question.prompt.trim()) {
      return `Question ${index + 1} needs a prompt.`;
    }

    if (question.options.length < MIN_OPTIONS) {
      return `Question ${index + 1} needs at least ${MIN_OPTIONS} options.`;
    }

    const optionLabels = new Set();
    for (const option of question.options) {
      if (!option.label.trim()) {
        return `Question ${index + 1} has an empty option.`;
      }
      optionLabels.add(option.label.trim().toLocaleLowerCase());
    }

    if (optionLabels.size !== question.options.length) {
      return `Question ${index + 1} has duplicate option labels.`;
    }

    if (!question.options.some((option) => option.id === question.correctOptionId)) {
      return `Question ${index + 1} is missing a correct answer.`;
    }
  }

  return '';
}

function checksumSurvey(questions) {
  return questions
    .map((question) => [question.prompt, question.correctOptionId, question.options.map((option) => option.label).join('|')].join('::'))
    .join('##');
}

createApp({
  setup() {
    const initialCatalog = normalizeCatalog(fallbackSurveyCatalog);
    const seed = cloneSurveyTemplate(initialCatalog[0]);
    const survey = reactive({ title: seed.title, description: seed.description });
    const questions = reactive(seed.questions);
    const surveyCatalog = reactive(initialCatalog);
    const selectedSurveyId = ref(seed.id);
    const catalogStatus = ref('Using bundled fallback until local defaults load.');
    const answers = reactive({});
    const mode = ref('build');
    const submission = ref(null);
    const validationMessage = ref('');

    const answerableQuestionCount = computed(() => questions.filter((question) => question.correctOptionId).length);
    const completedCount = computed(() => questions.filter((question) => answers[question.id]).length);

    function clearAttemptState() {
      Object.keys(answers).forEach((key) => delete answers[key]);
      submission.value = null;
      validationMessage.value = '';
    }

    function applySurveyTemplate(template) {
      const restored = cloneSurveyTemplate(template);
      survey.title = restored.title;
      survey.description = restored.description;
      questions.splice(0, questions.length, ...restored.questions);
      selectedSurveyId.value = restored.id;
      clearAttemptState();
    }

    loadSurveyCatalog().then((catalog) => {
      surveyCatalog.splice(0, surveyCatalog.length, ...catalog.surveys);
      catalogStatus.value =
        catalog.source === 'local-json'
          ? `Loaded ${catalog.surveys.length} local default survey set.`
          : 'Local defaults were unavailable, so bundled fallback surveys are active.';
      const selectedTemplate = catalog.surveys.find((item) => item.id === selectedSurveyId.value) || catalog.surveys[0];
      if (selectedTemplate) {
        applySurveyTemplate(selectedTemplate);
      }
    });

    function setMode(nextMode) {
      validationMessage.value = '';
      if (nextMode === 'take') {
        const validationError = validateSurvey(questions);
        if (validationError) {
          validationMessage.value = validationError;
          mode.value = 'build';
          return;
        }
      }
      mode.value = nextMode;
    }

    function addQuestion() {
      questions.push(createQuestion({ prompt: 'New question', options: ['Option A', 'Option B'] }));
      submission.value = null;
    }

    function removeQuestion(questionId) {
      if (questions.length === 1) {
        return;
      }
      const index = questions.findIndex((question) => question.id === questionId);
      if (index >= 0) {
        questions.splice(index, 1);
        delete answers[questionId];
        submission.value = null;
      }
    }

    function addOption(questionId) {
      const question = questions.find((item) => item.id === questionId);
      if (question && question.options.length < MAX_OPTIONS) {
        question.options.push(createOption(`Option ${question.options.length + 1}`));
        submission.value = null;
      }
    }

    function removeOption(questionId, optionId) {
      const question = questions.find((item) => item.id === questionId);
      if (!question || question.options.length <= MIN_OPTIONS) {
        return;
      }
      const index = question.options.findIndex((option) => option.id === optionId);
      if (index >= 0) {
        question.options.splice(index, 1);
        if (question.correctOptionId === optionId) {
          question.correctOptionId = question.options[0].id;
        }
        if (answers[questionId] === optionId) {
          delete answers[questionId];
        }
        submission.value = null;
      }
    }

    function loadSelectedDefault() {
      const selectedTemplate = surveyCatalog.find((item) => item.id === selectedSurveyId.value) || surveyCatalog[0];
      if (selectedTemplate) {
        applySurveyTemplate(selectedTemplate);
      }
    }

    function submitSurvey() {
      const validationError = validateSurvey(questions);
      if (validationError) {
        validationMessage.value = validationError;
        mode.value = 'build';
        return;
      }

      const unanswered = questions.findIndex((question) => !answers[question.id]);
      if (unanswered >= 0) {
        validationMessage.value = `Answer question ${unanswered + 1} before submitting.`;
        return;
      }

      const beforeGradeChecksum = checksumSurvey(questions);
      const results = questions.map((question) => {
        const selectedOption = question.options.find((option) => option.id === answers[question.id]);
        const correctOption = question.options.find((option) => option.id === question.correctOptionId);
        return {
          questionId: question.id,
          prompt: question.prompt,
          selectedLabel: selectedOption?.label || 'Missing answer',
          correctLabel: correctOption?.label || 'Missing correct answer',
          explanation: question.explanation,
          isCorrect: selectedOption?.id === correctOption?.id,
        };
      });
      const afterGradeChecksum = checksumSurvey(questions);

      submission.value = Object.freeze({
        score: results.filter((result) => result.isCorrect).length,
        total: results.length,
        results: Object.freeze(results.map(Object.freeze)),
        integrityMessage:
          beforeGradeChecksum === afterGradeChecksum
            ? 'Survey structure stayed stable during grading.'
            : 'Survey structure changed while grading; retake recommended.',
      });
      validationMessage.value = '';
      mode.value = 'review';
    }

    function retake() {
      clearAttemptState();
      mode.value = 'take';
    }

    return {
      addOption,
      addQuestion,
      answerableQuestionCount,
      answers,
      catalogStatus,
      completedCount,
      loadSelectedDefault,
      mode,
      questions,
      removeOption,
      removeQuestion,
      retake,
      selectedSurveyId,
      setMode,
      submission,
      submitSurvey,
      survey,
      surveyCatalog,
      validationMessage,
    };
  },
}).mount('#app');
