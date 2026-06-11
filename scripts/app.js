/*
  Идея на миллион?
  Бизнес-функции:
  - оценка идеи на подписочную модель;
  - сравнение двух идей;
  - план проверки спроса на 7 дней;
  - копирование и скачивание отчёта;
  - история проверок в localStorage.
*/

const STORAGE_KEY = "million_idea_validator_business_history_v1";
let currentData = null;
let currentResult = null;
let currentComparison = null;

const $ = (id) => document.getElementById(id);

function syncRange(inputId, valueId) {
  $(valueId).textContent = $(inputId).value;
}

function getText(id) {
  return String($(id).value || "").trim();
}

function getNumber(id) {
  const raw = String($(id).value || "").replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₽";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function collectMainIdea() {
  return {
    ideaName: getText("ideaName") || "Идея без названия",
    businessModel: getText("businessModel"),
    ideaDescription: getText("ideaDescription"),
    targetAudience: getText("targetAudience"),
    mainProblem: getText("mainProblem"),
    painLevel: getNumber("painLevel"),
    urgency: getNumber("urgency"),
    frequency: getText("frequency"),
    payReadiness: getText("payReadiness"),
    price: getNumber("price"),
    monthlyUsers: getNumber("monthlyUsers"),
    competition: getText("competition"),
    differentiation: getNumber("differentiation"),
    channel: getText("channel"),
    accessToAudience: getNumber("accessToAudience"),
    manualWork: getText("manualWork"),
    retention: getText("retention"),
    dataAvailability: getText("dataAvailability"),
    buildComplexity: getNumber("buildComplexity"),
    alternatives: getText("alternatives")
  };
}

function runValidation() {
  const data = collectMainIdea();
  const result = calculateIdea(data);
  currentData = data;
  currentResult = result;
  renderResult(data, result);
  renderWeekPlan(result.weekPlan);
  renderReport(data, result);
  saveHistory(data, result);
  renderHistory();
  showToast("Идея проверена");
}

function calculateIdea(data) {
  const frequencyScoreMap = { daily: 100, weekly: 86, monthly: 68, quarterly: 42, rare: 18 };
  const payScoreMap = { none: 32, low: 46, middle: 66, good: 86, high: 100 };
  const competitionScoreMap = { none: 58, low: 78, medium: 86, high: 62, crowded: 38 };
  const channelScoreMap = { content: 74, direct: 82, marketplace: 78, ads: 52, seo: 66, unknown: 24 };
  const manualWorkScoreMap = { high: 92, medium: 72, low: 38, unclear: 28 };
  const retentionScoreMap = { strong: 96, medium: 66, weak: 26, unclear: 30 };
  const dataScoreMap = { easy: 86, medium: 68, hard: 38, none: 22 };

  const painScore = Math.round(((data.painLevel + data.urgency) / 20) * 100);
  const frequencyScore = frequencyScoreMap[data.frequency] || 40;
  const payScore = payScoreMap[data.payReadiness] || 35;
  const competitionScore = competitionScoreMap[data.competition] || 50;
  const channelScore = channelScoreMap[data.channel] || 40;
  const manualWorkScore = manualWorkScoreMap[data.manualWork] || 40;
  const retentionScore = retentionScoreMap[data.retention] || 40;
  const dataAvailabilityScore = dataScoreMap[data.dataAvailability] || 40;

  const audienceClarityScore = getTextQualityScore(data.targetAudience, 10, 50, 88);
  const problemClarityScore = getTextQualityScore(data.mainProblem, 10, 45, 90);
  const descriptionScore = getTextQualityScore(data.ideaDescription, 25, 90, 92);
  const differentiationScore = data.differentiation * 10;
  const accessScore = data.accessToAudience * 10;

  const buildScore = clamp(
    Math.round((dataAvailabilityScore * 0.42) + (manualWorkScore * 0.26) + ((11 - data.buildComplexity) * 10 * 0.32)),
    0,
    100
  );

  const subscriptionScore = Math.round(frequencyScore * 0.42 + retentionScore * 0.42 + manualWorkScore * 0.16);
  const marketScore = Math.round(channelScore * 0.35 + accessScore * 0.35 + audienceClarityScore * 0.30);
  const clarityScore = Math.round(audienceClarityScore * 0.30 + problemClarityScore * 0.36 + descriptionScore * 0.34);
  const paymentScore = Math.round(payScore * 0.74 + getPriceRealismScore(data.price, data.payReadiness, data.businessModel) * 0.26);
  const estimatedMRR = data.price * data.monthlyUsers;

  let score = Math.round(
    painScore * 0.20 +
    subscriptionScore * 0.22 +
    paymentScore * 0.17 +
    marketScore * 0.15 +
    differentiationScore * 0.10 +
    buildScore * 0.10 +
    competitionScore * 0.06
  );

  if (clarityScore < 45) score -= 8;
  if (data.retention === "weak" && data.frequency === "rare") score -= 12;
  if (data.channel === "unknown") score -= 7;
  if (data.payReadiness === "none" && data.price > 0) score -= 5;

  score = clamp(score, 0, 100);

  const verdict = getVerdict(score);
  const positioning = buildPositioning(data);
  const firstVersion = buildFirstVersion(score);
  const validationPlan = buildValidationPlan(score);
  const pricingAdvice = buildPricingAdvice(data, estimatedMRR);

  const insights = buildInsights(data, {
    score,
    painScore,
    subscriptionScore,
    paymentScore,
    marketScore,
    buildScore,
    competitionScore,
    clarityScore,
    estimatedMRR,
    frequencyScore,
    retentionScore,
    channelScore,
    payScore,
    differentiationScore,
    accessScore
  });

  const weekPlan = buildWeekPlan(data, { score, subscriptionScore, paymentScore, marketScore, buildScore, clarityScore });

  return {
    score,
    verdict,
    painScore,
    subscriptionScore,
    paymentScore,
    marketScore,
    buildScore,
    competitionScore,
    clarityScore,
    estimatedMRR,
    positioning,
    firstVersion,
    validationPlan,
    pricingAdvice,
    insights,
    weekPlan
  };
}

function getTextQualityScore(text, lowLength, goodLength, maxScore) {
  const clean = String(text || "").trim();
  if (!clean) return 12;
  if (clean.length < lowLength) return 34;
  if (clean.length < goodLength) return 64;
  return maxScore;
}

function getPriceRealismScore(price, payReadiness, businessModel) {
  if (price <= 0) return 36;
  if (payReadiness === "low") return price <= 500 ? 88 : price <= 1200 ? 54 : 28;
  if (payReadiness === "middle") return price >= 500 && price <= 2500 ? 90 : price < 500 ? 62 : price <= 5000 ? 58 : 34;
  if (payReadiness === "good") return price >= 1500 && price <= 12000 ? 92 : price < 1500 ? 60 : 66;
  if (payReadiness === "high") return price >= 7000 ? 90 : 56;
  if (["b2b", "ecom", "local"].includes(businessModel) && price >= 990 && price <= 15000) return 74;
  return 52;
}

function getVerdict(score) {
  if (score >= 78) {
    return {
      label: "Сильный потенциал",
      className: "verdict-green",
      emoji: "🌱",
      title: "Идею стоит проверять быстро",
      subtitle: "Есть признаки повторяемой боли, понятной ценности и подписочного сценария. Следующий шаг — интервью, предзаказы и первая платная версия."
    };
  }
  if (score >= 55) {
    return {
      label: "Нужна доработка гипотезы",
      className: "verdict-yellow",
      emoji: "💡",
      title: "Идея перспективна, но есть слабые места",
      subtitle: "Перед разработкой нужно уточнить аудиторию, платёжную мотивацию, канал привлечения и причину платить каждый месяц."
    };
  }
  return {
    label: "Высокий риск",
    className: "verdict-red",
    emoji: "⚠️",
    title: "Идею рано упаковывать в подписку",
    subtitle: "Сначала нужно сузить аудиторию, доказать регулярную боль и проверить готовность платить. Иначе есть риск сделать сервис, которым воспользуются один раз."
  };
}

function buildPositioning(data) {
  const audience = data.targetAudience || "конкретной аудитории";
  const problem = data.mainProblem || "повторяющуюся рабочую задачу";
  return `${data.ideaName} — сервис для ${audience}, который помогает решить проблему: ${problem}. Основная ценность — быстрее принимать решение, экономить время и снижать риск ошибок.`;
}

function buildFirstVersion(score) {
  if (score < 55) {
    return [
      "Один простой сценарий без сложных интеграций",
      "Ручной ввод данных вместо автоматического подключения API",
      "Один конкретный сегмент аудитории",
      "Один главный результат, за который пользователь готов платить",
      "Форма заявки или список ожидания вместо сложной оплаты"
    ];
  }

  const base = [
    "Форма ввода ключевых данных по задаче клиента",
    "Автоматическая диагностика по 5–7 понятным критериям",
    "Итоговый статус: зелёный / жёлтый / красный",
    "Список рекомендаций и следующий шаг",
    "Копируемый отчёт для клиента или команды"
  ];

  if (score >= 78) {
    base.push("История проверок и сравнение нескольких идей");
    base.push("Шаблоны проверки для разных сегментов аудитории");
  }

  return base;
}

function buildValidationPlan(score) {
  const plan = [
    "Сформулировать одну узкую аудиторию и одну главную боль.",
    "Провести 10–15 коротких интервью с потенциальными клиентами.",
    "Показать прототип или лендинг и спросить, за что человек реально заплатил бы.",
    "Проверить цену: предложить 2–3 тарифных варианта.",
    "Собрать первые заявки, предзаказы или письма заинтересованных клиентов."
  ];

  if (score >= 78) {
    plan.push("Запустить закрытый доступ для первых пользователей и измерить повторное использование.");
  } else {
    plan.push("Не начинать сложную разработку до подтверждения регулярной потребности.");
  }

  return plan;
}

function buildPricingAdvice(data, estimatedMRR) {
  let advice = "";
  if (data.price <= 0) {
    advice = "Цена не указана. Для проверки спроса стоит предложить 2–3 тарифа: базовый, расширенный и индивидуальный.";
  } else if (data.price < 500) {
    advice = "Цена низкая. Для подписочной модели потребуется много пользователей, поэтому важно заранее понять канал массового привлечения.";
  } else if (data.price <= 2500) {
    advice = "Цена подходит для лёгкого входа. Хороший вариант для самостоятельных специалистов, небольших команд и первых платных тестов.";
  } else if (data.price <= 10000) {
    advice = "Цена выглядит как B2B/B2Pro-уровень. Нужно показывать экономию времени, денег или снижение ошибок.";
  } else {
    advice = "Высокая цена требует сильного доказательства ценности: кейсов, расчётов экономии, демонстрации результата и персональной продажи.";
  }

  if (estimatedMRR > 0) {
    advice += ` При цели ${data.monthlyUsers} платных клиентов потенциальный MRR составит около ${money(estimatedMRR)}.`;
  }

  return advice;
}

function buildInsights(data, metrics) {
  const insights = [];
  const add = (level, title, text) => insights.push({ level, title, text });

  if (!data.ideaDescription || data.ideaDescription.length < 40) {
    add("yellow", "Описание идеи нужно усилить", "Хорошая формулировка должна объяснять: для кого сервис, какую боль решает и какой результат даёт.");
  }

  if (!data.targetAudience || data.targetAudience.length < 10) {
    add("red", "Аудитория слишком широкая", "Для подписочного сервиса важно начинать с узкого сегмента, а не с формулировки «для всех предпринимателей».");
  } else {
    add("green", "Аудитория обозначена", "Есть база для проверки спроса. Следующий шаг — найти 10–15 представителей этой аудитории и обсудить реальную боль.");
  }

  if (metrics.painScore >= 75) {
    add("green", "Боль выглядит достаточно сильной", "Высокая сила боли повышает шанс, что пользователь будет готов платить не за функцию, а за решение проблемы.");
  } else if (metrics.painScore < 50) {
    add("red", "Боль может быть недостаточно острой", "Если проблема не влияет на деньги, время, клиентов или риски, подписку будет сложно продать.");
  } else {
    add("yellow", "Боль нужно конкретизировать", "Уточните, что именно теряет клиент: деньги, время, заявки, качество, контроль или спокойствие.");
  }

  if (metrics.subscriptionScore >= 75) {
    add("green", "Есть причина платить регулярно", "Проблема повторяется, а значит подписочная модель может быть уместной.");
  } else if (data.retention === "weak" || data.frequency === "rare") {
    add("red", "Риск одноразового использования", "Если сервис нужен один раз, подписка будет слабой. Возможно, лучше подойдёт разовый отчёт или пакет проверок.");
  } else {
    add("yellow", "Подписочную механику нужно усилить", "Добавьте регулярную ценность: мониторинг, историю, напоминания, еженедельные отчёты или обновление данных.");
  }

  if (metrics.paymentScore >= 76) {
    add("green", "Платёжная гипотеза выглядит рабочей", "Есть признаки, что клиент может платить ежемесячно. Теперь нужно проверить цену на реальных людях.");
  } else if (data.payReadiness === "none") {
    add("yellow", "Готовность платить не подтверждена", "Нужно прямо спросить потенциальных клиентов, сколько они платят сейчас и за какой результат готовы платить.");
  } else {
    add("yellow", "Цена требует проверки", "Возможна проблема между заявленной ценой и ценностью. Проверьте несколько тарифов и реакцию аудитории.");
  }

  if (data.channel === "unknown") {
    add("red", "Неясен канал привлечения", "Даже сильная идея не станет бизнесом без понятного способа находить клиентов.");
  } else if (metrics.marketScore >= 70) {
    add("green", "Есть основа для первых продаж", "Канал привлечения и доступ к аудитории выглядят достаточно реалистично для проверки спроса.");
  } else {
    add("yellow", "Привлечение может быть узким местом", "Стоит заранее понять, где находятся клиенты и почему они обратят внимание на новый сервис.");
  }

  if (data.competition === "crowded") {
    add("red", "Рынок перегрет", "На перегретом рынке нужна очень чёткая специализация: ниша, сегмент или необычный сценарий.");
  } else if (data.competition === "none") {
    add("yellow", "Нет конкурентов — это не всегда плюс", "Отсутствие конкурентов может означать свободную нишу, но может означать и слабый спрос.");
  } else {
    add("blue", "Конкуренция может подтвердить спрос", "Если конкуренты есть, это сигнал, что проблема уже кому-то важна. Вопрос — в отстройке.");
  }

  if (metrics.buildScore < 45) {
    add("red", "Первая версия может быть слишком сложной", "Сократите продукт до одного сценария и не начинайте со сложных интеграций, пока не подтверждён спрос.");
  } else if (metrics.buildScore >= 72) {
    add("green", "Первую версию можно собрать быстро", "Реалистичный старт повышает шанс быстро проверить идею и не потратить месяцы на лишние функции.");
  } else {
    add("yellow", "Сложность умеренная", "Перед разработкой отделите обязательные функции от красивых, но необязательных.");
  }

  if (data.alternatives && data.alternatives.length > 20) {
    add("blue", "Есть понимание текущих альтернатив", "Это полезно для продажи: сервис должен быть быстрее, проще или выгоднее текущего способа решения проблемы.");
  } else {
    add("yellow", "Не описаны текущие альтернативы", "Конкурентом может быть не другой SaaS, а Excel, сотрудник, подрядчик или привычка ничего не менять.");
  }

  return insights.slice(0, 10);
}

function buildWeekPlan(data, metrics) {
  const weakChannel = metrics.marketScore < 55;
  const weakClarity = metrics.clarityScore < 55;
  const weakPayment = metrics.paymentScore < 55;

  return [
    {
      day: "День 1",
      title: "Сузить аудиторию и боль",
      text: weakClarity
        ? "Перепишите идею в формате: для кого сервис, какая боль, какой измеримый результат. Уберите всё лишнее и оставьте один основной сценарий."
        : "Зафиксируйте одну основную аудиторию и один главный сценарий использования, чтобы не распыляться на несколько разных продуктов."
    },
    {
      day: "День 2",
      title: "Собрать список 20 потенциальных клиентов",
      text: weakChannel
        ? "Найдите людей вручную: Telegram-чаты, личные контакты, сообщества, маркетплейсы, профессиональные группы. Без доступа к аудитории идея не проверяется."
        : "Соберите список людей из выбранного канала привлечения и подготовьте короткое сообщение для интервью."
    },
    {
      day: "День 3",
      title: "Провести первые интервью",
      text: "Поговорите с 5–7 представителями аудитории. Не продавайте сразу. Спросите, как они решают проблему сейчас, сколько теряют и что уже пробовали."
    },
    {
      day: "День 4",
      title: "Проверить ценность и цену",
      text: weakPayment
        ? "Предложите 2–3 варианта цены и спросите, за какой конкретный результат человек был бы готов платить. Отдельно проверьте, платит ли он за похожее решение сейчас."
        : "Покажите цену и спросите, что должно быть внутри, чтобы подписка выглядела оправданной."
    },
    {
      day: "День 5",
      title: "Собрать быстрый прототип или демо",
      text: "Сделайте простую версию без сложной разработки: форма, расчёт, отчёт, ручная обработка или интерактивный макет. Цель — показать результат, а не идеальную систему."
    },
    {
      day: "День 6",
      title: "Получить заявки или предзаказы",
      text: "Попросите оставить заявку, оплатить ранний доступ или записаться в список ожидания. Реальный интерес лучше лайков и слов «идея классная»."
    },
    {
      day: "День 7",
      title: "Принять решение по идее",
      text: metrics.score >= 78
        ? "Если появились живые заявки — запускайте закрытый доступ. Если заявок нет, проверьте оффер, цену и канал."
        : "Соберите выводы: что подтвердилось, что нет, какую гипотезу менять. Не расширяйте продукт, пока не доказана основная ценность."
    }
  ];
}

function renderResult(data, result) {
  $("scoreValue").textContent = result.score;
  const degrees = Math.round((result.score / 100) * 360);
  $("scoreCircle").style.background = `radial-gradient(circle at center, #ffffff 58%, transparent 59%), conic-gradient(${getScoreColor(result.score)} 0deg ${degrees}deg, rgba(24,51,47,0.08) ${degrees}deg 360deg)`;

  const verdictPill = $("verdictPill");
  verdictPill.className = "verdict-pill " + result.verdict.className;
  verdictPill.textContent = `${result.verdict.emoji} ${result.verdict.label}`;

  $("resultTitle").textContent = result.verdict.title;
  $("resultSubtitle").textContent = result.verdict.subtitle;

  $("metrics").innerHTML = `
    <div class="metric ${metricClass(result.subscriptionScore)}"><small>Подписочный потенциал</small><strong>${result.subscriptionScore}/100</strong></div>
    <div class="metric ${metricClass(result.marketScore)}"><small>Готовность рынка</small><strong>${result.marketScore}/100</strong></div>
    <div class="metric ${metricClass(result.buildScore)}"><small>Реалистичность запуска</small><strong>${result.buildScore}/100</strong></div>
    <div class="metric ${result.estimatedMRR > 0 ? "good" : "warn"}"><small>Потенциальный MRR</small><strong>${result.estimatedMRR > 0 ? money(result.estimatedMRR) : "—"}</strong></div>
    <div class="metric ${metricClass(result.painScore)}"><small>Сила проблемы</small><strong>${result.painScore}/100</strong></div>
    <div class="metric ${metricClass(result.paymentScore)}"><small>Готовность платить</small><strong>${result.paymentScore}/100</strong></div>
  `;

  renderInsights(result.insights);
}

function getScoreColor(score) {
  if (score >= 78) return "#23b26d";
  if (score >= 55) return "#ffd166";
  return "#ef5b6a";
}

function metricClass(value) {
  if (value >= 75) return "good";
  if (value >= 50) return "warn";
  return "bad";
}

function renderInsights(insights) {
  const tagNames = { green: "Сила", yellow: "Проверить", red: "Риск", blue: "Инсайт" };
  $("insights").innerHTML = insights.map((item) => `
    <article class="insight">
      <div class="insight-head">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="tag ${item.level}">${tagNames[item.level] || "Совет"}</span>
      </div>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderWeekPlan(plan) {
  $("weekPlan").innerHTML = plan.map((item) => `
    <article class="day-card">
      <strong>${escapeHtml(item.day)} — ${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderReport(data, result) {
  const modelNames = {
    b2b: "B2B — бизнесу",
    b2c: "B2C — частным пользователям",
    creator: "Экспертам / авторам / блогерам",
    ecom: "Селлерам / e-commerce",
    local: "Локальному бизнесу",
    mixed: "Смешанная аудитория"
  };

  const frequencyNames = {
    daily: "ежедневно",
    weekly: "еженедельно",
    monthly: "ежемесячно",
    quarterly: "раз в квартал",
    rare: "редко / нерегулярно"
  };

  const comparisonBlock = currentComparison ? `\n\n9. СРАВНЕНИЕ ИДЕЙ\n${currentComparison.reportText}` : "";

  const report = `
# 💡 ИДЕЯ НА МИЛЛИОН?

## Проверка идеи на подписочную модель

**Идея:** ${data.ideaName}

**Описание:**  
${data.ideaDescription || "не указано"}

**Кому продаём:** ${modelNames[data.businessModel] || data.businessModel}

**Целевая аудитория:** ${data.targetAudience || "не указана"}

**Главная боль:** ${data.mainProblem || "не указана"}

## Итоговая оценка

**${result.score}/100**  
**Вердикт:** ${result.verdict.label}

${result.verdict.subtitle}

## 1. Ключевые оценки

- Сила проблемы: ${result.painScore}/100
- Подписочный потенциал: ${result.subscriptionScore}/100
- Готовность платить: ${result.paymentScore}/100
- Готовность рынка: ${result.marketScore}/100
- Реалистичность запуска: ${result.buildScore}/100
- Ясность формулировки: ${result.clarityScore}/100

## 2. Подписочная логика

- Частота проблемы: ${frequencyNames[data.frequency] || data.frequency}
- Планируемая цена: ${data.price > 0 ? money(data.price) + " / мес" : "не указана"}
- Цель по платным клиентам за 90 дней: ${data.monthlyUsers || "не указана"}
- Потенциальный MRR: ${result.estimatedMRR > 0 ? money(result.estimatedMRR) : "не рассчитан"}

## 3. Позиционирование

${result.positioning}

## 4. Ценовая гипотеза

${result.pricingAdvice}

## 5. Первая версия продукта

${result.firstVersion.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 6. План проверки спроса

${result.validationPlan.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 7. План проверки на 7 дней

${result.weekPlan.map((item) => `- **${item.day}: ${item.title}.** ${item.text}`).join("\n")}

## 8. Выводы и риски

${result.insights.map((item, index) => `${index + 1}. **${item.title}:** ${item.text}`).join("\n")}

## Текущие альтернативы клиента

${data.alternatives || "не указаны"}
${comparisonBlock}

## Итог

${result.score >= 78
  ? "Идею стоит проверять через быстрый запуск, интервью и первые платные заявки."
  : result.score >= 55
    ? "Идею стоит доработать и проверить спрос до полноценной разработки."
    : "Идею нужно сузить, усилить боль и подтвердить готовность платить до разработки."}

---

Дисклеймер: это предварительная диагностика. Для точного решения нужны интервью с клиентами, тест цены, проверка каналов привлечения и реальные заявки.
  `.trim();

  $("report").value = report;
}

function compareIdeas() {
  if (!currentData || !currentResult) {
    runValidation();
  }

  const secondData = buildSecondIdeaData();
  const secondResult = calculateIdea(secondData);
  const difference = currentResult.score - secondResult.score;

  const winner = difference >= 0 ? currentData.ideaName : secondData.ideaName;
  const loser = difference >= 0 ? secondData.ideaName : currentData.ideaName;
  const absDiff = Math.abs(difference);

  let advice = "";
  if (absDiff <= 5) {
    advice = "Обе идеи близки по потенциалу. Выбирайте ту, где проще получить первых пользователей и быстрее проверить оплату.";
  } else if (difference > 0) {
    advice = `Первой лучше тестировать идею «${currentData.ideaName}»: у неё выше расчётный потенциал по текущим вводным.`;
  } else {
    advice = `Первой лучше тестировать идею «${secondData.ideaName}»: она выглядит сильнее по текущим вводным.`;
  }

  currentComparison = {
    secondData,
    secondResult,
    reportText: `Идея 1: ${currentData.ideaName} — ${currentResult.score}/100\nИдея 2: ${secondData.ideaName} — ${secondResult.score}/100\nПобедитель: ${winner}\nКомментарий: ${advice}`
  };

  $("comparisonResult").innerHTML = `
    <div class="comparison-result-card">
      <div class="winner-note"><strong>Рекомендация:</strong> ${escapeHtml(advice)}</div>
      <div class="compare-grid">
        <div class="compare-box ${metricClass(currentResult.score)}">
          <strong>${escapeHtml(currentData.ideaName)}</strong>
          <span>Оценка: ${currentResult.score}/100</span>
          <span>Подписочный потенциал: ${currentResult.subscriptionScore}/100</span>
          <span>Запуск: ${currentResult.buildScore}/100</span>
        </div>
        <div class="compare-box ${metricClass(secondResult.score)}">
          <strong>${escapeHtml(secondData.ideaName)}</strong>
          <span>Оценка: ${secondResult.score}/100</span>
          <span>Подписочный потенциал: ${secondResult.subscriptionScore}/100</span>
          <span>Запуск: ${secondResult.buildScore}/100</span>
        </div>
      </div>
      <p class="result-subtitle">Разница: ${absDiff} баллов. ${escapeHtml(winner)} сейчас выглядит сильнее, чем ${escapeHtml(loser)}, если исходные данные указаны честно.</p>
    </div>
  `;

  renderReport(currentData, currentResult);
  showToast("Идеи сравнены");
}

function buildSecondIdeaData() {
  return {
    ideaName: getText("secondIdeaName") || "Вторая идея",
    businessModel: "b2b",
    ideaDescription: `${getText("secondIdeaName") || "Вторая идея"}: ${getText("secondProblem") || "описание не указано"}`,
    targetAudience: getText("secondAudience"),
    mainProblem: getText("secondProblem"),
    painLevel: getNumber("secondPainLevel"),
    urgency: getNumber("secondPainLevel"),
    frequency: getText("secondFrequency"),
    payReadiness: getText("secondPayReadiness"),
    price: 0,
    monthlyUsers: 0,
    competition: "medium",
    differentiation: 6,
    channel: "content",
    accessToAudience: getNumber("secondAccess"),
    manualWork: "medium",
    retention: getText("secondFrequency") === "rare" ? "weak" : getText("secondFrequency") === "monthly" ? "medium" : "strong",
    dataAvailability: "medium",
    buildComplexity: getNumber("secondComplexity"),
    alternatives: "Для второй идеи альтернативы не указаны."
  };
}

function scrollToCompare() {
  $("comparisonSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function fillDemo() {
  $("ideaName").value = "ProfitPulse для селлеров";
  $("businessModel").value = "ecom";
  $("ideaDescription").value = "Сервис помогает селлерам маркетплейсов быстро видеть, какие товары приносят прибыль, какие съедают рекламный бюджет, где заканчиваются остатки и какие карточки требуют внимания.";
  $("targetAudience").value = "Селлеры WB и Ozon с 50+ SKU и регулярными рекламными расходами";
  $("mainProblem").value = "Селлер не видит каждый день, какие товары продаются в плюс, а какие создают скрытые убытки";
  $("painLevel").value = 8;
  $("urgency").value = 7;
  $("frequency").value = "daily";
  $("payReadiness").value = "good";
  $("price").value = 2990;
  $("monthlyUsers").value = 40;
  $("competition").value = "medium";
  $("differentiation").value = 7;
  $("channel").value = "content";
  $("accessToAudience").value = 6;
  $("manualWork").value = "high";
  $("retention").value = "strong";
  $("dataAvailability").value = "medium";
  $("buildComplexity").value = 6;
  $("alternatives").value = "Excel-таблицы, ручные отчёты, аналитика в кабинетах маркетплейсов, подрядчики, разрозненные сервисы аналитики.";
  syncAllRanges();
  runValidation();
}

function fillSecondIdeaDemo() {
  $("secondIdeaName").value = "Генератор техпаспортов товаров";
  $("secondAudience").value = "Поставщики, B2B-компании и продавцы, которым нужно быстро готовить описания товаров";
  $("secondProblem").value = "Подготовка карточек, характеристик и технических описаний занимает много времени и часто делается вручную";
  $("secondPayReadiness").value = "middle";
  $("secondPainLevel").value = 7;
  $("secondFrequency").value = "weekly";
  $("secondComplexity").value = 6;
  $("secondAccess").value = 5;
  syncAllRanges();
  showToast("Пример второй идеи заполнен");
}

function resetForm() {
  ["ideaName", "ideaDescription", "targetAudience", "mainProblem", "price", "monthlyUsers", "alternatives"].forEach((id) => $(id).value = "");
  $("businessModel").value = "b2b";
  $("painLevel").value = 7;
  $("urgency").value = 6;
  $("frequency").value = "daily";
  $("payReadiness").value = "none";
  $("competition").value = "none";
  $("differentiation").value = 6;
  $("channel").value = "content";
  $("accessToAudience").value = 5;
  $("manualWork").value = "high";
  $("retention").value = "strong";
  $("dataAvailability").value = "easy";
  $("buildComplexity").value = 5;
  syncAllRanges();

  currentData = null;
  currentResult = null;
  currentComparison = null;

  $("scoreValue").textContent = "—";
  $("scoreCircle").style.background = "radial-gradient(circle at center, #ffffff 58%, transparent 59%), conic-gradient(var(--yellow) 0deg, var(--green) 180deg, rgba(24,51,47,0.08) 180deg 360deg)";
  $("verdictPill").className = "verdict-pill";
  $("verdictPill").textContent = "⏳ Идея ещё не проверена";
  $("resultTitle").textContent = "Заполните параметры идеи";
  $("resultSubtitle").textContent = "Сервис покажет, насколько идея подходит для подписочной модели и с чего начать проверку спроса.";
  $("metrics").innerHTML = `<div class="metric"><small>Подписочный потенциал</small><strong>—</strong></div><div class="metric"><small>Готовность рынка</small><strong>—</strong></div><div class="metric"><small>Реалистичность запуска</small><strong>—</strong></div><div class="metric"><small>Потенциальный MRR</small><strong>—</strong></div>`;
  $("insights").innerHTML = `<div class="empty-state">Здесь появятся выводы после проверки идеи.</div>`;
  $("weekPlan").innerHTML = `<div class="empty-state">План появится после проверки идеи.</div>`;
  $("comparisonResult").innerHTML = `<div class="empty-state">Здесь появится сравнение двух идей.</div>`;
  $("report").value = "";
  showToast("Форма очищена");
}

async function copyReport() {
  const report = $("report").value.trim();
  if (!report) {
    showToast("Сначала проверьте идею");
    return;
  }
  try {
    await navigator.clipboard.writeText(report);
    showToast("Отчёт скопирован");
  } catch (error) {
    $("report").select();
    document.execCommand("copy");
    showToast("Отчёт скопирован");
  }
}

function downloadReport() {
  const report = $("report").value.trim();
  if (!report) {
    showToast("Сначала проверьте идею");
    return;
  }
  const fileName = slugify(currentData?.ideaName || "idea-report") + ".md";
  const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Отчёт скачан");
}

function slugify(value) {
  return String(value || "report")
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map = { а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"e", ж:"zh", з:"z", и:"i", й:"y", к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u", ф:"f", х:"h", ц:"c", ч:"ch", ш:"sh", щ:"sch", ъ:"", ы:"y", ь:"", э:"e", ю:"yu", я:"ya" };
      return map[char] || "";
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "idea-report";
}

function saveHistory(data, result) {
  const item = {
    id: Date.now(),
    ideaName: data.ideaName,
    score: result.score,
    verdict: result.verdict.label,
    price: data.price,
    mrr: result.estimatedMRR,
    date: new Date().toLocaleString("ru-RU")
  };
  const history = loadHistory();
  history.unshift(item);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 6)));
  } catch (error) {
    console.warn("Не удалось сохранить историю", error);
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  if (!history.length) {
    $("history").innerHTML = `<div class="empty-state">История пока пустая. Проведите первую проверку.</div>`;
    return;
  }
  $("history").innerHTML = history.map((item) => `
    <div class="history-item">
      <strong>${escapeHtml(item.ideaName)}</strong>
      <span>Оценка ${item.score}/100 · ${escapeHtml(item.verdict)}</span>
      <span>Цена: ${item.price > 0 ? money(item.price) + " / мес" : "не указана"} · MRR: ${item.mrr > 0 ? money(item.mrr) : "—"}</span>
      <span>${escapeHtml(item.date)}</span>
    </div>
  `).join("");
}

function syncAllRanges() {
  syncRange("painLevel", "painLevelValue");
  syncRange("urgency", "urgencyValue");
  syncRange("differentiation", "differentiationValue");
  syncRange("accessToAudience", "accessValue");
  syncRange("buildComplexity", "buildValue");
  syncRange("secondPainLevel", "secondPainValue");
  syncRange("secondComplexity", "secondComplexityValue");
  syncRange("secondAccess", "secondAccessValue");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

syncAllRanges();
renderHistory();
