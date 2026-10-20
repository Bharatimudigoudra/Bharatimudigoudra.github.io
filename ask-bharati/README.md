# Ask Bharati chat

A static, automated Q&A widget for the portfolio. No model. Answers are prepared text matched to the question. The only network call is the optional history email described below.

## Structure
- `chat.css` - styles for the launcher, panel and pop-out
- `window.html` - page used by the pop-out fallback window
- `js/loader.js` - the only script `index.html` includes; loads the rest in order
- `js/answer.js` - question matching and rules (private topics, unknown skills, GitHub evidence)
- `js/ui.js` - launcher, panel, drag/resize, Picture-in-Picture pop-out
- `data/facts.js` - the facts the chat answers from (edit answers here)
- `data/config.js` - the public Web3Forms key for history emails (remove it to turn them off)
- `data/github-evidence.js` - GENERATED, links to public repo code at a pinned commit
- `tools/evidence_map.json` - which skill is shown by which file and pattern
- `tools/refresh_github_evidence.py` - rebuilds `data/github-evidence.js`

## Project questions
A single "main / strongest / best / flagship project" question gets one answer, ZeroQueue (the lead project on my resume). Plural questions ("main projects", "all projects") get the full list.
The chat keeps track of the last project you asked about, so follow-ups such as "who would use it" or "which database" use it. Ask OLake has prepared answers for problem, users, flow, choices, database and limits, written only from the resume and portfolio facts. Other projects answer from their portfolio description. If the portfolio has no detail on a point, the answer says so.

## Refresh the GitHub evidence
From the portfolio folder: `python ask-bharati/tools/refresh_github_evidence.py`
It reads public repos only, pins links to each repo's latest commit, and stops if a pattern is no longer found.
The date shown to visitors is the day you run it. Until then, answers say "snapshot checked <date>, newer commits not included".

## Limits
- Education answers: MCA (highest) by default, BCA only when asked, both only for a full-history request.
- Ask OLake and the Fire & Smoke fine-tuning have no public repo, so no link is shown for them.
- Django, PostgreSQL, LoRA and VLMs are knowledge only.
- Not mapped (no public evidence): FAISS, Weaviate, LlamaIndex, MCP, RAGAS, DeepEval, LangSmith, MongoDB, MySQL.

## Personal answers (v8)
Approved by Bharati on 20 Oct 2026: why AI engineering, hobbies, Haveri hometown, and a short family background (father's passing year, education loan without amount, mother and two sisters). Names, medical details, loan amount, sibling details, age and exact location are not in the chat; questions about them get the privacy reply. All answers are fixed text in data/facts.js and js/answer.js.

## Resume
The Resume buttons and the chat resume link open `assets/resume/Bharati_Mudigoudra_Resume.pdf`. It is the FlowCV export (Resume 1). To update it later, replace that one file with the new PDF. It is not synced automatically from FlowCV or LinkedIn.

## Root README
The update command appends a short "Ask Bharati" section to the root README.md (your existing text is kept; the original is copied to the backup folder first). Re-running does not duplicate it.

## Site layout
- `index.html` - the page (must stay in the root for GitHub Pages)
- `assets/css/style.css` - the page styles
- `assets/resume/` - the resume PDF
- `ask-bharati/` - the chat (this folder)
- `index.before-ask-bharati.bak` - backup of the page from before the chat; kept on purpose
- `.env` - local only, never committed; see below

## Chat gate and history emails
- Before the first question the chat asks for an email address. It only checks that it looks like an email ("Please enter a valid email ID"). It is not verified, so it does not prove who someone is.
- Visitors are told before anything is sent that their email and questions go to Bharati by email through Web3Forms, and that she may use the email to follow up about job openings. Nothing is sent to the visitor.
- Questions and answers are batched and emailed to Bharati's Gmail through Web3Forms (free plan, 250 emails a month, so at most 6 emails per visit). Sending happens about 20 seconds after a question, after 5 questions, and when the tab is hidden or closed. If the send fails the visitor sees a message and it is retried with the next question. A closed tab can still lose the last batch, so history is best effort, not a guaranteed log.
- Web3Forms processes the form data. Its terms (web3forms.com/terms section 17, /dpa section 8) say submissions are kept up to 3 years by default, while its FAQ says it does not store them. So the form's data retention was set to 7 days in the Web3Forms dashboard (Settings > Advanced Options, checked after reload on 20 Oct 2026); it only deletes Web3Forms's copy. Emails already in your Gmail stay until you delete them. The visitor notice says this.
- Spam protection: a hidden honeypot field, Web3Forms's Advanced Spam Filter (on, Basic level), the free-plan cap of 250 emails a month, and at most 6 emails per visit. No CAPTCHA: Web3Forms's free hCaptcha needs a fresh solved token for every submission, and chat history is sent in the background in batches, so it cannot be used without asking visitors to solve a puzzle repeatedly. Anyone who finds the public key can still send mail to Bharati up to the monthly cap; when the cap is used up, history emails stop.
- Opening the page from a local file (`file://`) is preview mode: no email prompt and nothing is sent. Add `?gate=1` to a local address to test the prompt.
- "My testing mode": a small link under the email field. It is for the site owner, but it is NOT a secure owner login: anyone can click it. It remembers the choice in this browser only (localStorage key `abTesting`), skips the email field and sends no history emails; a yellow bar shows that it is on, with "Exit testing mode" to turn it off and bring the normal email prompt back. It also applies in the pop-out window. It unlocks nothing private. To reset by hand, clear this site's data in the browser.
- Nothing from visitors is stored in this repo.

## Status (20 Oct 2026)
- Answers, chat window, pop-out, GitHub evidence links: working. Evidence is refreshed by running the script above by hand; there is no automatic sync.
- Ask OLake project card: added to the page, live demo link only (no public repo).
- Email gate and history: built and tested as described; delivery depends on Web3Forms and its free limit.
- `.env` is not used by this site. Keep it out of Git: the update command adds `.env` to `.gitignore` if missing.
