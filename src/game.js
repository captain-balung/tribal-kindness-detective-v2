(function (root) {
  "use strict";

  var app = root.TribalKindnessDetectiveV2;

  if (!app || !app.Content || !app.GameState || !app.SessionSeed || typeof document === "undefined") {
    return;
  }

  var Content = app.Content;
  var game = null;
  var dragState = null;
  var pointerDragState = null;
  var suppressNextClick = false;
  var dialogOpeners = {};
  var settings = { sound: true, motion: true };
  var systemReducedMotion = typeof root.matchMedia === "function"
    ? root.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  var elements = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function getHolderArticle(holderId) {
    var articles = document.querySelectorAll("[data-holder-card]");
    var index;

    for (index = 0; index < articles.length; index += 1) {
      if (articles[index].getAttribute("data-holder-card") === holderId) {
        return articles[index];
      }
    }

    return null;
  }

  function getHolderButton(holderId) {
    var buttons = document.querySelectorAll("[data-action='select-holder']");
    var index;

    for (index = 0; index < buttons.length; index += 1) {
      if (buttons[index].getAttribute("data-holder-id") === holderId) {
        return buttons[index];
      }
    }

    return null;
  }

  function getHolderLabel(holderId) {
    var holder = Content.getHolder(holderId);
    return holder ? holder.label : "持卡學生";
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value || "";
    }
  }

  function setHidden(element, hidden) {
    if (element) {
      element.hidden = Boolean(hidden);
    }
  }

  function setPressed(element, pressed) {
    if (element) {
      element.setAttribute("aria-pressed", pressed ? "true" : "false");
    }
  }

  function clearChildren(element) {
    if (element && typeof element.replaceChildren === "function") {
      element.replaceChildren();
    } else if (element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  }

  function createButton(className, action, label, text) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("data-action", action);
    button.setAttribute("aria-label", label);
    button.textContent = text;
    return button;
  }

  function canCompose(status) {
    return status === "mission_revealed" || status === "questioning";
  }

  function canSelectHolder(status) {
    return status === "mission_revealed" || status === "questioning" || status === "guessing";
  }

  function renderWordBank(snapshot) {
    var available = game.getWordBankTokenIds();
    var enabled = canCompose(snapshot.status);

    clearChildren(elements.wordBank);
    available.forEach(function (tokenId) {
      var token = Content.getToken(tokenId);
      var button = createButton(
        "word-token",
        "add-token",
        token.text + "，位於詞彙庫；按 Enter 或空白鍵加入問題",
        token.text
      );
      button.setAttribute("data-token-id", tokenId);
      button.setAttribute("lang", "ami");
      button.draggable = enabled;
      button.disabled = !enabled;
      elements.wordBank.appendChild(button);
    });

    setText(elements.wordBankCount, available.length + " 個詞");
  }

  function renderSentence(snapshot) {
    var enabled = canCompose(snapshot.status);
    var total = snapshot.sentenceTokenIds.length;

    clearChildren(elements.sentenceList);
    snapshot.sentenceTokenIds.forEach(function (tokenId, index) {
      var token = Content.getToken(tokenId);
      var item = document.createElement("li");
      var label = createButton(
        "sentence-token-label",
        "focus-token",
        token.text + "，問題組句區第 " + (index + 1) + " 個，共 " + total +
          " 個；Alt 加左右方向鍵可調序，Delete 或 Backspace 可移除",
        token.text
      );
      var controls = document.createElement("span");
      var left = createButton("", "move-token-left", "將 " + token.text + " 向左移", "←");
      var right = createButton("", "move-token-right", "將 " + token.text + " 向右移", "→");
      var remove = createButton("", "remove-token", "將 " + token.text + " 移回詞彙庫", "×");

      item.className = "sentence-token-item";
      item.setAttribute("data-token-item", "");
      item.setAttribute("data-token-id", tokenId);
      item.setAttribute("data-token-position", String(index + 1));
      item.draggable = enabled;
      label.setAttribute("lang", "ami");
      label.disabled = !enabled;
      controls.className = "sentence-token-controls";
      left.disabled = !enabled || index === 0;
      right.disabled = !enabled || index === total - 1;
      remove.disabled = !enabled;
      controls.appendChild(left);
      controls.appendChild(right);
      controls.appendChild(remove);
      item.appendChild(label);
      item.appendChild(controls);
      elements.sentenceList.appendChild(item);
    });

    setHidden(elements.sentenceEmptyHint, total !== 0);
    setText(elements.sentencePreview, total ? snapshot.sentenceText : "尚未組句");
    elements.clearSentenceButton.disabled = !enabled || total === 0;
    elements.submitQuestionButton.disabled = !enabled || total === 0;
    elements.sentenceDropzone.setAttribute(
      "aria-label",
      total ? "問題組句區，共 " + total + " 個詞，目前是「" + snapshot.sentenceText + "」" : "問題組句區，目前沒有詞彙"
    );
  }

  function renderMission(snapshot) {
    var revealed = Boolean(snapshot.mission);
    var story = revealed ? snapshot.mission.story : null;

    elements.missionPanel.setAttribute("data-mission-state", revealed ? "revealed" : "hidden");
    setHidden(elements.missionPlaceholder, revealed);
    setHidden(elements.missionReveal, !revealed);
    setText(elements.missionRoleGender, revealed ? snapshot.mission.roleGenderZh + "性角色卡" : "");
    setText(elements.missionTransport, revealed ? snapshot.mission.transport.display : "");
    setText(elements.missionStoryTitle, story ? story.title : "");
    setText(elements.missionStoryText, story ? story.text : "");
    if (story) {
      elements.missionStoryImage.setAttribute("src", story.image.src);
      elements.missionStoryImage.setAttribute("width", String(story.image.width));
      elements.missionStoryImage.setAttribute("height", String(story.image.height));
    } else {
      elements.missionStoryImage.removeAttribute("src");
      elements.missionStoryImage.removeAttribute("width");
      elements.missionStoryImage.removeAttribute("height");
    }
    elements.dealCardsButton.disabled = snapshot.status !== "ready";
    elements.drawMissionButton.disabled = snapshot.status !== "cards_dealt";
  }

  function clearFaceUp(article) {
    var layer = article.querySelector("[data-face-up-layer]");
    var first = article.querySelector("[data-face-up-slot='first']");
    var second = article.querySelector("[data-face-up-slot='second']");

    setHidden(layer, true);
    clearChildren(first);
    clearChildren(second);
    first.removeAttribute("aria-label");
    second.removeAttribute("aria-label");
  }

  function appendCardLine(slot, primary, secondary, primaryLang) {
    var strong = document.createElement("strong");
    var small = document.createElement("small");

    strong.textContent = primary;
    if (primaryLang) {
      strong.setAttribute("lang", primaryLang);
    }
    small.textContent = secondary;
    slot.appendChild(strong);
    slot.appendChild(small);
  }

  function revealFaceUp(article, holderState) {
    var layer = article.querySelector("[data-face-up-layer]");
    var first = article.querySelector("[data-face-up-slot='first']");
    var second = article.querySelector("[data-face-up-slot='second']");
    var role = holderState.cards.role.value;
    var transport = holderState.cards.transport.value;

    clearChildren(first);
    clearChildren(second);
    appendCardLine(first, role.displayName, role.genderZh + "性角色卡", "ami");
    appendCardLine(second, transport.amisStem, transport.zh, "ami");
    first.setAttribute("aria-label", "角色卡已翻開：" + role.displayName + "，" + role.genderZh + "性");
    second.setAttribute("aria-label", "交通工具卡已翻開：" + transport.zh + "，" + transport.amisStem);
    setHidden(layer, false);
  }

  function renderHolders(snapshot) {
    var selectable = canSelectHolder(snapshot.status);

    snapshot.holders.forEach(function (holderState) {
      var article = getHolderArticle(holderState.holderId);
      var button = getHolderButton(holderState.holderId);
      var stateLabel = article.querySelector("[data-holder-state]");
      var cardStatus = article.querySelector("[data-card-status]");
      var badge = article.querySelector("[data-selection-badge]");
      var selected = snapshot.selectedHolderId === holderState.holderId;
      var wrong = Boolean(snapshot.lastGuess && !snapshot.lastGuess.correct &&
        snapshot.lastGuess.holderId === holderState.holderId && snapshot.status === "guessing");
      var solved = snapshot.status === "solved" && snapshot.solvedHolderId === holderState.holderId;
      var accessibleState;

      article.setAttribute("data-visual-state", holderState.visualState);
      article.classList.toggle("is-selected", selected);
      article.classList.toggle("is-wrong", wrong);
      article.classList.toggle("is-solved", solved);
      button.disabled = !selectable;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      setHidden(badge, !selected);

      if (holderState.visualState === "empty") {
        accessibleState = "目前空手，尚未抽牌";
        setText(stateLabel, "空手等待抽牌");
        setText(cardStatus, "尚未取得卡牌");
        clearFaceUp(article);
      } else if (holderState.visualState === "revealed") {
        accessibleState = "角色卡與交通工具卡均已翻開";
        setText(stateLabel, "答案牌組已揭曉");
        setText(cardStatus, "角色卡與交通工具卡均已翻開");
        revealFaceUp(article, holderState);
      } else {
        accessibleState = "手持角色卡與交通工具卡，兩張牌均未翻開";
        setText(stateLabel, "手持兩張蓋牌");
        setText(cardStatus, "角色卡未翻開；交通工具卡未翻開");
        clearFaceUp(article);
      }

      setHidden(cardStatus, false);
      button.setAttribute(
        "aria-label",
        "選擇" + getHolderLabel(holderState.holderId) + "，" + accessibleState + (selected ? "，目前已選" : "")
      );
    });

    setText(
      elements.selectedHolderLabel,
      snapshot.selectedHolderId ? getHolderLabel(snapshot.selectedHolderId) : "尚未選擇持卡學生"
    );
  }

  function renderAnswer(snapshot) {
    var exchange = snapshot.lastExchange;

    if (!exchange) {
      setText(elements.askedQuestion, "");
      setText(elements.answerAmis, "");
      setText(elements.answerZh, "選擇學生、排好詞彙，再送出問題。");
      return;
    }

    setText(elements.askedQuestion, getHolderLabel(exchange.holderId) + "｜" + exchange.question.amis);
    setText(elements.answerAmis, exchange.answer.amis);
    setText(elements.answerZh, exchange.answer.zh);
  }

  function renderGuessing(snapshot) {
    var guessing = snapshot.status === "guessing";
    var allowed = snapshot.status === "mission_revealed" || snapshot.status === "questioning";

    elements.guessPanel.setAttribute("data-guess-state", guessing ? "active" : "inactive");
    elements.guessModeButton.disabled = !allowed;
    setPressed(elements.guessModeButton, guessing);
    setHidden(elements.guessModeButton, guessing);
    setHidden(elements.leaveGuessButton, !guessing);
    setText(
      elements.guessInstructions,
      guessing
        ? "猜測模式：選擇一位持卡學生送出答案；猜錯仍可返回繼續調查。"
        : "蒐集足夠線索後，進入猜測模式並選擇一位持卡學生。"
    );
  }

  function renderProgress(snapshot) {
    var currentIndex = 0;

    if (snapshot.status === "cards_dealt") {
      currentIndex = 1;
    } else if (snapshot.status === "mission_revealed" || snapshot.status === "questioning") {
      currentIndex = 2;
    } else if (snapshot.status === "guessing" || snapshot.status === "solved") {
      currentIndex = 3;
    }

    elements.progressSteps.forEach(function (step, index) {
      var complete = snapshot.status === "solved" ? true : index < currentIndex;
      var current = snapshot.status !== "solved" && index === currentIndex;
      step.classList.toggle("is-complete", complete);
      step.classList.toggle("is-current", current);
      if (current) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });
  }

  function renderFeedback(snapshot, action) {
    var feedbackType = "info";

    if (action === "submit_question_invalid" || action === "submit_question_holder_required" ||
        action === "guess_holder_required") {
      feedbackType = "error";
    } else if (action === "guess" && snapshot.lastGuess && !snapshot.lastGuess.correct) {
      feedbackType = "wrong";
    } else if (snapshot.status === "solved") {
      feedbackType = "success";
    }

    setText(elements.feedbackToast, snapshot.feedback || "");
    elements.feedbackToast.setAttribute("data-feedback", feedbackType);

    if (action === "submit_question_invalid" || action === "submit_question_holder_required" ||
        action === "guess_holder_required") {
      setText(elements.alertLive, snapshot.feedback);
    } else {
      setText(elements.alertLive, "");
      if (snapshot.feedback) {
        setText(elements.statusLive, snapshot.feedback);
      }
    }

    if (action === "add_token" || action === "move_token" || action === "remove_token" || action === "clear_sentence") {
      setText(
        elements.sentenceLive,
        snapshot.sentenceTokenIds.length
          ? "問題目前為：「" + snapshot.sentenceText + "」，共 " + snapshot.sentenceTokenIds.length + " 個詞。"
          : "問題組句區已清空。"
      );
    } else if (action === "submit_question" && snapshot.lastExchange) {
      setText(elements.statusLive, getHolderLabel(snapshot.lastExchange.holderId) + " 回答：" + snapshot.lastExchange.answer.amis);
    }
  }

  function renderSuccess(snapshot) {
    var holder;
    var role;
    var transport;

    if (snapshot.status !== "solved" || !snapshot.solvedHolderId) {
      clearChildren(elements.successFirst);
      clearChildren(elements.successSecond);
      return;
    }

    holder = snapshot.holders.filter(function (candidate) {
      return candidate.holderId === snapshot.solvedHolderId;
    })[0];
    role = holder.cards.role.value;
    transport = holder.cards.transport.value;
    setText(elements.successHolderLabel, getHolderLabel(holder.holderId) + " 持有符合任務的兩張牌。");
    clearChildren(elements.successFirst);
    clearChildren(elements.successSecond);
    appendCardLine(elements.successFirst, role.displayName, role.genderZh + "性角色卡", "ami");
    appendCardLine(elements.successSecond, transport.amisStem, transport.zh + "交通工具卡", "ami");
  }

  function render(snapshot, action) {
    elements.app.setAttribute("data-game-state", snapshot.status);
    renderMission(snapshot);
    renderHolders(snapshot);
    renderWordBank(snapshot);
    renderSentence(snapshot);
    renderAnswer(snapshot);
    renderGuessing(snapshot);
    renderProgress(snapshot);
    renderFeedback(snapshot, action || "render");
    renderSuccess(snapshot);

    if (snapshot.status === "solved" && action === "guess") {
      openDialog("success-dialog", null);
    }
  }

  function focusSoon(element) {
    if (element && typeof element.focus === "function") {
      element.focus();
    }
  }

  function focusSentenceAdjustment() {
    var firstToken = elements.sentenceList.querySelector(".sentence-token-label");
    focusSoon(firstToken || elements.sentenceDropzone);
  }

  function showScreen(screen) {
    var menu = screen === "menu";
    elements.menuScreen.hidden = !menu;
    elements.gameScreen.hidden = menu;
    elements.app.setAttribute("data-screen-state", screen);
    if (menu) {
      focusSoon(elements.startGameButton);
    }
  }

  function startGame() {
    if (game.getSnapshot().status === "solved") {
      game.restart();
    }
    showScreen("game");
    focusSoon(game.getSnapshot().status === "ready" ? elements.dealCardsButton : elements.mainContent);
  }

  function isDialogOpen(dialog) {
    return Boolean(dialog && (dialog.open || dialog.hasAttribute("open")));
  }

  function openDialog(id, opener) {
    var dialog = byId(id);
    var firstControl;

    if (!dialog || isDialogOpen(dialog)) {
      return;
    }
    dialogOpeners[id] = opener || document.activeElement || null;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    firstControl = dialog.querySelector("[data-dialog-close]") || dialog.querySelector("button");
    focusSoon(firstControl);
  }

  function closeDialog(dialog, restoreFocus) {
    var opener;

    if (!dialog || !isDialogOpen(dialog)) {
      return;
    }
    opener = dialogOpeners[dialog.id];
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    if (restoreFocus !== false) {
      focusSoon(opener);
    }
    dialogOpeners[dialog.id] = null;
  }

  function closeAllDialogs() {
    document.querySelectorAll("dialog").forEach(function (dialog) {
      closeDialog(dialog, false);
    });
  }

  function applyMotionSetting() {
    var reducedBySystem = Boolean(systemReducedMotion && systemReducedMotion.matches);
    elements.app.setAttribute("data-motion", settings.motion && !reducedBySystem ? "full" : "reduced");
  }

  function setTransientClass(className) {
    elements.app.classList.remove("is-dealing", "is-revealing-mission");
    elements.app.classList.add(className);
    if (typeof root.setTimeout === "function") {
      root.setTimeout(function () { elements.app.classList.remove(className); }, 700);
    }
  }

  function performAction(action, target) {
    var tokenItem;
    var tokenId;
    var snapshot;
    var index;
    var result;
    var dialog;

    if (action === "start-game") {
      startGame();
    } else if (action === "open-dialog") {
      openDialog(target.getAttribute("data-dialog-open"), target);
    } else if (action === "close-dialog") {
      dialog = target.closest("dialog");
      closeDialog(dialog, true);
    } else if (action === "return-menu") {
      closeAllDialogs();
      showScreen("menu");
    } else if (action === "play-again") {
      closeAllDialogs();
      game.restart();
      showScreen("game");
      focusSoon(elements.dealCardsButton);
    } else if (action === "restart") {
      closeAllDialogs();
      game.restart();
      showScreen("game");
      focusSoon(elements.dealCardsButton);
    } else if (action === "deal-cards") {
      result = game.dealCards();
      if (result.ok) {
        setTransientClass("is-dealing");
        focusSoon(elements.drawMissionButton);
      }
    } else if (action === "draw-mission") {
      result = game.drawMission();
      if (result.ok) {
        setTransientClass("is-revealing-mission");
        focusSoon(getHolderButton(Content.holders[0].holderId));
      }
    } else if (action === "select-holder") {
      snapshot = game.getSnapshot();
      tokenId = target.getAttribute("data-holder-id");
      if (snapshot.status === "guessing") {
        game.selectHolder(tokenId);
        result = game.guess(tokenId);
        if (result.ok && !result.correct) {
          focusSoon(elements.leaveGuessButton);
        }
      } else {
        game.selectHolder(tokenId);
      }
    } else if (action === "add-token") {
      tokenId = target.getAttribute("data-token-id");
      result = game.addToken(tokenId);
      if (result.ok) {
        focusSoon(elements.sentenceList.querySelector("[data-token-position='" + result.snapshot.sentenceTokenIds.length + "'] .sentence-token-label"));
      }
    } else if (action === "clear-sentence") {
      game.clearSentence();
      focusSoon(elements.wordBank.querySelector(".word-token") || elements.sentenceDropzone);
    } else if (action === "move-token-left" || action === "move-token-right" || action === "remove-token") {
      tokenItem = target.closest("[data-token-item]");
      tokenId = tokenItem.getAttribute("data-token-id");
      snapshot = game.getSnapshot();
      index = snapshot.sentenceTokenIds.indexOf(tokenId);
      if (action === "remove-token") {
        result = game.removeToken(tokenId);
        if (result.ok) {
          focusSoon(elements.wordBank.querySelector("[data-token-id='" + tokenId + "']"));
        }
      } else {
        result = game.moveToken(tokenId, index + (action === "move-token-left" ? -1 : 1));
        if (result.ok) {
          focusSoon(elements.sentenceList.querySelector("[data-token-id='" + tokenId + "'] .sentence-token-label"));
        }
      }
    } else if (action === "submit-question") {
      result = game.submitQuestion();
      if (!result.ok) {
        focusSentenceAdjustment();
      }
    } else if (action === "enter-guessing") {
      result = game.enterGuessing();
      if (result.ok) {
        focusSoon(getHolderButton(Content.holders[0].holderId));
      }
    } else if (action === "leave-guessing") {
      result = game.leaveGuessing();
      if (result.ok) {
        focusSentenceAdjustment();
      }
    }
  }

  function handleClick(event) {
    var target = event.target.closest("[data-action]");

    if (suppressNextClick) {
      suppressNextClick = false;
      event.preventDefault();
      return;
    }
    if (!target || target.disabled) {
      return;
    }
    performAction(target.getAttribute("data-action"), target);
  }

  function handleKeydown(event) {
    var bankToken = event.target.closest(".word-token[data-action='add-token']");
    var label = event.target.closest(".sentence-token-label");
    var item;
    var tokenId;
    var snapshot;
    var index;
    var destination;
    var result;

    if (bankToken && !bankToken.disabled && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      tokenId = bankToken.getAttribute("data-token-id");
      result = game.addToken(tokenId);
      if (result.ok) {
        focusSoon(elements.sentenceList.querySelector("[data-token-id='" + tokenId + "'] .sentence-token-label"));
      }
      return;
    }

    if (!label || label.disabled) {
      return;
    }
    item = label.closest("[data-token-item]");
    tokenId = item.getAttribute("data-token-id");

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      result = game.removeToken(tokenId);
      if (result.ok) {
        focusSoon(elements.wordBank.querySelector("[data-token-id='" + tokenId + "']"));
      }
      return;
    }

    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      snapshot = game.getSnapshot();
      index = snapshot.sentenceTokenIds.indexOf(tokenId);
      destination = index + (event.key === "ArrowLeft" ? -1 : 1);
      if (destination >= 0 && destination < snapshot.sentenceTokenIds.length) {
        result = game.moveToken(tokenId, destination);
        if (result.ok) {
          focusSoon(elements.sentenceList.querySelector("[data-token-id='" + tokenId + "'] .sentence-token-label"));
        }
      }
    }
  }

  function handleDragStart(event) {
    var tokenElement = event.target.closest("[data-token-id]");
    var tokenItem;

    if (!tokenElement) {
      return;
    }
    tokenItem = tokenElement.closest("[data-token-item]");
    dragState = {
      tokenId: tokenElement.getAttribute("data-token-id"),
      source: tokenItem ? "sentence" : "bank"
    };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragState.tokenId);
    }
  }

  function handleDragOver(event) {
    var dropzone = event.target.closest("[data-dropzone]");

    if (!dropzone || !dragState) {
      return;
    }
    event.preventDefault();
    dropzone.classList.add("is-drag-over");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function clearDragClasses() {
    document.querySelectorAll("[data-dropzone]").forEach(function (dropzone) {
      dropzone.classList.remove("is-drag-over");
    });
    elements.app.classList.remove("is-pointer-dragging");
  }

  function applyTokenDrop(payload, dropzone, targetElement) {
    var targetItem;
    var snapshot = game.getSnapshot();
    var targetId;
    var index;
    var result;

    if (dropzone.getAttribute("data-dropzone") === "bank") {
      if (payload.source === "sentence") {
        result = game.removeToken(payload.tokenId);
        if (result.ok) {
          focusSoon(elements.wordBank.querySelector("[data-token-id='" + payload.tokenId + "']"));
        }
      }
      return result;
    }

    targetItem = targetElement ? targetElement.closest("[data-token-item]") : null;
    index = snapshot.sentenceTokenIds.length;
    if (targetItem) {
      targetId = targetItem.getAttribute("data-token-id");
      index = snapshot.sentenceTokenIds.indexOf(targetId);
    }

    if (payload.source === "bank") {
      result = game.addToken(payload.tokenId, index);
    } else if (targetId !== payload.tokenId) {
      if (!targetItem) {
        index = Math.max(0, snapshot.sentenceTokenIds.length - 1);
      }
      result = game.moveToken(payload.tokenId, index);
    }

    if (result && result.ok) {
      focusSoon(elements.sentenceList.querySelector("[data-token-id='" + payload.tokenId + "'] .sentence-token-label"));
    }
    return result;
  }

  function handleDrop(event) {
    var dropzone = event.target.closest("[data-dropzone]");

    if (!dropzone || !dragState) {
      return;
    }
    event.preventDefault();
    applyTokenDrop(dragState, dropzone, event.target);

    dragState = null;
    clearDragClasses();
  }

  function handleDragEnd() {
    dragState = null;
    clearDragClasses();
  }

  function handlePointerDown(event) {
    var tokenHandle = event.target.closest(".word-token") || event.target.closest(".sentence-token-label");
    var tokenItem;

    if (!tokenHandle || tokenHandle.disabled || (typeof event.button === "number" && event.button !== 0)) {
      return;
    }
    tokenItem = tokenHandle.closest("[data-token-item]");
    pointerDragState = {
      pointerId: event.pointerId,
      tokenId: tokenItem ? tokenItem.getAttribute("data-token-id") : tokenHandle.getAttribute("data-token-id"),
      source: tokenItem ? "sentence" : "bank",
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
  }

  function pointerTarget(event) {
    if (typeof document.elementFromPoint !== "function") {
      return event.target;
    }
    return document.elementFromPoint(event.clientX, event.clientY) || event.target;
  }

  function handlePointerMove(event) {
    var distance;
    var target;
    var dropzone;

    if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) {
      return;
    }
    distance = Math.max(
      Math.abs(event.clientX - pointerDragState.startX),
      Math.abs(event.clientY - pointerDragState.startY)
    );
    if (!pointerDragState.moved && distance < 8) {
      return;
    }

    pointerDragState.moved = true;
    event.preventDefault();
    clearDragClasses();
    elements.app.classList.add("is-pointer-dragging");
    target = pointerTarget(event);
    dropzone = target && target.closest("[data-dropzone]");
    if (dropzone) {
      dropzone.classList.add("is-drag-over");
    }
  }

  function handlePointerUp(event) {
    var target;
    var dropzone;

    if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) {
      return;
    }

    if (pointerDragState.moved) {
      event.preventDefault();
      target = pointerTarget(event);
      dropzone = target && target.closest("[data-dropzone]");
      if (dropzone) {
        applyTokenDrop(pointerDragState, dropzone, target);
      }
      suppressNextClick = true;
      if (typeof root.setTimeout === "function") {
        root.setTimeout(function () { suppressNextClick = false; }, 0);
      }
    }

    pointerDragState = null;
    clearDragClasses();
  }

  function handlePointerCancel() {
    pointerDragState = null;
    clearDragClasses();
  }

  function handleChange(event) {
    if (event.target === elements.soundSetting) {
      settings.sound = Boolean(event.target.checked);
    } else if (event.target === elements.motionSetting) {
      settings.motion = Boolean(event.target.checked);
      applyMotionSetting();
    }
  }

  function bindDialogs() {
    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.addEventListener("cancel", function (event) {
        if (dialog.id === "success-dialog") {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        closeDialog(dialog, true);
      });
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog && dialog.id !== "success-dialog") {
          closeDialog(dialog, true);
        }
      });
    });
  }

  function cacheElements() {
    elements = {
      app: byId("app"),
      mainContent: byId("main-content"),
      menuScreen: byId("menu-screen"),
      gameScreen: byId("game-screen"),
      startGameButton: byId("start-game-button"),
      missionPanel: byId("mission-panel"),
      missionPlaceholder: byId("mission-placeholder"),
      missionReveal: byId("mission-reveal"),
      missionClues: byId("mission-clues"),
      missionRoleGender: byId("mission-role-gender"),
      missionTransport: byId("mission-transport"),
      missionStoryTitle: byId("mission-story-title"),
      missionStoryText: byId("mission-story-text"),
      missionStoryImage: byId("mission-story-image"),
      dealCardsButton: byId("deal-cards-button"),
      drawMissionButton: byId("draw-mission-button"),
      selectedHolderLabel: byId("selected-holder-label"),
      wordBank: byId("word-bank"),
      wordBankCount: byId("word-bank-count"),
      sentenceList: byId("sentence-token-list"),
      sentenceDropzone: byId("sentence-dropzone"),
      sentenceEmptyHint: byId("sentence-empty-hint"),
      sentencePreview: byId("sentence-preview"),
      clearSentenceButton: byId("clear-sentence-button"),
      submitQuestionButton: byId("submit-question-button"),
      askedQuestion: byId("asked-question"),
      answerAmis: byId("answer-amis"),
      answerZh: byId("answer-zh"),
      guessPanel: document.querySelector("[data-guess-state]"),
      guessInstructions: byId("guess-instructions"),
      guessModeButton: byId("guess-mode-button"),
      leaveGuessButton: byId("leave-guess-button"),
      feedbackToast: byId("feedback-toast"),
      statusLive: byId("status-live"),
      alertLive: byId("alert-live"),
      sentenceLive: byId("sentence-live"),
      successHolderLabel: byId("success-holder-label"),
      successFirst: document.querySelector("[data-success-slot='first']"),
      successSecond: document.querySelector("[data-success-slot='second']"),
      soundSetting: byId("sound-setting"),
      motionSetting: byId("motion-setting"),
      progressSteps: Array.prototype.slice.call(document.querySelectorAll("[data-step]"))
    };
  }

  function resetForTests(seed) {
    if (typeof seed === "undefined") {
      throw new TypeError("resetForTests(seed) requires an explicit fixed seed.");
    }

    closeAllDialogs();
    game = app.GameState.create({ seed: String(seed) });
    game.subscribe(render);
    showScreen("menu");
    render(game.getSnapshot(), "reset");
    return game.getSnapshot();
  }

  function initialize() {
    game = app.GameState.create({ seed: app.SessionSeed.create() });
    cacheElements();
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    document.addEventListener("dragend", handleDragEnd);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("change", handleChange);
    bindDialogs();
    if (systemReducedMotion && typeof systemReducedMotion.addEventListener === "function") {
      systemReducedMotion.addEventListener("change", applyMotionSetting);
    }
    game.subscribe(render);
    applyMotionSetting();
    render(game.getSnapshot(), "initialize");
    elements.app.setAttribute("data-ready", "true");

    app.GameUI = Object.freeze({
      getSnapshot: function () { return game.getSnapshot(); },
      getScreen: function () { return elements.app.getAttribute("data-screen-state"); },
      getSettings: function () { return { sound: settings.sound, motion: settings.motion }; },
      resetForTests: resetForTests
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
