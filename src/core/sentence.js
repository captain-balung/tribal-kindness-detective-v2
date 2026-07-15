(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app || !app.Content) {
    throw new Error("Content must be loaded before Sentence.");
  }

  var Content = app.Content;

  function sameSequence(left, right) {
    var index;

    if (left.length !== right.length) {
      return false;
    }

    for (index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) {
        return false;
      }
    }

    return true;
  }

  function knownTokenIds(tokenIds) {
    return Array.isArray(tokenIds) && tokenIds.every(function (tokenId) {
      return Boolean(Content.getToken(tokenId));
    });
  }

  function hasUniqueTokenIds(tokenIds) {
    return new Set(tokenIds).size === tokenIds.length;
  }

  function classify(tokenIds) {
    var index;
    var pattern;

    if (!knownTokenIds(tokenIds) || !hasUniqueTokenIds(tokenIds)) {
      return null;
    }

    for (index = 0; index < Content.questionPatterns.length; index += 1) {
      pattern = Content.questionPatterns[index];
      if (sameSequence(tokenIds, pattern.tokenIds)) {
        return pattern;
      }
    }

    return null;
  }

  function format(tokenIds) {
    var words;

    if (!knownTokenIds(tokenIds)) {
      throw new TypeError("Sentence contains an unknown token ID.");
    }
    if (tokenIds.length === 0) {
      return "";
    }

    words = tokenIds.map(function (tokenId) {
      return Content.getToken(tokenId).text;
    });
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(" ") + "?";
  }

  function available(tokenIds) {
    var used = new Set(tokenIds || []);
    return Content.tokens.filter(function (token) {
      return !used.has(token.tokenId);
    }).map(function (token) {
      return token.tokenId;
    });
  }

  function makeError(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function assertEditableSequence(tokenIds) {
    if (!knownTokenIds(tokenIds)) {
      throw makeError("unknown_token", "Sentence contains an unknown token ID.");
    }
    if (!hasUniqueTokenIds(tokenIds)) {
      throw makeError("duplicate_token", "A vocabulary token may appear only once.");
    }
  }

  function normalizeIndex(index, length) {
    if (typeof index === "undefined" || index === null) {
      return length;
    }
    if (!Number.isInteger(index) || index < 0 || index > length) {
      throw makeError("invalid_index", "Token position is outside the sentence.");
    }
    return index;
  }

  function add(tokenIds, tokenId, toIndex) {
    var result = tokenIds.slice();
    var index;

    assertEditableSequence(result);
    if (!Content.getToken(tokenId)) {
      throw makeError("unknown_token", "Unknown token: " + tokenId);
    }
    if (result.indexOf(tokenId) !== -1) {
      throw makeError("duplicate_token", "Token is already in the sentence: " + tokenId);
    }

    index = normalizeIndex(toIndex, result.length);
    result.splice(index, 0, tokenId);
    return result;
  }

  function remove(tokenIds, tokenId) {
    var result = tokenIds.slice();
    var index;

    assertEditableSequence(result);
    index = result.indexOf(tokenId);
    if (index === -1) {
      throw makeError("token_not_in_sentence", "Token is not in the sentence: " + tokenId);
    }
    result.splice(index, 1);
    return result;
  }

  function move(tokenIds, tokenId, toIndex) {
    var result = tokenIds.slice();
    var fromIndex;
    var index;

    assertEditableSequence(result);
    fromIndex = result.indexOf(tokenId);
    if (fromIndex === -1) {
      throw makeError("token_not_in_sentence", "Token is not in the sentence: " + tokenId);
    }
    if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= result.length) {
      throw makeError("invalid_index", "Token position is outside the sentence.");
    }

    result.splice(fromIndex, 1);
    index = Math.min(toIndex, result.length);
    result.splice(index, 0, tokenId);
    return result;
  }

  app.Sentence = Object.freeze({
    classify: classify,
    format: format,
    available: available,
    add: add,
    remove: remove,
    move: move
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
