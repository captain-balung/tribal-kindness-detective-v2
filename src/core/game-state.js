(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app || !app.Content || !app.Deal || !app.Sentence || !app.RoundContent) {
    throw new Error("Content, Deal, Sentence and RoundContent must be loaded before GameState.");
  }

  var Content = app.Content;
  var Deal = app.Deal;
  var Sentence = app.Sentence;
  var RoundContent = app.RoundContent;
  var STATUSES = [
    "ready",
    "cards_dealt",
    "mission_revealed",
    "questioning",
    "guessing",
    "solved"
  ];

  function copy(value) {
    if (value === null || typeof value === "undefined") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function create(options) {
    var settings = options || {};
    var baseSeed = String(typeof settings.seed === "undefined" ? "tribal-kindness-v2" : settings.seed);
    var round = 1;
    var internalDeal = null;
    var internalMission = null;
    var initialTokenOrder = null;
    var listeners = [];
    var state;

    function makePublicHolder(holder) {
      return {
        holderId: holder.holderId,
        visualId: holder.visualId,
        label: holder.label,
        visualState: "empty",
        cards: {
          role: { state: "not-dealt" },
          transport: { state: "not-dealt" }
        }
      };
    }

    function freshState() {
      initialTokenOrder = RoundContent.createTokenPermutation({
        seed: baseSeed,
        round: round
      });
      return {
        status: "ready",
        round: round,
        mission: null,
        selectedHolderId: null,
        holders: Content.holders.map(makePublicHolder),
        sentenceTokenIds: [],
        sentenceText: "",
        investigations: [],
        lastExchange: null,
        attempts: 0,
        lastGuess: null,
        solvedHolderId: null,
        feedback: null
      };
    }

    function getSnapshot() {
      return copy(state);
    }

    function getWordBankTokenIds() {
      var used = new Set(state.sentenceTokenIds);

      return initialTokenOrder.filter(function (tokenId) {
        return !used.has(tokenId);
      });
    }

    function emit(action) {
      var snapshot = getSnapshot();
      listeners.slice().forEach(function (listener) {
        listener(snapshot, action);
      });
    }

    function succeed(action, details) {
      var result = details || {};
      result.ok = true;
      result.action = action;
      result.snapshot = getSnapshot();
      emit(action);
      return result;
    }

    function fail(action, code, message) {
      return {
        ok: false,
        action: action,
        error: { code: code, message: message },
        snapshot: getSnapshot()
      };
    }

    function failWithFeedback(action, code, message) {
      state.feedback = message;
      emit(action);
      return {
        ok: false,
        action: action,
        error: { code: code, message: message },
        snapshot: getSnapshot()
      };
    }

    function requireStatus(action, accepted) {
      if (accepted.indexOf(state.status) === -1) {
        return fail(
          action,
          "invalid_status",
          "Action " + action + " is not available while status is " + state.status + "."
        );
      }
      return null;
    }

    function requireHolder(action, holderId) {
      if (!Content.getHolder(holderId)) {
        return fail(action, "unknown_holder", "Unknown holder: " + holderId);
      }
      return null;
    }

    function updateSentence(tokenIds) {
      state.sentenceTokenIds = tokenIds;
      state.sentenceText = Sentence.format(tokenIds);
      state.feedback = null;
    }

    function editSentence(action, operation) {
      var invalid = requireStatus(action, ["mission_revealed", "questioning"]);

      if (invalid) {
        return invalid;
      }

      try {
        updateSentence(operation());
      } catch (error) {
        return fail(action, error.code || "sentence_error", error.message);
      }

      return succeed(action);
    }

    function dealCards() {
      var invalid = requireStatus("deal_cards", ["ready"]);
      var errors;

      if (invalid) {
        return invalid;
      }

      internalDeal = Deal.create({ seed: baseSeed, round: round });
      errors = Deal.validate(internalDeal);
      if (errors.length) {
        internalDeal = null;
        return fail("deal_cards", "invalid_deal", errors.join("; "));
      }

      state.holders.forEach(function (holder) {
        holder.visualState = "holding";
        holder.cards.role = { state: "hidden" };
        holder.cards.transport = { state: "hidden" };
      });
      state.status = "cards_dealt";
      state.feedback = "六位持卡學生都抽到了兩張蓋牌。";
      return succeed("deal_cards");
    }

    function drawMission() {
      var invalid = requireStatus("draw_mission", ["cards_dealt"]);
      var transport;
      var story;

      if (invalid) {
        return invalid;
      }

      internalMission = Deal.createMission(internalDeal, { seed: baseSeed, round: round });
      transport = Content.getTransportCard(internalMission.transportCardId);
      story = RoundContent.selectStory(internalMission.missionId, {
        seed: baseSeed,
        round: round
      });
      state.mission = {
        missionId: internalMission.missionId,
        roleGender: internalMission.roleGender,
        roleGenderZh: internalMission.roleGender === "male" ? "男" : "女",
        transportCardId: internalMission.transportCardId,
        transport: {
          zh: transport.zh,
          amisStem: transport.amisStem,
          display: transport.display
        },
        story: {
          storyId: story.storyId,
          combo: story.combo,
          title: story.title,
          text: story.text,
          image: {
            src: story.image.src,
            width: story.image.width,
            height: story.image.height
          }
        }
      };
      state.status = "mission_revealed";
      state.feedback = "任務已揭曉，請選擇持卡學生並用詞彙組成問題。";
      return succeed("draw_mission", { mission: copy(state.mission) });
    }

    function selectHolder(holderId) {
      var invalid = requireStatus("select_holder", ["mission_revealed", "questioning", "guessing"]);
      var unknown;

      if (invalid) {
        return invalid;
      }
      unknown = requireHolder("select_holder", holderId);
      if (unknown) {
        return unknown;
      }

      state.selectedHolderId = holderId;
      state.feedback = Content.getHolder(holderId).label + " 已選取。";
      return succeed("select_holder", { holderId: holderId });
    }

    function addToken(tokenId, toIndex) {
      return editSentence("add_token", function () {
        return Sentence.add(state.sentenceTokenIds, tokenId, toIndex);
      });
    }

    function removeToken(tokenId) {
      return editSentence("remove_token", function () {
        return Sentence.remove(state.sentenceTokenIds, tokenId);
      });
    }

    function moveToken(tokenId, toIndex) {
      return editSentence("move_token", function () {
        return Sentence.move(state.sentenceTokenIds, tokenId, toIndex);
      });
    }

    function clearSentence() {
      return editSentence("clear_sentence", function () { return []; });
    }

    function submitQuestion() {
      var invalid = requireStatus("submit_question", ["mission_revealed", "questioning"]);
      var pattern;
      var assignment;
      var answerCard;
      var exchange;

      if (invalid) {
        return invalid;
      }
      if (!state.selectedHolderId) {
        return failWithFeedback("submit_question_holder_required", "holder_required", "請先選擇一位持卡學生。");
      }

      pattern = Sentence.classify(state.sentenceTokenIds);
      if (!pattern) {
        return failWithFeedback(
          "submit_question_invalid",
          "invalid_question",
          Content.invalidQuestionMessage
        );
      }

      assignment = Deal.getAssignment(internalDeal, state.selectedHolderId);
      answerCard = pattern.kind === "role"
        ? Content.getRoleCard(assignment.roleCardId)
        : Content.getTransportCard(assignment.transportCardId);
      exchange = {
        holderId: state.selectedHolderId,
        questionId: pattern.questionId,
        kind: pattern.kind,
        question: {
          tokenIds: state.sentenceTokenIds.slice(),
          amis: Sentence.format(state.sentenceTokenIds)
        },
        answer: {
          amis: answerCard.answer,
          zh: answerCard.answerZh
        }
      };

      state.lastExchange = copy(exchange);
      state.investigations.push(copy(exchange));
      state.status = "questioning";
      state.feedback = null;
      return succeed("submit_question", { exchange: copy(exchange) });
    }

    function enterGuessing() {
      var invalid = requireStatus("enter_guessing", ["mission_revealed", "questioning"]);

      if (invalid) {
        return invalid;
      }

      state.status = "guessing";
      state.feedback = "請選擇你認為持有任務牌組的學生。";
      return succeed("enter_guessing");
    }

    function leaveGuessing() {
      var invalid = requireStatus("leave_guessing", ["guessing"]);

      if (invalid) {
        return invalid;
      }

      state.status = state.investigations.length ? "questioning" : "mission_revealed";
      state.feedback = null;
      return succeed("leave_guessing");
    }

    function revealSolvedHolder(holderId) {
      var assignment = Deal.getAssignment(internalDeal, holderId);
      var role = Content.getRoleCard(assignment.roleCardId);
      var transport = Content.getTransportCard(assignment.transportCardId);
      var publicHolder = state.holders.filter(function (holder) {
        return holder.holderId === holderId;
      })[0];

      publicHolder.visualState = "revealed";
      publicHolder.cards.role = {
        state: "revealed",
        value: {
          roleCardId: role.roleCardId,
          displayName: role.displayName,
          gender: role.gender,
          genderZh: role.genderZh
        }
      };
      publicHolder.cards.transport = {
        state: "revealed",
        value: {
          transportCardId: transport.transportCardId,
          zh: transport.zh,
          amisStem: transport.amisStem,
          display: transport.display
        }
      };
    }

    function guess(holderId) {
      var invalid = requireStatus("guess", ["guessing"]);
      var candidateId = holderId || state.selectedHolderId;
      var unknown;
      var correct;

      if (invalid) {
        return invalid;
      }
      if (!candidateId) {
        return failWithFeedback("guess_holder_required", "holder_required", "請先選擇一位持卡學生。");
      }
      unknown = requireHolder("guess", candidateId);
      if (unknown) {
        return unknown;
      }

      state.selectedHolderId = candidateId;
      correct = candidateId === internalMission.targetHolderId;
      state.attempts += 1;
      state.lastGuess = { holderId: candidateId, correct: correct };

      if (!correct) {
        state.feedback = "不是這位持卡學生，牌面仍保持蓋住；可以繼續調查。";
        return succeed("guess", { correct: false, holderId: candidateId });
      }

      revealSolvedHolder(candidateId);
      state.status = "solved";
      state.solvedHolderId = candidateId;
      state.feedback = "答對了！只有正確持卡學生的兩張牌已翻開。";
      return succeed("guess", {
        correct: true,
        holderId: candidateId,
        revealedCards: copy(state.holders.filter(function (holder) {
          return holder.holderId === candidateId;
        })[0].cards)
      });
    }

    function restart() {
      round += 1;
      internalDeal = null;
      internalMission = null;
      state = freshState();
      return succeed("restart");
    }

    function subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("subscribe(listener) requires a function.");
      }
      listeners.push(listener);
      return function unsubscribe() {
        var index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    }

    state = freshState();

    return Object.freeze({
      dealCards: dealCards,
      drawMission: drawMission,
      selectHolder: selectHolder,
      addToken: addToken,
      removeToken: removeToken,
      moveToken: moveToken,
      clearSentence: clearSentence,
      submitQuestion: submitQuestion,
      enterGuessing: enterGuessing,
      leaveGuessing: leaveGuessing,
      guess: guess,
      restart: restart,
      getSnapshot: getSnapshot,
      getWordBankTokenIds: getWordBankTokenIds,
      subscribe: subscribe
    });
  }

  app.GameState = Object.freeze({
    statuses: Object.freeze(STATUSES.slice()),
    create: create
  });
  app.createGame = create;
})(typeof globalThis !== "undefined" ? globalThis : this);
