(() => {
  const $ = (selector) => document.querySelector(selector);
  const textInput = $("#textInput");
  const analyzeButton = $("#analyzeButton");
  const resultSection = $("#resultSection");
  const scoreCard = $("#scoreCard");
  const aboutDialog = $("#aboutDialog");
  let mode = "spam";

  const examples = {
    spam: "URGENT: Your account will be suspended today. We noticed unusual activity. Verify your identity now to avoid permanent closure: http://account-security-check.example.net/login. Reply with your one-time passcode if you need help.",
    news: "SHOCKING new study proves a secret cure doctors don't want you to know about. Experts say everyone should share this immediately before it gets deleted."
  };

  const spamRules = [
    { name: "Urgent pressure", re: /\b(urgent|act now|immediately|right away|expires? today|limited time|last chance|final notice|within \d+ hours?|suspended today)\b/gi, points: 17, detail: "A tight deadline or threat can push you to act before checking the request." },
    { name: "Sensitive information request", re: /\b(password|passcode|one[- ]time code|verification code|social security|ssn|bank details|credit card|login details|pin number)\b/gi, points: 23, detail: "The text mentions credentials or personal details that scammers often try to collect." },
    { name: "Unexpected money or prize", re: /\b(you('ve| have)? won|winner|prize|claim your|cash reward|free gift|lottery|inheritance|refund|bonus payment)\b/gi, points: 17, detail: "Unexpected rewards or money can be bait used to get a reply or click." },
    { name: "Payment pressure", re: /\b(gift cards?|wire transfer|crypto(currency)?|bitcoin|pay a fee|processing fee|payment required|send (money|funds)|pay now)\b/gi, points: 22, detail: "Gift cards, crypto, or unusual upfront payments are difficult to reverse and common in scams." },
    { name: "Suspicious link", re: /https?:\/\/[^\s)]+/gi, points: 9, detail: "A link is included. Check its exact destination independently before opening it." },
    { name: "Link shortener or unusual domain", re: /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|ow\.ly|is\.gd|rb\.gy)\b|https?:\/\/[^\s/]+\.(top|xyz|click|work|info|buzz|monster)\b/gi, points: 17, detail: "Shortened or less familiar domains can hide where a link leads." },
    { name: "Unsolicited opportunity", re: /\b(guaranteed (returns|income|profit)|work from home|no experience (needed|required)|double your money|risk[- ]free|passive income)\b/gi, points: 15, detail: "Unsolicited, unusually favorable offers deserve independent verification." },
    { name: "Push to reply or keep it secret", re: /\b(reply (now|yes|to claim)|don't tell|keep (this|it) (secret|between us)|do not contact|text back)\b/gi, points: 11, detail: "Requests to reply quickly or keep things quiet can isolate you from a second opinion." },
    { name: "Impersonal greeting", re: /\b(dear (customer|user|account holder)|valued customer|dear friend)\b/gi, points: 7, detail: "A generic greeting may indicate a bulk message, though legitimate notices can use one too." }
  ];

  const newsRules = [
    { name: "Sensational language", re: /\b(shocking|stunning|unbelievable|explosive|jaw[- ]dropping|you won't believe|mind[- ]blowing)\b/gi, points: 15, detail: "Highly emotional wording can be used to grab attention in place of useful evidence." },
    { name: "Urgent share request", re: /\b(share (this )?(now|immediately|before)|before it (gets? )?(deleted|removed|banned)|spread the word|go viral)\b/gi, points: 19, detail: "Pressure to share before content is removed is a common manipulation tactic." },
    { name: "Extraordinary or conspiratorial claim", re: /\b(secret cure|they don't want you to know|hidden truth|cover[- ]?up|mainstream media won't|censored truth|miracle cure)\b/gi, points: 19, detail: "A dramatic claim framed as suppressed knowledge needs strong, checkable evidence." },
    { name: "Absolute certainty", re: /\b(proves? once and for all|everyone knows|doctors? all agree|100% (effective|safe|true)|always works|never fails)\b/gi, points: 13, detail: "Absolute claims can leave out uncertainty, limits, or disagreement in the evidence." },
    { name: "No clear attribution found", test: (s) => !/\b(according to|reported by|study (from|in|published)|researchers? at|the report (says|found)|data from|[A-Z][a-z]+ (said|told|wrote))\b/.test(s), points: 16, detail: "The pasted text does not clearly identify a report, researcher, or named source to follow up." },
    { name: "No source link in pasted text", test: (s) => !/https?:\/\/|www\./i.test(s), points: 9, detail: "No direct source link appears in the text provided, so the original evidence is not easy to trace from this excerpt." },
    { name: "Named source or attribution", test: (s) => /\b(according to|reported by|study (from|in|published)|researchers? at|the report (says|found)|data from|[A-Z][a-z]+ (said|told|wrote))\b/.test(s), type: "safe", points: 0, detail: "The text includes attribution language. Check whether the named source is real and accurately represented." },
    { name: "Source link included", test: (s) => /https?:\/\/|www\./i.test(s), type: "safe", points: 0, detail: "A link is present. Open the publisher or original source independently and check what it actually says." }
  ];

  function matches(rule, value) {
    if (rule.test) return rule.test(value);
    const flags = rule.re.flags.includes("g") ? rule.re.flags : `${rule.re.flags}g`;
    const re = new RegExp(rule.re.source, flags);
    return re.test(value);
  }

  function analyzeSpam(value) {
    const signals = spamRules.filter((rule) => matches(rule, value));
    const score = Math.min(100, signals.reduce((sum, item) => sum + item.points, 0));
    let level;
    if (score >= 54) level = "high";
    else if (score >= 26) level = "warn";
    else level = "low";
    return { score, level, signals };
  }

  function analyzeNews(value) {
    const signals = newsRules.filter((rule) => matches(rule, value));
    const riskPoints = signals.filter((s) => s.type !== "safe").reduce((sum, item) => sum + item.points, 0);
    const score = Math.min(100, riskPoints);
    let level;
    if (score >= 49) level = "high";
    else if (score >= 25) level = "warn";
    else level = "low";
    return { score, level, signals };
  }

  function verdictFor(currentMode, level) {
    if (currentMode === "spam") {
      if (level === "high") return ["Several scam patterns", "Treat this message as suspicious." ];
      if (level === "warn") return ["Some warning signs", "Verify the sender before taking action." ];
      return ["Few obvious signals", "No common patterns jumped out." ];
    }
    if (level === "high") return ["Several claims to verify", "The text uses multiple high-caution patterns." ];
    if (level === "warn") return ["A few things to verify", "Check the source and evidence before sharing." ];
    return ["Few language red flags", "This is not a check of whether the claims are true." ];
  }

  function render(result) {
    const isNews = mode === "news";
    const [verdict, copy] = verdictFor(mode, result.level);
    scoreCard.className = `score-card ${result.level === "low" ? "" : result.level}`;
    $("#scoreEyebrow").textContent = isNews ? "VERIFY SIGNALS" : "PATTERN SCORE";
    $("#scoreType").textContent = isNews ? "NEWS CHECK" : "SPAM CHECK";
    $("#scoreValue").textContent = String(result.score);
    $("#meterFill").style.width = `${result.score}%`;
    $("#verdictTitle").textContent = verdict;
    $("#verdictCopy").textContent = copy;
    $("#resultTitle").textContent = isNews ? "Here are some signals to review" : "Here’s what stood out";
    $("#scoreDisclaimer").textContent = isNews
      ? "This is a language and sourcing cue score, not a truth rating. Clearcheck does not verify publishers or claims."
      : "This score reflects common spam patterns in the text. It cannot confirm whether a sender is safe.";
    $("#verifyCopy").textContent = isNews
      ? "Find the original article, then compare its claims with independent reporting and primary sources such as research papers or public records."
      : "If money or personal information is involved, contact the organization using a number or website you find independently.";
    $("#resultFootnote").textContent = isNews
      ? "This check reviews wording only. It does not search the web or determine whether a claim is true."
      : "Your text was analyzed in this browser and was not sent to a server.";

    const list = $("#signalList");
    list.replaceChildren();
    const riskCount = result.signals.filter((s) => s.type !== "safe").length;
    $("#signalCount").textContent = `${riskCount} ${riskCount === 1 ? "signal" : "signals"}`;
    if (!result.signals.length) {
      const none = document.createElement("p");
      none.className = "no-signals";
      none.textContent = "No matching patterns were found in this text. That alone does not confirm it is genuine or safe.";
      list.append(none);
    } else {
      result.signals.slice(0, 6).forEach((signal) => {
        const row = document.createElement("div");
        row.className = `signal-item ${signal.type === "safe" ? "safe" : ""}`;
        const mark = document.createElement("span");
        mark.className = "signal-mark";
        mark.textContent = signal.type === "safe" ? "✓" : "!";
        const body = document.createElement("div");
        body.className = "signal-text";
        const title = document.createElement("strong");
        title.textContent = signal.name;
        const detail = document.createElement("p");
        detail.textContent = signal.detail;
        body.append(title, detail);
        const tag = document.createElement("span");
        tag.className = "signal-tag";
        tag.textContent = signal.type === "safe" ? "context" : "review";
        row.append(mark, body, tag);
        list.append(row);
      });
    }
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setMode(nextMode) {
    mode = nextMode;
    const spam = nextMode === "spam";
    $("#spamTab").classList.toggle("active", spam);
    $("#newsTab").classList.toggle("active", !spam);
    $("#spamTab").setAttribute("aria-selected", String(spam));
    $("#newsTab").setAttribute("aria-selected", String(!spam));
    $("#inputPanel").setAttribute("aria-labelledby", spam ? "spamTab" : "newsTab");
    $("#inputLabel").textContent = spam ? "Paste the message you received" : "Paste the headline, post, or article excerpt";
    textInput.placeholder = spam
      ? "Paste a suspicious email, text, or direct message here…"
      : "Paste a headline, claim, or article excerpt you want to review…";
    $("#analyzeButton").querySelector("span").textContent = spam ? "Check this text" : "Review this text";
    $("#scoreType").textContent = spam ? "SPAM CHECK" : "NEWS CHECK";
    resultSection.hidden = true;
  }

  function updateInput() {
    const length = textInput.value.length;
    $("#charCount").textContent = `${length.toLocaleString()} / 5,000`;
    analyzeButton.disabled = textInput.value.trim().length < 8;
  }

  $("#spamTab").addEventListener("click", () => setMode("spam"));
  $("#newsTab").addEventListener("click", () => setMode("news"));
  textInput.addEventListener("input", updateInput);
  textInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !analyzeButton.disabled) analyzeButton.click();
  });
  analyzeButton.addEventListener("click", () => {
    const value = textInput.value.trim();
    if (value.length < 8) return;
    render(mode === "spam" ? analyzeSpam(value) : analyzeNews(value));
  });
  $("#clearButton").addEventListener("click", () => {
    textInput.value = "";
    updateInput();
    resultSection.hidden = true;
    textInput.focus();
  });
  $("#sampleButton").addEventListener("click", () => {
    textInput.value = examples[mode];
    updateInput();
    textInput.focus();
  });
  $("#newCheckButton").addEventListener("click", () => {
    resultSection.hidden = true;
    textInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  const openAbout = () => aboutDialog.showModal();
  $("#aboutButton").addEventListener("click", openAbout);
  $("#footerAbout").addEventListener("click", openAbout);
  $("#closeDialog").addEventListener("click", () => aboutDialog.close());
  $("#dialogDone").addEventListener("click", () => aboutDialog.close());
  aboutDialog.addEventListener("click", (event) => {
    if (event.target === aboutDialog) aboutDialog.close();
  });
})();

