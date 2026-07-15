(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;
  var fallbackCounter = 0;

  if (!app || !app.Random) {
    throw new Error("TribalKindnessDetectiveV2 namespace and Random must be loaded first.");
  }

  function toHex(value) {
    return ("00000000" + (value >>> 0).toString(16)).slice(-8);
  }

  function cryptoSeed(cryptoSource) {
    var words;

    if (!cryptoSource || typeof cryptoSource.getRandomValues !== "function") {
      return null;
    }

    try {
      words = new Uint32Array(4);
      cryptoSource.getRandomValues(words);
      return "tkd2-session-" + Array.prototype.map.call(words, toHex).join("");
    } catch (_error) {
      return null;
    }
  }

  function fallbackSeed(options) {
    var now = typeof options.now === "function" ? options.now() : Date.now();
    var random = typeof options.random === "function" ? options.random() : Math.random();
    var performanceNow = typeof options.performanceNow === "function"
      ? options.performanceNow()
      : root.performance && typeof root.performance.now === "function"
        ? root.performance.now()
        : 0;
    var material;
    var first;
    var second;

    fallbackCounter += 1;
    material = [now, performanceNow, random, fallbackCounter].join(":");
    first = app.Random.hashSeed(material);
    second = app.Random.hashSeed(material + ":fallback");
    return "tkd2-session-fallback-" + toHex(first) + toHex(second) + "-" + fallbackCounter.toString(36);
  }

  function create(options) {
    var settings = options || {};
    var cryptoSource = Object.prototype.hasOwnProperty.call(settings, "cryptoSource")
      ? settings.cryptoSource
      : root.crypto;

    return cryptoSeed(cryptoSource) || fallbackSeed(settings);
  }

  app.SessionSeed = Object.freeze({
    create: create
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
