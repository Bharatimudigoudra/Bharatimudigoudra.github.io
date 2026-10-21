#!/usr/bin/env python3
"""Regenerate ask-bharati/js/../data/facts.js from data/approved-qa.yml.
Run from the repo root:  python ask-bharati/tools/build_from_yaml.py
Needs PyYAML (conda/pip). Rewrites ONLY data/facts.js; review the diff before pushing.
After answer text changes, also regenerate data/anchors.json - see tools/README.md."""
import json, sys, os
try:
    import yaml
except ImportError:
    sys.exit('PyYAML missing: pip install pyyaml')
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
with open(os.path.join(root, 'data', 'approved-qa.yml'), encoding='utf-8') as f:
    doc = yaml.safe_load(f)
EMAIL = doc['email']
L = doc['links']
def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r').replace("'", "\\'") + "'"
def js_text(s):
    # {EMAIL} becomes a + EMAIL + concatenation, matching the original file shape
    parts = s.split('{EMAIL}')
    return ' + EMAIL + '.join(js_str(p) for p in parts)
out = []
out.append("/* GENERATED from ask-bharati/data/approved-qa.yml by tools/build_from_yaml.py - edit the YAML, not this file.\n   Public facts the chat answers from. Sources: current resume and the live portfolio page; where they differ the resume wins.\n   Anything neither supports is left out. */")
out.append("(function (AB) {\n  'use strict';")
out.append("  var EMAIL = " + js_str(EMAIL) + ";")
lines = ['  var L = {']
items = list(L.items())
for i, (k, v) in enumerate(items):
    lines.append("    " + k + ": [" + js_str(v[0]) + ", " + js_str(v[1]) + "]" + (',' if i < len(items) - 1 else ''))
lines.append('  };')
out.append('\n'.join(lines))
out.append("  var lk = function () { return Array.prototype.map.call(arguments, function (k) { return L[k]; }); };")
out.append('  var FACTS = [')
for i, f in enumerate(doc['facts']):
    links = ', '.join(js_str(k) for k in f.get('links', []))
    out.append("    {id: " + js_str(f['id']) + ", sec: " + js_str(f['sec']) + ", kw: " + js_str(f['kw']) + ",\n     text: " + js_text(f['text']) + ",\n     links: lk(" + links + ")}" + (',' if i < len(doc['facts']) - 1 else ''))
out.append('  ];')
out.append("\n  AB.EMAIL = EMAIL; AB.L = L; AB.lk = lk; AB.FACTS = FACTS;\n})((window.AskBharati = window.AskBharati || {}));")
dest = os.path.join(root, 'data', 'facts.js')
with open(dest, 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(out) + '\n')
print('wrote', dest)
