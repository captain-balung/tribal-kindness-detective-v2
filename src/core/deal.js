(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app || !app.Content || !app.Random) {
    throw new Error("Content and Random must be loaded before Deal.");
  }

  var Content = app.Content;
  var Random = app.Random;
  var TRANSPORT_IDS = Content.transportCards.map(function (card) {
    return card.transportCardId;
  });
  var COMBINATIONS = ["male", "female"].reduce(function (all, gender) {
    return all.concat(TRANSPORT_IDS.map(function (transportCardId) {
      return {
        roleGender: gender,
        transportCardId: transportCardId,
        key: gender + ":" + transportCardId
      };
    }));
  }, []);

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freezeDeal(value) {
    value.assignments.forEach(Object.freeze);
    Object.freeze(value.assignments);
    return Object.freeze(value);
  }

  function create(options) {
    var settings = options || {};
    var seed = String(typeof settings.seed === "undefined" ? "tribal-kindness-v2" : settings.seed);
    var round = Number.isInteger(settings.round) && settings.round > 0 ? settings.round : 1;
    var prefix = seed + ":deal:" + round + ":";
    var maleRoles = Content.roleCards.filter(function (card) { return card.gender === "male"; });
    var femaleRoles = Content.roleCards.filter(function (card) { return card.gender === "female"; });
    var shuffledMale = Random.shuffle(maleRoles, prefix + "male");
    var shuffledFemale = Random.shuffle(femaleRoles, prefix + "female");
    var bundles = [];
    var shuffledBundles;
    var assignments;

    TRANSPORT_IDS.forEach(function (transportCardId, index) {
      bundles.push({
        roleCardId: shuffledMale[index].roleCardId,
        transportCardId: transportCardId
      });
      bundles.push({
        roleCardId: shuffledFemale[index].roleCardId,
        transportCardId: transportCardId
      });
    });

    shuffledBundles = Random.shuffle(bundles, prefix + "holders");
    assignments = Content.holders.map(function (holder, index) {
      return {
        holderId: holder.holderId,
        roleCardId: shuffledBundles[index].roleCardId,
        transportCardId: shuffledBundles[index].transportCardId
      };
    });

    return freezeDeal({
      seed: seed,
      round: round,
      assignments: assignments
    });
  }

  function getAssignment(deal, holderId) {
    var index;

    if (!deal || !Array.isArray(deal.assignments)) {
      return null;
    }

    for (index = 0; index < deal.assignments.length; index += 1) {
      if (deal.assignments[index].holderId === holderId) {
        return deal.assignments[index];
      }
    }

    return null;
  }

  function resolveTarget(deal, roleGender, transportCardId) {
    var matches = deal.assignments.filter(function (assignment) {
      var role = Content.getRoleCard(assignment.roleCardId);
      return role && role.gender === roleGender && assignment.transportCardId === transportCardId;
    });

    if (matches.length !== 1) {
      throw new Error(
        "Mission " + roleGender + ":" + transportCardId + " resolved to " + matches.length + " holders."
      );
    }

    return matches[0].holderId;
  }

  function createMission(deal, options) {
    var settings = options || {};
    var baseSeed;
    var round;
    var offset;
    var combination;

    if (!deal || !Array.isArray(deal.assignments)) {
      throw new TypeError("createMission(deal) requires a valid deal.");
    }

    baseSeed = String(typeof settings.seed === "undefined" ? deal.seed : settings.seed);
    round = Number.isInteger(settings.round) && settings.round > 0 ? settings.round : deal.round;
    offset = Random.hashSeed(baseSeed + ":mission-offset") % COMBINATIONS.length;
    combination = COMBINATIONS[(offset + round - 1) % COMBINATIONS.length];

    return Object.freeze({
      missionId: combination.key,
      roleGender: combination.roleGender,
      transportCardId: combination.transportCardId,
      targetHolderId: resolveTarget(deal, combination.roleGender, combination.transportCardId)
    });
  }

  function validate(deal) {
    var errors = [];
    var holderIds;
    var roleIds;
    var transportCounts = {};
    var combinations = {};

    if (!deal || !Array.isArray(deal.assignments)) {
      return ["deal.assignments must be an array"];
    }

    holderIds = deal.assignments.map(function (assignment) { return assignment.holderId; });
    roleIds = deal.assignments.map(function (assignment) { return assignment.roleCardId; });

    if (deal.assignments.length !== Content.holders.length) {
      errors.push("deal must contain six assignments");
    }
    if (new Set(holderIds).size !== Content.holders.length) {
      errors.push("holder IDs must be unique");
    }
    if (new Set(roleIds).size !== Content.roleCards.length) {
      errors.push("role card IDs must be unique");
    }

    deal.assignments.forEach(function (assignment) {
      var role = Content.getRoleCard(assignment.roleCardId);
      var transport = Content.getTransportCard(assignment.transportCardId);
      var key;

      if (!Content.getHolder(assignment.holderId)) {
        errors.push("unknown holder: " + assignment.holderId);
      }
      if (!role) {
        errors.push("unknown role card: " + assignment.roleCardId);
      }
      if (!transport) {
        errors.push("unknown transport card: " + assignment.transportCardId);
      }
      if (!role || !transport) {
        return;
      }

      transportCounts[transport.transportCardId] = (transportCounts[transport.transportCardId] || 0) + 1;
      key = role.gender + ":" + transport.transportCardId;
      combinations[key] = (combinations[key] || 0) + 1;
    });

    TRANSPORT_IDS.forEach(function (transportCardId) {
      if (transportCounts[transportCardId] !== 2) {
        errors.push(transportCardId + " must occur exactly twice");
      }
    });
    COMBINATIONS.forEach(function (combination) {
      if (combinations[combination.key] !== 1) {
        errors.push(combination.key + " must occur exactly once");
      }
    });

    return errors;
  }

  app.Deal = Object.freeze({
    combinations: Object.freeze(COMBINATIONS.map(function (combination) {
      return Object.freeze(copy(combination));
    })),
    create: create,
    createMission: createMission,
    getAssignment: getAssignment,
    resolveTarget: resolveTarget,
    validate: validate
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
