# Rebuilding chat data after editing approved-qa.yml

1. Edit `ask-bharati/data/approved-qa.yml` (answers, keywords, links). Keep wording factual - the chat shows it verbatim.
2. Regenerate the runtime facts file (needs Python + PyYAML):
   `python ask-bharati/tools/build_from_yaml.py`
   Review the change in `ask-bharati/data/facts.js` before pushing.
3. Because meaning-matching uses precomputed vectors, also regenerate `ask-bharati/data/anchors.json` (needs Node.js once):
   `cd ask-bharati/tools && npm install && node build_anchors.mjs`
4. Push the changed files. Do not edit facts.js or anchors.json by hand.
