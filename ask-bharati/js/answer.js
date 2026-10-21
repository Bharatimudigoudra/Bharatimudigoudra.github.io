/* Question matching: policy gates (private topics, unknown skills), GitHub evidence, then fact retrieval. No model, no network. */
(function (AB) {
  'use strict';
  var FACTS = AB.FACTS, lk = AB.lk, GH_DATE = AB.GH_DATE, EV = AB.EV;

  var STOP = 'a an the is are was were be been of to in on at for and or with about what which who whom how do does did can could would should tell me her she bharati s any you your yours yourself my i am please give show info information more this that it its from as by has have had'.split(' ');
  var SKILLGROUPS = {
    'GenAI and LLM engineering': 'LLMs, RAG, Prompt Engineering, AI Agents, Agentic Workflows, Embeddings, Vector Search, Reranking, CrossEncoder, NL2SQL, ReAct, MCP',
    'AI frameworks and backend': 'Python, FastAPI, Flask, Django, LangChain, LangGraph, LlamaIndex, PyTorch, Scikit-learn',
    'machine learning and data': 'Feature Engineering, Model Selection, Classification, Regression, Clustering, Ensemble Learning, Model Evaluation, Pandas, NumPy',
    'computer vision and NLP': 'Object Detection, Image Classification, Segmentation, YOLO, Transformers, LSTM, RNN',
    'data and vector infrastructure': 'SQL, MySQL, PostgreSQL, MongoDB, Pinecone, Weaviate, ChromaDB, FAISS',
    'cloud and MLOps': 'AWS, Docker, Git, GitHub Actions, CI/CD, pytest',
    'evaluation and monitoring': 'LangSmith, Ragas, DeepEval'
  };
  var SKILLSET = {};
  Object.keys(SKILLGROUPS).forEach(function (g) { SKILLGROUPS[g].split(', ').forEach(function (n) { tok(n).forEach(function (w) { SKILLSET[w] = {g: g, n: n}; }); }); });
  SKILLSET.lora = {g: 'GenAI and LLM engineering', n: 'LoRA', k: 'basic'};
  SKILLSET.django = {g: 'AI frameworks and backend', n: 'Django', k: 'noproject'};
  SKILLSET.postgresql = {g: 'data and vector infrastructure', n: 'PostgreSQL', k: 'noproject'};
  SKILLSET.vlm = {g: 'GenAI and LLM engineering', n: 'VLMs', k: 'basic'};
  var USEQ = /\b(project|projects|where|which|repo|repos|github|used|use|using|built|build|worked|work|code|deploy|deployed|deployment)\b/i;
  var SKILLQ = /\b(know|knows|familiar|experience|experienced|use|uses|used|using|worked|work with|proficient|skilled|hands-on|handson|good at|good with|expert)\b/i;
  var QGENERIC = ['project', 'repo', 'where', 'which', 'github', 'built', 'build', 'code', 'a', 'know', 'experience', 'experienced', 'familiar', 'proficient', 'skilled', 'work', 'worked', 'use', 'used', 'using', 'good', 'expert', 'hands-on', 'handson', 'with', 'in', 'have', 'there', 'any', 'well', 'knowledge', 'skill', 'tech', 'technology'];
  var SENSITIVE_STRICT = /\b(pay|compensation|ctc|lpa)\b/i;
  var SENSITIVE = /\b(salary|ctc|lpa|pay|compensation|expected|notice|phone|mobile|whatsapp|number|relocat\w*|age|married|marital|family|address|religion|caste|why (did|was) (she|bharati) (leave|left)|other (offers|applications)|interview|applied|rejected|laid|fired|reference)\b/i;
  var LINKWORDS = /\b(linkedin|github|resume|cv|portfolio|website|link|links|profile|profiles|url|email|e-mail|contact|reach)\b/i;

  function tok(s) {
    return (s.toLowerCase().match(/[a-z0-9+#.-]+/g) || []).map(function (w) { return w.replace(/^[.-]+|[.-]+$/g, ''); })
      .filter(function (w) { return w && STOP.indexOf(w) < 0; })
      .map(function (w) { return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w; });
  }
  var DOCS = FACTS.map(function (f) { return {f: f, kw: tok(f.kw), tx: tok(f.text)}; });
  var DF = {};
  DOCS.forEach(function (d) {
    var seen = {};
    d.kw.concat(d.tx).forEach(function (w) { if (!seen[w]) { seen[w] = 1; DF[w] = (DF[w] || 0) + 1; } });
  });
  function idf(w) { return Math.log(1 + DOCS.length / (DF[w] || 0.5)); }

  function answer(q) {
    var t = tok(q);
    if (!t.length && /\bwho\b|about (her|bharati|you|yourself)|introduce|what do you do/i.test(q)) {
      var iv = FACTS[0]; return {text: iv.text, links: iv.links, src: iv.sec};
    }
    if (!t.length) return {text: 'Please type a question about my projects, skills, experience, education or how to contact me.', links: [], src: ''};
    if (/^\s*(no|nope|actually|it'?s|its|that'?s (wrong|not|incorrect)|that is (wrong|not|incorrect)|this is (wrong|not|incorrect)|wrong)\b/i.test(q)) {
      return {text: 'Thank you for telling me. I can\'t change anything from this chat, but if something on my portfolio looks wrong, please email me.', links: lk('email'), src: ''};
    }
    if (/^\s*(thanks|thank you|thankyou|thx|ok|okay|great|nice|cool|got it)\b[\s!.]*$/i.test(q)) {
      return {text: 'You are welcome! Ask me anything else about my projects, skills, experience or education.', links: [], src: ''};
    }
    if (/^\s*(hi|hello|hey|hii|good (morning|afternoon|evening))( there)?\b[\s!.]*$/i.test(q)) {
      return {text: 'Hello! You can ask me about my projects, skills, experience or education.', links: [], src: ''};
    }
    var JUDGE = /\b(negatives?|weakness(es)?|weak points?|flaws?|faults?|shortcomings?|drawbacks?|bad (things?|habits?|points?|side|qualit(y|ies))|downsides?|gaps?|cons|arrogant|lazy|rude|ugly|good[- ]looking|beautiful|pretty|attractive|handsome|boyfriend|girlfriend|dating|religion|caste|politics|drink|smoke|gossip|rumou?rs?|regrets?|insta(gram)?|facebook|snapchat|twitter|five years|10 years|ten years)\b|\bnot (hire|select|choose)\b|\b(what|anything|something|one|any) (is|are)? ?(wrong|bad|negative) (with|about)\b/i;
    var PROJ_NAMED = /\b(youtube|zeroqueue|zero queue|olake|ask olake|medical|fire|smoke|video|lead enrichment|book recommend|source[- ]code|project|projects|app|tool|code|repo|resume|cv)\b/i;
    if (JUDGE.test(q) && !PROJ_NAMED.test(q)) {
      return {text: 'I don\'t have reliable information about that in my portfolio or resume, so I won\'t guess. Please contact me by email or LinkedIn.', links: lk('email', 'linkedin'), src: ''};
    }
    var PRIV_DETAIL = /\b(name|names|medical|health|illness|sick|disease|operation|surgery|medicine|medicines|medication|hospital|how much|amount|lakhs?|lpa|interest|emi|salary|age|old|dob|birth ?date|date of birth|married|marital|husband|children|kids|address|phone|mobile|number|religion|caste|exact|village|street|income|jobs?)\b|\b(sister|sisters|siblings?)\b.*\b(who|which|what|where|do|does|did)\b.*\b(do|does|work|study|married|live|name)\b/i;
    var FAMILY_Q = /\b(family|background|parents?|mother|mom|father|dad|sisters?|siblings?|grew up|grow up|brought up|single[- ]parent|struggles?|hardships?|journey|life story|your story|education loan|student loan|loan|passed away|died|death)\b/i;
    var FAM_WORD = /\b(family|parents?|mother|mom|mum|father|dad|sisters?|siblings?|brothers?|children|kids|husband|wife|loan|operation|surgery|medical condition)\b/i;
    if (FAM_WORD.test(q) && (PRIV_DETAIL.test(q) || /\b(sisters?|siblings?)\b.*\b(do|does|work|study|live)\b/i.test(q))) {
      return {text: 'I would rather not share that in this chat. Please email me and we can talk about it.', links: lk('email'), src: ''};
    }
    if (/\b(hobb(y|ies)|free time|spare time|outside (of )?work|for fun|do you (sing|play|cook|read|write|garden|like music|listen)|play chess|badminton)\b/i.test(q)) {
      return {text: 'Outside work I enjoy chess, badminton, cooking, indoor gardening, reading, movies, writing, listening to music and singing.', links: [], src: 'Beyond work'};
    }
    if (FAMILY_Q.test(q) && !PRIV_DETAIL.test(q) && !/\b(education(al)?|academic|technical|professional|work|career|skills?|project|tech|experience|resume|cv)\b.*\b(background|journey)\b|\b(background|journey)\b.*\b(in|of)\b.*\b(ai|ml|tech|data|python|engineering)\b/i.test(q)) {
      return {text: 'I\'m from Haveri, Karnataka. My father passed away in 2006, and my mother took care of me and my two sisters on her own. I completed my education with an education loan, which I now want to repay while supporting my family. I can join immediately and am open to working from the office, remotely or in a hybrid role.', links: [], src: 'About me'};
    }
    if (/\b(remote|hybrid|work from (home|office)|wfh|work mode|work models?|on-?site|in[- ]office|(ok|okay|fine|comfortable|open) with (the )?office|office (work|job|role|based)|from (the )?office)\b/i.test(q) && !/\b(salary|relocat\w*|address|phone|experience|project|projects|built|used)\b/i.test(q) && !SENSITIVE_STRICT.test(q)) {
      return {text: 'I can join immediately and am open to working from the office, remotely or in a hybrid role.', links: lk('email'), src: 'About me'};
    }
    if (SENSITIVE.test(q)) {
      return {text: 'I would rather not share that in this chat. Please email me and we can talk about it.', links: lk('email'), src: ''};
    }
    function fact(id) { return FACTS.filter(function (f) { return f.id === id; })[0]; }
    function byId(id) { var f = fact(id); return {text: f.text, links: f.links, src: f.sec}; }
    if (/\b(fire|smoke)\b/i.test(q) && /\b(public|github|repo|repository|source|code)\b/i.test(q)) {
      return {text: 'I don\'t have a public repo for my Fire & Smoke Detection project, so I can\'t share its code. The project details are in my portfolio.', links: [], src: 'Projects'};
    }
    if (/\b(open[- ]?source|public repos?|public code)\b/i.test(q)) {
      return {text: 'My public code is on my GitHub: ZeroQueue, the Autonomous Lead Enrichment Agent, the Medical Chatbot, Video Context Extractor and a few smaller projects. Ask OLake and Fire & Smoke Detection do not have public repos.', links: lk('github'), src: 'Links'};
    }
    // Named topics: answer from the one fact the question is clearly about.
    var NAMED = [
      [/\bresource ?pro\b/i, 'resourcepro'], [/\bai4see\b/i, 'ai4see'], [/\bi ?neuron\b/i, 'ineuron'],
      [/\bolake\b|\bolack\b/i, 'olake'], [/\bzero ?queue\b/i, 'zeroqueue'], [/\bmedical\b/i, 'medical'],
      [/\bfire\b|\bsmoke\b/i, 'fire'], [/\blead enrichment\b/i, 'lead'], [/\bvideo context\b|\btranscript\w*\b/i, 'vce'],
      [/\bfine[- ]?tun\w*\b/i, 'fire'], [/\b(what do you do|what are you working on|your role|your profession)\b/i, 'intro'],
      [/\b(how many|how long|years? of|total) .*(experience)\b|\b(experience).*(how many|how long)\b|\b(work experience|work history|employment history)\b/i, 'experience']
    ];
    for (var ni = 0; ni < NAMED.length; ni++) {
      if (NAMED[ni][0].test(q) && !(NAMED[ni][1] !== 'fire' && /\b(langchain|pinecone|fastapi|flask|groq|docker|pytest|langgraph)\b/i.test(q) && USEQ.test(q))) {
        if (NAMED[ni][1] === 'fire' && /\bfine[- ]?tun/i.test(q) === false && !/\b(fire|smoke)\b/i.test(q)) continue;
        return byId(NAMED[ni][1]);
      }
    }
    var TOPICS = [
      [/\b(rag|retrieval|retrieval[- ]augmented)\b/i, 'I have built retrieval (RAG) systems in three projects: ZeroQueue (RAG over a support knowledge base indexed in Moss, with cited answers), the Medical Chatbot (LangChain and Pinecone vector search), and Ask OLake (TF-IDF retrieval over the OLake documentation).', ['zq', 'zqc', 'med', 'olake']],
      [/\b(agents?|agentic)\b/i, 'My agent work is the Autonomous Lead Enrichment Agent, a LangGraph state graph that crawls company websites with Playwright and extracts structured lead data with Groq. ZeroQueue also hands over to a human through the Intercom API when it cannot answer.', ['lead', 'zqc']],
      [/\b(computer vision|object detection|image)\b/i, 'My computer vision work is the Fire & Smoke Detection project (YOLO11 fine-tuned on a custom dataset) and my AI4SEE internship, where I trained YOLOv10 models and built a real-time detection system with YOLOv10 and DETR.', ['github']]
    ];
    if (!/\b(do you know|have you used|experience with|skills?)\b/i.test(q) || /\b(which|what|where) project/i.test(q)) {
      for (var ti = 0; ti < TOPICS.length; ti++) {
        if (TOPICS[ti][0].test(q) && /\b(project|projects|built|build|work|used|use|example|examples|experience)\b/i.test(q)) {
          return {text: TOPICS[ti][1], links: lk.apply(null, TOPICS[ti][2]), src: 'Projects'};
        }
      }
    }
    if ((/\bwhy (should|would|do) (we|i) hire\b|\bwhat makes you\b|\bstrengths?\b/i.test(q) || (/\bpositives?\b|\bgood (things?|points?|qualit(y|ies)|sides?|traits?)\b|\bbest (things?|qualit(y|ies)|points?|sides?|traits?)\b/i.test(q) && !/zeroqueue|olake|medical|fire|smoke|video|project|app|tool|code|repo|skill/i.test(q)))) {
      return {text: 'I am an AI Engineer who builds LLM, RAG and agent applications in Python and FastAPI. My projects include ZeroQueue and Ask OLake, and the code for several of them is public on my GitHub. Please look at my projects, or email me.', links: lk('github', 'email'), src: ''};
    }
    if (/\bwhy (did you |do you |have you )?(choose|chose|pick|picked|like|interested in|go into|get into|want)\b.*\b(ai|artificial intelligence|machine learning|this field)\b|\bwhat (motivates|drives|inspires) you\b|\bwhy (ai|ai engineering)\??$/i.test(q)) {
      return {text: 'I chose AI engineering because I want to build useful applications that solve real-world problems. AI can help people automate tasks, understand information and make better decisions. I\'m excited to contribute to the next generation of AI applications and make them useful in everyday life.', links: [], src: 'About me'};
    }
    if (/\b(hobb(y|ies)|free time|spare time|outside (of )?work|for fun|do you (sing|play|cook|read|write|garden|like music|listen)|play chess|badminton)\b/i.test(q)) {
      return {text: 'Outside work I enjoy chess, badminton, cooking, indoor gardening, reading, movies, writing, listening to music and singing.', links: [], src: 'Beyond work'};
    }
    if (/\b(born|birth ?place|place of birth)\b/i.test(q)) {
      return {text: 'I\'m originally from Haveri, Karnataka; my birthplace isn\'t listed here.', links: [], src: 'About me'};
    }
    if (/\b(hometown|home town|native|native place|originally|where (are|is) (you|she|bharati) from|where do you come from|belong to|from which (place|city|town))\b/i.test(q)) {
      return {text: 'I\'m originally from Haveri, Karnataka. I am based in Bengaluru now.', links: [], src: 'About me'};
    }
    var EDUQ = /\b(education|educational|degrees?|qualifications?|colleges?|universit\w*|institutes?|campus|studied|graduat\w*|masters?|mca|bca|bachelors?|undergrad\w*|cgpa|marks|percentage|harsha|sahyadri|kuvempu)\b|where did you study/i;
    if (EDUQ.test(q) && !/\b(certif\w*|courses?)\b/i.test(q)) {
      // Education routing: MCA (highest) by default, BCA only when asked, both only for an explicit full-history request.
      var wantMca = /\b(mca|master'?s?|masters|harsha|bangalore university|nelamangala|highest|latest|recent|current)\b/i.test(q);
      var wantBca = /\b(bca|bachelor'?s?|bachelors|undergrad\w*|sahyadri|kuvempu|shivamogga|first degree)\b/i.test(q);
      var wantAll = /\b(all|full|every|both|complete|entire|history|earlier|before|first)\b/i.test(q) && !wantBca || (wantMca && wantBca);
      var ids = wantAll ? ['education', 'education_bca'] : wantBca ? ['education_bca'] : ['education'];
      var picked = ids.map(function (id) { return FACTS.filter(function (f) { return f.id === id; })[0]; });
      return {text: picked.map(function (f) { return f.text; }), links: [], src: 'Education'};
    }
    function orig(w) { var ws = q.split(/[^A-Za-z0-9+#.-]+/); for (var i = 0; i < ws.length; i++) if (ws[i] && tok(ws[i])[0] === w) return ws[i]; return w; }
    var hits = EV.filter(function (e) { return e.re.test(q); });
    if (hits.length && (SKILLQ.test(q) || USEQ.test(q))) {
      var paras = [], links = [], seen = {};
      hits.forEach(function (e) {
        var names = e.uses.map(function (u) { return u[0]; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        paras.push(e.say ? e.say : 'I have used ' + e.n + ' in ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]) + '.' + (e.note ? ' ' + e.note : ''));
        e.uses.slice(0, 4).forEach(function (u) { if (!seen[u[2]]) { seen[u[2]] = 1; links.push([u[0] + ': ' + u[1], u[2]]); } });
      });
      return {text: paras, links: links.slice(0, 8), src: 'My public GitHub code, snapshot checked ' + GH_DATE + ' (newer commits are not included)'};
    }
    if (SKILLQ.test(q) && /\b(do you (know|use)|have you (used|worked|tried)|experience (with|in)|familiar with|are you (good|proficient|experienced|skilled)|worked with|work with|know about)\b/i.test(q) && q.length < 90) {
      var tech = t.filter(function (w) { return QGENERIC.indexOf(w) < 0; });
      var known = [], unknown = [];
      tech.forEach(function (w) { if (SKILLSET[w]) known.push(SKILLSET[w]); else if (DF[w] === undefined) unknown.push(w); });
      if (unknown.length) {
        var yes = known.length ? 'I have ' + known.map(function (k) { return k.n; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ') + ' listed on my resume. ' : '';
        return {text: yes + 'I don\'t have ' + unknown.map(orig).join(', ') + ' listed on my portfolio, so I can\'t say whether I have used it. You can see all my skills under Skills, or email me your question.', links: lk('email'), src: 'Skills'};
      }
      if (known.length && known.length === tech.length) {
        var used = USEQ.test(q), sent = known.map(function (k) {
          if (k.k === 'basic') return 'I have basic knowledge of ' + k.n + ' (listed under ' + k.g + ' on my resume).';
          if (k.k === 'noproject') return 'I know ' + k.n + ' (listed under ' + k.g + ' on my resume), but I have not used it in my projects.';
          return k.n + ' is listed under ' + k.g + ' on my resume.' + (used ? ' I don\'t have a public repo that shows it, so I can\'t point you to an example.' : '');
        }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        return {text: sent, links: [], src: 'Skills'};
      }
    }
    var LOWINFO = ['bangalore', 'bengaluru', 'rural', 'india', 'karnataka', 'nelamangala'];
    var t0 = t; t = t.filter(function (w) { return LOWINFO.indexOf(w) < 0; });
    if (!t.length && t0.length) {
      var fid = /\b(college|campus|institute|university|studied|study)\b/i.test(q) ? 'education' : /\b(are you|you in|you from|based|live|located)\b/i.test(q) ? 'location' : '';
      var ff = FACTS.filter(function (f) { return f.id === fid; })[0];
      if (ff) return byId(ff.id);
      return {text: 'Sorry, I did not understand that question. You can ask about my projects, skills, experience or education, or email me.', links: lk('email'), src: ''};
    }
    var scored = DOCS.map(function (d) {
      var s = 0, hit = 0;
      t.forEach(function (w) {
        var inKw = d.kw.indexOf(w) >= 0, inTx = d.tx.indexOf(w) >= 0;
        if (inKw || inTx) { s += idf(w) * (inKw ? 2 : 1); hit++; }
      });
      return {d: d, s: s, hit: hit};
    }).sort(function (a, b) { return b.s - a.s; });
    var top = scored[0];
    if (LINKWORDS.test(q) && top.d.f.id !== 'contact') {
      var lf = FACTS.filter(function (f) { return f.id === 'links'; })[0];
      if (!/project|demo|code|zeroqueue|lead|medical|fire|video/i.test(q)) top = {d: {f: lf}, s: 99, hit: 1};
    }
    if (top.s < 2.2 || top.hit < 1) {
      return {text: 'Sorry, I did not understand that question. You can ask about my projects, skills, experience or education, or email me.', links: lk('email', 'linkedin'), src: ''};
    }
    if (/\b(college|campus|institute|university)\b/i.test(q) && top.d.f.id !== 'education') {
      var ef = FACTS.filter(function (f) { return f.id === 'education'; })[0]; top = {d: {f: ef}, s: 99, hit: 1};
    }
    var out = [top.d.f];
    var second = scored[1];
    if (second && top.s < 99 && second.s >= 0.85 * top.s && second.d.f.sec !== top.d.f.sec && out.length < 2) out.push(second.d.f);
    var links = [], seenL = {};
    out.forEach(function (f) { f.links.forEach(function (l) { if (!seenL[l[1]]) { seenL[l[1]] = 1; links.push(l); } }); });
    return {text: out.map(function (f) { return f.text; }).join('\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean), links: links, src: out.map(function (f) { return f.sec; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ')};
  }

  // ---------- project questions and follow-ups (prepared answers from my resume and portfolio facts only) ----------
  var PROJ = [
    ['olake', /\bolake\b|\bolack\b|\btf-?idf\b/i], ['zeroqueue', /\bzero ?queue\b/i], ['medical', /\bmedical (chat)?bot\b|\bmedical chatbot\b/i],
    ['fire', /\bfire\b.*\bsmoke\b|\bsmoke detection\b/i], ['lead', /\blead enrichment\b/i], ['vce', /\bvideo context\b/i]
  ];
  var INTENT = [
    ['problem', /\bproblem\b|\bsolv\w*\b|\bpurpose\b|\bgoal\b|\bwhy (did you|have you|do you)? ?(build|built|make|made|create|created)\b|\bwhat (is|does) (it|this)( do)?\b/i],
    ['users', /\bwho (would|will|can|could|should|uses?)\b|\busers?\b|\baudience\b|\bwho is it for\b/i],
    ['flow', /\bhow (does|do|did|is|are)\b.*\b(work|works|answer|answers|become|retriev\w+|built|made|flow)\b|\bbecome (an )?answer\b|\bpipeline\b|\barchitecture\b|\bexplain\b|\bflow\b/i],
    ['database', /\bdatabase\b|\bdb\b|\bstorage\b|\bstore[sd]?\b|\bvector (db|store|database)\b/i],
    ['choice', /\bwhy\b.*\b(use|used|choose|chose|pick|picked)\b|\blibrar(y|ies)\b|\bstack\b|\bwhich (tools|technolog\w+)\b|\bwhy tf-?idf\b/i],
    ['limits', /\blimit\w*\b|\bweakness\w*\b|\bimprov\w*\b|\bchallenge\w*\b|\bnext\b|\bwhat would you (change|add)\b/i]
  ];
  var PQA = {
    olake: {
      problem: 'Ask OLake answers OLake data-ingestion setup, sync and Iceberg table-maintenance questions from the documentation, with numbered steps and cited sources, so people do not have to search the docs by hand.',
      users: 'It is aimed at people reading the OLake documentation to set up, sync and maintain Iceberg tables. I built it at the OLake hackathon, so my portfolio has no usage data for it.',
      flow: 'A question goes to the public POST /ask API. It retrieves matching passages with TF-IDF from a downloaded snapshot of 121 documentation pages (698 passages), runs relevance and evidence checks to reduce unsupported answers, and returns numbered steps with source links that jump to the matching doc section. Optional LLM answers also get an exact-quote check.',
      choice: 'Ask OLake uses scikit-learn TF-IDF to retrieve passages from the documentation snapshot, with relevance and evidence checks on top. It is written in Python with FastAPI, has a small embeddable chat widget in JavaScript, is deployed on Vercel and is tested with 188 pytest checks. My portfolio does not spell out why I chose TF-IDF over other retrieval methods, so please email me if you want to discuss that.',
      database: 'My portfolio does not list a database for Ask OLake. It retrieves from a downloaded snapshot of the OLake documentation (121 pages, 698 passages).',
      limits: 'Ask OLake only knows the documentation snapshot I downloaded, so newer pages are not included, and the relevance and evidence checks reduce unsupported answers but do not remove them. It has no public repo.'
    }
  };
  var ctx = {project: null};
  function answerCtx(q) {
    var pid = null, i;
    for (i = 0; i < PROJ.length; i++) if (PROJ[i][1].test(q)) { pid = PROJ[i][0]; break; }
    var pron = /\b(it|this|that|the project|this project|that project|its)\b/i.test(q);
    var intents = [];
    for (i = 0; i < INTENT.length; i++) if (INTENT[i][1].test(q)) intents.push(INTENT[i][0]);
    var useId = pid || (ctx.project && intents.length ? ctx.project : null);
    if (useId && intents.length && PQA[useId]) {
      var parts = intents.filter(function (k) { return PQA[useId][k]; }).slice(0, 3).map(function (k) { return PQA[useId][k]; });
      if (parts.length) { ctx.project = useId; return {text: parts, links: [], src: 'Projects'}; }
    }
    if (!pid && !ctx.project && pron && intents.length && /\b(project|it|this)\b/i.test(q) && !/\b(skill|experience|education|college)\b/i.test(q)) {
      return {text: 'Which project do you mean? I can talk about Ask OLake, ZeroQueue, the Medical Chatbot, Fire & Smoke Detection, the Autonomous Lead Enrichment Agent or the Video Context Extractor.', links: [], src: 'Projects'};
    }
    // one project asked for ("main", "strongest", "best" project, singular): lead with ZeroQueue, the lead project on my resume
    if (!pid && !/\bprojects\b/i.test(q) && /\b(main|strongest|strong|best|top|flagship|biggest|signature|proudest|favou?rite|most (impressive|important|significant))\b[^?.!]*\bproject\b|\bproject\b[^?.!]*\b(main|strongest|best|top|flagship|biggest)\b/i.test(q)) {
      ctx.project = 'zeroqueue';
      return {text: 'My lead project is ZeroQueue, an AI gift-card support copilot that I co-built with a teammate at the HiDevs YC Fall 2026 "Moss Zero-Latency Builder Sprint". I built the Python and FastAPI backend with a RAG pipeline over a support knowledge base of 100 brands, returning cited answers. It runs as one Docker container on Render, with 64 pytest tests on every push. Ask about any other project by name, or ask for all my projects.', links: lk('zq', 'zqc'), src: 'Projects'};
    }
    var r = answer(q);
    if (pid) ctx.project = pid;
    else if (r && r.src === 'Projects' && /Ask OLake/.test(JSON.stringify(r.text))) ctx.project = 'olake';
    return r;
  }
  AB.answer = answerCtx;
})((window.AskBharati = window.AskBharati || {}));
