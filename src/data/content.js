(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app) {
    throw new Error("TribalKindnessDetectiveV2 namespace must be loaded first.");
  }

  function deepFreeze(value) {
    var keys;
    var index;

    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    keys = Object.keys(value);
    for (index = 0; index < keys.length; index += 1) {
      deepFreeze(value[keys[index]]);
    }

    return Object.freeze(value);
  }

  function findById(items, key, id) {
    var index;

    for (index = 0; index < items.length; index += 1) {
      if (items[index][key] === id) {
        return items[index];
      }
    }

    return null;
  }

  var HOLDERS = [
    { holderId: "holder-1", visualId: "student-a", label: "持卡學生 1" },
    { holderId: "holder-2", visualId: "student-b", label: "持卡學生 2" },
    { holderId: "holder-3", visualId: "student-c", label: "持卡學生 3" },
    { holderId: "holder-4", visualId: "student-d", label: "持卡學生 4" },
    { holderId: "holder-5", visualId: "student-e", label: "持卡學生 5" },
    { holderId: "holder-6", visualId: "student-f", label: "持卡學生 6" }
  ];

  var ROLE_CARDS = [
    {
      roleCardId: "mayaw",
      name: "Mayaw",
      displayName: "ci Mayaw",
      gender: "male",
      genderZh: "男",
      answer: "Ci Mayaw kako.",
      answerZh: "我抽到的角色卡是 ci Mayaw。"
    },
    {
      roleCardId: "kacaw",
      name: "Kacaw",
      displayName: "ci Kacaw",
      gender: "male",
      genderZh: "男",
      answer: "Ci Kacaw kako.",
      answerZh: "我抽到的角色卡是 ci Kacaw。"
    },
    {
      roleCardId: "kolas",
      name: "Kolas",
      displayName: "ci Kolas",
      gender: "male",
      genderZh: "男",
      answer: "Ci Kolas kako.",
      answerZh: "我抽到的角色卡是 ci Kolas。"
    },
    {
      roleCardId: "panay",
      name: "Panay",
      displayName: "ci Panay",
      gender: "female",
      genderZh: "女",
      answer: "Ci Panay kako.",
      answerZh: "我抽到的角色卡是 ci Panay。"
    },
    {
      roleCardId: "dongi",
      name: "Dongi",
      displayName: "ci Dongi",
      gender: "female",
      genderZh: "女",
      answer: "Ci Dongi kako.",
      answerZh: "我抽到的角色卡是 ci Dongi。"
    },
    {
      roleCardId: "amoy",
      name: "Amoy",
      displayName: "ci Amoy",
      gender: "female",
      genderZh: "女",
      answer: "Ci Amoy kako.",
      answerZh: "我抽到的角色卡是 ci Amoy。"
    }
  ];

  var TRANSPORT_CARDS = [
    {
      transportCardId: "bus",
      zh: "公車",
      amisStem: "faso^",
      display: "公車 faso^",
      answer: "Pakafaso^ kako a tayni.",
      answerZh: "我抽到的交通工具卡是公車。"
    },
    {
      transportCardId: "motorcycle",
      zh: "摩托車",
      amisStem: "otofay",
      display: "摩托車 otofay",
      answer: "Pakaotofay kako a tayni.",
      answerZh: "我抽到的交通工具卡是摩托車。"
    },
    {
      transportCardId: "walking",
      zh: "走路",
      amisStem: "rakat",
      display: "走路 rakat",
      answer: "Pakarakat kako a tayni.",
      answerZh: "我抽到的交通工具卡是走路。"
    }
  ];

  var TOKENS = [
    { tokenId: "cima", text: "cima" },
    { tokenId: "ko", text: "ko" },
    { tokenId: "ngangan", text: "ngangan" },
    { tokenId: "no", text: "no" },
    { tokenId: "miso", text: "miso" },
    { tokenId: "kiso", text: "kiso" },
    { tokenId: "iso", text: "iso" },
    { tokenId: "pakamaan", text: "pakamaan" },
    { tokenId: "a", text: "a" },
    { tokenId: "tayni", text: "tayni" }
  ];

  var QUESTION_PATTERNS = [
    {
      questionId: "role-long",
      kind: "role",
      tokenIds: ["cima", "ko", "ngangan", "no", "miso"],
      amis: "Cima ko ngangan no miso?"
    },
    {
      questionId: "role-short",
      kind: "role",
      tokenIds: ["cima", "kiso"],
      amis: "Cima kiso?"
    },
    {
      questionId: "role-alt",
      kind: "role",
      tokenIds: ["cima", "ko", "ngangan", "iso"],
      amis: "Cima ko ngangan iso?"
    },
    {
      questionId: "transport-short",
      kind: "transport",
      tokenIds: ["pakamaan", "kiso"],
      amis: "Pakamaan kiso?"
    },
    {
      questionId: "transport-full",
      kind: "transport",
      tokenIds: ["pakamaan", "kiso", "a", "tayni"],
      amis: "Pakamaan kiso a tayni?"
    }
  ];

  var INVALID_QUESTION_MESSAGE = "電腦有點不懂你的問題，再試試看好嗎？";

  function getHolder(id) {
    return findById(HOLDERS, "holderId", id);
  }

  function getRoleCard(id) {
    return findById(ROLE_CARDS, "roleCardId", id);
  }

  function getTransportCard(id) {
    return findById(TRANSPORT_CARDS, "transportCardId", id);
  }

  function getToken(id) {
    return findById(TOKENS, "tokenId", id);
  }

  function getQuestionPattern(id) {
    return findById(QUESTION_PATTERNS, "questionId", id);
  }

  function makeTransportAnswer(transportCardId) {
    var transport = getTransportCard(transportCardId);

    if (!transport) {
      return null;
    }

    return "Paka" + transport.amisStem + " kako a tayni.";
  }

  app.Content = deepFreeze({
    schemaVersion: 2,
    holders: HOLDERS,
    roleCards: ROLE_CARDS,
    transportCards: TRANSPORT_CARDS,
    tokens: TOKENS,
    questionPatterns: QUESTION_PATTERNS,
    invalidQuestionMessage: INVALID_QUESTION_MESSAGE,
    language: {
      teacherReview: {
        status: "confirmed",
        notice: "族語內容已由族語老師確認"
      },
      roleAnswers: ROLE_CARDS.map(function (card) { return card.answer; }),
      transportAnswers: TRANSPORT_CARDS.map(function (card) { return card.answer; })
    },
    getHolder: getHolder,
    getRoleCard: getRoleCard,
    getTransportCard: getTransportCard,
    getToken: getToken,
    getQuestionPattern: getQuestionPattern,
    makeTransportAnswer: makeTransportAnswer
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
