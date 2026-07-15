(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app) {
    throw new Error("TribalKindnessDetectiveV2 namespace must be loaded first.");
  }

  function hashSeed(seed) {
    var text = String(typeof seed === "undefined" ? "tribal-kindness-v2" : seed);
    var hash = 2166136261;
    var index;

    for (index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function create(seed) {
    var state = hashSeed(seed) || 0x6d2b79f5;

    function next() {
      var value;

      state = (state + 0x6d2b79f5) >>> 0;
      value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }

    function integer(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError("integer(maxExclusive) requires a positive integer.");
      }

      return Math.floor(next() * maxExclusive);
    }

    function shuffle(items) {
      var result = items.slice();
      var index;
      var swapIndex;
      var temporary;

      for (index = result.length - 1; index > 0; index -= 1) {
        swapIndex = integer(index + 1);
        temporary = result[index];
        result[index] = result[swapIndex];
        result[swapIndex] = temporary;
      }

      return result;
    }

    return Object.freeze({
      next: next,
      integer: integer,
      shuffle: shuffle
    });
  }

  function shuffle(items, seed) {
    return create(seed).shuffle(items);
  }

  app.Random = Object.freeze({
    hashSeed: hashSeed,
    create: create,
    shuffle: shuffle
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
