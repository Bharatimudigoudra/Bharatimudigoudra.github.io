/* Semantic routing for Ask Bharati: matches a question to one approved fact by meaning.
   Runs fully in the visitor's browser (Transformers.js + ONNX Runtime Web, WASM on CPU).
   The model never writes answer text; it only picks which approved fact to show.
   All assets are served from this site (no third-party requests, no API key). */
(function (AB) {
  'use strict';
  var state = 'idle', pipe = null, anchors = [], threshold = 0.67, margin = 0, qPrefix = '', readyP = null;
  function b64ToF32(b) {
    var bin = atob(b), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Float32Array(buf);
  }
  function warm() {
    if (readyP) return readyP;
    state = 'loading';
    readyP = import(/* webpackIgnore: true */ AB.root + 'vendor/transformers.min.js').then(function (T) {
      T.env.allowRemoteModels = false;
      T.env.localModelPath = AB.root + 'models/';
      T.env.backends.onnx.wasm.wasmPaths = AB.root + 'vendor/ort/';
      T.env.backends.onnx.wasm.numThreads = 1;
      var anchorsP = fetch(AB.root + 'data/anchors.json').then(function (r) {
        if (!r.ok) throw new Error('anchors ' + r.status);
        return r.json();
      });
      var pipeP = T.pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { quantized: true });
      return Promise.all([anchorsP, pipeP]);
    }).then(function (rr) {
      var data = rr[0];
      anchors = data.anchors.map(function (a) { return { id: a.id, v: b64ToF32(a.v) }; });
      if (typeof data.threshold === 'number') threshold = data.threshold;
      if (typeof data.margin === 'number') margin = data.margin;
      if (typeof data.queryPrefix === 'string') qPrefix = data.queryPrefix;
      pipe = rr[1];
      state = 'ready';
    }).catch(function (e) { state = 'failed'; throw e; });
    return readyP;
  }
  function route(q) {
    return warm().then(function () {
      if (state !== 'ready') throw new Error('semantic not ready: ' + state);
      return pipe(qPrefix + q, { pooling: 'mean', normalize: true });
    }).then(function (out) {
      var qv = out.data, best = -1, second = -1, bestId = null;
      for (var a = 0; a < anchors.length; a++) {
        var v = anchors[a].v, d = 0;
        for (var i = 0; i < qv.length; i++) d += qv[i] * v[i];
        if (d > best) { second = best; best = d; bestId = anchors[a].id; }
        else if (d > second) second = d;
      }
      return (best >= threshold && best - second >= margin) ? bestId : null;
    });
  }
  AB.semantic = { warm: warm, route: route, state: function () { return state; } };
})((window.AskBharati = window.AskBharati || {}));
