(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app || !app.Content || !app.Stories || !app.Random) {
    throw new Error("Content, Stories and Random must be loaded before RoundContent.");
  }

  var STORY_NAMESPACE = ":story-variant:";
  var TOKEN_NAMESPACE = ":token-permutation:";

  function normalizeOptions(options) {
    var settings = options || {};
    var round = settings.round;

    if (!Number.isInteger(round) || round < 1) {
      throw new RangeError("round must be a positive integer.");
    }
    return {
      seed: String(typeof settings.seed === "undefined" ? "tribal-kindness-v2" : settings.seed),
      round: round
    };
  }

  function selectStory(missionId, options) {
    var settings = normalizeOptions(options);
    var pool = app.Stories.forMission(missionId);
    var random;

    if (pool.length !== 2) {
      throw new Error("Mission must map to exactly two stories: " + missionId);
    }
    random = app.Random.create(
      settings.seed + STORY_NAMESPACE + settings.round + ":" + missionId
    );
    return pool[random.integer(pool.length)];
  }

  function createTokenPermutation(options) {
    var settings = normalizeOptions(options);
    var tokenIds = app.Content.tokens.map(function (token) {
      return token.tokenId;
    });

    return app.Random.shuffle(
      tokenIds,
      settings.seed + TOKEN_NAMESPACE + settings.round
    );
  }

  app.RoundContent = Object.freeze({
    selectStory: selectStory,
    createTokenPermutation: createTokenPermutation
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
