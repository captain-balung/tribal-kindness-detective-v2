(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app) {
    throw new Error("TribalKindnessDetectiveV2 namespace must be loaded first.");
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function findById(items, id) {
    var index;

    for (index = 0; index < items.length; index += 1) {
      if (items[index].storyId === id) {
        return items[index];
      }
    }
    return null;
  }

  var ITEMS = [
    {
      storyId: "story-01",
      combo: "female+bus",
      missionId: "female:bus",
      title: "扶奶奶過馬路",
      text: "有位奶奶跑來說，過斑馬線時，有位女同學主動扶她安全走到對面。奶奶想道謝時已找不到她，只聽說她搭公車來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-01.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-02",
      combo: "male+bus",
      missionId: "male:bus",
      title: "幫新同學帶路",
      text: "有個新同學跑來說，他第一次到校找不到教室，一位男同學耐心帶他走到班上。想道謝時已找不到人，只聽說那位男同學搭公車來，請協助找出他。",
      image: { src: "assets/stories/story-02.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-03",
      combo: "male+bus",
      missionId: "male:bus",
      title: "撿散落作業",
      text: "有位同學跑來說，風把他的作業吹散時，一位男同學立刻幫忙撿回每一張。想謝謝他時已找不到人，只聽說他搭公車來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-03.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-04",
      combo: "female+bus",
      missionId: "female:bus",
      title: "拾金不昧",
      text: "有位同學跑來說，她掉在走廊的錢包被一位女同學撿到，還完整交給老師。想當面道謝時已找不到她，只聽說她搭公車來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-04.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-05",
      combo: "female+motorcycle",
      missionId: "female:motorcycle",
      title: "主動讓座",
      text: "有位同學跑來說，她腳受傷站得很累，一位女同學立刻把椅子讓給她坐。想道謝時已找不到她，只聽說她搭家人的摩托車來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-05.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-06",
      combo: "male+motorcycle",
      missionId: "male:motorcycle",
      title: "幫忙貼OK繃",
      text: "有位同學跑來說，他跌倒擦傷時，一位男同學拿出OK繃，細心幫他貼好。想道謝時已找不到他，只聽說他搭家人的摩托車來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-06.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-07",
      combo: "male+motorcycle",
      missionId: "male:motorcycle",
      title: "撿回礦泉水",
      text: "有位同學跑來說，他的礦泉水滾到樓梯旁，一位男同學幫忙撿回來，還細心把瓶身擦乾淨。想謝謝他時已找不到人，只聽說他搭家人的摩托車來，請協助找出他。",
      image: { src: "assets/stories/story-07.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-08",
      combo: "female+motorcycle",
      missionId: "female:motorcycle",
      title: "搬營養午餐",
      text: "有位老師跑來說，營養午餐送到教室時，一位女同學主動幫忙搬餐桶和餐具。老師想謝謝她時已找不到人，只聽說她搭家人的摩托車來，請協助找出她。",
      image: { src: "assets/stories/story-08.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-09",
      combo: "female+walking",
      missionId: "female:walking",
      title: "歸還悠遊卡",
      text: "有位同學跑來說，她掉了悠遊卡，一位女同學撿到後立刻追上來歸還。想好好道謝時已找不到她，只聽說她今天走路來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-09.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-10",
      combo: "female+walking",
      missionId: "female:walking",
      title: "幫忙澆花",
      text: "有位老師跑來說，幾盆花的土快乾了，一位女同學主動提水，把每盆花都澆得剛剛好。老師想道謝時已找不到她，只聽說她今天走路來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-10.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-11",
      combo: "male+walking",
      missionId: "male:walking",
      title: "撿回鉛筆盒",
      text: "有位同學跑來說，他把鉛筆盒忘在操場，一位男同學撿到後送去辦公室。想謝謝他時已找不到人，只聽說他今天走路來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-11.webp", width: 674, height: 489 }
    },
    {
      storyId: "story-12",
      combo: "male+walking",
      missionId: "male:walking",
      title: "主動撿垃圾",
      text: "有位老師跑來說，風把幾張紙屑吹到校園角落，一位男同學主動用垃圾夾一張張撿起來放進垃圾桶。老師想謝謝他時已找不到人，只聽說他今天走路來，請協助找出這位好心人。",
      image: { src: "assets/stories/story-12.webp", width: 674, height: 489 }
    }
  ];
  var POOLS = {};

  ITEMS.forEach(function (story) {
    if (!POOLS[story.missionId]) {
      POOLS[story.missionId] = [];
    }
    POOLS[story.missionId].push(story);
  });
  Object.keys(POOLS).forEach(function (missionId) {
    POOLS[missionId] = Object.freeze(POOLS[missionId].slice());
  });

  app.Stories = deepFreeze({
    items: ITEMS,
    get: function (storyId) {
      return findById(ITEMS, storyId);
    },
    forMission: function (missionId) {
      return POOLS[missionId] || Object.freeze([]);
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
