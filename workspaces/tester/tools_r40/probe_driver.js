(function () {
  'use strict';
  var TAG = 'LY15_PROBE';
  var VERSION = 'r40-probe-v1';
  var CASE = globalThis.__LY15_PROBE_CASE__;
  var PLAYER = globalThis.__LY15_PROBE_PLAYER__;

  if (globalThis.__LY15_PROBE_APPROVED__ !== true) {
    console.error(TAG + ': FAIL stage=approval reason=not_approved');
    return;
  }
  if (!CASE || !PLAYER) {
    console.error(TAG + ': FAIL stage=init reason=case_or_player_missing');
    return;
  }

  var T0 = Date.now();
  var MAX_NODES = 300;
  var MAX_DEPTH = 8;
  var MAX_NAMES = 12;
  var TIMEOUT_MS = 30000;
  var ccRef = null;
  var sceneRef = null;

  function elapsed() { return Date.now() - T0; }
  function getCC() { return globalThis.cc || (globalThis.window && globalThis.window.cc) || null; }
  function getScene(cc) {
    if (!cc || !cc.director || typeof cc.director.getScene !== 'function') return null;
    return cc.director.getScene();
  }
  function getClass(cc) {
    if (!cc || !cc.js || typeof cc.js.getClassByName !== 'function') return null;
    return cc.js.getClassByName('GameRoot');
  }

  function writeLog(payload) {
    var path = '';
    try {
      if (!wx || !wx.env || !wx.env.USER_DATA_PATH) throw new Error('USER_DATA_PATH_MISSING');
      path = wx.env.USER_DATA_PATH + '/ly15_probe_' + CASE + '_' + PLAYER + '_' +
        Date.now() + '_' + Math.floor(Math.random() * 1000000) + '.log';
      payload.logPath = path;
      payload.logOk = false;
      var fs = wx.getFileSystemManager();
      fs.writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
      payload.logOk = true;
      fs.writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    } catch (e) {
      payload.logPath = path;
      payload.logOk = false;
      payload.errors.push('log_write:' + String(e));
      console.error(TAG + ': LOG_FAIL ' + String(e));
    }
    console.log(TAG + ': LOG_PATH ' + payload.logPath);
    return payload;
  }

  function basePayload(stage, reason) {
    return {
      probeVersion: VERSION,
      mode: 'probe-layout',
      not_normal_touch: true,
      case: CASE,
      player: PLAYER,
      stage: stage,
      reason: reason,
      elapsedMs: elapsed(),
      errors: []
    };
  }

  function fail(stage, reason, detail) {
    var payload = basePayload(stage, reason);
    if (detail) {
      payload.ccPresent = detail.ccPresent;
      payload.directorPresent = detail.directorPresent;
      payload.scenePresent = detail.scenePresent;
      payload.sceneName = detail.sceneName;
      payload.classFound = detail.classFound;
      payload.rootBy = detail.rootBy;
      payload.rootNode = detail.nodeName;
      payload.componentName = detail.componentName;
      payload.gamePresent = detail.gamePresent;
      payload.nodesVisited = detail.nodesVisited;
      payload.nodeNames = detail.nodeNames;
      payload.canvasSeen = detail.canvasSeen;
    }
    writeLog(payload);
    console.error(TAG + ': FAIL ' + JSON.stringify(payload));
  }

  function findRoot(cc, scene) {
    var result = {
      ccPresent: !!cc,
      directorPresent: !!(cc && cc.director),
      scenePresent: !!scene,
      sceneName: scene ? String(scene.name || '') : null,
      classFound: false,
      rootBy: null,
      root: null,
      nodeName: null,
      componentName: null,
      gamePresent: false,
      nodesVisited: 0,
      nodeNames: [],
      canvasSeen: false,
      reason: null
    };
    if (!cc) { result.reason = 'NO_CC'; return result; }
    if (!cc.director || typeof cc.director.getScene !== 'function') {
      result.reason = 'NO_DIRECTOR'; return result;
    }
    if (!scene) { result.reason = 'NO_SCENE'; return result; }

    if (typeof scene.getComponentInChildren === 'function') {
      var byName = scene.getComponentInChildren('GameRoot');
      if (byName) {
        result.root = byName;
        result.rootBy = 'getComponentInChildren(string)';
      }
    }
    var cls = getClass(cc);
    result.classFound = !!cls;
    if (!result.root && cls && typeof scene.getComponentInChildren === 'function') {
      var byClass = scene.getComponentInChildren(cls);
      if (byClass) {
        result.root = byClass;
        result.rootBy = 'getComponentInChildren(class)';
      }
    }
    if (!result.root) {
      var queue = [{ node: scene, depth: 0 }];
      var visited = 0;
      var names = [];
      var canvasSeen = false;
      while (queue.length > 0 && visited < MAX_NODES) {
        var item = queue.shift();
        var node = item.node;
        if (!node) continue;
        visited++;
        if (names.length < MAX_NAMES) names.push(String(node.name || ''));
        if (String(node.name || '') === 'Canvas') canvasSeen = true;
        var comp = null;
        if (typeof node.getComponent === 'function') {
          comp = node.getComponent('GameRoot');
          if (!comp && cls) comp = node.getComponent(cls);
        }
        if (comp) {
          result.root = comp;
          result.rootBy = 'scene-child/getComponent';
          result.nodeName = String(node.name || '');
          break;
        }
        if (item.depth < MAX_DEPTH && node.children) {
          for (var i = 0; i < node.children.length; i++) {
            queue.push({ node: node.children[i], depth: item.depth + 1 });
          }
        }
      }
      result.nodesVisited = visited;
      result.nodeNames = names;
      result.canvasSeen = canvasSeen;
    }
    if (result.root) {
      result.componentName = result.root.constructor && result.root.constructor.name
        ? String(result.root.constructor.name) : 'GameRoot';
      result.gamePresent = !!result.root.game;
      result.reason = result.gamePresent ? 'ROOT_OK' : 'GAMEROOT_NO_GAME';
    } else {
      result.reason = 'NO_GAMEROOT_COMPONENT';
    }
    return result;
  }

  function nodeBounds(cc, scene, node) {
    var U = cc.UITransform || (cc.js && cc.js.getClassByName('cc.UITransform'));
    if (!U || !node || typeof node.getComponent !== 'function') return null;
    var u = node.getComponent(U);
    if (!u || typeof u.getBoundingBoxToWorld !== 'function') return null;
    var bb = u.getBoundingBoxToWorld();
    var cam = scene.getComponentInChildren(cc.Camera);
    if (!cam) return null;
    var a = new cc.Vec3();
    var b = new cc.Vec3();
    cam.worldToScreen(new cc.Vec3(bb.x, bb.y, 0), a);
    cam.worldToScreen(new cc.Vec3(bb.x + bb.width, bb.y + bb.height, 0), b);
    return [Math.round(Math.min(a.x, b.x)), Math.round(Math.max(a.y, b.y)),
      Math.round(Math.abs(b.x - a.x)), Math.round(Math.abs(b.y - a.y))];
  }

  function findByName(scene, name) {
    var found = null;
    function walk(n) {
      if (found) return;
      if (n.name === name) { found = n; return; }
      var children = n.children || [];
      for (var i = 0; i < children.length; i++) walk(children[i]);
    }
    walk(scene);
    return found;
  }

  function findHero(scene, player) {
    var found = null;
    function walk(n) {
      if (found) return;
      if (n.name === 'hero_idle' && n.parent && n.parent.name === 'map_marker_' + player) {
        found = n; return;
      }
      var children = n.children || [];
      for (var i = 0; i < children.length; i++) walk(children[i]);
    }
    walk(scene);
    return found;
  }

  function labelsUnder(node) {
    var out = [];
    function walk(n) {
      var label = n.getComponent && n.getComponent('cc.Label');
      if (label && label.string) out.push(label.string);
      var children = n.children || [];
      for (var i = 0; i < children.length; i++) walk(children[i]);
    }
    walk(node);
    return out.join('|');
  }

  function collect(result) {
    var cc = ccRef;
    var scene = sceneRef;
    var badge = findByName(scene, 'daily_badge');
    if (!badge) { fail('layout', 'DAILY_BADGE_MISSING', result); return; }
    var plate = badge.parent;
    if (!plate) { fail('layout', 'DAILY_BADGE_PARENT_MISSING', result); return; }
    var hero = findHero(scene, PLAYER);
    if (!hero) { fail('layout', 'HERO_MISSING', result); return; }
    var marker = findByName(scene, 'map_marker_' + PLAYER);
    var badgeBounds = nodeBounds(cc, scene, badge);
    var plateBounds = nodeBounds(cc, scene, plate);
    var heroBounds = nodeBounds(cc, scene, hero);
    var markerBounds = marker ? nodeBounds(cc, scene, marker) : null;
    var badgeText = labelsUnder(badge);
    if (!badgeBounds || !plateBounds) { fail('layout', 'BOUNDS_MISSING', result); return; }
    if (badgeText.indexOf('限定') < 0) { fail('layout', 'BADGE_TEXT_MISSING', result); return; }
    var dx = Math.round(((badgeBounds[0] + badgeBounds[2] / 2) -
      (plateBounds[0] + plateBounds[2] / 2)) * 10) / 10;
    var payload = basePayload('ready', 'ROOT_OK');
    payload.rootBy = result.rootBy;
    payload.rootNode = result.nodeName;
    payload.componentName = result.componentName;
    payload.classFound = result.classFound;
    payload.nodesVisited = result.nodesVisited;
    payload.canvasSeen = result.canvasSeen;
    payload.badgeText = badgeText;
    payload.badgeBounds = badgeBounds;
    payload.plateBounds = plateBounds;
    payload.heroBounds = heroBounds;
    payload.markerBounds = markerBounds;
    payload.dx = dx;
    writeLog(payload);
    console.log(TAG + ': READY ' + JSON.stringify(payload));
  }

  function run(result) {
    var G = result.root.game;
    var R = result.root;
    if (!G || typeof G.acceptFortune !== 'function' || !G.cfg) {
      fail('state', 'GAME_OBJECT_INVALID', result); return;
    }
    if (typeof R.refresh !== 'function') {
      fail('state', 'GAMEROOT_REFRESH_MISSING', result); return;
    }
    G.cfg.eventChancePerDig = 0;
    G.cfg.mishapChance = 0;
    G.phase = 'fortune';
    G.money = 0;
    G.fortune = {
      id: 'probe_layout', tier: 'meh', name: '平', text: 'probe',
      effect: 'none', needsLocation: false
    };
    G.fortuneLocation = null;
    G.acceptFortune();
    G.phase = 'map';
    G.pendingEvent = null;
    G.location = PLAYER;
    G.day = 7;
    G.isLocationOpen = function () { return true; };
    G.dailySpecial = {
      id: 'probe_layout', name: '探针布局', desc: '注入驱动布局探针',
      effect: 'none', bias: 'good', locationId: CASE
    };
    G.dailySpecialDay = 7;
    R.dailySpecialShownDay = 7;
    R.refresh();
    setTimeout(function () { collect(result); }, 1000);
  }

  function wait() {
    var cc = getCC();
    var scene = getScene(cc);
    ccRef = cc;
    sceneRef = scene;
    var result = findRoot(cc, scene);
    if (result.root && result.gamePresent) {
      run(result);
      return;
    }
    if (elapsed() >= TIMEOUT_MS) {
      fail('lookup', result.reason || 'ROOT_LOOKUP_TIMEOUT', result);
      return;
    }
    setTimeout(wait, 500);
  }

  console.log(TAG + ': START ' + JSON.stringify({
    probeVersion: VERSION, mode: 'probe-layout', not_normal_touch: true,
    case: CASE, player: PLAYER, stage: 'start'
  }));
  setTimeout(wait, 1000);
})();
