import { computed, createApp, reactive, ref } from 'https://unpkg.com/vue@3.4.38/dist/vue.esm-browser.prod.js';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const sampleSurvey = Object.freeze({
  title: 'JavaScript basics check',
  description: 'A tiny editable sample that demonstrates a survey/test workflow.',
  questions: Object.freeze([
    Object.freeze({
      prompt: 'Which keyword declares a block-scoped variable?',
      explanation: 'let and const are block-scoped; var is function-scoped.',
      options: Object.freeze(['var', 'let', 'global']),
      correctIndex: 1,
    }),
    Object.freeze({
      prompt: 'What does JSON.parse return when given valid JSON text?',
      explanation: 'JSON.parse converts valid JSON text into the matching JavaScript value.',
      options: Object.freeze(['A JavaScript value', 'Always a string', 'A CSS rule']),
      correctIndex: 0,
    }),
  ]),
});

let nextId = 1;

function newId(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function createOption(label = '') {
  return { id: newId('option'), label };
}

function createQuestion(source = {}) {
  const labels = Array.isArray(source.options) && source.options.length >= MIN_OPTIONS ? source.options : ['Yes', 'No'];
  const options = labels.slice(0, MAX_OPTIONS).map(createOption);
  const safeCorrectIndex = Math.min(Math.max(Number(source.correctIndex) || 0, 0), options.length - 1);

  return {
    id: newId('question'),
    prompt: source.prompt || 'New question',
    explanation: source.explanation || 'Add a short explanation for learners.',
    options,
    correctOptionId: options[safeCorrectIndex].id,
  };
}

function buildSurveyFromSample() {
  return {
    title: sampleSurvey.title,
    description: sampleSurvey.description,
    questions: sampleSurvey.questions.map(createQuestion),
  };
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
    const seed = buildSurveyFromSample();
    const survey = reactive({ title: seed.title, description: seed.description });
    const questions = reactive(seed.questions);
    const answers = reactive({});
    const mode = ref('build');
    const submission = ref(null);
    const validationMessage = ref('');

    const answerableQuestionCount = computed(() => questions.filter((question) => question.correctOptionId).length);
    const completedCount = computed(() => questions.filter((question) => answers[question.id]).length);

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

    function resetSample() {
      const restored = buildSurveyFromSample();
      survey.title = restored.title;
      survey.description = restored.description;
      questions.splice(0, questions.length, ...restored.questions);
      Object.keys(answers).forEach((key) => delete answers[key]);
      submission.value = null;
      validationMessage.value = '';
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
      Object.keys(answers).forEach((key) => delete answers[key]);
      submission.value = null;
      validationMessage.value = '';
      mode.value = 'take';
    }

    return {
      addOption,
      addQuestion,
      answerableQuestionCount,
      answers,
      completedCount,
      mode,
      questions,
      removeOption,
      removeQuestion,
      resetSample,
      retake,
      setMode,
      submission,
      submitSurvey,
      survey,
      validationMessage,
    };
  },
}).mount('#app');
