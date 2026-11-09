System.register("chunks:///_virtual/Art.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './ArtMap.ts', './UI.ts'], function (exports) {
  var _inheritsLoose, _createClass, _createForOfIteratorHelperLoose, _asyncToGenerator, _regeneratorRuntime, cclegacy, _decorator, Sprite, Component, UITransform, Color, Button, Graphics, Label, resources, SpriteFrame, Texture2D, assetManager, ImageAsset, ART_ALIAS, ICON_MAP, uiNode;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createClass = module.createClass;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Sprite = module.Sprite;
      Component = module.Component;
      UITransform = module.UITransform;
      Color = module.Color;
      Button = module.Button;
      Graphics = module.Graphics;
      Label = module.Label;
      resources = module.resources;
      SpriteFrame = module.SpriteFrame;
      Texture2D = module.Texture2D;
      assetManager = module.assetManager;
      ImageAsset = module.ImageAsset;
    }, function (module) {
      ART_ALIAS = module.ART_ALIAS;
      ICON_MAP = module.ICON_MAP;
    }, function (module) {
      uiNode = module.uiNode;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "0de5e9JY2tOmYu9+4dixOpf", "Art", undefined);
      var ccclass = _decorator.ccclass;
      var ART_ROOT = 'art';
      var DEFAULT_FPS = 10;

      /** 文件名自然排序（0.png, 1.png, ... 10.png 不会排到 2 前面） */
      function compareNames(a, b) {
        if (a === b) return 0;
        var pa = a.replace(/\d+/g, '#');
        var pb = b.replace(/\d+/g, '#');
        if (pa !== pb) return pa < pb ? -1 : 1;
        var na = a.match(/\d+/g);
        var nb = b.match(/\d+/g);
        if (na && nb && na.length > 0 && nb.length > 0) {
          var len = Math.min(na.length, nb.length);
          for (var i = 0; i < len; i++) {
            var x = parseInt(na[i], 10);
            var y = parseInt(nb[i], 10);
            if (x !== y) return x - y;
          }
          if (na.length !== nb.length) return na.length - nb.length;
        }
        return a < b ? -1 : a > b ? 1 : 0;
      }

      /**
       * 挂在节点上的简易序列帧播放器，支持循环起点。
       */
      var ArtSpritePlayer = exports('ArtSpritePlayer', (_dec = ccclass('ArtSpritePlayer'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(ArtSpritePlayer, _Component);
        function ArtSpritePlayer() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this._frames = [];
          _this._fps = DEFAULT_FPS;
          _this._loop = true;
          _this._loopFrom = 0;
          _this._index = 0;
          _this._sprite = null;
          return _this;
        }
        var _proto = ArtSpritePlayer.prototype;
        _proto.setFrames = function setFrames(frames, fps, loop, loopFrom) {
          if (fps === void 0) {
            fps = DEFAULT_FPS;
          }
          if (loop === void 0) {
            loop = true;
          }
          if (loopFrom === void 0) {
            loopFrom = 0;
          }
          this._frames = frames && frames.length > 0 ? frames.slice() : [];
          var f = Math.floor(fps);
          this._fps = f > 0 ? f : DEFAULT_FPS;
          this._loop = loop;
          this._loopFrom = Math.max(0, Math.min(loopFrom, Math.max(0, this._frames.length - 1)));
          this._index = 0;
          this.applyFrame();
          this.restartSchedule();
        };
        _proto.onEnable = function onEnable() {
          this.restartSchedule();
        };
        _proto.onDisable = function onDisable() {
          this.unschedule(this.tick);
        };
        _proto.ensureSprite = function ensureSprite() {
          if (!this._sprite || !this._sprite.isValid) {
            this._sprite = this.getComponent(Sprite);
          }
          return this._sprite;
        };
        _proto.applyFrame = function applyFrame() {
          var sp = this.ensureSprite();
          if (!sp) return;
          sp.spriteFrame = this._frames.length > 0 ? this._frames[Math.min(this._index, this._frames.length - 1)] : null;
        };
        _proto.restartSchedule = function restartSchedule() {
          this.unschedule(this.tick);
          if (!this.node || !this.node.activeInHierarchy) return;
          if (this._frames.length <= 1) return;
          this.schedule(this.tick, 1 / this._fps);
        };
        _proto.tick = function tick() {
          if (this._frames.length <= 1) return;
          this._index++;
          if (this._index >= this._frames.length) {
            if (this._loop) {
              this._index = this._loopFrom;
            } else {
              this._index = this._frames.length - 1;
              this.unschedule(this.tick);
              this.applyFrame();
              return;
            }
          }
          this.applyFrame();
        };
        _createClass(ArtSpritePlayer, [{
          key: "frameCount",
          get: function get() {
            return this._frames.length;
          }
        }]);
        return ArtSpritePlayer;
      }(Component)) || _class));

      /**
       * 表现层素材工具。
       * 所有 art 资源都是可选的：没有序列帧时一律退化成纯色块 + 文字占位。
       */
      var Art = exports('Art', /*#__PURE__*/function () {
        function Art() {}
        /** 预加载 resources/art 下所有 SpriteFrame，并后台加载背景 bundle。 */
        Art.preload = /*#__PURE__*/
        function () {
          var _preload = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  if (!Art._preloaded) {
                    _context.next = 2;
                    break;
                  }
                  return _context.abrupt("return");
                case 2:
                  Art._preloaded = true;

                  // 1. 加载 resources/art 下所有 SpriteFrame
                  _context.prev = 3;
                  _context.next = 6;
                  return new Promise(function (resolve) {
                    try {
                      resources.loadDir(ART_ROOT, SpriteFrame, function (err, assets) {
                        // 即使有单张图失败，也把已导入的帧收集起来
                        Art.collectResFrames(assets);
                        resolve();
                      });
                    } catch (e) {
                      resolve();
                    }
                  });
                case 6:
                  _context.next = 10;
                  break;
                case 8:
                  _context.prev = 8;
                  _context.t0 = _context["catch"](3);
                case 10:
                  // 2. 设置纹理过滤与九宫格 insets
                  Art.applyFiltersAndInsets();

                  // 3. 后台加载背景 bundle
                  _context.next = 13;
                  return Art.loadBackgrounds();
                case 13:
                case "end":
                  return _context.stop();
              }
            }, _callee, null, [[3, 8]]);
          }));
          function preload() {
            return _preload.apply(this, arguments);
          }
          return preload;
        }() /** 获取逻辑名对应的序列帧（bg/icon 映射到正确路径）。无素材返回空数组。 */;
        Art.frames = function frames(name) {
          if (!name) return [];

          // icon_<itemId>
          if (name.startsWith('icon_')) {
            var itemId = name.slice(5);
            var iconName = ICON_MAP[itemId];
            if (!iconName) {
              Art.recordMissing(name);
              return [];
            }
            var key = "icons/" + iconName;
            var list = Art._resFramesCache.get(key);
            if (list && list.length > 0) return list;
            if (Art._preloaded) Art.recordMissing(name);
            return [];
          }

          // bg_<locationId>
          if (name.startsWith('bg_')) {
            var _alias = ART_ALIAS[name];
            if (!_alias || _alias.src !== 'bg') {
              Art.recordMissing(name);
              return [];
            }
            var sf = Art._bgFramesCache.get(_alias.path);
            if (sf) return [sf];
            if (Art._bgLoaded) Art.recordMissing(name);
            return [];
          }

          // 普通逻辑名
          var alias = ART_ALIAS[name];
          if (alias && alias.src === 'res') {
            var _list = Art._resFramesCache.get(alias.path);
            if (_list && _list.length > 0) return _list;
            if (Art._preloaded) Art.recordMissing(name);
            return [];
          }

          // 兼容：直接尝试用原名作为素材目录
          var legacy = Art._resFramesCache.get(name);
          if (legacy && legacy.length > 0) return legacy;
          if (Art._preloaded) Art.recordMissing(name);
          return [];
        }

        /**
         * 通用可视占位：有序列帧 -> Sprite 自动循环播放；
         * 否则 -> 纯色块 + 中文文字。背景未加载完时先占位，加载完自动替换。
         */;
        Art.makeVisual = function makeVisual(name, w, h, color, label) {
          var width = Math.max(1, Math.round(w));
          var height = Math.max(1, Math.round(h));
          var node = uiNode(name || 'visual');
          var ut = node.addComponent(UITransform);
          ut.setContentSize(width, height);
          var frames = Art.frames(name);
          if (frames.length > 0) {
            Art.applySpriteToNode(node, name, frames);
            return node;
          }

          // 背景尚未加载完成？
          var alias = ART_ALIAS[name];
          if (alias && alias.src === 'bg' && !Art._bgLoaded) {
            // 先画占位，等背景加载完成后再替换
            Art.drawPlaceholder(node, width, height, color, label);
            Art._bgWaiters.push({
              name: name,
              node: node
            });
            return node;
          }

          // 普通占位
          Art.drawPlaceholder(node, width, height, color, label);
          return node;
        }

        /** 切换节点的序列帧播放；目标名字没有帧时 no-op。 */;
        Art.play = function play(node, name, fps, loop) {
          var _alias$loopFrom;
          if (fps === void 0) {
            fps = DEFAULT_FPS;
          }
          if (loop === void 0) {
            loop = true;
          }
          if (!node || !node.isValid) return;
          var frames = Art.frames(name);
          if (frames.length === 0) return;
          var alias = ART_ALIAS[name];
          var loopFrom = (_alias$loopFrom = alias == null ? void 0 : alias.loopFrom) != null ? _alias$loopFrom : 0;
          Art.applySpriteToNode(node, name, frames, fps, loop, loopFrom);
        }

        /**
         * 创建卡片节点：高度 = parentH * 0.7，宽 = 高 * 0.75，水平居中。
         * 底图为卡片素材，上面挂 content 子节点。
         */;
        Art.makeCard = function makeCard(kind, parentH) {
          var cardH = Math.max(100, parentH * 0.7);
          var cardW = cardH * 0.75;
          var node = uiNode(kind);
          var ut = node.addComponent(UITransform);
          ut.setContentSize(cardW, cardH);
          var frames = Art.frames(kind);
          if (frames.length > 0) {
            Art.applySpriteToNode(node, kind, frames);
          } else {
            var _cardLabels$kind;
            var cardLabels = {
              card_day: '日结算',
              card_fail: '倒霉卡',
              card_cert: '通关证书'
            };
            Art.drawPlaceholder(node, cardW, cardH, new Color(220, 220, 220, 255), (_cardLabels$kind = cardLabels[kind]) != null ? _cardLabels$kind : '卡片');
          }

          // 文字内容子节点
          var content = uiNode('content');
          var cut = content.addComponent(UITransform);
          cut.setContentSize(cardW, cardH);
          content.setParent(node);
          content.setPosition(0, 0, 0);
          return node;
        }

        /** 创建九宫格按钮，按下时切换素材。无素材时退化为色块按钮。 */;
        Art.makeButton = function makeButton(text, w, h, onClick, fontSize) {
          var node = uiNode('button');
          var ut = node.addComponent(UITransform);
          ut.setContentSize(w, h);
          var normalFrames = Art.frames('button');
          var pressedFrames = Art.frames('button_pressed');
          var sprite = null;
          if (normalFrames.length > 0 && pressedFrames.length > 0) {
            Art.applySpriteToNode(node, 'button', normalFrames);
            sprite = node.getComponent(Sprite);
            if (sprite) {
              sprite.type = Sprite.Type.SLICED;
            }
            var btn = node.addComponent(Button);
            btn.transition = Button.Transition.SPRITE;
            btn.normalSprite = normalFrames[0];
            btn.pressedSprite = pressedFrames[0];
          } else {
            // 色块按钮
            var g = node.addComponent(Graphics);
            var col = new Color(90, 90, 100, 255);
            g.fillColor = col;
            g.rect(-w / 2, -h / 2, w, h);
            g.fill();
            var _btn = node.addComponent(Button);
            _btn.transition = Button.Transition.COLOR;
            _btn.normalColor = col;
            _btn.pressedColor = new Color(60, 60, 70, 255);
          }

          // 文字
          var labelNode = uiNode('label');
          var lUt = labelNode.addComponent(UITransform);
          lUt.setContentSize(w, h);
          var lb = labelNode.addComponent(Label);
          lb.string = text;
          lb.fontSize = fontSize != null ? fontSize : Math.max(14, Math.min(28, Math.floor(Math.min(w, h) * 0.5)));
          lb.lineHeight = lb.fontSize + 4;
          lb.horizontalAlign = Label.HorizontalAlign.CENTER;
          lb.verticalAlign = Label.VerticalAlign.CENTER;
          lb.overflow = Label.Overflow.SHRINK;
          lb.enableWrapText = true;
          lb.color = new Color(245, 245, 245, 255);
          labelNode.setParent(node);
          labelNode.setPosition(0, 0, 0);
          node.on(Button.EventType.CLICK, function () {
            onClick();
          });
          return node;
        }

        /** 代码绘制背包单个格子。 */;
        Art.drawCell = function drawCell(g, x, y, size, state, badAlpha) {
          if (badAlpha === void 0) {
            badAlpha = 1;
          }
          var half = size / 2;
          // 普通格是深色底；bad 时整格填红，而不只是描边
          var alpha = Math.max(0, Math.min(1, badAlpha));
          if (state === 'bad') {
            g.fillColor = new Color(190, 42, 42, Math.round(200 * alpha));
          } else if (state === 'filled') {
            g.fillColor = new Color(52, 52, 58, 255);
          } else {
            g.fillColor = new Color(45, 45, 50, 255);
          }
          g.rect(x - half, y - half, size, size);
          g.fill();
          g.lineWidth = 2;
          var strokeColor;
          switch (state) {
            case 'hover':
              strokeColor = new Color(255, 220, 80, 255);
              break;
            case 'bad':
              strokeColor = new Color(255, 90, 90, Math.round(255 * alpha));
              break;
            case 'filled':
              strokeColor = new Color(180, 180, 200, 255);
              break;
            case 'normal':
            default:
              strokeColor = new Color(160, 160, 170, 255);
              break;
          }
          g.strokeColor = strokeColor;
          g.rect(x - half, y - half, size, size);
          g.stroke();
        }

        /** 返回本次运行中被请求但没有素材、走了占位的逻辑名（去重）。 */;
        Art.missing = function missing() {
          return Array.from(Art._missing);
        }

        // ------------------------------------------------------------------
        // 内部方法
        // ------------------------------------------------------------------
        ;

        Art.recordMissing = function recordMissing(name) {
          Art._missing.add(name);
        };
        Art.drawPlaceholder = function drawPlaceholder(node, width, height, color, label) {
          var base = color ? color.clone() : new Color(200, 200, 200, 255);
          var g = node.addComponent(Graphics);
          g.fillColor = base;
          g.rect(-width / 2, -height / 2, width, height);
          g.fill();
          g.lineWidth = Math.max(1, Math.round(Math.min(width, height) * 0.05));
          g.strokeColor = new Color(0, 0, 0, 90);
          g.stroke();
          if (label != null && label !== '') {
            var ln = uiNode('ph_label');
            var lut = ln.addComponent(UITransform);
            lut.setContentSize(width, height);
            var lb = ln.addComponent(Label);
            lb.string = label;
            var fs = Math.max(12, Math.min(30, Math.floor(Math.min(width, height) * 0.52)));
            lb.fontSize = fs;
            lb.lineHeight = fs + 4;
            lb.horizontalAlign = Label.HorizontalAlign.CENTER;
            lb.verticalAlign = Label.VerticalAlign.CENTER;
            lb.overflow = Label.Overflow.SHRINK;
            lb.enableWrapText = false;
            var lum = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b;
            lb.color = lum > 150 ? new Color(25, 25, 28, 255) : new Color(248, 248, 248, 255);
            ln.setParent(node);
            ln.setPosition(0, 0, 0);
          }
        };
        Art.applySpriteToNode = function applySpriteToNode(node, name, frames, fps, loop, loopFrom) {
          var _ref;
          if (!node || !node.isValid || frames.length === 0) return;

          // 隐藏占位元素
          var g = node.getComponent(Graphics);
          if (g) g.enabled = false;
          var label = node.getChildByName('ph_label');
          if (label) label.active = false;
          var sp = node.getComponent(Sprite);
          if (!sp) {
            sp = node.addComponent(Sprite);
          }
          sp.sizeMode = Sprite.SizeMode.CUSTOM;
          var alias = ART_ALIAS[name];
          if (alias != null && alias.insets) {
            sp.type = Sprite.Type.SLICED;
          } else {
            sp.type = Sprite.Type.SIMPLE;
          }
          // 注意：这里假设 UITransform 已经存在并设置了尺寸
          // 如果没有，makeVisual 里已设置；play 升级的节点一般也有了

          var effectiveFps = fps || DEFAULT_FPS;
          var effectiveLoop = loop != null ? loop : true;
          var effectiveLoopFrom = (_ref = loopFrom != null ? loopFrom : alias == null ? void 0 : alias.loopFrom) != null ? _ref : 0;
          var player = node.getComponent(ArtSpritePlayer);
          if (!player) {
            player = node.addComponent(ArtSpritePlayer);
          }
          player.setFrames(frames, effectiveFps, effectiveLoop, effectiveLoopFrom);
        }

        /** 从已加载的 resources/art 资源中归类缓存。 */;
        Art.collectResFrames = function collectResFrames(loaded) {
          Art._resFramesCache.clear();
          var buckets = new Map();
          var infos = [];
          try {
            var got = resources.getDirWithPath(ART_ROOT, SpriteFrame);
            if (got && got.length > 0) infos = got;
          } catch (e) {
            infos = [];
          }
          for (var i = 0; i < infos.length; i++) {
            var info = infos[i];
            if (!info) continue;
            var rawPath = info.path || info.url || '';
            if (!rawPath) continue;
            var segs = rawPath.split('/');
            var parts = segs;
            var tail = parts[parts.length - 1];
            if (tail === 'spriteFrame' || tail === 'texture') {
              parts = parts.slice(0, parts.length - 1);
            }
            if (parts.length < 3) continue; // 至少 art/xxx/file

            var artIdx = parts.indexOf(ART_ROOT);
            if (artIdx === -1) continue; // 不在 art 目录下
            var relParts = parts.slice(artIdx + 1); // 相对 art/ 的路径段
            if (relParts.length < 2) continue; // 至少有一个目录和文件

            var name = void 0;
            var file = void 0;
            if (relParts.length === 2) {
              // 目录/文件 或 子目录/文件（如 icons/plastic_bottle）
              var dirName = relParts[0];
              file = relParts[1];
              if (dirName === 'icons') {
                // 图标单独作为 key：icons/<filename>
                name = "icons/" + file;
              } else {
                name = dirName;
              }
            } else if (relParts.length > 2) {
              // 多级目录，暂时只取最后一级目录名作为 key
              name = relParts[relParts.length - 2];
              file = relParts[relParts.length - 1];
            } else {
              continue;
            }

            // 图片导入类型是 sprite-frame 时，子资源路径是 .../xxx/spriteFrame
            var sf = null;
            var candidates = [];
            if (rawPath.endsWith('/spriteFrame')) {
              candidates.push(rawPath);
            } else {
              candidates.push(rawPath + "/spriteFrame");
              candidates.push(rawPath);
            }
            for (var _i = 0, _candidates = candidates; _i < _candidates.length; _i++) {
              var path = _candidates[_i];
              try {
                sf = resources.get(path, SpriteFrame);
              } catch (e) {
                sf = null;
              }
              if (sf) break;
            }
            if (!sf) {
              // 尝试直接使用 info.asset
              sf = info.asset;
            }
            if (!sf) continue;
            var arr = buckets.get(name);
            if (!arr) {
              arr = [];
              buckets.set(name, arr);
            }
            arr.push({
              key: file,
              sf: sf
            });
          }
          buckets.forEach(function (arr, name) {
            arr.sort(function (a, b) {
              return compareNames(a.key, b.key);
            });
            var frames = [];
            for (var _i2 = 0; _i2 < arr.length; _i2++) frames.push(arr[_i2].sf);
            if (frames.length > 0) Art._resFramesCache.set(name, frames);
          });
        }

        /** 设置纹理过滤与九宫格 insets。 */;
        Art.applyFiltersAndInsets = function applyFiltersAndInsets() {
          // 设置所有 res SpriteFrame 的 filter
          Art._resFramesCache.forEach(function (frames) {
            frames.forEach(function (sf) {
              if (sf.texture) {
                sf.texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
              }
            });
          });

          // 根据 ART_ALIAS 设置 insets
          var _loop = function _loop() {
              var _Object$entries$_i = _Object$entries[_i3],
                name = _Object$entries$_i[0],
                alias = _Object$entries$_i[1];
              if (alias.src !== 'res' || !alias.insets) return 0; // continue
              var frames = Art._resFramesCache.get(alias.path);
              if (!frames || frames.length === 0) return 0; // continue
              var _alias$insets = alias.insets,
                l = _alias$insets[0],
                r = _alias$insets[1],
                t = _alias$insets[2],
                b = _alias$insets[3];
              frames.forEach(function (sf) {
                sf.insetLeft = l;
                sf.insetRight = r;
                sf.insetTop = t;
                sf.insetBottom = b;
              });
            },
            _ret;
          for (var _i3 = 0, _Object$entries = Object.entries(ART_ALIAS); _i3 < _Object$entries.length; _i3++) {
            _ret = _loop();
            if (_ret === 0) continue;
          }
        }

        /** 加载背景 bundle 并缓存所有背景。 */;
        Art.loadBackgrounds = /*#__PURE__*/
        function () {
          var _loadBackgrounds = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  return _context2.abrupt("return", new Promise(function (resolve) {
                    assetManager.loadBundle('bg', function (err, bundle) {
                      if (err || !bundle) {
                        Art._bgLoaded = true;
                        Art._onBgLoaded();
                        resolve();
                        return;
                      }
                      var bgAliases = Object.entries(ART_ALIAS).filter(function (_ref2) {
                        var alias = _ref2[1];
                        return alias.src === 'bg';
                      });
                      var remaining = bgAliases.length;
                      if (remaining === 0) {
                        Art._bgLoaded = true;
                        Art._onBgLoaded();
                        resolve();
                        return;
                      }
                      var finishOne = function finishOne(path, sf) {
                        if (sf) {
                          if (sf.texture) {
                            sf.texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
                          }
                          Art._bgFramesCache.set(path, sf);
                        }
                        remaining--;
                        if (remaining <= 0) {
                          Art._bgLoaded = true;
                          Art._onBgLoaded();
                          resolve();
                        }
                      };
                      var loadBackground = function loadBackground(path) {
                        var loadImageAsSpriteFrame = function loadImageAsSpriteFrame() {
                          try {
                            bundle.load(path, ImageAsset, function (imageErr, image) {
                              if (imageErr || !image) {
                                finishOne(path, null);
                                return;
                              }
                              var sf = null;
                              try {
                                sf = SpriteFrame.createWithImage(image);
                              } catch (e) {
                                sf = null;
                              }
                              finishOne(path, sf);
                            });
                          } catch (e) {
                            finishOne(path, null);
                          }
                        };
                        try {
                          bundle.load(path + "/spriteFrame", SpriteFrame, function (sfErr, sf) {
                            if (sfErr || !sf) {
                              loadImageAsSpriteFrame();
                              return;
                            }
                            finishOne(path, sf);
                          });
                        } catch (e) {
                          loadImageAsSpriteFrame();
                        }
                      };
                      for (var _iterator = _createForOfIteratorHelperLoose(bgAliases), _step; !(_step = _iterator()).done;) {
                        var _step$value = _step.value,
                          alias = _step$value[1];
                        loadBackground(alias.path);
                      }
                    });
                  }));
                case 1:
                case "end":
                  return _context2.stop();
              }
            }, _callee2);
          }));
          function loadBackgrounds() {
            return _loadBackgrounds.apply(this, arguments);
          }
          return loadBackgrounds;
        }() /** 背景加载完成后的处理：替换等待中的占位节点。 */;
        Art._onBgLoaded = function _onBgLoaded() {
          var waiters = Art._bgWaiters.slice();
          Art._bgWaiters = [];
          for (var _iterator2 = _createForOfIteratorHelperLoose(waiters), _step2; !(_step2 = _iterator2()).done;) {
            var _step2$value = _step2.value,
              name = _step2$value.name,
              node = _step2$value.node;
            var frames = Art.frames(name);
            if (frames.length > 0 && node && node.isValid) {
              Art.applySpriteToNode(node, name, frames);
            }
          }
        };
        return Art;
      }());
      Art._preloaded = false;
      Art._bgLoaded = false;
      Art._resFramesCache = new Map();
      Art._bgFramesCache = new Map();
      Art._missing = new Set();
      Art._bgWaiters = [];
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ArtMap.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "f47648nzABBIZzF+7gMCOkN", "ArtMap", undefined);
      /**
       * assets/scripts/ui/ArtMap.ts
       * 逻辑名 → 美术素材路径 映射表
       * 供 Art.ts 解析 frames / icons / 地图坐标使用
       */
      var ART_ALIAS = exports('ART_ALIAS', {
        // ---------- 主角 ----------
        hero_idle: {
          src: 'res',
          path: 'hero_idle'
        },
        hero_walk: {
          src: 'res',
          path: 'hero_walk'
        },
        hero_dig: {
          src: 'res',
          path: 'hero_dig'
        },
        hero_fall: {
          src: 'res',
          path: 'hero_fall_sleep'
        },
        // ---------- 盒子 ----------
        box_small: {
          src: 'res',
          path: 'box_bag_shake'
        },
        box_big: {
          src: 'res',
          path: 'box_bin_shake'
        },
        box_big_alt: {
          src: 'res',
          path: 'box_scrap_shake'
        },
        // ---------- 光效 ----------
        glow_white: {
          src: 'res',
          path: 'glow_white'
        },
        glow_blue: {
          src: 'res',
          path: 'glow_blue'
        },
        glow_gold: {
          src: 'res',
          path: 'glow_gold'
        },
        glow_rainbow: {
          src: 'res',
          path: 'glow_rainbow'
        },
        // ---------- 开盖特效 ----------
        lid_pop: {
          src: 'res',
          path: 'fx_lidpop'
        },
        pop_flash: {
          src: 'res',
          path: 'fx_item_pop'
        },
        fx_flashlight: {
          src: 'res',
          path: 'fx_flashlight'
        },
        fx_clash: {
          src: 'res',
          path: 'fx_clash'
        },
        // ---------- NPC / 事件 ----------
        npc_patrol: {
          src: 'res',
          path: 'npc_patrol_uncle'
        },
        ev_patrol: {
          src: 'res',
          path: 'npc_patrol_uncle'
        },
        npc_guard: {
          src: 'res',
          path: 'npc_guard'
        },
        ev_guard: {
          src: 'res',
          path: 'npc_guard'
        },
        npc_rival: {
          src: 'res',
          path: 'npc_rival'
        },
        ev_rival: {
          src: 'res',
          path: 'npc_rival'
        },
        npc_cat: {
          src: 'res',
          path: 'npc_cat'
        },
        ev_cat: {
          src: 'res',
          path: 'npc_cat'
        },
        npc_auntie: {
          src: 'res',
          path: 'npc_kind_auntie'
        },
        ev_auntie: {
          src: 'res',
          path: 'npc_kind_auntie'
        },
        npc_courier: {
          src: 'res',
          path: 'npc_delivery_rider'
        },
        ev_delivery: {
          src: 'res',
          path: 'npc_delivery_rider'
        },
        ev_wallet: {
          src: 'res',
          path: 'npc_wallet_owner'
        },
        npc_sanitation: {
          src: 'res',
          path: 'npc_sanitation_auntie'
        },
        ev_night_warmth: {
          src: 'res',
          path: 'npc_sanitation_auntie'
        },
        // ---------- 摇签 / 卡片 ----------
        fortune_tube: {
          src: 'res',
          path: 'fortune_cup',
          fps: 10,
          loopFrom: 1
        },
        fortune_slip: {
          src: 'res',
          path: 'fortune_slip'
        },
        card_day: {
          src: 'res',
          path: 'card_daily'
        },
        card_fail: {
          src: 'res',
          path: 'card_fail'
        },
        card_cert: {
          src: 'res',
          path: 'card_cert'
        },
        // ---------- UI 条 / 按钮 / 面板 ----------
        bar_hunger: {
          src: 'res',
          path: 'bar_frame_yellow',
          insets: [3, 3, 3, 3]
        },
        bar_stamina: {
          src: 'res',
          path: 'bar_frame_red',
          insets: [3, 3, 3, 3]
        },
        bar_mood: {
          src: 'res',
          path: 'bar_frame_blue',
          insets: [2, 2, 2, 2]
        },
        button: {
          src: 'res',
          path: 'button_normal',
          insets: [2, 2, 2, 4]
        },
        button_pressed: {
          src: 'res',
          path: 'button_pressed',
          insets: [5, 5, 4, 5]
        },
        panel: {
          src: 'res',
          path: 'panel_frame',
          insets: [5, 3, 5, 5]
        },
        // ---------- 背景（bg 分包） ----------
        bg_huaqiangbei: {
          src: 'bg',
          path: 'loc_huaqiangbei'
        },
        bg_dongmen: {
          src: 'bg',
          path: 'loc_dongmen'
        },
        bg_baishizhou: {
          src: 'bg',
          path: 'loc_baishizhou'
        },
        bg_futian_cbd: {
          src: 'bg',
          path: 'loc_futian_cbd'
        },
        bg_nanshan_tech: {
          src: 'bg',
          path: 'loc_nanshan_tech'
        },
        // 以下逻辑名没有背景素材，Art.ts 中走占位：
        // bg_sz_bay / bg_window_world / bg_university_town

        map: {
          src: 'bg',
          path: 'map_shenzhen'
        },
        home_0: {
          src: 'bg',
          path: 'shelter_bed'
        },
        home_1: {
          src: 'bg',
          path: 'shelter_recycle'
        },
        home_2: {
          src: 'bg',
          path: 'shelter_recycle_up'
        },
        sleep_bench: {
          src: 'bg',
          path: 'sleep_park'
        },
        sleep_diner: {
          src: 'bg',
          path: 'sleep_fastfood'
        },
        sleep_netcafe: {
          src: 'bg',
          path: 'sleep_netcafe'
        }
      });

      /**
       * itemId → iconName
       * icon 文件位于 assets/resources/art/icons/<iconName>.png
       * 没有登记的 itemId 由 Art.ts 使用占位色块 + 名字首字。
       */
      var ICON_MAP = exports('ICON_MAP', {
        empty_water_bottle: 'plastic_bottle',
        crushed_can: 'soda_can',
        cardboard_box: 'cardboard',
        left_slipper: 'left_slipper',
        broken_umbrella: 'umbrella',
        half_cup_milk_tea: 'milk_tea',
        cold_bun: 'buns',
        half_egg_tart: 'egg_tart',
        expired_bread: 'bread',
        charging_cable: 'charger_cable',
        energy_drink: 'tin_can',
        delivery_set_meal: 'rice_box',
        exam_materials: 'old_book',
        mechanical_keyboard: 'keyboard',
        old_phone: 'old_phone',
        scratch_card: 'scratch_card',
        dead_mouse: 'dead_mouse',
        // 新增的 17 个专属图标（items_atlas 第 34~50 格）
        old_newspaper: 'old_newspaper',
        disposable_chopsticks: 'chopsticks',
        plastic_flower: 'plastic_flower',
        old_clothes: 'old_clothes',
        unopened_rice_ball: 'onigiri_sealed',
        old_rice_cooker: 'old_rice_cooker',
        half_bag_rice: 'half_rice_bag',
        plaid_shirt: 'plaid_shirt',
        metro_card: 'metro_card',
        kite: 'kite',
        power_bank: 'power_bank',
        unopened_mooncake: 'mooncake_sealed',
        brand_briefcase: 'brand_briefcase',
        off_season_tshirt: 'trendy_tshirt',
        graphics_card: 'gpu',
        golden_koi: 'gold_koi',
        cat_hair: 'cat_hair'
      });

      /**
       * locationId → 地图 360x640 像素坐标（原点左上）。
       * Art.ts 中换算为 Cocos 坐标：
       *   cx = (x - 180) * 2
       *   cy = (320 - y) * 2
       */
      var MAP_POINTS = exports('MAP_POINTS', {
        university_town: {
          x: 210,
          y: 154
        },
        huaqiangbei: {
          x: 301,
          y: 216
        },
        nanshan_tech: {
          x: 43,
          y: 264
        },
        baishizhou: {
          x: 178,
          y: 301
        },
        window_world: {
          x: 106,
          y: 311
        },
        dongmen: {
          x: 329,
          y: 357
        },
        futian_cbd: {
          x: 244,
          y: 403
        },
        sz_bay: {
          x: 59,
          y: 421
        }
      });
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/config.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "328f5NPn01AjYh5DvTYfGIL", "config", undefined);
      var ITEMS = exports('ITEMS', [{
        id: 'empty_water_bottle',
        name: '空矿泉水瓶',
        rarity: 'common',
        cells: 1,
        price: 1,
        edible: false,
        desc: '深圳最稳定的理财产品'
      }, {
        id: 'crushed_can',
        name: '压扁的易拉罐',
        rarity: 'common',
        cells: 1,
        price: 1.5,
        edible: false,
        desc: '被人踩过，但它没放弃'
      }, {
        id: 'old_newspaper',
        name: '旧报纸',
        rarity: 'common',
        cells: 1,
        price: 0.5,
        edible: false,
        desc: '头条写着「就业形势向好」'
      }, {
        id: 'cardboard_box',
        name: '纸箱',
        rarity: 'common',
        cells: 2,
        price: 7.5,
        edible: false,
        desc: '白天能卖钱，晚上能当被子'
      }, {
        id: 'left_slipper',
        name: '左脚拖鞋',
        rarity: 'common',
        cells: 1,
        price: 0,
        edible: false,
        desc: '右脚在哪？这是一个哲学问题'
      }, {
        id: 'broken_umbrella',
        name: '坏掉的雨伞',
        rarity: 'common',
        cells: 2,
        price: 2.5,
        edible: false,
        desc: '只能挡住一半的命运'
      }, {
        id: 'half_cup_milk_tea',
        name: '半杯奶茶',
        rarity: 'common',
        cells: 1,
        price: 0,
        edible: true,
        hunger: 5,
        desc: '三分糖，七分别人的口水',
        locations: ['dongmen']
      }, {
        id: 'cold_bun',
        name: '冷掉的包子',
        rarity: 'common',
        cells: 1,
        price: 0,
        edible: true,
        hunger: 15,
        desc: '皮比你的人生还硬'
      }, {
        id: 'half_egg_tart',
        name: '半块蛋挞',
        rarity: 'common',
        cells: 1,
        price: 0,
        edible: true,
        hunger: 10,
        desc: '前主人只咬了一个梦想'
      }, {
        id: 'expired_bread',
        name: '过期 1 天的面包',
        rarity: 'common',
        cells: 1,
        price: 0,
        edible: true,
        hunger: 20,
        desc: '保质期只是一个建议'
      }, {
        id: 'disposable_chopsticks',
        name: '一次性筷子',
        rarity: 'common',
        cells: 1,
        price: 0.5,
        edible: false,
        desc: '恭喜你，离吃饭只差饭了'
      }, {
        id: 'plastic_flower',
        name: '塑料花',
        rarity: 'common',
        cells: 1,
        price: 2.5,
        edible: false,
        desc: '永不凋谢，就像你的贫穷'
      }, {
        id: 'old_clothes',
        name: '旧衣服',
        rarity: 'good',
        cells: 2,
        price: 4,
        edible: false,
        desc: '还有香水味，比你体面'
      }, {
        id: 'charging_cable',
        name: '充电线',
        rarity: 'good',
        cells: 1,
        price: 4,
        edible: false,
        desc: '只有一头能用，像一段感情'
      }, {
        id: 'energy_drink',
        name: '能量饮料',
        rarity: 'good',
        cells: 1,
        price: 0,
        edible: true,
        stamina: 15,
        desc: '喝完感觉还能再翻 5 个桶'
      }, {
        id: 'unopened_rice_ball',
        name: '没拆封的饭团',
        rarity: 'good',
        cells: 1,
        price: 0,
        edible: true,
        hunger: 30,
        desc: '今日大奖！双手合十'
      }, {
        id: 'delivery_set_meal',
        name: '外卖套餐',
        rarity: 'good',
        cells: 1,
        price: 0,
        edible: true,
        hunger: 35,
        stamina: 5,
        desc: '备注写着「不要香菜」',
        locations: ['university_town']
      }, {
        id: 'old_rice_cooker',
        name: '旧电饭煲',
        rarity: 'good',
        cells: 2,
        price: 20,
        edible: false,
        desc: '煮过无数人的梦想',
        locations: ['baishizhou', 'university_town']
      }, {
        id: 'half_bag_rice',
        name: '半袋大米',
        rarity: 'good',
        cells: 2,
        price: 7,
        edible: true,
        hunger: 25,
        desc: '生吃需要勇气',
        locations: ['baishizhou']
      }, {
        id: 'exam_materials',
        name: '考研资料',
        rarity: 'good',
        cells: 2,
        price: 20,
        edible: false,
        desc: '上一位主人已经上岸了',
        locations: ['university_town']
      }, {
        id: 'plaid_shirt',
        name: '格子衫',
        rarity: 'good',
        cells: 1,
        price: 10,
        edible: false,
        desc: '穿上它，南山欢迎你',
        locations: ['nanshan_tech']
      }, {
        id: 'metro_card',
        name: '地铁卡',
        rarity: 'good',
        cells: 1,
        price: 12,
        edible: false,
        desc: '余额 ¥10，够你逃离一次',
        locations: ['window_world']
      }, {
        id: 'kite',
        name: '风筝',
        rarity: 'good',
        cells: 2,
        price: 20,
        edible: false,
        desc: '它也想飞，你也想',
        locations: ['sz_bay']
      }, {
        id: 'power_bank',
        name: '充电宝',
        rarity: 'rare',
        cells: 1,
        price: 20,
        edible: false,
        desc: '剩 3% 电，和你一样',
        locations: ['huaqiangbei']
      }, {
        id: 'mechanical_keyboard',
        name: '机械键盘',
        rarity: 'rare',
        cells: 2,
        price: 75,
        edible: false,
        desc: '少了一个 Enter，所以没法回车',
        locations: ['nanshan_tech']
      }, {
        id: 'old_phone',
        name: '旧手机',
        rarity: 'rare',
        cells: 1,
        price: 54,
        edible: false,
        desc: '屏碎了，但相册里全是自拍',
        locations: ['huaqiangbei']
      }, {
        id: 'unopened_mooncake',
        name: '没拆封的月饼',
        rarity: 'rare',
        cells: 1,
        price: 36,
        edible: true,
        hunger: 40,
        desc: '是五仁的，懂的都懂',
        locations: ['futian_cbd']
      }, {
        id: 'brand_briefcase',
        name: '名牌公文包',
        rarity: 'rare',
        cells: 2,
        price: 105,
        edible: false,
        desc: '里面装着别人的 KPI',
        locations: ['futian_cbd']
      }, {
        id: 'off_season_tshirt',
        name: '过季潮牌 T 恤',
        rarity: 'rare',
        cells: 1,
        price: 27,
        edible: false,
        desc: '胸口印着「LUCKY」，讽刺拉满',
        locations: ['dongmen']
      }, {
        id: 'graphics_card',
        name: '显卡',
        rarity: 'epic',
        cells: 2,
        price: 120,
        edible: false,
        desc: '华强北的传说，挖矿遗孤',
        locations: ['huaqiangbei']
      }, {
        id: 'golden_koi',
        name: '金色锦鲤摆件',
        rarity: 'epic',
        cells: 1,
        price: 60,
        edible: false,
        desc: '转发它，然后继续穷'
      }, {
        id: 'scratch_card',
        name: '刮刮乐（未刮）',
        rarity: 'epic',
        cells: 1,
        price: 0,
        priceMax: 200,
        edible: false,
        desc: '回家才揭晓，人生就是赌'
      }, {
        id: 'dead_mouse',
        name: '死老鼠',
        rarity: 'mishap',
        cells: 1,
        price: 0,
        edible: false,
        mood: -10,
        desc: '它比你先放弃了深圳'
      }, {
        id: 'cat_hair',
        name: '猫毛一团',
        rarity: 'mishap',
        cells: 1,
        price: 0,
        edible: false,
        mood: -5,
        desc: '被抓伤后的纪念品'
      }]);
      var LOCATIONS = exports('LOCATIONS', [{
        id: 'baishizhou',
        name: '白石洲',
        lootRate: 1.0,
        danger: 0.6,
        distance: 5,
        far: false
      }, {
        id: 'dongmen',
        name: '东门',
        lootRate: 1.25,
        danger: 1.0,
        distance: 10,
        far: false
      }, {
        id: 'huaqiangbei',
        name: '华强北',
        lootRate: 1.25,
        danger: 1.6,
        distance: 12,
        far: false
      }, {
        id: 'futian_cbd',
        name: '福田 CBD',
        lootRate: 1.25,
        danger: 1.6,
        distance: 17,
        far: true
      }, {
        id: 'nanshan_tech',
        name: '南山科技园',
        lootRate: 1.25,
        danger: 1.0,
        distance: 14,
        far: true
      }, {
        id: 'sz_bay',
        name: '深圳湾公园',
        lootRate: 1.25,
        danger: 0.6,
        distance: 18,
        far: true
      }, {
        id: 'window_world',
        name: '世界之窗地铁站',
        lootRate: 1.0,
        danger: 1.0,
        distance: 12,
        far: false
      }, {
        id: 'university_town',
        name: '大学城',
        lootRate: 1.25,
        danger: 0.6,
        distance: 19,
        far: true
      }]);
      var FORTUNES = exports('FORTUNES', [{
        id: 'great_luck',
        tier: 'good',
        name: '大吉',
        text: '今日华强北大吉，宝贝在等你',
        effect: 'lootUp',
        needsLocation: true
      }, {
        id: 'mid_luck',
        tier: 'good',
        name: '中吉',
        text: '东门有人刚搬家',
        effect: 'bigGuaranteeGood',
        needsLocation: true
      }, {
        id: 'small_luck',
        tier: 'good',
        name: '小吉',
        text: '宜吃饭',
        effect: 'foodUp',
        needsLocation: false
      }, {
        id: 'flat',
        tier: 'meh',
        name: '平',
        text: '今天适合呼吸',
        effect: 'none',
        needsLocation: false
      }, {
        id: 'lazy',
        tier: 'meh',
        name: '烂',
        text: '今日宜躺平，忌努力',
        effect: 'none',
        needsLocation: false
      }, {
        id: 'charging',
        tier: 'meh',
        name: '烂',
        text: '你的运气在充电',
        effect: 'nextGoodUp',
        needsLocation: false
      }, {
        id: 'patrol_warning',
        tier: 'bad',
        name: '凶',
        text: '今日福田 CBD 有巡逻大叔',
        effect: 'patrolX2',
        needsLocation: true
      }, {
        id: 'cat_many',
        tier: 'bad',
        name: '凶',
        text: '南山猫多',
        effect: 'mishapUp',
        needsLocation: true
      }, {
        id: 'windy',
        tier: 'bad',
        name: '大凶',
        text: '今天风大',
        effect: 'windy',
        needsLocation: false
      }]);
      var EVENTS = exports('EVENTS', [{
        id: 'patrol',
        name: '巡逻大叔来了',
        weight: 30,
        options: ['礼貌离开', '装作散步']
      }, {
        id: 'guard',
        name: '小区保安',
        weight: 12,
        options: ['被请出小区']
      }, {
        id: 'rival',
        name: '同行抢地盘',
        weight: 15,
        options: ['让给他', '比谁掏得快']
      }, {
        id: 'auntie',
        name: '好心阿姨送饭',
        weight: 10,
        options: ['谢谢阿姨']
      }, {
        id: 'delivery',
        name: '外卖小哥送单错了',
        weight: 10,
        options: ['收下外卖']
      }, {
        id: 'wallet',
        name: '捡到钱包',
        weight: 5,
        options: ['归还钱包']
      }, {
        id: 'cat',
        name: '流浪猫跟着你',
        weight: 10,
        options: ['喂它', '不喂']
      }, {
        id: 'rain',
        name: '下雨了',
        weight: 8,
        options: ['撑住']
      }]);
      var SLEEP_SPOTS = exports('SLEEP_SPOTS', [{
        id: 'bench',
        name: '公园长椅',
        prob: 0.5,
        stamina: 40,
        cost: 0
      }, {
        id: 'diner',
        name: '通宵堡',
        prob: 0.3,
        stamina: 60,
        cost: 5
      }, {
        id: 'netcafe',
        name: '星河网咖',
        prob: 0.2,
        stamina: 80,
        cost: 12
      }]);
      var CONFIG = exports('CONFIG', {
        totalDays: 15,
        startHunger: 80,
        maxHunger: 100,
        startStamina: 100,
        maxStamina: 135,
        startMood: 70,
        maxMood: 100,
        startMoney: 0,
        dayStartMinute: 480,
        midnightMinute: 1440,
        minutesPerDig: {
          small: 15,
          big: 30
        },
        minutesPerHoldSecond: 2,
        travelMinutes: 40,
        digStamina: {
          small: 5,
          big: 12
        },
        holdStaminaPerSec: 3,
        hungerPerDig: 1,
        moodPerDay: -5,
        phases: [{
          fromDay: 1,
          toDay: 4,
          dailyHunger: 12,
          lootMul: 1.0,
          patrolBonus: 0,
          rivalEnabled: false,
          badFortuneBonus: 0,
          farTravelMul: 1
        }, {
          fromDay: 5,
          toDay: 9,
          dailyHunger: 38,
          lootMul: 0.7,
          patrolBonus: 0.1,
          rivalEnabled: true,
          badFortuneBonus: 0,
          farTravelMul: 1
        }, {
          fromDay: 10,
          toDay: 15,
          dailyHunger: 66,
          lootMul: 0.5,
          patrolBonus: 0.1,
          rivalEnabled: true,
          badFortuneBonus: 0.15,
          farTravelMul: 1.5
        }],
        holdCurve: [{
          minSec: 0,
          good: 0.05,
          rare: 0,
          epic: 0
        }, {
          minSec: 1,
          good: 0.15,
          rare: 0,
          epic: 0
        }, {
          minSec: 2,
          good: 0.28,
          rare: 0.015,
          epic: 0
        }, {
          minSec: 2.5,
          good: 0.3,
          rare: 0.025,
          epic: 0.004
        }, {
          minSec: 3,
          good: 0.36,
          rare: 0.08,
          epic: 0.02
        }, {
          minSec: 4,
          good: 0.42,
          rare: 0.13,
          epic: 0.04
        }, {
          minSec: 5,
          good: 0.48,
          rare: 0.21,
          epic: 0.09
        }],
        mishapStartSec: 4,
        mishapPerSec: 0.06,
        maxHoldSec: 6,
        itemsPerBox: {
          small: [1, 1],
          big: [1, 2]
        },
        bigBoxBonusGood: 0.1,
        boxesPerLocation: [3, 5],
        boxCountFortuneDelta: {
          good: [1, 1],
          meh: [0, 0],
          bad: [0, -1]
        },
        bigBoxChance: {
          good: 0.5,
          meh: 0.35,
          bad: 0.2
        },
        moodGoldLow: {
          threshold: 30,
          mul: 0.8
        },
        moodGoldHigh: {
          threshold: 80,
          mul: 1.1
        },
        eventChancePerDig: 0.12,
        fortuneWeights: {
          good: 0.35,
          meh: 0.4,
          bad: 0.25
        },
        fortuneEffects: {
          lootUp: 0.5,
          foodUp: 0.2,
          nextGoodUp: 0.1,
          patrolX2: 2,
          mishapUp: 0.15,
          windy: 5
        },
        rainTravelExtra: 5,
        rainMishapDelta: -0.1,
        catLuckDigs: 3,
        catLuckMul: 0.2,
        patrolLeaveStamina: 5,
        patrolMood: -8,
        rivalYieldMood: -5,
        rivalLoseStamina: 10,
        auntieHunger: 30,
        auntieMood: 15,
        deliveryHunger: 25,
        walletMoney: 20,
        walletMood: 20,
        mishapMood: -10,
        rareMood: 10,
        warmthMood: 15,
        nightWarmthChance: 0.2,
        nightWarmthHunger: 15,
        bagSizes: [{
          w: 3,
          h: 3,
          cost: 0
        }, {
          w: 3,
          h: 4,
          cost: 40
        }, {
          w: 4,
          h: 4,
          cost: 90
        }],
        foodPrice: 20,
        foodHunger: 20,
        rerollBase: 5,
        rerollStep: 5,
        homeLevels: [{
          name: '城中村床位',
          cost: 0,
          staminaBonus: 0
        }, {
          name: '回收站角落',
          cost: 60,
          staminaBonus: 10
        }, {
          name: '回收站小间',
          cost: 150,
          staminaBonus: 20
        }],
        benchGuardChance: 0.2,
        benchGuardStamina: 10,
        collapseLoseRatio: 0.5,
        day1GuaranteeGood: true,
        adsEnabled: false
      });
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/EventView.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './Art.ts', './UI.ts', './Fx.ts'], function (exports) {
  var _asyncToGenerator, _regeneratorRuntime, cclegacy, Color, view, UITransform, Graphics, UIOpacity, tween, Label, Node, Vec3, Art, uiNode, Fx;
  return {
    setters: [function (module) {
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      Color = module.Color;
      view = module.view;
      UITransform = module.UITransform;
      Graphics = module.Graphics;
      UIOpacity = module.UIOpacity;
      tween = module.tween;
      Label = module.Label;
      Node = module.Node;
      Vec3 = module.Vec3;
    }, function (module) {
      Art = module.Art;
    }, function (module) {
      uiNode = module.uiNode;
    }, function (module) {
      Fx = module.Fx;
    }],
    execute: function () {
      exports('playNightWarmth', playNightWarmth);
      cclegacy._RF.push({}, "d145eD50EJN+aop6cU5QU8x", "EventView", undefined);
      var COLORS = {
        patrol: new Color(255, 210, 80, 255),
        guard: new Color(170, 180, 190, 255),
        rival: new Color(255, 90, 90, 255),
        auntie: new Color(255, 170, 90, 255),
        delivery: new Color(120, 200, 255, 255),
        wallet: new Color(250, 220, 100, 255),
        cat: new Color(180, 150, 120, 255),
        rain: new Color(120, 160, 220, 255)
      };
      var EventView = exports('EventView', /*#__PURE__*/function () {
        function EventView() {}
        EventView.show = function show(root, game, ev, done) {
          var _this = this;
          var size = this.rootSize(root);
          // 遮罩先加、事件容器后加：遮罩在最底层，立绘/标题/选项都在它上面
          var dim = Fx.dimOverlay(root, 178); // 约 70% 不透明，保留地点背景轮廓
          // 遮罩挡住地点页的点击（事件按钮在遮罩上层，不受影响）
          dim.on(Node.EventType.TOUCH_START, function (e) {
            return e == null || e.stopPropagation == null ? void 0 : e.stopPropagation();
          });
          dim.on(Node.EventType.TOUCH_END, function (e) {
            return e == null || e.stopPropagation == null ? void 0 : e.stopPropagation();
          });
          var container = uiNode('EventView');
          container.parent = root;
          var ut = container.addComponent(UITransform);
          ut.setContentSize(size.width, size.height);
          container.setPosition(0, 0, 0);
          var stage = uiNode('ev_stage');
          stage.parent = container;
          var sut = stage.addComponent(UITransform);
          sut.setContentSize(size.width, size.height);
          stage.setPosition(0, 0, 0);
          this.playIntro(stage, game, ev, root).then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
            var choice;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return _this.showOptions(stage, root, ev, game);
                case 2:
                  choice = _context.sent;
                  // 关键：选项确定后立刻结算游戏状态，再播结果动画
                  game.resolveEvent(choice.optionIndex, choice.minigameWin);
                  _context.next = 6;
                  return _this.playResult(stage, root, game, ev, choice.optionIndex, choice.minigameWin, game.lastEventNotice);
                case 6:
                  _this.cleanup(dim, container);
                  done();
                case 8:
                case "end":
                  return _context.stop();
              }
            }, _callee);
          })))["catch"](function () {
            _this.cleanup(dim, container);
            done();
          });
        };
        EventView.cleanup = function cleanup(dim, container) {
          if (dim && dim.isValid) dim.destroy();
          if (container && container.isValid) container.destroy();
        };
        EventView.rootSize = function rootSize(root) {
          var ut = root.getComponent(UITransform);
          if (ut) return {
            width: ut.width,
            height: ut.height
          };
          var vs = view.getVisibleSize();
          return {
            width: vs.width,
            height: vs.height
          };
        }

        // ---------------- 开场 ----------------
        ;

        EventView.playIntro = /*#__PURE__*/
        function () {
          var _playIntro = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(stage, game, ev, root) {
            var frames, stageUt, frame, fw, fh, maxSide, scale, visW, visH, vis;
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  frames = Art.frames("ev_" + ev.id);
                  if (!(frames.length > 0)) {
                    _context2.next = 17;
                    break;
                  }
                  stageUt = stage.getComponent(UITransform);
                  frame = frames[0];
                  fw = Math.max(1, frame.originalSize.width);
                  fh = Math.max(1, frame.originalSize.height); // 固定尺寸 + 整数倍放大，居中显示，禁止把 NPC 像素图拉满全屏
                  maxSide = Math.min(stageUt.width * 0.55, stageUt.height * 0.4, 256);
                  scale = Math.max(1, Math.floor(Math.min(maxSide / fw, maxSide / fh)));
                  visW = fw * scale;
                  visH = fh * scale;
                  vis = Art.makeVisual("ev_" + ev.id, visW, visH, COLORS[ev.id] || Color.WHITE);
                  vis.parent = stage;
                  vis.setPosition(0, 250, 0);
                  // 事件名放在图上方的空白区，避免和下面的选项按钮叠在一起
                  this.label(stage, ev.name, 28, 0, 250 + visH / 2 + 24);
                  _context2.next = 16;
                  return Fx.freeze(1.5);
                case 16:
                  return _context2.abrupt("return");
                case 17:
                  _context2.next = 19;
                  return this.handmadeIntro(stage, game, ev, root);
                case 19:
                case "end":
                  return _context2.stop();
              }
            }, _callee2, this);
          }));
          function playIntro(_x, _x2, _x3, _x4) {
            return _playIntro.apply(this, arguments);
          }
          return playIntro;
        }();
        EventView.handmadeIntro = /*#__PURE__*/function () {
          var _handmadeIntro = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(stage, game, ev, root) {
            var w, h, light, hero, gate, clash, vs, op, warmth, _op, steam, bike, bag, wallet, _op2, cat, _bag, _op3;
            return _regeneratorRuntime().wrap(function _callee3$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  w = stage.getComponent(UITransform).width;
                  h = stage.getComponent(UITransform).height;
                  _context3.t0 = ev.id;
                  _context3.next = _context3.t0 === 'patrol' ? 5 : _context3.t0 === 'guard' ? 17 : _context3.t0 === 'rival' ? 23 : _context3.t0 === 'auntie' ? 33 : _context3.t0 === 'delivery' ? 48 : _context3.t0 === 'wallet' ? 58 : _context3.t0 === 'cat' ? 66 : _context3.t0 === 'rain' ? 76 : 84;
                  break;
                case 5:
                  this.block(stage, 'hero', 80, 120, new Color(90, 170, 255, 255), 0, -160);
                  if (Art.frames('fx_flashlight').length > 0) {
                    light = Art.makeVisual('fx_flashlight', 192, 192, Color.WHITE);
                    light.parent = stage;
                    Art.play(light, 'fx_flashlight', 8, true);
                  } else {
                    light = this.triangle(stage, 'torch', 180, 140, new Color(255, 235, 130, 220));
                  }
                  light.setPosition(-w / 2 - 200, 160, 0);
                  tween(light).to(1.1, {
                    position: new Vec3(w / 2 + 200, 160, 0)
                  }).start();
                  _context3.next = 11;
                  return Fx.freeze(0.2);
                case 11:
                  hero = stage.getChildByName('hero');
                  if (hero) Fx.shake(hero, 6, 0.4);
                  _context3.next = 15;
                  return Fx.freeze(1.1);
                case 15:
                  this.label(stage, '手电光扫过', 30, -w / 2 + 20, h / 2 - 80);
                  return _context3.abrupt("break", 84);
                case 17:
                  gate = this.block(stage, 'gate', w - 160, 90, new Color(140, 150, 160, 255), 0, h / 2 + 100);
                  tween(gate).to(0.6, {
                    position: new Vec3(0, -80, 0)
                  }, {
                    easing: 'quadIn'
                  }).call(function () {
                    return Fx.screenShake(stage);
                  }).start();
                  this.label(stage, '闸门落下「咔」', 30, 0, -220);
                  _context3.next = 22;
                  return Fx.freeze(0.8);
                case 22:
                  return _context3.abrupt("break", 84);
                case 23:
                  this.block(stage, 'player', 90, 130, new Color(90, 170, 255, 255), -180, -150);
                  this.block(stage, 'rivalNpc', 90, 130, new Color(255, 110, 110, 255), 180, -150);
                  if (Art.frames('fx_clash').length > 0) {
                    clash = Art.makeVisual('fx_clash', 192, 192, Color.WHITE);
                    clash.parent = stage;
                    clash.setPosition(0, -150, 0);
                    Art.play(clash, 'fx_clash', 10, true);
                  }
                  vs = this.label(stage, '对决', 42, 0, 60);
                  op = vs.addComponent(UIOpacity);
                  op.opacity = 255;
                  tween(op).to(0.25, {
                    opacity: 60
                  }).to(0.25, {
                    opacity: 255
                  }).union().repeat(4).start();
                  _context3.next = 32;
                  return Fx.freeze(1.2);
                case 32:
                  return _context3.abrupt("break", 84);
                case 33:
                  warmth = this.block(stage, 'warm_overlay', w, h, new Color(255, 180, 80, 200), 0, 0);
                  warmth.setPosition(0, 0, 0);
                  _op = warmth.addComponent(UIOpacity);
                  _op.opacity = 0;
                  tween(_op).to(0.5, {
                    opacity: 255
                  }).start();
                  this.block(stage, 'lunchbox', 140, 100, new Color(220, 150, 90, 255), 0, -80);
                  this.label(stage, '饭盒', 24, 0, -80);
                  steam = this.stripe(stage, 'steam', 8, 30, new Color(255, 255, 255, 220));
                  steam.setPosition(0, 60, 0);
                  tween(steam).by(0.8, {
                    position: new Vec3(0, 60, 0)
                  }, {
                    easing: 'quadOut'
                  }).start();
                  this.block(stage, 'hero_face', 90, 100, new Color(90, 170, 255, 255), 0, -230);
                  this.label(stage, '★_★', 32, 0, -230);
                  _context3.next = 47;
                  return Fx.freeze(1.3);
                case 47:
                  return _context3.abrupt("break", 84);
                case 48:
                  bike = this.block(stage, 'ebike', 150, 100, new Color(80, 150, 240, 255), w / 2 + 200, -100);
                  tween(bike).to(0.7, {
                    position: new Vec3(-120, -100, 0)
                  }, {
                    easing: 'quadOut'
                  }).call(function () {
                    return Fx.shake(bike, 8, 0.25);
                  }).start();
                  _context3.next = 52;
                  return Fx.freeze(0.75);
                case 52:
                  bag = this.block(stage, 'deliv_bag', 100, 80, new Color(200, 160, 80, 255), -120, -100);
                  bag.setPosition(-120, -100, 0);
                  this.label(stage, '这单算你的', 28, 0, 120);
                  _context3.next = 57;
                  return Fx.freeze(0.9);
                case 57:
                  return _context3.abrupt("break", 84);
                case 58:
                  wallet = this.block(stage, 'wallet', 120, 100, new Color(220, 180, 70, 255), 0, -80);
                  _op2 = wallet.addComponent(UIOpacity);
                  _op2.opacity = 255;
                  tween(_op2).to(0.2, {
                    opacity: 100
                  }).to(0.2, {
                    opacity: 255
                  }).union().repeat(3).start();
                  _context3.next = 64;
                  return Fx.freeze(1.0);
                case 64:
                  this.label(stage, '钱包闪光', 26, 0, 80);
                  return _context3.abrupt("break", 84);
                case 66:
                  this.block(stage, 'box', 110, 90, new Color(150, 100, 70, 255), 0, -120);
                  cat = this.block(stage, 'cat', 80, 80, new Color(180, 150, 120, 255), 0, -120);
                  cat.setPosition(0, -180, 0);
                  tween(cat).to(0.5, {
                    position: new Vec3(0, -80, 0)
                  }, {
                    easing: 'quadOut'
                  }).start();
                  _context3.next = 72;
                  return Fx.freeze(0.55);
                case 72:
                  this.label(stage, '喵？', 26, 0, 30);
                  _context3.next = 75;
                  return Fx.freeze(0.5);
                case 75:
                  return _context3.abrupt("break", 84);
                case 76:
                  _bag = this.block(stage, 'plastic_bag', 90, 60, new Color(200, 220, 240, 180), 0, -230);
                  _op3 = _bag.addComponent(UIOpacity);
                  _op3.opacity = 255;
                  tween(_op3).to(0.4, {
                    opacity: 180
                  }).to(0.4, {
                    opacity: 255
                  }).repeat(2).start();
                  this.label(stage, '下雨了', 28, 0, 120);
                  _context3.next = 83;
                  return Fx.freeze(1.2);
                case 83:
                  return _context3.abrupt("break", 84);
                case 84:
                case "end":
                  return _context3.stop();
              }
            }, _callee3, this);
          }));
          function handmadeIntro(_x5, _x6, _x7, _x8) {
            return _handmadeIntro.apply(this, arguments);
          }
          return handmadeIntro;
        }() // ---------------- 选项 ----------------
        ;

        EventView.showOptions = /*#__PURE__*/
        function () {
          var _showOptions = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(stage, root, ev, game) {
            var _this2 = this;
            var w, h, layer, lut, buttons, numberOfOptions, btnW, btnH, gap, totalH, y, i, btn;
            return _regeneratorRuntime().wrap(function _callee5$(_context5) {
              while (1) switch (_context5.prev = _context5.next) {
                case 0:
                  w = stage.getComponent(UITransform).width;
                  h = stage.getComponent(UITransform).height;
                  layer = uiNode('option_layer');
                  layer.parent = stage;
                  lut = layer.addComponent(UITransform);
                  lut.setContentSize(w, h);
                  layer.setPosition(0, 0, 0);
                  buttons = [];
                  numberOfOptions = ev.options.length;
                  btnW = 260;
                  btnH = 72;
                  gap = 28;
                  totalH = numberOfOptions * btnH + (numberOfOptions - 1) * gap;
                  y = totalH / 2 - btnH / 2;
                  for (i = 0; i < numberOfOptions; i++) {
                    btn = this.makeButton(layer, ev.options[i], btnW, btnH, function () {});
                    btn.setPosition(0, y, 0);
                    y -= btnH + gap;
                    buttons.push(btn);
                  }
                  return _context5.abrupt("return", new Promise(function (resolve) {
                    buttons.forEach(function (btn, i) {
                      // 移除之前的占位回调后重新监听
                      btn.off(Node.EventType.TOUCH_END);
                      btn.on(Node.EventType.TOUCH_END, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(e) {
                        var minigameWin;
                        return _regeneratorRuntime().wrap(function _callee4$(_context4) {
                          while (1) switch (_context4.prev = _context4.next) {
                            case 0:
                              if (e && e.stopPropagation) e.stopPropagation();
                              // 选项出现后先整层隐藏，避免结果文字压在按钮上
                              layer.active = false;
                              minigameWin = false;
                              if (!(ev.id === 'rival' && i === 1)) {
                                _context4.next = 7;
                                break;
                              }
                              _context4.next = 6;
                              return _this2.runMinigame(stage, root);
                            case 6:
                              minigameWin = _context4.sent;
                            case 7:
                              resolve({
                                optionIndex: i,
                                minigameWin: minigameWin
                              });
                            case 8:
                            case "end":
                              return _context4.stop();
                          }
                        }, _callee4);
                      })));
                    });
                  }));
                case 16:
                case "end":
                  return _context5.stop();
              }
            }, _callee5, this);
          }));
          function showOptions(_x9, _x10, _x11, _x12) {
            return _showOptions.apply(this, arguments);
          }
          return showOptions;
        }();
        EventView.runMinigame = /*#__PURE__*/function () {
          var _runMinigame = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(stage, root) {
            var w, h, layer, lut, bg, counter, count, start, duration;
            return _regeneratorRuntime().wrap(function _callee6$(_context6) {
              while (1) switch (_context6.prev = _context6.next) {
                case 0:
                  w = stage.getComponent(UITransform).width;
                  h = stage.getComponent(UITransform).height;
                  layer = uiNode('minigame');
                  layer.parent = stage;
                  lut = layer.addComponent(UITransform);
                  lut.setContentSize(w, h);
                  layer.setPosition(0, 0, 0);
                  bg = this.rect(layer, 'mg_bg', w, h, new Color(20, 20, 30, 230));
                  bg.setPosition(0, 0, 0);
                  this.label(layer, '狂点！', 40, 0, 150);
                  counter = this.label(layer, '0 次', 32, 0, 60);
                  count = 0;
                  layer.on(Node.EventType.TOUCH_END, function (e) {
                    if (e && e.stopPropagation) e.stopPropagation();
                    count++;
                    counter.getComponent(Label).string = count + " \u6B21";
                  });
                  start = Date.now();
                  duration = 3000;
                  return _context6.abrupt("return", new Promise(function (resolve) {
                    var tick = setInterval(function () {
                      var elapsed = Date.now() - start;
                      if (elapsed >= duration) {
                        clearInterval(tick);
                        layer.active = false;
                        layer.destroy();
                        resolve(count >= 15);
                      }
                    }, 100);
                  }));
                case 16:
                case "end":
                  return _context6.stop();
              }
            }, _callee6, this);
          }));
          function runMinigame(_x14, _x15) {
            return _runMinigame.apply(this, arguments);
          }
          return runMinigame;
        }() // ---------------- 结果动画 ----------------
        ;

        EventView.playResult = /*#__PURE__*/
        function () {
          var _playResult = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(stage, root, game, ev, optionIndex, minigameWin, notice) {
            var w, artName, artNode, success;
            return _regeneratorRuntime().wrap(function _callee7$(_context7) {
              while (1) switch (_context7.prev = _context7.next) {
                case 0:
                  w = stage.getComponent(UITransform).width;
                  artName = "ev_" + ev.id;
                  artNode = stage.getChildByName(artName);
                  _context7.t0 = ev.id;
                  _context7.next = _context7.t0 === 'patrol' ? 6 : _context7.t0 === 'guard' ? 19 : _context7.t0 === 'rival' ? 23 : _context7.t0 === 'auntie' ? 41 : _context7.t0 === 'delivery' ? 45 : _context7.t0 === 'wallet' ? 49 : _context7.t0 === 'cat' ? 54 : _context7.t0 === 'rain' ? 58 : 62;
                  break;
                case 6:
                  if (!(optionIndex === 0)) {
                    _context7.next = 13;
                    break;
                  }
                  if (artNode) {
                    tween(artNode).to(0.8, {
                      position: new Vec3(-w / 2 - 160, artNode.position.y, 0)
                    }).start();
                  }
                  this.showResult(stage, '礼貌离开');
                  _context7.next = 11;
                  return Fx.freeze(1.0);
                case 11:
                  _context7.next = 18;
                  break;
                case 13:
                  success = Math.random() < 0.5;
                  if (artNode) {
                    tween(artNode).to(0.7, {
                      position: new Vec3(success ? w / 2 + 160 : 0, artNode.position.y, 0)
                    }).start();
                  }
                  this.showResult(stage, notice || (success ? '大叔笑着走了' : '大叔指路请你走'));
                  _context7.next = 18;
                  return Fx.freeze(0.9);
                case 18:
                  return _context7.abrupt("break", 62);
                case 19:
                  this.showResult(stage, notice || '被请出小区，背包被没收');
                  _context7.next = 22;
                  return Fx.freeze(1.0);
                case 22:
                  return _context7.abrupt("break", 62);
                case 23:
                  if (!(optionIndex === 0)) {
                    _context7.next = 29;
                    break;
                  }
                  this.showResult(stage, '你认怂了');
                  _context7.next = 27;
                  return Fx.freeze(1.0);
                case 27:
                  _context7.next = 40;
                  break;
                case 29:
                  if (!minigameWin) {
                    _context7.next = 36;
                    break;
                  }
                  if (artNode) {
                    tween(artNode).to(0.7, {
                      position: new Vec3(w / 2 + 160, artNode.position.y, 0)
                    }).start();
                  }
                  this.showResult(stage, '对方耸肩离开');
                  _context7.next = 34;
                  return Fx.freeze(0.9);
                case 34:
                  _context7.next = 40;
                  break;
                case 36:
                  if (artNode) {
                    tween(artNode).to(0.3, {
                      scale: new Vec3(0.7, 0.7, 1)
                    }).start();
                  }
                  this.showResult(stage, '被压扁了');
                  _context7.next = 40;
                  return Fx.freeze(1.0);
                case 40:
                  return _context7.abrupt("break", 62);
                case 41:
                  this.showResult(stage, '吃饱了，心情也好了');
                  _context7.next = 44;
                  return Fx.freeze(1.0);
                case 44:
                  return _context7.abrupt("break", 62);
                case 45:
                  this.showResult(stage, '收下外卖，饱腹恢复');
                  _context7.next = 48;
                  return Fx.freeze(0.9);
                case 48:
                  return _context7.abrupt("break", 62);
                case 49:
                  if (artNode) {
                    tween(artNode).to(0.3, {
                      scale: new Vec3(1.2, 1.2, 1)
                    }).to(0.3, {
                      scale: Vec3.ONE
                    }).start();
                  }
                  this.showResult(stage, '归还钱包，¥20 到手');
                  _context7.next = 53;
                  return Fx.freeze(1.2);
                case 53:
                  return _context7.abrupt("break", 62);
                case 54:
                  if (optionIndex === 0) {
                    if (notice) {
                      // 包里没有可喂的食物
                      this.showResult(stage, notice);
                    } else {
                      if (artNode) {
                        tween(artNode).to(0.4, {
                          position: new Vec3(0, -60, 0)
                        }).start();
                      }
                      this.showResult(stage, '猫跟着你，幸运 +3 次');
                    }
                  } else {
                    this.showResult(stage, '喵~');
                  }
                  _context7.next = 57;
                  return Fx.freeze(1.0);
                case 57:
                  return _context7.abrupt("break", 62);
                case 58:
                  this.showResult(stage, '下雨了，猫都躲起来了');
                  _context7.next = 61;
                  return Fx.freeze(1.0);
                case 61:
                  return _context7.abrupt("break", 62);
                case 62:
                case "end":
                  return _context7.stop();
              }
            }, _callee7, this);
          }));
          function playResult(_x16, _x17, _x18, _x19, _x20, _x21, _x22) {
            return _playResult.apply(this, arguments);
          }
          return playResult;
        }() /** 结果区：独立的底板 + 唯一一行文字，出现时选项和小游戏层已经隐藏/销毁。 */;
        EventView.showResult = function showResult(stage, text) {
          var panel = this.rect(stage, 'result_panel', 380, 66, new Color(18, 20, 28, 235));
          panel.setPosition(0, 60, 0);
          var lb = this.label(stage, text, 30, 0, 60);
          lb.setSiblingIndex(stage.children.length - 1);
        }

        // ---------------- 工具 ----------------
        ;

        EventView.block = function block(parent, name, w, h, color, x, y) {
          var n = this.rect(parent, name, w, h, color);
          n.setPosition(x, y, 0);
          return n;
        };
        EventView.rect = function rect(parent, name, w, h, color) {
          var n = uiNode(name);
          n.parent = parent;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(w, h);
          var g = n.addComponent(Graphics);
          g.fillColor = color.clone();
          g.rect(-w / 2, -h / 2, w, h);
          g.fill();
          return n;
        };
        EventView.triangle = function triangle(parent, name, w, h, color) {
          var n = uiNode(name);
          n.parent = parent;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(w, h);
          var g = n.addComponent(Graphics);
          g.fillColor = color.clone();
          g.moveTo(-w / 2, -h / 2);
          g.lineTo(w / 2, 0);
          g.lineTo(-w / 2, h / 2);
          g.close();
          g.fill();
          return n;
        };
        EventView.stripe = function stripe(parent, name, w, h, color) {
          var n = this.rect(parent, name, w, h, color);
          return n;
        };
        EventView.label = function label(parent, text, fontSize, x, y) {
          var n = uiNode('label');
          n.parent = parent;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(300, fontSize + 12);
          n.setPosition(x, y, 0);
          var lb = n.addComponent(Label);
          lb.string = text;
          lb.fontSize = fontSize;
          lb.lineHeight = fontSize + 6;
          lb.horizontalAlign = Label.HorizontalAlign.CENTER;
          lb.verticalAlign = Label.VerticalAlign.CENTER;
          lb.color = new Color(255, 255, 255, 255);
          lb.overflow = Label.Overflow.SHRINK;
          return n;
        };
        EventView.makeButton = function makeButton(parent, text, w, h, onClick) {
          var n = uiNode('ev_btn');
          n.parent = parent;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(w, h);
          var g = n.addComponent(Graphics);
          // 选项按钮：不透明深底 + 高对比亮边，避免和事件背景糊在一起
          g.fillColor = new Color(22, 24, 32, 255);
          g.rect(-w / 2, -h / 2, w, h);
          g.fill();
          g.lineWidth = 3;
          g.strokeColor = new Color(255, 214, 110, 255);
          g.stroke();
          g.strokeColor = new Color(255, 255, 255, 80);
          g.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
          g.stroke();
          var lbNode = uiNode('lb');
          lbNode.parent = n;
          var lut = lbNode.addComponent(UITransform);
          lut.setContentSize(w, h);
          lbNode.setPosition(0, 0, 0);
          var lb = lbNode.addComponent(Label);
          lb.string = text;
          lb.fontSize = 30;
          lb.lineHeight = 34;
          lb.horizontalAlign = Label.HorizontalAlign.CENTER;
          lb.verticalAlign = Label.VerticalAlign.CENTER;
          lb.color = new Color(255, 255, 255, 255);
          return n;
        };
        return EventView;
      }());
      function playNightWarmth(root) {
        return new Promise(function (resolve) {
          var size = EventView['rootSize'] ? EventView.rootSize(root) : {
            width: view.getVisibleSize().width,
            height: view.getVisibleSize().height
          };
          var w = size.width;
          var h = size.height;
          var overlay = uiNode('warmth_overlay');
          overlay.parent = root;
          var out = overlay.addComponent(UITransform);
          out.setContentSize(w, h);
          overlay.setPosition(0, 0, 0);
          var g = overlay.addComponent(Graphics);
          g.fillColor = new Color(255, 180, 100, 220);
          g.rect(-w / 2, -h / 2, w, h);
          g.fill();
          var op = overlay.addComponent(UIOpacity);
          op.opacity = 0;
          tween(op).to(0.6, {
            opacity: 255
          }).start();
          var auntie = uiNode('auntie');
          auntie.parent = overlay;
          var aut = auntie.addComponent(UITransform);
          aut.setContentSize(120, 120);
          auntie.setPosition(0, -80, 0);
          var ag = auntie.addComponent(Graphics);
          ag.fillColor = new Color(230, 130, 70, 255);
          ag.rect(-60, -60, 120, 120);
          ag.fill();
          var bun = uiNode('bun');
          bun.parent = overlay;
          var but = bun.addComponent(UITransform);
          but.setContentSize(50, 40);
          bun.setPosition(0, 80, 0);
          var bg = bun.addComponent(Graphics);
          bg.fillColor = new Color(230, 200, 150, 255);
          bg.rect(-25, -20, 50, 40);
          bg.fill();
          var text = uiNode('warm_text');
          text.parent = overlay;
          var tut = text.addComponent(UITransform);
          tut.setContentSize(500, 80);
          text.setPosition(0, 160, 0);
          var tl = text.addComponent(Label);
          tl.string = '环卫阿姨塞给你一个热包子';
          tl.fontSize = 30;
          tl.lineHeight = 36;
          tl.horizontalAlign = Label.HorizontalAlign.CENTER;
          tl.verticalAlign = Label.VerticalAlign.CENTER;
          tl.color = new Color(255, 255, 255, 255);
          tween(op).delay(1.8).to(0.5, {
            opacity: 0
          }).call(function () {
            overlay.destroy();
            resolve();
          }).start();
        });
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Fx.ts", ['cc', './UI.ts'], function (exports) {
  var cclegacy, Tween, tween, Vec3, UITransform, view, Graphics, Color, Node, director, UIOpacity, Label, uiNode;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Tween = module.Tween;
      tween = module.tween;
      Vec3 = module.Vec3;
      UITransform = module.UITransform;
      view = module.view;
      Graphics = module.Graphics;
      Color = module.Color;
      Node = module.Node;
      director = module.director;
      UIOpacity = module.UIOpacity;
      Label = module.Label;
    }, function (module) {
      uiNode = module.uiNode;
    }],
    execute: function () {
      cclegacy._RF.push({}, "db527h7zLJEZ7sekQZR7Q9m", "Fx", undefined);

      /**
       * Fx —— 纯代码缓动 / 特效工具。
       * 所有节点都是 uiNode() 现造，父节点由调用方（GameRoot / 各 View）传入。
       * 不依赖 prefab、不依赖场景里预先摆放的任何东西。
       */
      var Fx = exports('Fx', /*#__PURE__*/function () {
        function Fx() {}
        // ---------------------------------------------------------------- 抖动
        /** 小幅左右/上下抖动 */
        Fx.shake = function shake(node, strength, duration) {
          if (strength === void 0) {
            strength = 10;
          }
          if (duration === void 0) {
            duration = 0.3;
          }
          if (!node || !node.isValid) return;
          Tween.stopAllByTarget(node);
          var base = node.position.clone();
          var steps = 6;
          var seg = Math.max(0.016, duration / (steps + 1));
          var tw = tween(node);
          for (var i = 0; i < steps; i++) {
            var k = strength * (1 - i / steps);
            tw = tw.to(seg, {
              position: new Vec3(base.x + (Math.random() * 2 - 1) * k, base.y + (Math.random() * 2 - 1) * k, base.z)
            });
          }
          tw.to(seg, {
            position: base
          }).start();
        }

        /** 整屏震一下（一般给 Canvas 根节点） */;
        Fx.screenShake = function screenShake(root) {
          if (!root || !root.isValid) return;
          Fx.shake(root, 18, 0.4);
        }

        /** 鼓一下再回来 */;
        Fx.pulse = function pulse(node, scale, duration) {
          if (scale === void 0) {
            scale = 1.12;
          }
          if (duration === void 0) {
            duration = 0.12;
          }
          if (!node || !node.isValid) return;
          Tween.stopAllByTarget(node);
          var base = node.scale.clone();
          var half = Math.max(0.03, duration / 2);
          tween(node).to(half, {
            scale: new Vec3(base.x * scale, base.y * scale, base.z)
          }).to(half, {
            scale: base
          }).start();
        }

        // ---------------------------------------------------------------- 抛物线
        /** 从 from 抛物线飞到 to（x 线性、y 叠加一个正弦拱高） */;
        Fx.popArc = function popArc(node, from, to, duration) {
          if (duration === void 0) {
            duration = 0.45;
          }
          return new Promise(function (resolve) {
            if (!node || !node.isValid) {
              resolve();
              return;
            }
            var fz = from.z || 0;
            var tz = to.z || 0;
            node.setPosition(from.x, from.y, fz);
            var arc = Math.max(60, Math.min(240, Math.abs(to.x - from.x) * 0.35 + 60));
            var state = {
              t: 0
            };
            tween(state).to(Math.max(0.05, duration), {
              t: 1
            }, {
              onUpdate: function onUpdate() {
                if (!node || !node.isValid) return;
                var t = state.t;
                var x = from.x + (to.x - from.x) * t;
                var y = from.y + (to.y - from.y) * t + Math.sin(Math.PI * t) * arc;
                node.setPosition(x, y, fz + (tz - fz) * t);
              }
            }).call(function () {
              if (node && node.isValid) node.setPosition(to.x, to.y, tz);
              resolve();
            }).start();
          });
        }

        // ---------------------------------------------------------------- 时间
        /** 普通等待（不暂停场景），用于动画节奏。 */;
        Fx.freeze = function freeze(seconds) {
          return new Promise(function (resolve) {
            var state = {
              t: 0
            };
            tween(state).delay(Math.max(0, seconds)).call(function () {
              return resolve();
            }).start();
          });
        }

        /**
         * 真冻结：暂停 director 的 tween/scheduler，并盖一层输入拦截 0.3s。
         * 用 setTimeout 计时，避免 tween 被自己暂停。
         */;
        Fx.sceneFreeze = function sceneFreeze(root, seconds) {
          return new Promise(function (resolve) {
            if (!root || !root.isValid) {
              resolve();
              return;
            }
            var block = uiNode('fx_freeze_block');
            block.parent = root;
            var ut = block.addComponent(UITransform);
            var size = root.getComponent(UITransform);
            var w = size ? size.width : view.getVisibleSize().width;
            var h = size ? size.height : view.getVisibleSize().height;
            ut.setContentSize(w, h);
            var g = block.addComponent(Graphics);
            g.fillColor = new Color(0, 0, 0, 1);
            g.rect(-w / 2, -h / 2, w, h);
            g.fill();
            block.setPosition(0, 0, 0);
            block.on(Node.EventType.TOUCH_START, function (e) {
              return e == null || e.stopPropagation == null ? void 0 : e.stopPropagation();
            });
            block.on(Node.EventType.TOUCH_END, function (e) {
              return e == null || e.stopPropagation == null ? void 0 : e.stopPropagation();
            });
            block.setSiblingIndex(root.children.length - 1);
            director.pause();
            setTimeout(function () {
              if (block && block.isValid) block.destroy();
              director.resume();
              resolve();
            }, Math.max(0, seconds) * 1000);
          });
        }

        // ---------------------------------------------------------------- 闪屏 / 光晕
        /** 全屏闪一下颜色（默认白） */;
        Fx.flash = function flash(root, color, duration) {
          if (color === void 0) {
            color = new Color(255, 255, 255, 150);
          }
          if (duration === void 0) {
            duration = 0.35;
          }
          if (!root || !root.isValid) return;
          var size = view.getVisibleSize();
          var w = size.width;
          var h = size.height;
          var n = uiNode('fx_flash');
          n.parent = root;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(w, h);
          var g = n.addComponent(Graphics);
          g.fillColor = color ? color.clone() : new Color(255, 255, 255, 150);
          g.rect(-w / 2, -h / 2, w, h);
          g.fill();
          var op = n.addComponent(UIOpacity);
          op.opacity = 255;
          tween(op).to(Math.max(0.05, duration), {
            opacity: 0
          }).call(function () {
            if (n && n.isValid) n.destroy();
          }).start();
        }

        /** 屏幕四边呼吸光晕。on=false 时移除 */;
        Fx.edgeGlow = function edgeGlow(root, color, on) {
          if (!root || !root.isValid) return;
          var NAME = 'fx_edge_glow';
          var old = root.getChildByName(NAME);
          if (old) {
            Tween.stopAllByTarget(old);
            old.destroy();
          }
          if (!on) return;
          var size = view.getVisibleSize();
          var w = size.width;
          var h = size.height;
          var t = 18;
          var n = uiNode(NAME);
          n.parent = root;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(w, h);
          n.setPosition(0, 0, 0);
          var g = n.addComponent(Graphics);
          g.fillColor = color ? color.clone() : new Color(255, 220, 120, 200);
          g.rect(-w / 2, h / 2 - t, w, t);
          g.fill();
          g.rect(-w / 2, -h / 2, w, t);
          g.fill();
          g.rect(-w / 2, -h / 2, t, h);
          g.fill();
          g.rect(w / 2 - t, -h / 2, t, h);
          g.fill();
          var op = n.addComponent(UIOpacity);
          op.opacity = 130;
          tween(op).to(0.45, {
            opacity: 255
          }).to(0.45, {
            opacity: 130
          }).union().repeatForever().start();
        }

        // ---------------------------------------------------------------- 淡入淡出
        ;

        Fx.fadeIn = function fadeIn(node, duration) {
          if (duration === void 0) {
            duration = 0.3;
          }
          return new Promise(function (resolve) {
            if (!node || !node.isValid) {
              resolve();
              return;
            }
            var op = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            op.opacity = 0;
            tween(op).to(Math.max(0.01, duration), {
              opacity: 255
            }).call(function () {
              return resolve();
            }).start();
          });
        };
        Fx.fadeOut = function fadeOut(node, duration) {
          if (duration === void 0) {
            duration = 0.3;
          }
          return new Promise(function (resolve) {
            if (!node || !node.isValid) {
              resolve();
              return;
            }
            var op = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            op.opacity = 255;
            tween(op).to(Math.max(0.01, duration), {
              opacity: 0
            }).call(function () {
              return resolve();
            }).start();
          });
        }

        // ---------------------------------------------------------------- 遮罩
        /** 全屏半透明黑遮罩，返回节点，用完自己 destroy */;
        Fx.dimOverlay = function dimOverlay(root, alpha) {
          if (alpha === void 0) {
            alpha = 175;
          }
          var size = view.getVisibleSize();
          var w = size.width;
          var h = size.height;
          var n = uiNode('fx_dim');
          n.parent = root;
          var ut = n.addComponent(UITransform);
          ut.setContentSize(w, h);
          n.setPosition(0, 0, 0);
          var g = n.addComponent(Graphics);
          g.fillColor = new Color(0, 0, 0, Math.max(0, Math.min(255, Math.round(alpha))));
          g.rect(-w / 2, -h / 2, w, h);
          g.fill();
          var op = n.addComponent(UIOpacity);
          op.opacity = 0;
          tween(op).to(0.18, {
            opacity: 255
          }).start();
          return n;
        }

        // ---------------------------------------------------------------- 漂浮文字
        /** 飘字：从 pos 向上飘并淡出 */;
        Fx.floatText = function floatText(root, text, pos, color) {
          var n = uiNode('fx_float_text');
          n.parent = root;
          n.setPosition(pos ? pos.x : 0, pos ? pos.y : 0, pos ? pos.z || 0 : 0);
          var ut = n.addComponent(UITransform);
          ut.setContentSize(240, 40);
          ut.setAnchorPoint(0.5, 0.5);
          var label = n.addComponent(Label);
          label.string = text;
          label.fontSize = 28;
          label.lineHeight = 32;
          label.color = color ? color.clone() : new Color(255, 255, 255, 255);
          label.horizontalAlign = Label.HorizontalAlign.CENTER;
          label.verticalAlign = Label.VerticalAlign.CENTER;
          var op = n.addComponent(UIOpacity);
          op.opacity = 255;
          var rise = 70;
          tween(n).by(1.0, {
            position: new Vec3(0, rise, 0)
          }, {
            easing: 'quadOut'
          }).start();
          tween(op).delay(0.45).to(0.55, {
            opacity: 0
          }).call(function () {
            if (n && n.isValid) n.destroy();
          }).start();
          return n;
        }

        // ---------------------------------------------------------------- 进度条
        /**
         * 把 barNode 的显示比例设为 ratio(0~1)。
         * 支持两种条：
         *  - 节点带 Graphics：清空后按左对齐重画一个矩形（宽度按初始宽 * ratio）；
         *  - 节点无 Graphics（纯 Sprite/纯色块）：改 UITransform 宽度并补偿锚点位移。
         */;
        Fx.barTo = function barTo(barNode, ratio) {
          if (!barNode || !barNode.isValid) return;
          var ut = barNode.getComponent(UITransform);
          if (!ut) return;
          var full = barNode.__fxFull;
          var height = barNode.__fxHeight;
          var baseX = barNode.__fxBaseX;
          var baseY = barNode.__fxBaseY;
          if (full == null) {
            full = ut.width;
            height = ut.height;
            baseX = barNode.position.x;
            baseY = barNode.position.y;
            barNode.__fxFull = full;
            barNode.__fxHeight = height;
            barNode.__fxBaseX = baseX;
            barNode.__fxBaseY = baseY;
          }
          var r = Math.max(0, Math.min(1, ratio));
          var w = Math.max(0.01, full * r);
          var anchor = ut.anchorPoint;
          var g = barNode.getComponent(Graphics);
          if (g) {
            if (!barNode.__fxColor) {
              barNode.__fxColor = g.fillColor ? g.fillColor.clone() : new Color(255, 255, 255, 255);
            }
            var c = barNode.__fxColor;
            var left = -anchor.x * full;
            var bottom = -anchor.y * height;
            g.clear();
            g.fillColor = c;
            g.rect(left, bottom, w, height);
            g.fill();
          } else {
            ut.setContentSize(w, height);
            barNode.setPosition(baseX - (full - w) * anchor.x, baseY, barNode.position.z);
          }
        }

        // ---------------------------------------------------------------- 震动
        /** 微信小游戏短震动；无 wx 环境直接跳过 */;
        Fx.vibrateShort = function vibrateShort() {
          try {
            var wxAny = globalThis.wx;
            if (wxAny && typeof wxAny.vibrateShort === 'function') {
              wxAny.vibrateShort({
                type: 'light'
              });
            }
          } catch (e) {
            // 忽略
          }
        }

        // ---------------------------------------------------------------- 雨
        /** 全屏像素雨，返回容器节点（需要停止时自己 destroy） */;
        Fx.rainOverlay = function rainOverlay(root) {
          var size = view.getVisibleSize();
          var w = Math.max(720, size.width);
          var h = Math.max(1280, size.height);
          var holder = uiNode('fx_rain');
          holder.parent = root;
          var hut = holder.addComponent(UITransform);
          hut.setContentSize(w, h);
          holder.setPosition(0, 0, 0);
          var _loop = function _loop() {
            var ln = uiNode('fx_rain_layer_' + layer);
            ln.parent = holder;
            var lut = ln.addComponent(UITransform);
            lut.setContentSize(w, h * 3);
            ln.setPosition(0, 0, 0);
            var g = ln.addComponent(Graphics);
            g.lineWidth = 1 + layer;
            g.strokeColor = new Color(150, 200, 255, 90 + layer * 55);
            var count = 22;
            for (var i = 0; i < count; i++) {
              var rx = (i * 137 + layer * 61) % 1000 / 1000;
              var ry = (i * 311 + layer * 173) % 1000 / 1000;
              var x = -w / 2 + rx * w;
              var y = -h + ry * h * 3;
              var len = 16 + (i + layer * 5) % 3 * 9;
              g.moveTo(x, y);
              g.lineTo(x - 3, y - len);
              g.stroke();
            }
            var dur = 0.6 + layer * 0.2;
            tween(ln).to(dur, {
              position: new Vec3(0, -h, 0)
            }).call(function () {
              if (ln && ln.isValid) ln.setPosition(0, 0, 0);
            }).union().repeatForever().start();
          };
          for (var layer = 0; layer < 3; layer++) {
            _loop();
          }
          return holder;
        }

        // ---------------------------------------------------------------- 彩带
        /** 全屏彩纸喷洒（通关用） */;
        Fx.confetti = function confetti(root) {
          var size = view.getVisibleSize();
          var w = Math.max(720, size.width);
          var h = Math.max(1280, size.height);
          var holder = uiNode('fx_confetti');
          holder.parent = root;
          var hut = holder.addComponent(UITransform);
          hut.setContentSize(w, h);
          holder.setPosition(0, 0, 0);
          var palette = [new Color(255, 92, 92, 255), new Color(255, 200, 60, 255), new Color(90, 210, 255, 255), new Color(120, 235, 130, 255), new Color(230, 130, 255, 255), new Color(255, 255, 255, 255)];
          var count = 40;
          for (var i = 0; i < count; i++) {
            var n = uiNode('fx_cf_' + i);
            n.parent = holder;
            var nut = n.addComponent(UITransform);
            var cw = 8 + i % 3 * 4;
            var ch = 5 + i % 2 * 4;
            nut.setContentSize(cw, ch);
            var g = n.addComponent(Graphics);
            g.fillColor = palette[i % palette.length];
            g.rect(-cw / 2, -ch / 2, cw, ch);
            g.fill();
            var x0 = -w / 2 + Math.random() * w;
            var y0 = h / 2 + 40 + Math.random() * 260;
            n.setPosition(x0, y0, 0);
            var drift = (Math.random() * 2 - 1) * 130;
            var dur = 1.8 + Math.random() * 1.6;
            tween(n).delay(Math.random() * 0.9).by(dur, {
              position: new Vec3(drift, -(h + 340), 0)
            }, {
              easing: 'quadIn'
            }).start();
            tween(n).by(dur, {
              angle: (Math.random() > 0.5 ? 1 : -1) * 540
            }).start();
          }
          tween(holder).delay(4.2).call(function () {
            if (holder && holder.isValid) holder.destroy();
          }).start();
          return holder;
        };
        return Fx;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/game.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './config.ts'], function (exports) {
  var _createForOfIteratorHelperLoose, _createClass, cclegacy, ITEMS, FORTUNES, LOCATIONS, SLEEP_SPOTS, EVENTS, CONFIG;
  return {
    setters: [function (module) {
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      ITEMS = module.ITEMS;
      FORTUNES = module.FORTUNES;
      LOCATIONS = module.LOCATIONS;
      SLEEP_SPOTS = module.SLEEP_SPOTS;
      EVENTS = module.EVENTS;
      CONFIG = module.CONFIG;
    }],
    execute: function () {
      cclegacy._RF.push({}, "c43d5wAd5RNI4Sq36RoRnms", "game", undefined);
      var Rng = exports('Rng', /*#__PURE__*/function () {
        function Rng(seed) {
          this.state = void 0;
          this.state = seed >>> 0;
        }
        var _proto = Rng.prototype;
        _proto.next = function next() {
          var t = this.state += 0x6d2b79f5;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        _proto["int"] = function int(a, b) {
          var min = Math.ceil(a);
          var max = Math.floor(b);
          if (min > max) return min;
          return Math.floor(this.next() * (max - min + 1)) + min;
        };
        _proto.pick = function pick(arr) {
          if (arr.length === 0) throw new Error('pick from empty array');
          return arr[Math.floor(this.next() * arr.length)];
        };
        _proto.chance = function chance(p) {
          return this.next() < p;
        };
        return Rng;
      }());
      var Game = exports('Game', /*#__PURE__*/function () {
        function Game(seed, cfg) {
          if (cfg === void 0) {
            cfg = CONFIG;
          }
          this.cfg = void 0;
          this.rng = void 0;
          this.day = void 0;
          this.minute = void 0;
          this.hunger = void 0;
          this.stamina = void 0;
          this.mood = void 0;
          this.money = void 0;
          this.phase = void 0;
          this.location = void 0;
          this.fortune = void 0;
          this.fortuneLocation = void 0;
          this.rerollCount = void 0;
          this.bagLevel = void 0;
          this.homeLevel = void 0;
          this.bag = void 0;
          this.floor = void 0;
          this.bannedToday = void 0;
          this.raining = void 0;
          this.catLuck = void 0;
          this.deathCause = void 0;
          /** 刚结算的事件提示（例如喂猫时包里没吃的），UI 在事件结果里显示 */
          this.lastEventNotice = void 0;
          /** 当晚是否触发夜间温情（由 sleep() 的 rng 决定，UI 只读这个结果） */
          this.lastNightWarmth = void 0;
          this.totalIncome = void 0;
          this.log = void 0;
          this.lastDayReport = void 0;
          this.lastCollapse = void 0;
          this.history = void 0;
          this.boxes = void 0;
          this.nextUid = void 0;
          this.pendingEvent = void 0;
          this.dayHasGoodOrAbove = void 0;
          this.fortuneGuaranteeUsed = void 0;
          this.todayEdibleSeen = void 0;
          this.cfg = cfg;
          this.rng = new Rng(seed);
          this.day = 1;
          this.minute = cfg.dayStartMinute;
          this.hunger = cfg.startHunger;
          this.stamina = cfg.startStamina;
          this.mood = cfg.startMood;
          this.money = cfg.startMoney;
          this.phase = 'fortune';
          this.location = null;
          this.fortune = null;
          this.fortuneLocation = null;
          this.rerollCount = 0;
          this.bagLevel = 0;
          this.homeLevel = 0;
          this.bag = [];
          this.floor = [];
          this.bannedToday = [];
          this.raining = false;
          this.catLuck = 0;
          this.deathCause = '';
          this.lastEventNotice = '';
          this.lastNightWarmth = false;
          this.totalIncome = 0;
          this.log = [];
          this.lastDayReport = null;
          this.lastCollapse = null;
          this.history = [];
          this.boxes = new Map();
          this.nextUid = 1;
          this.pendingEvent = null;
          this.dayHasGoodOrAbove = false;
          this.fortuneGuaranteeUsed = false;
          this.todayEdibleSeen = [];
        }
        var _proto2 = Game.prototype;
        _proto2.startGame = function startGame() {
          this.day = 1;
          this.minute = this.cfg.dayStartMinute;
          this.hunger = this.cfg.startHunger;
          this.stamina = this.cfg.startStamina;
          this.mood = this.cfg.startMood;
          this.money = this.cfg.startMoney;
          this.phase = 'fortune';
          this.location = null;
          this.fortune = null;
          this.fortuneLocation = null;
          this.rerollCount = 0;
          this.bagLevel = 0;
          this.homeLevel = 0;
          this.bag = [];
          this.floor = [];
          this.bannedToday = [];
          this.raining = false;
          this.catLuck = 0;
          this.deathCause = '';
          this.lastEventNotice = '';
          this.lastNightWarmth = false;
          this.totalIncome = 0;
          this.log = [];
          this.lastDayReport = null;
          this.lastCollapse = null;
          this.history = [];
          this.boxes = new Map();
          this.nextUid = 1;
          this.pendingEvent = null;
          this.dayHasGoodOrAbove = false;
          this.fortuneGuaranteeUsed = false;
          this.todayEdibleSeen = [];
          this.drawFortune();
          this.phase = 'fortune';
        };
        _proto2.drawFortune = function drawFortune() {
          this.drawFortuneInternal();
        };
        _proto2.rerollCost = function rerollCost() {
          return this.cfg.rerollBase + this.cfg.rerollStep * this.rerollCount;
        };
        _proto2.rerollFortune = function rerollFortune() {
          if (this.phase !== 'fortune') return false;
          var cost = this.rerollCost();
          if (this.money < cost) return false;
          this.money -= cost;
          this.rerollCount++;
          this.drawFortune();
          return true;
        };
        _proto2.acceptFortune = function acceptFortune() {
          if (this.phase !== 'fortune' || !this.fortune) return;
          var tier = this.fortune.tier;
          var delta = this.cfg.boxCountFortuneDelta[tier];
          var minBase = this.cfg.boxesPerLocation[0];
          var maxBase = this.cfg.boxesPerLocation[1];
          this.boxes = new Map();
          for (var _iterator = _createForOfIteratorHelperLoose(LOCATIONS), _step; !(_step = _iterator()).done;) {
            var loc = _step.value;
            var count = this.rng["int"](minBase + delta[0], maxBase + delta[1]);
            count = Math.max(1, count);
            var boxes = [];
            for (var i = 0; i < count; i++) {
              var size = this.rng.chance(this.cfg.bigBoxChance[tier]) ? 'big' : 'small';
              boxes.push({
                id: "box_" + loc.id + "_" + i,
                size: size,
                opened: false
              });
            }
            this.boxes.set(loc.id, boxes);
          }
          this.phase = 'map';
          this.bannedToday = [];
        };
        _proto2.boxesAt = function boxesAt(locId) {
          var _this$boxes$get;
          return (_this$boxes$get = this.boxes.get(locId)) != null ? _this$boxes$get : [];
        }

        /** 当前待处理事件（UI 在 event 状态刷新时重新打开事件界面用）。 */;
        /** 被抓/被没收时清空整个背包（含大件和已摆放坐标）。 */
        _proto2.clearBag = function clearBag() {
          this.bag = [];
          this.lastEventNotice = '背包被没收了';
        };
        _proto2.travelCost = function travelCost(locId) {
          var _this$fortune;
          var loc = this.findLocation(locId);
          if (!loc) return this.cfg.maxStamina * 10;
          var cost;
          if (this.location == null) {
            cost = loc.distance;
          } else {
            var curLoc = this.findLocation(this.location);
            if (!curLoc) cost = loc.distance;else cost = Math.abs(curLoc.distance - loc.distance) + 5;
          }
          cost = Math.max(5, cost);
          var phaseDef = this.currentPhaseDef();
          if (loc.far && phaseDef.farTravelMul !== 1) {
            cost = Math.floor(cost * phaseDef.farTravelMul);
          }
          if (((_this$fortune = this.fortune) == null ? void 0 : _this$fortune.effect) === 'windy') {
            cost += this.cfg.fortuneEffects.windy;
          }
          if (this.raining) {
            cost += this.cfg.rainTravelExtra;
          }
          return Math.max(5, cost);
        };
        _proto2.homeCost = function homeCost() {
          var _this$fortune2;
          if (this.location == null) return 0;
          var loc = this.findLocation(this.location);
          if (!loc) return 0;
          var cost = loc.distance;
          var phaseDef = this.currentPhaseDef();
          if (loc.far && phaseDef.farTravelMul !== 1) {
            cost = Math.floor(cost * phaseDef.farTravelMul);
          }
          if (((_this$fortune2 = this.fortune) == null ? void 0 : _this$fortune2.effect) === 'windy') {
            cost += this.cfg.fortuneEffects.windy;
          }
          if (this.raining) {
            cost += this.cfg.rainTravelExtra;
          }
          return Math.max(5, cost);
        };
        _proto2.travel = function travel(locId) {
          if (this.phase !== 'map' && this.phase !== 'location') return false;
          if (this.bannedToday.includes(locId)) return false;
          var loc = this.findLocation(locId);
          if (!loc) return false;
          var cost = this.travelCost(locId);
          this.stamina -= cost;
          this.minute += this.cfg.travelMinutes;
          this.location = locId;
          this.phase = 'location';
          if (this.stamina <= 0) {
            this.collapse();
            return true;
          }
          this.checkMidnight();
          return true;
        };
        _proto2.goldChance = function goldChance(holdSec, boxId) {
          var _this$fortune3;
          var box = this.findBox(boxId);
          if (!box || !this.location) return 0;
          var clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
          var rareP = 0;
          var epicP = 0;
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.cfg.holdCurve), _step2; !(_step2 = _iterator2()).done;) {
            var step = _step2.value;
            if (step.minSec <= clampHold) {
              step.good;
              rareP = step.rare;
              epicP = step.epic;
            } else break;
          }
          var locId = this.location;
          var loc = this.findLocation(locId);
          if (!loc) return 0;
          var phaseDef = this.currentPhaseDef();
          var mul = loc.lootRate * phaseDef.lootMul;
          if (((_this$fortune3 = this.fortune) == null ? void 0 : _this$fortune3.effect) === 'lootUp' && this.fortuneLocation === locId) {
            mul *= 1 + this.cfg.fortuneEffects.lootUp;
          }
          if (this.catLuck > 0) {
            mul *= 1 + this.cfg.catLuckMul;
          }
          if (this.mood < this.cfg.moodGoldLow.threshold) {
            mul *= this.cfg.moodGoldLow.mul;
          } else if (this.mood >= this.cfg.moodGoldHigh.threshold) {
            mul *= this.cfg.moodGoldHigh.mul;
          }
          rareP *= mul;
          epicP *= mul;
          rareP = Math.min(1, Math.max(0, rareP));
          epicP = Math.min(1, Math.max(0, epicP));
          return Math.min(1, rareP + epicP);
        };
        _proto2.glowFor = function glowFor(holdSec, boxId) {
          var _this$fortune4;
          var box = this.findBox(boxId);
          if (!box || !this.location) return 'white';
          var clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
          var goodP = 0;
          var rareP = 0;
          var epicP = 0;
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.cfg.holdCurve), _step3; !(_step3 = _iterator3()).done;) {
            var step = _step3.value;
            if (step.minSec <= clampHold) {
              goodP = step.good;
              rareP = step.rare;
              epicP = step.epic;
            } else break;
          }
          var locId = this.location;
          var loc = this.findLocation(locId);
          if (!loc) return 'white';
          var phaseDef = this.currentPhaseDef();
          var mul = loc.lootRate * phaseDef.lootMul;
          if (((_this$fortune4 = this.fortune) == null ? void 0 : _this$fortune4.effect) === 'lootUp' && this.fortuneLocation === locId) {
            mul *= 1 + this.cfg.fortuneEffects.lootUp;
          }
          if (this.catLuck > 0) {
            mul *= 1 + this.cfg.catLuckMul;
          }
          if (this.mood < this.cfg.moodGoldLow.threshold) {
            mul *= this.cfg.moodGoldLow.mul;
          } else if (this.mood >= this.cfg.moodGoldHigh.threshold) {
            mul *= this.cfg.moodGoldHigh.mul;
          }
          goodP *= mul;
          rareP *= mul;
          epicP *= mul;
          if (box.size === 'big') {
            goodP += this.cfg.bigBoxBonusGood;
          }
          goodP = Math.min(1, Math.max(0, goodP));
          rareP = Math.min(1, Math.max(0, rareP));
          epicP = Math.min(1, Math.max(0, epicP));
          if (epicP > 0) return 'rainbow';
          if (rareP > 0) return 'gold';
          if (goodP > 0) return 'blue';
          return 'white';
        };
        _proto2.dig = function dig(boxId, holdSec) {
          var _this$boxes$get2, _this$fortune5, _this$floor;
          if (this.phase !== 'location' || this.location == null) {
            return {
              ok: false,
              reason: '当前不能挖',
              items: [],
              mishap: false,
              glow: 'white',
              staminaCost: 0,
              quip: ''
            };
          }
          var locId = this.location;
          var boxes = (_this$boxes$get2 = this.boxes.get(locId)) != null ? _this$boxes$get2 : [];
          var box = boxes.find(function (b) {
            return b.id === boxId;
          });
          if (!box) {
            return {
              ok: false,
              reason: '盒子不存在',
              items: [],
              mishap: false,
              glow: 'white',
              staminaCost: 0,
              quip: ''
            };
          }
          if (box.opened) {
            return {
              ok: false,
              reason: '盒子已经被掏过了',
              items: [],
              mishap: false,
              glow: 'white',
              staminaCost: 0,
              quip: ''
            };
          }
          var clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
          var staminaCost = this.cfg.digStamina[box.size] + clampHold * this.cfg.holdStaminaPerSec;
          this.stamina -= staminaCost;
          this.hunger = Math.max(0, this.hunger - this.cfg.hungerPerDig);
          this.minute += this.cfg.minutesPerDig[box.size] + clampHold * this.cfg.minutesPerHoldSecond;
          box.opened = true;
          if (this.hunger <= 0) {
            this.phase = 'lost';
            this.deathCause = this.makeDeathCause();
            return {
              ok: false,
              reason: '饿晕了',
              items: [],
              mishap: false,
              glow: 'white',
              staminaCost: staminaCost,
              quip: '',
              collapsed: false
            };
          }
          var mishapProb = 0;
          if (clampHold > this.cfg.mishapStartSec) {
            mishapProb = (clampHold - this.cfg.mishapStartSec) * this.cfg.mishapPerSec;
          }
          if (((_this$fortune5 = this.fortune) == null ? void 0 : _this$fortune5.effect) === 'mishapUp' && this.fortuneLocation === locId) {
            mishapProb += this.cfg.fortuneEffects.mishapUp;
          }
          if (this.raining) {
            mishapProb += this.cfg.rainMishapDelta;
          }
          mishapProb = Math.min(1, Math.max(0, mishapProb));
          var isMishap = this.rng.chance(mishapProb);
          var items = [];
          var glow = 'white';
          var quip = '';
          if (isMishap) {
            var mishapDef = this.rng.pick(ITEMS.filter(function (i) {
              return i.rarity === 'mishap';
            }));
            items.push({
              uid: this.nextUid++,
              itemId: mishapDef.id
            });
            this.mood = Math.max(0, this.mood + this.cfg.mishapMood);
            quip = this.makeMishapQuip();
          } else {
            var _this$fortune6;
            var itemCount = box.size === 'big' ? this.rng["int"](this.cfg.itemsPerBox.big[0], this.cfg.itemsPerBox.big[1]) : this.cfg.itemsPerBox.small[0];
            var day1Guarantee = this.day === 1 && this.cfg.day1GuaranteeGood && box.size === 'big' && !this.dayHasGoodOrAbove;
            var fortuneGuarantee = ((_this$fortune6 = this.fortune) == null ? void 0 : _this$fortune6.effect) === 'bigGuaranteeGood' && this.fortuneLocation === locId && box.size === 'big' && !this.fortuneGuaranteeUsed;
            var needGuarantee = day1Guarantee || fortuneGuarantee;
            var guaranteedFulfilled = false;
            for (var i = 0; i < itemCount; i++) {
              var rarity = this.rollRarity(clampHold, box.size, locId);
              if (rarity === 'common' && needGuarantee && !guaranteedFulfilled) {
                rarity = 'good';
              }
              if (rarity === 'good' || rarity === 'rare' || rarity === 'epic') {
                this.dayHasGoodOrAbove = true;
                if (needGuarantee && rarity === 'good') {
                  guaranteedFulfilled = true;
                }
              }
              if (rarity === 'rare' || rarity === 'epic') {
                this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.rareMood);
              }
              var def = this.pickItemByRarity(rarity, locId);
              items.push({
                uid: this.nextUid++,
                itemId: def.id
              });
              if (def.edible) {
                this.todayEdibleSeen.push(def.id);
              }
              if (rarity === 'epic') {
                glow = 'rainbow';
              } else if (rarity === 'rare' && glow !== 'rainbow') {
                glow = 'gold';
              } else if (rarity === 'good' && glow === 'white') {
                glow = 'blue';
              }
            }
            if (needGuarantee && guaranteedFulfilled) {
              if (fortuneGuarantee) {
                this.fortuneGuaranteeUsed = true;
              }
            }
            quip = this.makeQuip(items);
          }
          if (this.catLuck > 0) {
            this.catLuck--;
          }
          (_this$floor = this.floor).push.apply(_this$floor, items);
          var event;
          var collapsed = false;
          if (!isMishap && this.rng.chance(this.cfg.eventChancePerDig)) {
            event = this.tryTriggerEvent(locId);
            if (event) {
              this.pendingEvent = event;
              this.phase = 'event';
            }
          }
          if (this.stamina <= 0) {
            this.collapse();
            collapsed = true;
            event = undefined;
            this.pendingEvent = null;
          } else {
            this.checkMidnight();
            if (this.phase === 'collapsed') {
              collapsed = true;
              event = undefined;
            }
          }
          return {
            ok: true,
            items: items,
            mishap: isMishap,
            glow: glow,
            staminaCost: staminaCost,
            quip: quip,
            event: event,
            collapsed: collapsed
          };
        };
        _proto2.resolveEvent = function resolveEvent(optionIndex, minigameWin) {
          if (minigameWin === void 0) {
            minigameWin = false;
          }
          if (this.phase !== 'event' || !this.pendingEvent) return;
          this.lastEventNotice = '';
          var ev = this.pendingEvent;
          var locId = this.location;
          this.pendingEvent = null;
          if (!locId) {
            this.phase = 'map';
            return;
          }
          switch (ev.id) {
            case 'patrol':
              {
                if (optionIndex === 0) {
                  this.stamina = Math.max(0, this.stamina - this.cfg.patrolLeaveStamina);
                  this.bannedToday.push(locId);
                  this.phase = 'map';
                } else {
                  if (this.rng.chance(0.5)) {
                    this.phase = 'location';
                  } else {
                    this.mood = Math.max(0, this.mood + this.cfg.patrolMood);
                    this.bannedToday.push(locId);
                    // 装作散步失败被抓：背包被没收
                    this.clearBag();
                    this.phase = 'map';
                  }
                }
                break;
              }
            case 'guard':
              {
                this.bannedToday.push(locId);
                // 被保安请出小区：背包没收
                this.clearBag();
                this.phase = 'map';
                break;
              }
            case 'rival':
              {
                if (optionIndex === 0) {
                  this.mood = Math.max(0, this.mood + this.cfg.rivalYieldMood);
                  this.phase = 'location';
                } else {
                  if (minigameWin) {
                    var _this$boxes$get3;
                    var boxes = (_this$boxes$get3 = this.boxes.get(locId)) != null ? _this$boxes$get3 : [];
                    boxes.push({
                      id: "box_extra_" + this.nextUid++,
                      size: 'big',
                      opened: false
                    });
                    this.phase = 'location';
                  } else {
                    this.stamina = Math.max(0, this.stamina - this.cfg.rivalLoseStamina);
                    this.phase = 'location';
                    if (this.stamina <= 0) {
                      this.collapse();
                    }
                  }
                }
                break;
              }
            case 'auntie':
              {
                this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.auntieHunger);
                this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.auntieMood);
                this.phase = 'location';
                break;
              }
            case 'delivery':
              {
                this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.deliveryHunger);
                this.phase = 'location';
                break;
              }
            case 'wallet':
              {
                this.money += this.cfg.walletMoney;
                this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.walletMood);
                this.phase = 'location';
                break;
              }
            case 'cat':
              {
                if (optionIndex === 0) {
                  // 只消耗背包里的一份食物，不加玩家饱腹
                  var foodUid = this.findBagEdibleUid();
                  if (foodUid != null) {
                    var idx = this.bag.findIndex(function (p) {
                      return p.uid === foodUid;
                    });
                    if (idx >= 0) this.bag.splice(idx, 1);
                    this.catLuck = this.cfg.catLuckDigs;
                  } else {
                    this.lastEventNotice = '包里没吃的';
                  }
                }
                this.phase = 'location';
                break;
              }
            case 'rain':
              {
                this.raining = true;
                this.phase = 'location';
                break;
              }
          }
        };
        _proto2.canPlace = function canPlace(itemCells, x, y, rotated) {
          var w = itemCells === 2 ? rotated ? 1 : 2 : 1;
          var h = itemCells === 2 ? rotated ? 2 : 1 : 1;
          if (x < 0 || y < 0 || x + w > this.bagW || y + h > this.bagH) return false;
          for (var _iterator4 = _createForOfIteratorHelperLoose(this.bag), _step4; !(_step4 = _iterator4()).done;) {
            var p = _step4.value;
            if (this.rectsOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) return false;
          }
          return true;
        };
        _proto2.placeFromFloor = function placeFromFloor(uid, x, y, rotated) {
          if (rotated === void 0) {
            rotated = false;
          }
          var idx = this.floor.findIndex(function (i) {
            return i.uid === uid;
          });
          if (idx === -1) return false;
          var item = this.floor[idx];
          var def = this.findItemDef(item.itemId);
          if (!def) return false;
          if (!this.canPlace(def.cells, x, y, rotated)) return false;
          var w = def.cells === 2 ? rotated ? 1 : 2 : 1;
          var h = def.cells === 2 ? rotated ? 2 : 1 : 1;
          this.floor.splice(idx, 1);
          this.bag.push({
            uid: item.uid,
            itemId: item.itemId,
            x: x,
            y: y,
            w: w,
            h: h,
            scratchValue: item.scratchValue
          });
          return true;
        };
        _proto2.moveToFloor = function moveToFloor(uid) {
          var idx = this.bag.findIndex(function (p) {
            return p.uid === uid;
          });
          if (idx === -1) return false;
          var p = this.bag[idx];
          this.bag.splice(idx, 1);
          this.floor.push({
            uid: p.uid,
            itemId: p.itemId,
            scratchValue: p.scratchValue
          });
          return true;
        };
        _proto2.discard = function discard(uid) {
          var idx = this.floor.findIndex(function (i) {
            return i.uid === uid;
          });
          if (idx === -1) return false;
          this.floor.splice(idx, 1);
          return true;
        };
        _proto2.eat = function eat(uid) {
          var _this$fortune7;
          var idx = this.floor.findIndex(function (i) {
            return i.uid === uid;
          });
          var isBag = false;
          if (idx === -1) {
            idx = this.bag.findIndex(function (p) {
              return p.uid === uid;
            });
            isBag = true;
          }
          if (idx === -1) return false;
          var item = isBag ? this.bag[idx] : this.floor[idx];
          var def = this.findItemDef(item.itemId);
          if (!def || !def.edible) return false;
          var foodMul = 1;
          if (((_this$fortune7 = this.fortune) == null ? void 0 : _this$fortune7.effect) === 'foodUp') {
            foodMul = 1 + this.cfg.fortuneEffects.foodUp;
          }
          if (def.hunger) {
            this.hunger = Math.min(this.cfg.maxHunger, this.hunger + Math.round(def.hunger * foodMul));
          }
          if (def.stamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + def.stamina);
          }
          if (def.mood) {
            this.mood = Math.min(this.cfg.maxMood, this.mood + def.mood);
          }
          if (isBag) {
            this.bag.splice(idx, 1);
          } else {
            this.floor.splice(idx, 1);
          }
          return true;
        };
        _proto2.leaveLocation = function leaveLocation() {
          if (this.location == null) return;
          this.clearFloor('离开时，没装的东西落在了原地');
          this.location = null;
          this.phase = 'map';
        };
        _proto2.goHome = function goHome() {
          if (this.phase === 'won' || this.phase === 'lost' || this.phase === 'collapsed') return false;
          if (this.location == null) {
            if (this.phase === 'home') return true;
            this.phase = 'home';
            this.sellBagAndReport();
            return true;
          }
          var cost = this.homeCost();
          if (this.stamina < cost) return false;
          this.stamina -= cost;
          this.location = null;
          this.phase = 'home';
          this.clearFloor('回家路上，面前的宝贝不见了');
          this.sellBagAndReport();
          return true;
        };
        _proto2.endDayAway = function endDayAway() {
          if (!this.goHome()) {
            this.collapse();
          }
        };
        _proto2.buyFood = function buyFood() {
          if (this.phase !== 'home') return false;
          if (this.money < this.cfg.foodPrice) return false;
          this.money -= this.cfg.foodPrice;
          this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.foodHunger);
          return true;
        };
        _proto2.expandBag = function expandBag() {
          if (this.bagLevel >= this.cfg.bagSizes.length - 1) return false;
          var cost = this.cfg.bagSizes[this.bagLevel + 1].cost;
          if (this.money < cost) return false;
          this.money -= cost;
          this.bagLevel++;
          return true;
        };
        _proto2.upgradeHome = function upgradeHome() {
          if (this.homeLevel >= this.cfg.homeLevels.length - 1) return false;
          var cost = this.cfg.homeLevels[this.homeLevel + 1].cost;
          if (this.money < cost) return false;
          this.money -= cost;
          this.homeLevel++;
          return true;
        };
        _proto2.sleep = function sleep() {
          if (this.phase !== 'home') return;

          // 统一在逻辑层 roll，并把结果保留下来给 UI 播动画
          this.lastNightWarmth = this.rng.chance(this.cfg.nightWarmthChance);
          if (this.lastNightWarmth) {
            this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.nightWarmthHunger);
            this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.warmthMood);
          }
          this.hunger -= this.dailyHunger;
          this.mood += this.cfg.moodPerDay;
          this.mood = Math.max(0, Math.min(this.cfg.maxMood, this.mood));
          this.stamina = this.maxStamina;
          this.history.push({
            day: this.day,
            money: this.money,
            hunger: this.hunger,
            stamina: this.stamina
          });
          if (this.hunger <= 0) {
            this.phase = 'lost';
            this.deathCause = this.makeDeathCause();
            return;
          }
          if (this.day === this.cfg.totalDays) {
            this.phase = 'won';
            return;
          }
          this.day += 1;
          this.minute = this.cfg.dayStartMinute;
          this.floor = [];
          this.bag = [];
          this.bannedToday = [];
          this.raining = false;
          this.catLuck = 0;
          this.dayHasGoodOrAbove = false;
          this.fortuneGuaranteeUsed = false;
          this.todayEdibleSeen = [];
          this.pendingEvent = null;
          this.lastDayReport = null;
          this.drawFortune();
          this.phase = 'fortune';
        };
        _proto2.collapse = function collapse() {
          if (this.phase === 'won' || this.phase === 'lost') return;
          var spot = this.chooseSleepSpot();
          var lostItems = [];
          // 至少丢 1 件（有物品时），其余按比例向下取整
          var loseCount = this.bag.length === 0 ? 0 : Math.max(1, Math.floor(this.bag.length * this.cfg.collapseLoseRatio));
          for (var i = 0; i < loseCount && this.bag.length > 0; i++) {
            var idx = Math.floor(this.rng.next() * this.bag.length);
            var removed = this.bag.splice(idx, 1)[0];
            var def = this.findItemDef(removed.itemId);
            if (def) lostItems.push(def.name);
          }
          this.clearFloor('倒下后，面前的宝贝消失了');
          this.hunger -= this.dailyHunger;
          this.mood += this.cfg.moodPerDay;
          this.mood = Math.max(0, Math.min(this.cfg.maxMood, this.mood));
          if (this.hunger <= 0) {
            this.phase = 'lost';
            this.deathCause = this.makeDeathCause();
            return;
          }
          var finalSpot = spot;
          var staminaNext = spot.stamina;
          if (spot.cost > 0) {
            if (this.money >= spot.cost) {
              this.money -= spot.cost;
            } else {
              finalSpot = SLEEP_SPOTS[0];
              staminaNext = finalSpot.stamina;
              if (this.rng.chance(this.cfg.benchGuardChance)) {
                staminaNext -= this.cfg.benchGuardStamina;
              }
            }
          } else {
            if (finalSpot.id === 'bench' && this.rng.chance(this.cfg.benchGuardChance)) {
              staminaNext -= this.cfg.benchGuardStamina;
            }
          }
          staminaNext = Math.max(0, staminaNext);
          this.stamina = staminaNext;
          this.lastCollapse = {
            day: this.day,
            spot: finalSpot.id,
            spotName: finalSpot.name,
            lostItems: lostItems,
            staminaNextDay: staminaNext,
            text: this.makeCollapseText(finalSpot.name, lostItems)
          };
          this.phase = 'collapsed';
          this.pendingEvent = null;
        };
        _proto2.wakeUp = function wakeUp() {
          if (this.phase !== 'collapsed') return;
          if (this.day === this.cfg.totalDays) {
            this.phase = 'won';
            return;
          }
          this.history.push({
            day: this.day,
            money: this.money,
            hunger: this.hunger,
            stamina: this.stamina
          });
          this.day += 1;
          this.minute = this.cfg.dayStartMinute;
          this.floor = [];
          // 倒下时已经只丢了一半，剩下的物品留到第二天，回家时再卖
          this.bannedToday = [];
          this.raining = false;
          this.catLuck = 0;
          this.dayHasGoodOrAbove = false;
          this.fortuneGuaranteeUsed = false;
          this.todayEdibleSeen = [];
          this.pendingEvent = null;
          this.lastCollapse = null;
          this.location = null;
          this.drawFortune();
          this.phase = 'fortune';
        };
        _proto2.drawFortuneInternal = function drawFortuneInternal() {
          var previousFortune = this.fortune;
          var goodWeight = this.cfg.fortuneWeights.good;
          var mehWeight = this.cfg.fortuneWeights.meh;
          var badWeight = this.cfg.fortuneWeights.bad;
          if ((previousFortune == null ? void 0 : previousFortune.effect) === 'nextGoodUp') {
            goodWeight += this.cfg.fortuneEffects.nextGoodUp;
          }
          var phaseDef = this.currentPhaseDef();
          if (phaseDef.badFortuneBonus > 0) {
            badWeight += phaseDef.badFortuneBonus;
          }
          var total = goodWeight + mehWeight + badWeight;
          var roll = this.rng.next() * total;
          var tier;
          if (roll < goodWeight) {
            tier = 'good';
          } else if (roll < goodWeight + mehWeight) {
            tier = 'meh';
          } else {
            tier = 'bad';
          }
          var candidates = FORTUNES.filter(function (f) {
            return f.tier === tier;
          });
          var fortune = this.rng.pick(candidates);
          this.fortune = fortune;
          if (fortune.needsLocation) {
            this.fortuneLocation = this.rng.pick(LOCATIONS).id;
          } else {
            this.fortuneLocation = null;
          }
        };
        _proto2.currentPhaseDef = function currentPhaseDef() {
          for (var _iterator5 = _createForOfIteratorHelperLoose(this.cfg.phases), _step5; !(_step5 = _iterator5()).done;) {
            var phase = _step5.value;
            if (this.day >= phase.fromDay && this.day <= phase.toDay) {
              return phase;
            }
          }
          return this.cfg.phases[this.cfg.phases.length - 1];
        };
        _proto2.findLocation = function findLocation(id) {
          return LOCATIONS.find(function (loc) {
            return loc.id === id;
          });
        };
        _proto2.findBox = function findBox(boxId) {
          for (var _iterator6 = _createForOfIteratorHelperLoose(this.boxes.values()), _step6; !(_step6 = _iterator6()).done;) {
            var boxes = _step6.value;
            for (var _iterator7 = _createForOfIteratorHelperLoose(boxes), _step7; !(_step7 = _iterator7()).done;) {
              var box = _step7.value;
              if (box.id === boxId) {
                return box;
              }
            }
          }
          return undefined;
        };
        _proto2.rollRarity = function rollRarity(holdSec, boxSize, locId) {
          var _this$fortune8;
          var clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
          var goodP = 0;
          var rareP = 0;
          var epicP = 0;
          for (var _iterator8 = _createForOfIteratorHelperLoose(this.cfg.holdCurve), _step8; !(_step8 = _iterator8()).done;) {
            var step = _step8.value;
            if (step.minSec <= clampHold) {
              goodP = step.good;
              rareP = step.rare;
              epicP = step.epic;
            } else {
              break;
            }
          }
          var loc = this.findLocation(locId);
          if (!loc) return 'common';
          var phaseDef = this.currentPhaseDef();
          var mul = loc.lootRate * phaseDef.lootMul;
          if (((_this$fortune8 = this.fortune) == null ? void 0 : _this$fortune8.effect) === 'lootUp' && this.fortuneLocation === locId) {
            mul *= 1 + this.cfg.fortuneEffects.lootUp;
          }
          if (this.catLuck > 0) {
            mul *= 1 + this.cfg.catLuckMul;
          }
          if (this.mood < this.cfg.moodGoldLow.threshold) {
            mul *= this.cfg.moodGoldLow.mul;
          } else if (this.mood >= this.cfg.moodGoldHigh.threshold) {
            mul *= this.cfg.moodGoldHigh.mul;
          }
          goodP *= mul;
          rareP *= mul;
          epicP *= mul;
          if (boxSize === 'big') {
            goodP += this.cfg.bigBoxBonusGood;
          }
          goodP = Math.min(1, Math.max(0, goodP));
          rareP = Math.min(1, Math.max(0, rareP));
          epicP = Math.min(1, Math.max(0, epicP));
          var roll = this.rng.next();
          if (roll < epicP) {
            return 'epic';
          } else if (roll < epicP + rareP) {
            return 'rare';
          } else if (roll < epicP + rareP + goodP) {
            return 'good';
          } else {
            return 'common';
          }
        };
        _proto2.pickItemByRarity = function pickItemByRarity(rarity, locId) {
          var candidates = ITEMS.filter(function (item) {
            return item.rarity === rarity;
          });
          if (candidates.length === 0) return ITEMS[0];
          var weights = candidates.map(function (item) {
            var _item$locations;
            return (_item$locations = item.locations) != null && _item$locations.includes(locId) ? 3 : 1;
          });
          var totalWeight = 0;
          for (var _iterator9 = _createForOfIteratorHelperLoose(weights), _step9; !(_step9 = _iterator9()).done;) {
            var weight = _step9.value;
            totalWeight += weight;
          }
          var roll = this.rng.next() * totalWeight;
          for (var i = 0; i < candidates.length; i++) {
            if (roll < weights[i]) {
              return candidates[i];
            }
            roll -= weights[i];
          }
          return candidates[candidates.length - 1];
        };
        _proto2.makeQuip = function makeQuip(items) {
          var _this = this;
          if (items.length === 0) return '';
          var names = items.map(function (i) {
            var _this$findItemDef$nam, _this$findItemDef;
            return (_this$findItemDef$nam = (_this$findItemDef = _this.findItemDef(i.itemId)) == null ? void 0 : _this$findItemDef.name) != null ? _this$findItemDef$nam : '未知';
          });
          var joined = names.join('、');
          return "\u638F\u51FA\uFF1A" + joined + "\uFF0C\u6DF1\u5733\u6B22\u8FCE\u4F60";
        };
        _proto2.makeMishapQuip = function makeMishapQuip() {
          var quips = ['手一抖，掏出了一团糟糕', '猫主子给了你一巴掌', '今天的垃圾桶格外暴躁', '你被垃圾教育了'];
          return this.rng.pick(quips);
        };
        _proto2.tryTriggerEvent = function tryTriggerEvent(locId) {
          var available = [];
          var weights = [];
          for (var _iterator10 = _createForOfIteratorHelperLoose(EVENTS), _step10; !(_step10 = _iterator10()).done;) {
            var _ev = _step10.value;
            var _weight = _ev.weight;
            var allowed = true;
            if (_ev.id === 'patrol') {
              var _this$fortune9;
              var loc = this.findLocation(locId);
              if (loc) {
                _weight *= loc.danger;
              }
              _weight *= 1 + this.currentPhaseDef().patrolBonus;
              if (((_this$fortune9 = this.fortune) == null ? void 0 : _this$fortune9.effect) === 'patrolX2' && this.fortuneLocation === locId) {
                _weight *= this.cfg.fortuneEffects.patrolX2;
              }
            }
            if (_ev.id === 'rival' && !this.currentPhaseDef().rivalEnabled) {
              allowed = false;
            }
            if (_ev.id === 'rain' && this.raining) {
              allowed = false;
            }
            if (allowed && _weight > 0) {
              available.push(_ev);
              weights.push(_weight);
            }
          }
          if (available.length === 0) return undefined;
          var totalWeight = 0;
          for (var _i = 0, _weights = weights; _i < _weights.length; _i++) {
            var weight = _weights[_i];
            totalWeight += weight;
          }
          var roll = this.rng.next() * totalWeight;
          for (var i = 0; i < available.length; i++) {
            if (roll < weights[i]) {
              var ev = available[i];
              return {
                id: ev.id,
                name: ev.name,
                options: [].concat(ev.options)
              };
            }
            roll -= weights[i];
          }
          return undefined;
        };
        _proto2.findBagEdibleUid = function findBagEdibleUid() {
          for (var _iterator11 = _createForOfIteratorHelperLoose(this.bag), _step11; !(_step11 = _iterator11()).done;) {
            var item = _step11.value;
            var def = this.findItemDef(item.itemId);
            if (def != null && def.edible) return item.uid;
          }
          return null;
        };
        _proto2.rectsOverlap = function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
          return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
        };
        _proto2.clearFloor = function clearFloor(text) {
          if (this.floor.length > 0) {
            this.log.push(text + "\uFF0C" + this.floor.length + " \u4EF6\u7269\u54C1\u6D88\u5931");
            this.floor = [];
          }
        };
        _proto2.sellBagAndReport = function sellBagAndReport() {
          var _this$lastDayReport;
          var income = 0;
          var soldItems = [];
          var bestItem;
          var bestPrice = -Infinity;
          for (var _iterator12 = _createForOfIteratorHelperLoose(this.bag), _step12; !(_step12 = _iterator12()).done;) {
            var item = _step12.value;
            var def = this.findItemDef(item.itemId);
            if (!def) continue;
            var price = def.price;
            if (def.id === 'scratch_card') {
              price = this.revealScratchValue();
              item.scratchValue = price;
            } else if (def.priceMax != null && def.priceMax > def.price) {
              price = def.price;
            }
            income += price;
            soldItems.push(def.name);
            if (price > bestPrice) {
              bestPrice = price;
              bestItem = def.name;
            }
          }
          this.money += income;
          this.totalIncome += income;
          this.bag = [];
          var report = {
            day: this.day,
            income: income,
            soldItems: soldItems,
            bestItem: bestItem,
            hungerLeft: this.hunger,
            quip: this.makeDayQuip(soldItems, income, bestItem)
          };
          if ((_this$lastDayReport = this.lastDayReport) != null && _this$lastDayReport.warmth) {
            report.warmth = true;
          }
          this.lastDayReport = report;
          this.log.push("\u7B2C " + this.day + " \u5929\u5356\u51FA\uFF1A" + (soldItems.join('、') || '无') + "\uFF0C\u6536\u5165 \xA5" + income.toFixed(2));
        };
        _proto2.revealScratchValue = function revealScratchValue() {
          var roll = this.rng.next() * 100;
          if (roll < 60) {
            return 0;
          } else if (roll < 90) {
            return this.rng["int"](5, 20);
          } else if (roll < 99) {
            return this.rng["int"](30, 80);
          } else {
            return 200;
          }
        };
        _proto2.makeDayQuip = function makeDayQuip(soldItems, income, bestItem) {
          if (soldItems.length === 0) {
            return '今天一无所获，深圳的天空依旧灰蒙蒙';
          }
          // 和结算卡的「最离谱」用同一件物品；金额用不换行空格连成一个整体
          var best = bestItem != null ? bestItem : soldItems[soldItems.length - 1];
          return "\u4ECA\u65E5\u6218\u7EE9\uFF1A" + best + "\uFF0C\u6536\u5165 \xA5\xA0" + income.toFixed(2) + "\uFF0C\u6DF1\u5733\u6B22\u8FCE\u4F60";
        };
        _proto2.chooseSleepSpot = function chooseSleepSpot() {
          var roll = this.rng.next();
          for (var _iterator13 = _createForOfIteratorHelperLoose(SLEEP_SPOTS), _step13; !(_step13 = _iterator13()).done;) {
            var spot = _step13.value;
            if (roll < spot.prob) {
              return spot;
            }
            roll -= spot.prob;
          }
          return SLEEP_SPOTS[0];
        };
        _proto2.makeDeathCause = function makeDeathCause() {
          var dayText = "\u7B2C " + this.day + " \u5929";
          if (this.todayEdibleSeen.length > 0) {
            var _this$findItemDef$nam2, _this$findItemDef2;
            var name = (_this$findItemDef$nam2 = (_this$findItemDef2 = this.findItemDef(this.todayEdibleSeen[this.todayEdibleSeen.length - 1])) == null ? void 0 : _this$findItemDef2.name) != null ? _this$findItemDef$nam2 : '可吃的东西';
            return dayText + "\uFF0C\u820D\u4E0D\u5F97\u5403\u90A3\u5757" + name + "\uFF0C\u997F\u6655\u4E86";
          }
          var causes = [dayText + "\uFF0C\u5728\u6DF1\u5733\u7684\u8857\u5934\u997F\u6210\u4E86\u7EB8\u7247\u4EBA", dayText + "\uFF0C\u4EE5\u4E3A\u559D\u897F\u5317\u98CE\u80FD\u9971\uFF0C\u7ED3\u679C\u98CE\u505C\u4E86", dayText + "\uFF0C\u7EC8\u4E8E\u7406\u89E3\u4E86\u4EC0\u4E48\u53EB\u201C\u997F\u5F97\u524D\u80F8\u8D34\u540E\u80CC\u201D", dayText + "\uFF0C\u5851\u6599\u888B\u7FFB\u4E86\u4E2A\u904D\uFF0C\u53EA\u627E\u5230\u4E86\u5B64\u72EC"];
          return this.rng.pick(causes);
        };
        _proto2.makeCollapseText = function makeCollapseText(spotName, lostItems) {
          if (lostItems.length === 0) {
            return "\u4F60\u5728" + spotName + "\u7761\u7740\u4E86\uFF0C\u9192\u6765\u8FD8\u662F\u8EAB\u65E0\u5206\u6587\uFF0C\u4F46\u81F3\u5C11\u6CA1\u4E22\u4E1C\u897F\u3002";
          }
          var names = lostItems.join('、');
          return "\u4F60\u5728" + spotName + "\u7761\u7740\u4E86\uFF0C\u9192\u6765\u5C11\u4E86 " + lostItems.length + " \u6837\u4E1C\u897F\uFF1A" + names + "\u3002";
        };
        _proto2.findItemDef = function findItemDef(id) {
          return ITEMS.find(function (item) {
            return item.id === id;
          });
        };
        _proto2.checkMidnight = function checkMidnight() {
          if (this.phase === 'won' || this.phase === 'lost' || this.phase === 'collapsed' || this.phase === 'home') return;
          if (this.location == null) return;
          if (this.minute < this.cfg.midnightMinute) return;
          if (this.stamina >= this.homeCost()) {
            this.goHome();
          } else {
            this.collapse();
          }
        };
        _createClass(Game, [{
          key: "bagW",
          get: function get() {
            return this.cfg.bagSizes[this.bagLevel].w;
          }
        }, {
          key: "bagH",
          get: function get() {
            return this.cfg.bagSizes[this.bagLevel].h;
          }
        }, {
          key: "maxStamina",
          get: function get() {
            return this.cfg.maxStamina + this.cfg.homeLevels[this.homeLevel].staminaBonus;
          }
        }, {
          key: "dailyHunger",
          get: function get() {
            return this.currentPhaseDef().dailyHunger;
          }
        }, {
          key: "currentEvent",
          get: function get() {
            return this.pendingEvent;
          }
        }]);
        return Game;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameRoot.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './game.ts', './config.ts', './Art.ts', './UI.ts', './ArtMap.ts', './Fx.ts', './LocationView.ts', './EventView.ts', './Sfx.ts'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, _asyncToGenerator, _regeneratorRuntime, cclegacy, _decorator, UITransform, Graphics, Color, Vec3, Label, tween, LabelOutline, UIOpacity, Component, Layers, Game, CONFIG, LOCATIONS, Art, uiNode, UILayout, alignTopSide, alignTop, alignBottom, MAP_POINTS, Fx, LocationView, EventView, playNightWarmth, Sfx;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      UITransform = module.UITransform;
      Graphics = module.Graphics;
      Color = module.Color;
      Vec3 = module.Vec3;
      Label = module.Label;
      tween = module.tween;
      LabelOutline = module.LabelOutline;
      UIOpacity = module.UIOpacity;
      Component = module.Component;
      Layers = module.Layers;
    }, function (module) {
      Game = module.Game;
    }, function (module) {
      CONFIG = module.CONFIG;
      LOCATIONS = module.LOCATIONS;
    }, function (module) {
      Art = module.Art;
    }, function (module) {
      uiNode = module.uiNode;
      UILayout = module.UILayout;
      alignTopSide = module.alignTopSide;
      alignTop = module.alignTop;
      alignBottom = module.alignBottom;
    }, function (module) {
      MAP_POINTS = module.MAP_POINTS;
    }, function (module) {
      Fx = module.Fx;
    }, function (module) {
      LocationView = module.LocationView;
    }, function (module) {
      EventView = module.EventView;
      playNightWarmth = module.playNightWarmth;
    }, function (module) {
      Sfx = module.Sfx;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "0f56cpbArhGw6J4jlhtoizz", "GameRoot", undefined);
      var ccclass = _decorator.ccclass;
      var GameRoot = exports('GameRoot', (_dec = ccclass('GameRoot'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameRoot, _Component);
        function GameRoot() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.game = null;
          _this.hudRoot = null;
          _this.screenRoot = null;
          _this.locationView = null;
          _this.dayLabel = null;
          _this.timeLabel = null;
          _this.moneyLabel = null;
          _this.homeCostLabel = null;
          _this.hungerFill = null;
          _this.staminaFill = null;
          _this.moodFill = null;
          return _this;
        }
        var _proto = GameRoot.prototype;
        _proto.start = /*#__PURE__*/function () {
          var _start = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
            var screenUt;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  // 保证宿主节点也在 UI 层（Canvas 通常已是 UI_2D）
                  this.node.layer = Layers.Enum.UI_2D;
                  UILayout.refresh();
                  _context.next = 4;
                  return Art.preload();
                case 4:
                  this.game = new Game(Math.floor(Date.now() % 1e9));
                  this.game.startGame();

                  // 先建内容层，再建 HUD：HUD 必须在背景/内容之上
                  this.screenRoot = uiNode('screen');
                  this.screenRoot.parent = this.node;
                  screenUt = this.screenRoot.addComponent(UITransform);
                  screenUt.setContentSize(720, 1280);
                  this.screenRoot.setPosition(0, 0, 0);
                  this.buildHUD();
                  this.hudRoot.setSiblingIndex(this.node.children.length - 1);
                  Sfx.init(this.node);
                  _context.next = 16;
                  return this.showLoading();
                case 16:
                  this.refresh();
                case 17:
                case "end":
                  return _context.stop();
              }
            }, _callee, this);
          }));
          function start() {
            return _start.apply(this, arguments);
          }
          return start;
        }();
        _proto.showLoading = /*#__PURE__*/function () {
          var _showLoading = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            var loading, ut, label, lut, lb;
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  loading = uiNode('loading');
                  loading.parent = this.screenRoot;
                  ut = loading.addComponent(UITransform);
                  ut.setContentSize(720, 1280);
                  loading.setPosition(0, 0, 0);
                  label = uiNode('label');
                  label.parent = loading;
                  lut = label.addComponent(UITransform);
                  lut.setContentSize(500, 100);
                  label.setPosition(0, 0, 0);
                  lb = label.addComponent(Label);
                  lb.string = '本游戏纯属虚构，现实请勿模仿';
                  lb.fontSize = 36;
                  lb.lineHeight = 44;
                  lb.horizontalAlign = Label.HorizontalAlign.CENTER;
                  lb.verticalAlign = Label.VerticalAlign.CENTER;
                  lb.color = new Color(255, 255, 255, 255);
                  _context2.next = 19;
                  return Fx.freeze(1.5);
                case 19:
                  loading.destroy();
                case 20:
                case "end":
                  return _context2.stop();
              }
            }, _callee2, this);
          }));
          function showLoading() {
            return _showLoading.apply(this, arguments);
          }
          return showLoading;
        }();
        _proto.buildHUD = function buildHUD() {
          this.hudRoot = uiNode('HUD');
          this.hudRoot.parent = this.node;
          var hudUt = this.hudRoot.addComponent(UITransform);
          hudUt.setContentSize(720, 1280);
          this.hudRoot.setPosition(0, 0, 0);

          // 顶部压暗条：保证状态栏在任何背景上都可读；
          // headerTop 已避开微信胶囊，非微信环境回退到刘海安全区
          var headerH = UILayout.headerTop + 118;
          var stripW = UILayout.visibleW + 40;
          var strip = uiNode('hud_strip');
          strip.parent = this.hudRoot;
          var stripUt = strip.addComponent(UITransform);
          stripUt.setContentSize(stripW, headerH);
          strip.setPosition(0, UILayout.visibleH / 2 - headerH / 2, 0);
          var stripG = strip.addComponent(Graphics);
          stripG.fillColor = new Color(0, 0, 0, 140);
          stripG.rect(-stripW / 2, -headerH / 2, stripW, headerH);
          stripG.fill();

          // 顶部第一行：天数 时间 金钱（Widget 贴顶，自动避开刘海/胶囊和两侧裁切）
          var topY = UILayout.headerY - 24;
          this.dayLabel = this.createLabel('day', 24, new Color(255, 255, 255, 255), new Vec3(-UILayout.halfW + 70, topY, 0), 140, 40);
          this.timeLabel = this.createLabel('time', 24, new Color(255, 255, 255, 255), new Vec3(0, topY, 0), 130, 40);
          this.moneyLabel = this.createLabel('money', 24, new Color(255, 220, 100, 255), new Vec3(UILayout.halfW - 80, topY, 0), 150, 40);
          alignTopSide(this.dayLabel.node, 'left');
          alignTop(this.timeLabel.node);
          alignTopSide(this.moneyLabel.node, 'right');

          // 顶部第二行：三条进度条
          var barY = UILayout.headerY - 62;
          this.hungerFill = this.createBar('hunger', new Color(255, 200, 80, 255), new Vec3(-155, barY, 0));
          this.staminaFill = this.createBar('stamina', new Color(255, 100, 100, 255), new Vec3(0, barY, 0));
          this.moodFill = this.createBar('mood', new Color(100, 180, 255, 255), new Vec3(155, barY, 0));
          alignTop(this.hungerFill.parent, 50, -155);
          alignTop(this.staminaFill.parent, 50, 0);
          alignTop(this.moodFill.parent, 50, 155);

          // 回家体力标签
          this.homeCostLabel = this.createLabel('home_cost', 22, new Color(220, 220, 220, 255), new Vec3(0, UILayout.headerY - 94, 0), 300, 30);
          alignTop(this.homeCostLabel.node, 82);
          this.homeCostLabel.node.active = false;

          // 签名贴底
          var sign = this.createLabel('sign', 18, new Color(180, 180, 180, 180), new Vec3(0, UILayout.bottom + 8, 0), 500, 30);
          sign.string = '深圳生存 · 垃圾人生模拟器';
          alignBottom(sign.node, 2);
        };
        _proto.createLabel = function createLabel(name, fontSize, color, pos, width, height) {
          var node = uiNode(name);
          node.parent = this.hudRoot;
          var ut = node.addComponent(UITransform);
          ut.setContentSize(width, height);
          node.setPosition(pos.x, pos.y, pos.z || 0);
          var label = node.addComponent(Label);
          label.fontSize = fontSize;
          label.lineHeight = fontSize + 4;
          label.color = color;
          label.horizontalAlign = Label.HorizontalAlign.CENTER;
          label.verticalAlign = Label.VerticalAlign.CENTER;
          label.overflow = Label.Overflow.SHRINK;
          label.enableWrapText = false;
          return label;
        };
        _proto.createBar = function createBar(name, color, pos) {
          var _barLabels$name;
          var barLabels = {
            hunger: '饱腹',
            stamina: '体力',
            mood: '心情'
          };
          // 背景九宫格
          var bg = Art.makeVisual("bar_" + name, 150, 26, color, (_barLabels$name = barLabels[name]) != null ? _barLabels$name : name);
          bg.parent = this.hudRoot;
          bg.setPosition(pos.x, pos.y, 0);

          // 填充节点
          var fill = uiNode('fill');
          fill.parent = bg;
          var fut = fill.addComponent(UITransform);
          fut.setContentSize(150, 26);
          var g = fill.addComponent(Graphics);
          var fillColor = color.clone();
          fillColor.a = 220;
          g.fillColor = fillColor;
          g.rect(-75, -13, 150, 26);
          g.fill();
          fill.setPosition(0, 0, 0);
          return fill;
        };
        _proto.updateHUD = function updateHUD() {
          if (!this.game) return;
          this.dayLabel.string = "\u7B2C " + this.game.day + " \u5929";
          // 分钟可能是小数（长按按秒推进），显示前取整并补零
          var totalMin = Math.max(0, Math.floor(this.game.minute));
          var hh = Math.floor(totalMin / 60) % 24;
          var mm = totalMin % 60;
          this.timeLabel.string = String(hh).padStart(2, '0') + ":" + String(mm).padStart(2, '0');
          this.moneyLabel.string = "\xA5 " + this.game.money.toFixed(2);
          Fx.barTo(this.hungerFill, this.game.hunger / CONFIG.maxHunger);
          Fx.barTo(this.staminaFill, this.game.stamina / this.game.maxStamina);
          Fx.barTo(this.moodFill, this.game.mood / CONFIG.maxMood);

          // 只有在地点页才显示回家体力；占卜/地图页不显示「回家需 0 体力」
          var showHomeCost = this.game.phase === 'location' && this.game.location != null;
          this.homeCostLabel.node.active = showHomeCost;
          if (showHomeCost) {
            var cost = this.game.homeCost();
            this.homeCostLabel.string = "\u56DE\u5BB6\u9700 " + cost + " \u4F53\u529B";
          }
        };
        _proto.refresh = function refresh() {
          if (!this.screenRoot) return;
          this.screenRoot.destroyAllChildren();
          // 地点视图的节点已随 screenRoot 一起销毁，指针置空，下面按当前 phase 重建
          this.locationView = null;
          this.updateHUD();
          switch (this.game.phase) {
            case 'fortune':
              this.showFortune();
              break;
            case 'map':
              this.showMap();
              break;
            case 'location':
              this.showLocation();
              break;
            case 'event':
              this.showEvent();
              break;
            case 'home':
              this.showHome();
              break;
            case 'collapsed':
              this.showCollapsed();
              break;
            case 'lost':
              this.showLost();
              break;
            case 'won':
              this.showWon();
              break;
          }
        }

        // -------------------- 占卜 --------------------
        ;

        _proto.showFortune = function showFortune() {
          var _this2 = this;
          var bg = Art.makeVisual('bg_fortune', 720, 1280, new Color(60, 40, 80, 255), '占卜');
          bg.parent = this.screenRoot;
          bg.setPosition(0, 0, 0);

          // 签筒原图 64×96，按 2 倍整数倍显示，避免拉伸
          var tube = Art.makeVisual('fortune_tube', 128, 192, new Color(180, 140, 100, 255), '签筒');
          tube.parent = this.screenRoot;
          tube.setPosition(0, 200, 0);

          // 摇晃动画
          tween(tube).to(0.2, {
            angle: -15
          }).to(0.2, {
            angle: 15
          }).to(0.2, {
            angle: -10
          }).to(0.2, {
            angle: 10
          }).to(0.3, {
            angle: 0
          }).union().repeat(1).call(function () {
            _this2.showFortuneSlip();
          }).start();
        };
        _proto.showFortuneSlip = function showFortuneSlip() {
          var _tierColors$this$game,
            _tierNames$this$game$,
            _this3 = this;
          if (!this.game.fortune) return;
          // 签纸原图 64×96，按 4 倍整数倍显示（256×384），不拉伸
          var slipW = 256;
          var slipH = 384;
          var slip = Art.makeVisual('fortune_slip', slipW, slipH, new Color(240, 230, 200, 255), '签面');
          slip.parent = this.screenRoot;
          slip.setPosition(0, -80, 0);

          // 签纸是米黄色，用深色字保证对比度
          var tierColors = {
            good: new Color(28, 96, 40, 255),
            meh: new Color(62, 58, 52, 255),
            bad: new Color(140, 30, 34, 255)
          };
          var color = (_tierColors$this$game = tierColors[this.game.fortune.tier]) != null ? _tierColors$this$game : new Color(255, 255, 255, 255);
          var tierNames = {
            good: '好签',
            meh: '平签',
            bad: '坏签'
          };
          var tierName = (_tierNames$this$game$ = tierNames[this.game.fortune.tier]) != null ? _tierNames$this$game$ : '签';
          var text = this.createWorldLabel("\u3010" + tierName + " \xB7 " + this.game.fortune.name + "\u3011\n" + this.game.fortune.text + (this.game.fortuneLocation ? "\n\u6307\u5B9A\u5730\u70B9\uFF1A" + this.locationName(this.game.fortuneLocation) : ''), 22, color, new Vec3(0, -80, 0), slipW - 28, slipH - 36);
          text.parent = this.screenRoot;
          var outline = text.addComponent(LabelOutline);
          outline.color = new Color(255, 250, 235, 255);
          outline.width = 2;
          var acceptBtn = this.createButton('就它了', 160, 60, new Vec3(-120, 0, 0), function () {
            _this3.game.acceptFortune();
            _this3.refresh();
          });
          acceptBtn.parent = this.screenRoot;
          alignBottom(acceptBtn, 70);
          var rerollCost = this.game.rerollCost();
          var rerollBtn = this.createButton("\u91CD\u62BD \xA5" + rerollCost.toFixed(0), 160, 60, new Vec3(120, 0, 0), function () {
            if (_this3.game.rerollFortune()) {
              _this3.showFortune(); // 重新显示签筒和签面
            } else {
              Fx.floatText(_this3.screenRoot, '钱不够', new Vec3(0, -500, 0), new Color(255, 80, 80, 255));
            }
          });
          if (this.game.money < rerollCost) {
            var _rerollBtn$getCompone;
            (_rerollBtn$getCompone = rerollBtn.getComponent(UIOpacity)) != null ? _rerollBtn$getCompone : rerollBtn.addComponent(UIOpacity);
            rerollBtn.getComponent(UIOpacity).opacity = 120;
          }
          rerollBtn.parent = this.screenRoot;
          alignBottom(rerollBtn, 70);
        }

        // -------------------- 地图 --------------------
        ;

        _proto.showMap = function showMap() {
          var _this4 = this;
          // 先铺满底色，地图横向缩放后两侧不会露黑边
          var mapBg = Art.makeVisual('map_bg', 720, 1280, new Color(100, 140, 100, 255));
          mapBg.parent = this.screenRoot;
          mapBg.setPosition(0, 0, 0);

          // 地图原图 360×640；标题单独画，不依赖占位图的 label
          var map = Art.makeVisual('map', 720, 1280, new Color(100, 140, 100, 255));
          map.parent = this.screenRoot;
          map.setPosition(0, 0, 0);

          // 竖屏 Fit Height 下两侧会被裁掉，地图横向缩到可视安全区
          var mapScaleX = Math.min(1, (UILayout.visibleW - 48) / 720);
          map.setScale(mapScaleX, 1, 1);

          // 标题放在顶栏下方，按钮再往下排，避免压住标题
          var titleY = UILayout.headerY - 150;
          var titleBg = uiNode('map_title_bg');
          titleBg.parent = this.screenRoot;
          var tbgUt = titleBg.addComponent(UITransform);
          tbgUt.setContentSize(260, 46);
          titleBg.setPosition(0, titleY, 0);
          var tbg = titleBg.addComponent(Graphics);
          tbg.fillColor = new Color(30, 35, 25, 170);
          tbg.roundRect(-130, -23, 260, 46, 10);
          tbg.fill();
          var title = this.createWorldLabel('深圳地图', 28, new Color(255, 245, 210, 255), new Vec3(0, titleY, 0), 260, 42);
          title.parent = this.screenRoot;

          // 地图上只给一条模糊的签文提示，不显示盒子数量/大小盒数量
          var fortune = this.game.fortune;
          var fortuneLoc = this.game.fortuneLocation;
          var mapHint = '';
          var hintColor = new Color(230, 230, 230, 255);
          if (fortune && fortuneLoc) {
            var locName = this.locationName(fortuneLoc);
            if (fortune.tier === 'good') {
              mapHint = locName + "\u4ECA\u5929\u597D\u50CF\u70ED\u95F9\u70B9";
              hintColor = new Color(150, 235, 150, 255);
            } else if (fortune.tier === 'bad') {
              mapHint = locName + "\u611F\u89C9\u4E0D\u592A\u5999";
              hintColor = new Color(255, 150, 150, 255);
            }
          } else if ((fortune == null ? void 0 : fortune.effect) === 'windy') {
            mapHint = '今天风大，出门好像不太顺';
            hintColor = new Color(255, 190, 120, 255);
          }
          if (mapHint) {
            var hintBg = uiNode('map_hint_bg');
            hintBg.parent = this.screenRoot;
            var hbUt = hintBg.addComponent(UITransform);
            hbUt.setContentSize(500, 40);
            var hbY = UILayout.bottom + 160;
            hintBg.setPosition(0, hbY, 0);
            var hbg = hintBg.addComponent(Graphics);
            hbg.fillColor = new Color(0, 0, 0, 145);
            hbg.roundRect(-250, -20, 500, 40, 12);
            hbg.fill();
            var hint = this.createWorldLabel(mapHint, 22, hintColor, new Vec3(0, hbY, 0), 480, 36);
            hint.parent = this.screenRoot;
          }
          var btnW = 140;
          var btnH = 68;
          var safeX = Math.max(80, UILayout.halfW - btnW / 2 - 4);

          // 先按地图点位算初始位置，再从上往下做一次避让，保证 8 个按钮互不重叠
          var raw = LOCATIONS.map(function (loc) {
            var point = MAP_POINTS[loc.id];
            var x = point ? Math.max(-safeX, Math.min(safeX, (point.x - 180) * 2 * mapScaleX)) : 0;
            var y = point ? (320 - point.y) * 2 : 0;
            return {
              id: loc.id,
              x: x,
              y: y
            };
          }).sort(function (a, b) {
            return b.y - a.y;
          });
          var placed = [];
          var positions = new Map();
          var titleBottom = titleY - 24;
          var limit = UILayout.bottom + 130;
          var _loop = function _loop() {
            var p = _step.value;
            var y = p.y;
            // 先避开标题，再避开已排好的按钮
            while (y + btnH / 2 > titleBottom && y > limit) y -= btnH + 8;
            while (y > limit && placed.some(function (q) {
              return Math.abs(q.x - p.x) < btnW + 8 && Math.abs(q.y - y) < btnH + 8;
            })) {
              y -= btnH + 8;
            }
            y = Math.max(y, limit);
            placed.push({
              x: p.x,
              y: y
            });
            positions.set(p.id, {
              x: p.x,
              y: y
            });
          };
          for (var _iterator = _createForOfIteratorHelperLoose(raw), _step; !(_step = _iterator()).done;) {
            _loop();
          }

          // 地点按钮（挂在 screenRoot，不继承地图的横向缩放，避免文字被压窄）
          var _loop2 = function _loop2() {
            var loc = _step2.value;
            var pos = positions.get(loc.id);
            if (!pos) return 1; // continue
            var cx = pos.x;
            var cy = pos.y;
            var banned = _this4.game.bannedToday.includes(loc.id);
            var travelCost = _this4.game.travelCost(loc.id);
            var isFortuneLoc = _this4.game.fortuneLocation === loc.id;

            // 地图上只显示地点和移动体力，不泄露盒子数量/战利品
            var btn = _this4.createButton(loc.name + "\n\u4F53\u529B " + travelCost, btnW, btnH, new Vec3(cx, cy, 0), function () {
              if (banned) {
                Fx.floatText(_this4.screenRoot, '今天被拉黑了', new Vec3(cx, cy + 60, 0), new Color(255, 80, 80, 255));
                return;
              }
              if (_this4.game.travel(loc.id)) {
                _this4.refresh();
              } else {
                Fx.floatText(_this4.screenRoot, '体力不足', new Vec3(cx, cy + 60, 0), new Color(255, 80, 80, 255));
              }
            }, 16);
            btn.parent = _this4.screenRoot;

            // 高亮签指定地点
            if (isFortuneLoc) {
              var glow = uiNode('fortune_glow');
              glow.parent = btn;
              var gut = glow.addComponent(UITransform);
              gut.setContentSize(btnW + 10, btnH + 10);
              var glowG = glow.addComponent(Graphics);
              glowG.strokeColor = new Color(255, 255, 150, 255);
              glowG.lineWidth = 4;
              glowG.rect(-(btnW + 10) / 2, -(btnH + 10) / 2, btnW + 10, btnH + 10);
              glowG.stroke();
              glow.setPosition(0, 0, 0);
            }

            // 被 banned 显示灰叉
            if (banned) {
              var cross = _this4.createLabel('cross', 30, new Color(180, 180, 180, 255), new Vec3(0, 0, 0), 40, 40);
              cross.string = '✕';
              cross.node.parent = btn;
            }
          };
          for (var _iterator2 = _createForOfIteratorHelperLoose(LOCATIONS), _step2; !(_step2 = _iterator2()).done;) {
            if (_loop2()) continue;
          }

          // 回家按钮
          var sideX = Math.min(200, UILayout.halfW - 66);
          var homeBtn = this.createButton('回家', 120, 56, new Vec3(-sideX, 0, 0), function () {
            if (_this4.game.goHome()) {
              _this4.refresh();
            } else {
              Fx.floatText(_this4.screenRoot, "\u4F53\u529B\u4E0D\u8DB3\uFF0C\u9700 " + _this4.game.homeCost(), new Vec3(0, -500, 0), new Color(255, 80, 80, 255));
            }
          });
          homeBtn.parent = this.screenRoot;
          alignBottom(homeBtn, 20);

          // 收工按钮
          var endBtn = this.createButton('收工', 120, 56, new Vec3(sideX, 0, 0), function () {
            _this4.game.endDayAway();
            _this4.refresh();
          });
          endBtn.parent = this.screenRoot;
          alignBottom(endBtn, 20);
        }

        // -------------------- 地点 --------------------
        ;

        _proto.showLocation = function showLocation() {
          var _this5 = this;
          if (!this.locationView) {
            this.locationView = new LocationView(this.screenRoot, this.game, function () {
              _this5.updateHUD();
              // 事件由 onEvent 打开 EventView；这里不要提前 refresh，否则会叠出两层事件界面
              if (_this5.game.phase === 'event') return;
              if (_this5.game.phase !== 'location') {
                _this5.refresh();
              }
            }, function (ev) {
              return _this5.handleEvent(ev);
            }, function () {
              return _this5.refresh();
            });
          }
          this.locationView.show();
        };
        _proto.handleEvent = function handleEvent(ev) {
          this.showEvent(ev);
        };
        _proto.showEvent = function showEvent(ev) {
          var _this6 = this;
          var pending = ev != null ? ev : this.game.currentEvent;
          if (!pending) return;
          // 保留地点背景在遮罩下面，事件结束后 refresh 统一重建
          EventView.show(this.screenRoot, this.game, pending, function () {
            // 被抓等事件清空背包时，先把地点页网格里的物品节点也清掉
            if (_this6.game.bag.length === 0) {
              var _this6$locationView;
              (_this6$locationView = _this6.locationView) == null || _this6$locationView.clearBagView();
            }
            _this6.refresh();
          });
        }

        // -------------------- 家 --------------------
        ;

        _proto.showHome = function showHome() {
          var _this7 = this;
          var bg = Art.makeVisual("home_" + this.game.homeLevel, 720, 1280, new Color(80, 80, 100, 255), '家');
          bg.parent = this.screenRoot;
          bg.setPosition(0, 0, 0);

          // 日结算卡
          if (this.game.lastDayReport) {
            var _report$bestItem;
            var report = this.game.lastDayReport;
            var card = Art.makeCard('card_day', 1280);
            card.parent = this.screenRoot;
            card.setPosition(0, 250, 0);
            var content = card.getChildByName('content');
            this.addCardText(content, 24, ["\u7B2C " + report.day + " \u5929\u7ED3\u7B97", "\u6536\u5165\uFF1A\xA5\xA0" + report.income.toFixed(2), "\u6700\u79BB\u8C31\uFF1A" + ((_report$bestItem = report.bestItem) != null ? _report$bestItem : '无'), "\u9971\u8179\u4F59\u91CF\uFF1A" + report.hungerLeft, "\u5410\u69FD\uFF1A" + report.quip], new Color(50, 50, 50, 255));
          }

          // 商店按钮
          var btnY = 100;
          var foodBtn = this.createButton("\u4E70\u5403\u7684 \xA5" + CONFIG.foodPrice, 200, 60, new Vec3(0, btnY, 0), function () {
            if (_this7.game.buyFood()) {
              _this7.updateHUD();
              Fx.floatText(_this7.screenRoot, '吃饱了', new Vec3(0, btnY + 40, 0), new Color(120, 255, 120, 255));
            } else {
              Fx.floatText(_this7.screenRoot, '钱不够', new Vec3(0, btnY + 40, 0), new Color(255, 80, 80, 255));
            }
          });
          foodBtn.parent = this.screenRoot;
          var bagNextCost = this.game.bagLevel < CONFIG.bagSizes.length - 1 ? CONFIG.bagSizes[this.game.bagLevel + 1].cost : null;
          var bagBtn = this.createButton(bagNextCost ? "\u6269\u80CC\u5305 \xA5" + bagNextCost : '背包已最大', 200, 60, new Vec3(0, btnY - 80, 0), function () {
            if (_this7.game.expandBag()) {
              _this7.updateHUD();
              Fx.floatText(_this7.screenRoot, '背包变大', new Vec3(0, btnY - 40, 0), new Color(120, 255, 120, 255));
            } else {
              Fx.floatText(_this7.screenRoot, '无法升级', new Vec3(0, btnY - 40, 0), new Color(255, 80, 80, 255));
            }
          });
          if (!bagNextCost) {
            var _bagBtn$getComponent;
            (_bagBtn$getComponent = bagBtn.getComponent(UIOpacity)) != null ? _bagBtn$getComponent : bagBtn.addComponent(UIOpacity);
            bagBtn.getComponent(UIOpacity).opacity = 120;
          }
          bagBtn.parent = this.screenRoot;
          var homeNextCost = this.game.homeLevel < CONFIG.homeLevels.length - 1 ? CONFIG.homeLevels[this.game.homeLevel + 1].cost : null;
          var upgradeHomeBtn = this.createButton(homeNextCost ? "\u5347\u7EA7\u843D\u811A\u70B9 \xA5" + homeNextCost : '落脚点已最好', 200, 60, new Vec3(0, btnY - 160, 0), function () {
            if (_this7.game.upgradeHome()) {
              _this7.updateHUD();
              Fx.floatText(_this7.screenRoot, '落脚点升级', new Vec3(0, btnY - 120, 0), new Color(120, 255, 120, 255));
            } else {
              Fx.floatText(_this7.screenRoot, '无法升级', new Vec3(0, btnY - 120, 0), new Color(255, 80, 80, 255));
            }
          });
          if (!homeNextCost) {
            var _upgradeHomeBtn$getCo;
            (_upgradeHomeBtn$getCo = upgradeHomeBtn.getComponent(UIOpacity)) != null ? _upgradeHomeBtn$getCo : upgradeHomeBtn.addComponent(UIOpacity);
            upgradeHomeBtn.getComponent(UIOpacity).opacity = 120;
          }
          upgradeHomeBtn.parent = this.screenRoot;

          // 睡觉按钮
          var sleepBtn = this.createButton('睡觉', 160, 60, new Vec3(0, btnY - 260, 0), /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
            return _regeneratorRuntime().wrap(function _callee3$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  // 先由逻辑层结算，UI 只读取 lastNightWarmth 决定是否播动画
                  _this7.game.sleep();
                  if (!_this7.game.lastNightWarmth) {
                    _context3.next = 4;
                    break;
                  }
                  _context3.next = 4;
                  return playNightWarmth(_this7.screenRoot);
                case 4:
                  _this7.refresh();
                case 5:
                case "end":
                  return _context3.stop();
              }
            }, _callee3);
          })));
          sleepBtn.parent = this.screenRoot;
        }

        // -------------------- 倒下 --------------------
        ;

        _proto.showCollapsed = function showCollapsed() {
          var _this8 = this;
          if (!this.game.lastCollapse) return;
          var collapse = this.game.lastCollapse;
          var bg = Art.makeVisual("sleep_" + collapse.spot, 720, 1280, new Color(70, 70, 70, 255), collapse.spotName);
          bg.parent = this.screenRoot;
          bg.setPosition(0, 0, 0);
          var card = Art.makeCard('card_fail', 1280);
          card.parent = this.screenRoot;
          card.setPosition(0, 0, 0);
          var content = card.getChildByName('content');
          this.addCardText(content, 24, ["" + collapse.spotName, "\u4E22\u4E86\uFF1A" + (collapse.lostItems.join('、') || '无'), "\u7B2C\u4E8C\u5929\u4F53\u529B\uFF1A" + collapse.staminaNextDay, collapse.text], new Color(50, 50, 50, 255));
          var wakeBtn = this.createButton('醒来', 160, 60, new Vec3(0, -380, 0), function () {
            _this8.game.wakeUp();
            _this8.refresh();
          });
          wakeBtn.parent = this.screenRoot;
        }

        // -------------------- 失败 --------------------
        ;

        _proto.showLost = function showLost() {
          var _this$game$lastDayRep,
            _this$game$lastDayRep2,
            _this9 = this;
          var card = Art.makeCard('card_fail', 1280);
          card.parent = this.screenRoot;
          card.setPosition(0, 100, 0);
          var content = card.getChildByName('content');
          this.addCardText(content, 24, ["\u4F60\u5728\u6DF1\u5733\u6D3B\u4E86 " + this.game.day + " \u5929", "\u6B7B\u56E0\uFF1A" + this.game.deathCause, "\u6700\u79BB\u8C31\u6536\u83B7\uFF1A" + ((_this$game$lastDayRep = (_this$game$lastDayRep2 = this.game.lastDayReport) == null ? void 0 : _this$game$lastDayRep2.bestItem) != null ? _this$game$lastDayRep : '无')], new Color(50, 50, 50, 255));
          var retryBtn = this.createButton('再来一局', 160, 60, new Vec3(-120, -320, 0), function () {
            _this9.game.startGame();
            _this9.refresh();
          });
          retryBtn.parent = this.screenRoot;
          var shareBtn = this.createButton('分享', 120, 60, new Vec3(120, -320, 0), function () {
            var wxAny = globalThis.wx;
            if (wxAny && typeof wxAny.shareAppMessage === 'function') {
              wxAny.shareAppMessage({
                title: "\u6211\u5728\u6DF1\u5733\u6D3B\u4E86 " + _this9.game.day + " \u5929"
              });
            } else {
              Fx.floatText(_this9.screenRoot, '当前环境不支持分享', new Vec3(0, -400, 0));
            }
          });
          shareBtn.parent = this.screenRoot;
        }

        // -------------------- 胜利 --------------------
        ;

        _proto.showWon = function showWon() {
          var _this10 = this;
          var card = Art.makeCard('card_cert', 1280);
          card.parent = this.screenRoot;
          card.setPosition(0, 80, 0);
          var content = card.getChildByName('content');
          var certId = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
          var dateStr = new Date().toLocaleDateString();
          this.addCardText(content, 22, ['深圳生存成功', "\u7F16\u53F7\uFF1A" + certId, "\u65E5\u671F\uFF1A" + dateStr, "\u603B\u6536\u5165\uFF1A\xA5" + this.game.totalIncome.toFixed(2)], new Color(50, 50, 50, 255));
          Fx.confetti(this.screenRoot);
          var retryBtn = this.createButton('再来一局', 160, 60, new Vec3(-90, 0, 0), function () {
            _this10.game.startGame();
            _this10.refresh();
          });
          retryBtn.parent = this.screenRoot;
          alignBottom(retryBtn, 90);
          var shareBtn = this.createButton('分享', 120, 60, new Vec3(110, 0, 0), function () {
            var wxAny = globalThis.wx;
            if (wxAny && typeof wxAny.shareAppMessage === 'function') {
              wxAny.shareAppMessage({
                title: '我在深圳活满了 15 天'
              });
            } else {
              Fx.floatText(_this10.screenRoot, '当前环境不支持分享', new Vec3(0, -420, 0));
            }
          });
          shareBtn.parent = this.screenRoot;
          alignBottom(shareBtn, 90);
        }

        // -------------------- 工具 --------------------
        ;

        _proto.createWorldLabel = function createWorldLabel(text, fontSize, color, pos, width, height) {
          var node = uiNode('label');
          var ut = node.addComponent(UITransform);
          ut.setContentSize(width, height);
          node.setPosition(pos.x, pos.y, pos.z || 0);
          var label = node.addComponent(Label);
          label.string = text;
          label.fontSize = fontSize;
          label.lineHeight = fontSize + 6;
          label.color = color;
          label.horizontalAlign = Label.HorizontalAlign.CENTER;
          label.verticalAlign = Label.VerticalAlign.CENTER;
          label.overflow = Label.Overflow.SHRINK;
          label.enableWrapText = true;
          return node;
        };
        _proto.createButton = function createButton(text, w, h, pos, onClick, fontSize) {
          var btn = Art.makeButton(text, w, h, onClick, fontSize);
          btn.setPosition(pos.x, pos.y, pos.z || 0);
          return btn;
        };
        _proto.addCardText = function addCardText(parent, fontSize, lines, color) {
          var textNode = this.createWorldLabel(lines.join('\n'), fontSize, color, Vec3.ZERO, 400, 400);
          textNode.parent = parent;
          textNode.setPosition(0, 0, 0);
        };
        _proto.locationName = function locationName(id) {
          var loc = LOCATIONS.find(function (l) {
            return l.id === id;
          });
          return loc ? loc.name : id;
        };
        return GameRoot;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/LocationView.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './config.ts', './placement.ts', './Art.ts', './Fx.ts', './UI.ts', './Sfx.ts'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, _asyncToGenerator, _regeneratorRuntime, cclegacy, _decorator, UITransform, Color, Label, LabelOutline, Vec3, Graphics, Node, tween, UIOpacity, Sprite, Component, LOCATIONS, CONFIG, ITEMS, bagCellCenter, positionForAnchor, Art, Fx, uiNode, alignBottom, UILayout, Sfx;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      UITransform = module.UITransform;
      Color = module.Color;
      Label = module.Label;
      LabelOutline = module.LabelOutline;
      Vec3 = module.Vec3;
      Graphics = module.Graphics;
      Node = module.Node;
      tween = module.tween;
      UIOpacity = module.UIOpacity;
      Sprite = module.Sprite;
      Component = module.Component;
    }, function (module) {
      LOCATIONS = module.LOCATIONS;
      CONFIG = module.CONFIG;
      ITEMS = module.ITEMS;
    }, function (module) {
      bagCellCenter = module.bagCellCenter;
      positionForAnchor = module.positionForAnchor;
    }, function (module) {
      Art = module.Art;
    }, function (module) {
      Fx = module.Fx;
    }, function (module) {
      uiNode = module.uiNode;
      alignBottom = module.alignBottom;
      UILayout = module.UILayout;
    }, function (module) {
      Sfx = module.Sfx;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "8a182s3p3tHQZFa7HW1PA4w", "LocationView", undefined);
      var ccclass = _decorator.ccclass;
      var CELL = 80;
      // 地面/背包图标都是 16px 原图 ×4 = 64px
      var FLOOR_ICON = 64;
      var FLOOR_PLATE = 72;
      var FLOOR_GLOW = 88;
      var BAG_ICON = 64;
      var BAG_PLATE = 72;
      var BAG_GLOW = 80;
      var SMALL_BOX = 96;
      var BIG_BOX = 144;
      var FLOOR_Y = -60;
      var BAG_Y = -300;
      var HOLD_UI_Y = -500;
      var BOX_Y = 330;
      var BOX_COLS = 3;

      /** 用于驱动按住每帧更新 */
      var LocationHoldUpdater = (_dec = ccclass('LocationHoldUpdater'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(LocationHoldUpdater, _Component);
        function LocationHoldUpdater() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.onTick = null;
          return _this;
        }
        var _proto = LocationHoldUpdater.prototype;
        _proto.update = function update(dt) {
          if (this.onTick) this.onTick(dt);
        };
        return LocationHoldUpdater;
      }(Component)) || _class);
      var LocationView = exports('LocationView', /*#__PURE__*/function () {
        function LocationView(root, game, onChanged, onEvent, onLeave) {
          this.root = void 0;
          this.game = void 0;
          this.onChanged = void 0;
          this.onEvent = void 0;
          this.onLeave = void 0;
          this.viewNode = null;
          this.boxContainer = null;
          this.floorContainer = null;
          this.bagContainer = null;
          this.holdUI = null;
          this.ringNode = null;
          this.ringGraphics = null;
          this.holdLabel = null;
          this.holdUpdater = null;
          this.boxNodes = new Map();
          this.floorNodes = new Map();
          this.bagNodes = new Map();
          this.holdBoxId = null;
          this.holdStartTime = 0;
          this.lastDebrisTime = 0;
          this.glowNode = null;
          this.edgeGlowOn = false;
          this.heroNode = null;
          this.bagGridNode = null;
          this.bagGridGraphics = null;
          this.hoverCell = null;
          this.badCells = [];
          this.badCellAlpha = 1;
          this.draggingUid = null;
          this.draggingNode = null;
          this.dragOffset = new Vec3();
          this.isDragging = false;
          this.potentialDrag = false;
          this.touchStartPos = new Vec3();
          this.touchStartTime = 0;
          this.floorRotated = new Map();
          this.menuNode = null;
          this.root = root;
          this.game = game;
          this.onChanged = onChanged;
          this.onEvent = onEvent;
          this.onLeave = onLeave;
        }
        var _proto2 = LocationView.prototype;
        _proto2.show = function show() {
          var _loc$name,
            _this2 = this;
          if (this.viewNode) this.hide();
          if (!this.game.location) return;
          this.viewNode = uiNode('LocationView');
          this.viewNode.parent = this.root;
          var ut = this.viewNode.addComponent(UITransform);
          ut.setContentSize(720, 1280);
          this.viewNode.setPosition(0, 0, 0);

          // 地点背景（按高度适配）
          var locId = this.game.location;
          var loc = LOCATIONS.find(function (l) {
            return l.id === locId;
          });
          var bgColor = new Color(110, 130, 100, 255);
          var bg = Art.makeVisual("bg_" + locId, 720, 1280, bgColor, (_loc$name = loc == null ? void 0 : loc.name) != null ? _loc$name : locId);
          bg.parent = this.viewNode;
          bg.setPosition(0, 0, 0);
          this.adaptBackgroundToHeight(bg, 1280);

          // 盒子区域
          this.boxContainer = uiNode('boxes');
          this.boxContainer.parent = this.viewNode;
          this.boxContainer.setPosition(0, BOX_Y, 0);
          var boxUt = this.boxContainer.addComponent(UITransform);
          boxUt.setContentSize(720, 300);

          // 待选区（地板）
          this.floorContainer = uiNode('floor');
          this.floorContainer.parent = this.viewNode;
          this.floorContainer.setPosition(0, FLOOR_Y, 0);
          var floorUt = this.floorContainer.addComponent(UITransform);
          floorUt.setContentSize(720, 220);

          // 背包格子区
          this.bagContainer = uiNode('bag');
          this.bagContainer.parent = this.viewNode;
          this.bagContainer.setPosition(0, BAG_Y, 0);
          var bagUt = this.bagContainer.addComponent(UITransform);
          bagUt.setContentSize(720, 360);
          this.createHint();
          this.createButtons();
          this.createHoldUI();
          this.renderBoxes();
          this.renderFloor();
          this.renderBag();
          this.holdUpdater = this.viewNode.addComponent(LocationHoldUpdater);
          this.holdUpdater.onTick = function (dt) {
            return _this2.updateHold(dt);
          };
        };
        _proto2.hide = function hide() {
          if (this.holdBoxId) this.stopHold(true);
          if (this.isDragging) this.cancelDrag();
          this.closeMenu();
          this.destroyHeroNode();
          if (this.viewNode) {
            this.viewNode.destroy();
            this.viewNode = null;
          }
          this.boxNodes.clear();
          this.floorNodes.clear();
          this.bagNodes.clear();
          this.floorRotated.clear();
          this.holdUpdater = null;
          this.ringNode = null;
          this.ringGraphics = null;
          this.holdLabel = null;
          this.glowNode = null;
          this.bagGridGraphics = null;
          this.bagGridNode = null;
          this.hoverCell = null;
          this.badCells = [];
          this.badCellAlpha = 1;
        }

        // ------------------------------------------------------------------
        // 构建按钮
        // ------------------------------------------------------------------
        ;

        _proto2.createHint = function createHint() {
          if (!this.viewNode) return;
          var hint = uiNode('hint');
          hint.parent = this.viewNode;
          var ut = hint.addComponent(UITransform);
          ut.setContentSize(520, 20);
          var lb = hint.addComponent(Label);
          lb.string = '拖动 / 单击物品放入背包';
          lb.fontSize = 16;
          lb.lineHeight = 20;
          // 提示字加深，并加浅色描边保证在深色背景上仍可读
          lb.color = new Color(58, 42, 24, 255);
          lb.horizontalAlign = Label.HorizontalAlign.CENTER;
          lb.verticalAlign = Label.VerticalAlign.CENTER;
          lb.overflow = Label.Overflow.SHRINK;
          var outline = hint.addComponent(LabelOutline);
          outline.color = new Color(255, 246, 220, 230);
          outline.width = 2;
          hint.setPosition(0, 42, 0);
        };
        _proto2.createButtons = function createButtons() {
          var _this3 = this;
          if (!this.viewNode) return;
          var sideX = Math.min(180, UILayout.halfW - 76);
          var leaveBtn = Art.makeButton('换地点', 140, 56, function () {
            _this3.game.leaveLocation();
            _this3.onLeave();
          });
          leaveBtn.parent = this.viewNode;
          leaveBtn.setPosition(-sideX, 0, 0);
          alignBottom(leaveBtn, 12);
          var homeBtn = Art.makeButton('回家', 140, 56, function () {
            var cost = _this3.game.homeCost();
            if (_this3.game.goHome()) {
              Fx.floatText(_this3.viewNode, "\u56DE\u5BB6\u6D88\u8017 " + cost + " \u4F53\u529B", new Vec3(0, -440, 0));
              _this3.onChanged();
            } else {
              Fx.floatText(_this3.viewNode, "\u4F53\u529B\u4E0D\u8DB3\uFF0C\u56DE\u5BB6\u9700 " + cost, new Vec3(0, -440, 0), new Color(255, 80, 80, 255));
            }
          });
          homeBtn.parent = this.viewNode;
          homeBtn.setPosition(sideX, 0, 0);
          alignBottom(homeBtn, 12);
        }

        // ------------------------------------------------------------------
        // 按住 UI
        // ------------------------------------------------------------------
        ;

        _proto2.createHoldUI = function createHoldUI() {
          if (!this.viewNode) return;
          this.holdUI = uiNode('hold_ui');
          this.holdUI.parent = this.viewNode;
          this.holdUI.setPosition(0, HOLD_UI_Y, 0);
          var hut = this.holdUI.addComponent(UITransform);
          hut.setContentSize(600, 100);

          // 进度环在外面围绕盒子绘制，这里只保留体力/消耗文字
          var labelNode = uiNode('label');
          var lut = labelNode.addComponent(UITransform);
          lut.setContentSize(500, 28);
          this.holdLabel = labelNode.addComponent(Label);
          this.holdLabel.string = '';
          this.holdLabel.fontSize = 20;
          this.holdLabel.lineHeight = 24;
          this.holdLabel.color = new Color(255, 255, 255, 255);
          this.holdLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
          this.holdLabel.verticalAlign = Label.VerticalAlign.CENTER;
          labelNode.parent = this.holdUI;
          labelNode.setPosition(0, -16, 0);
          this.holdUI.active = false;

          // 圆形进度环（围绕正在按的盒子）
          this.ringNode = uiNode('hold_ring');
          this.ringNode.parent = this.viewNode;
          var rUt = this.ringNode.addComponent(UITransform);
          rUt.setContentSize(220, 220);
          this.ringGraphics = this.ringNode.addComponent(Graphics);
          this.ringNode.setPosition(0, 0, 0);
          this.ringNode.active = false;
        }

        // ------------------------------------------------------------------
        // 渲染盒子
        // ------------------------------------------------------------------
        ;

        _proto2.boxSpacing = function boxSpacing() {
          // 安全区是 390/844 这类竖屏时，可视宽只有 ~592 设计单位
          var safeW = Math.min(720, UILayout.visibleW) - 40;
          var x = Math.max(120, Math.min(180, (safeW - BIG_BOX) / 2));
          return {
            x: x,
            y: 168
          };
        };
        _proto2.getBoxBasePosition = function getBoxBasePosition(index, total) {
          var row = Math.floor(index / BOX_COLS);
          var col = index % BOX_COLS;
          var inRow = Math.min(BOX_COLS, Math.max(0, total - row * BOX_COLS));
          var sp = this.boxSpacing();
          return new Vec3((col - (inRow - 1) / 2) * sp.x, -row * sp.y, 0);
        };
        _proto2.renderBoxes = function renderBoxes() {
          var _this4 = this;
          if (!this.boxContainer || !this.game.location) return;
          var boxes = this.game.boxesAt(this.game.location);
          boxes.forEach(function (box, idx) {
            var node = _this4.boxNodes.get(box.id);
            if (!node) {
              node = _this4.createBoxNode(box);
              _this4.boxNodes.set(box.id, node);
              node.parent = _this4.boxContainer;
              _this4.attachBoxTouch(node, box.id);
            }
            var base = _this4.getBoxBasePosition(idx, boxes.length);
            node.setPosition(base.x, base.y, 0);
            node.active = !box.opened;
          });
          var ids = new Set(boxes.map(function (b) {
            return b.id;
          }));
          for (var _iterator = _createForOfIteratorHelperLoose(this.boxNodes), _step; !(_step = _iterator()).done;) {
            var _step$value = _step.value,
              id = _step$value[0],
              node = _step$value[1];
            if (!ids.has(id)) {
              node.destroy();
              this.boxNodes["delete"](id);
            }
          }
        };
        _proto2.getBoxArtName = function getBoxArtName(box) {
          if (box.size === 'big') {
            // 解析盒子编号（id 格式：box_<location>_<index>）
            var parts = box.id.split('_');
            var idxStr = parts[parts.length - 1];
            var idx = parseInt(idxStr, 10);
            if (!isNaN(idx) && idx % 2 === 0) {
              return 'box_big_alt';
            }
            return 'box_big';
          }
          return 'box_small';
        };
        _proto2.createBoxNode = function createBoxNode(box) {
          var size = box.size === 'big' ? BIG_BOX : SMALL_BOX;
          var artName = this.getBoxArtName(box);
          var color = box.size === 'big' ? new Color(160, 120, 70, 255) : new Color(130, 100, 60, 255);
          var node = Art.makeVisual(artName, size, size, color, box.size === 'big' ? '大盒' : '小盒');
          // 确保初始播放正确的序列帧（若存在）
          Art.play(node, artName, 10, true);
          return node;
        };
        _proto2.attachBoxTouch = function attachBoxTouch(node, boxId) {
          var _this5 = this;
          node.on(Node.EventType.TOUCH_START, function (event) {
            return _this5.onBoxTouchStart(event, boxId);
          }, this);
          node.on(Node.EventType.TOUCH_END, function (event) {
            return _this5.onBoxTouchEnd(event, boxId);
          }, this);
          node.on(Node.EventType.TOUCH_CANCEL, function (event) {
            return _this5.onBoxTouchCancel(event, boxId);
          }, this);
        };
        _proto2.onBoxTouchStart = function onBoxTouchStart(event, boxId) {
          var _this6 = this;
          if (this.holdBoxId) return;
          var box = this.game.boxesAt(this.game.location).find(function (b) {
            return b.id === boxId;
          });
          if (!box || box.opened) return;
          var boxNode = this.boxNodes.get(boxId);
          this.holdBoxId = boxId;
          this.holdStartTime = Date.now();
          this.lastDebrisTime = Date.now();
          Fx.vibrateShort();
          this.holdUI.active = true;
          if (this.ringNode) this.ringNode.active = true;
          this.updateHold(0);

          // 播放按住抖动帧
          if (boxNode) {
            var artName = this.getBoxArtName(box);
            Art.play(boxNode, artName, 12, true);
          }

          // 创建主角挖掘动画
          if (boxNode && this.boxContainer) {
            this.destroyHeroNode();
            var heroNode = Art.makeVisual('hero_dig', 80, 80, new Color(180, 160, 120, 255));
            heroNode.parent = this.boxContainer;
            heroNode.setPosition(boxNode.position.x, boxNode.position.y - 120, 0);
            this.heroNode = heroNode;
          }
          if (this.holdUpdater) this.holdUpdater.onTick = function (dt) {
            return _this6.updateHold(dt);
          };
        };
        _proto2.onBoxTouchEnd = function onBoxTouchEnd(event, boxId) {
          if (this.holdBoxId === boxId) {
            this.stopHold(false);
          }
        };
        _proto2.onBoxTouchCancel = function onBoxTouchCancel(event, boxId) {
          if (this.holdBoxId === boxId) {
            this.stopHold(true);
          }
        };
        _proto2.destroyHeroNode = function destroyHeroNode() {
          if (this.heroNode && this.heroNode.isValid) {
            this.heroNode.destroy();
          }
          this.heroNode = null;
        };
        _proto2.stopHold = function stopHold(cancelled) {
          if (!this.holdBoxId) return;
          var boxId = this.holdBoxId;
          var holdSec = Math.min(CONFIG.maxHoldSec, (Date.now() - this.holdStartTime) / 1000);
          this.holdBoxId = null;
          this.holdStartTime = 0;
          if (this.holdUpdater) this.holdUpdater.onTick = null;
          this.holdUI.active = false;
          if (this.ringNode) this.ringNode.active = false;
          if (this.ringGraphics) this.ringGraphics.clear();
          this.clearHoldEffects();
          this.destroyHeroNode();
          if (!cancelled) {
            this.performDig(boxId, holdSec);
          }
        };
        _proto2.updateHold = function updateHold(dt) {
          if (!this.holdBoxId) return;
          var boxId = this.holdBoxId;
          var locId = this.game.location;
          var box = this.game.boxesAt(locId).find(function (b) {
            return b.id === boxId;
          });
          if (!box) return;
          var sec = Math.min(CONFIG.maxHoldSec, (Date.now() - this.holdStartTime) / 1000);
          var boxNode = this.boxNodes.get(boxId);
          if (!boxNode) return;

          // 抖动
          var strength = sec < 1 ? 4 : sec < 3 ? 10 : 16;
          var allBoxes = this.game.boxesAt(locId);
          var index = allBoxes.findIndex(function (b) {
            return b.id === boxId;
          });
          if (index === -1) return;
          var base = this.getBoxBasePosition(index, allBoxes.length);
          boxNode.setPosition(base.x + (Math.random() - 0.5) * strength, base.y + (Math.random() - 0.5) * strength, 0);

          // 碎纸片
          var now = Date.now();
          if (now - this.lastDebrisTime > 120) {
            this.lastDebrisTime = now;
            this.spawnDebris(boxNode.getWorldPosition());
          }

          // 光晕/进度环只跟按住时长走：白 -> 蓝 -> 金，长按不会出彩虹
          var glow = this.holdGlowByTime(sec);
          this.updateGlow(glow, boxNode.getWorldPosition());
          this.drawHoldRing(boxNode, box.size, sec, glow);
          var staminaCost = CONFIG.digStamina[box.size] + sec * CONFIG.holdStaminaPerSec;
          var remaining = this.game.stamina;
          if (this.holdLabel) {
            this.holdLabel.string = "\u5269\u4F59\u4F53\u529B " + remaining + " / \u672C\u6B21\u5C06\u6263 " + (staminaCost.toFixed == null ? void 0 : staminaCost.toFixed(1));
          }

          // 长按到金色才给屏幕边缘光；彩虹只在真正开出史诗时由开奖流程处理
          if (glow === 'gold') {
            if (!this.edgeGlowOn) {
              Fx.edgeGlow(this.root, new Color(255, 220, 100, 220), true);
              this.edgeGlowOn = true;
            }
          } else if (this.edgeGlowOn) {
            Fx.edgeGlow(this.root, new Color(255, 255, 255, 255), false);
            this.edgeGlowOn = false;
          }
        };
        _proto2.holdGlowByTime = function holdGlowByTime(sec) {
          if (sec >= 2.5) return 'gold';
          if (sec >= 1) return 'blue';
          return 'white';
        };
        _proto2.drawHoldRing = function drawHoldRing(boxNode, boxSize, sec, glow) {
          var _colors$glow;
          if (!this.viewNode || !this.ringNode || !this.ringGraphics) return;
          var local = this.viewNode.getComponent(UITransform).convertToNodeSpaceAR(boxNode.getWorldPosition());
          this.ringNode.setPosition(local.x, local.y, 0);
          var g = this.ringGraphics;
          g.clear();
          var radius = (boxSize === 'big' ? BIG_BOX : SMALL_BOX) / 2 + 12;
          var start = -Math.PI / 2;
          var ratio = Math.max(0, Math.min(1, sec / CONFIG.maxHoldSec));
          g.lineWidth = 6;
          g.lineCap = Graphics.LineCap.ROUND;
          g.strokeColor = new Color(0, 0, 0, 120);
          g.circle(0, 0, radius);
          g.stroke();
          var colors = {
            white: new Color(255, 255, 255, 230),
            blue: new Color(110, 190, 255, 240),
            gold: new Color(255, 215, 90, 255)
          };
          g.lineWidth = 5;
          g.strokeColor = (_colors$glow = colors[glow]) != null ? _colors$glow : colors.white;
          g.arc(0, 0, radius, start, start + ratio * Math.PI * 2, false);
          g.stroke();
        };
        _proto2.spawnDebris = function spawnDebris(worldPos) {
          var _this7 = this;
          if (!this.viewNode) return;
          var pieces = 3;
          var _loop = function _loop() {
            var n = uiNode('debris');
            n.parent = _this7.viewNode;
            var ut = n.addComponent(UITransform);
            var w = 8 + Math.random() * 10;
            ut.setContentSize(w, w);
            var g = n.addComponent(Graphics);
            g.fillColor = new Color(180, 160, 120, 255);
            g.rect(-w / 2, -w / 2, w, w);
            g.fill();
            var local = _this7.viewNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
            n.setPosition(local.x, local.y, 0);
            var angle = Math.random() * Math.PI * 2;
            var dist = 60 + Math.random() * 80;
            var target = new Vec3(local.x + Math.cos(angle) * dist, local.y + Math.sin(angle) * dist, 0);
            Fx.popArc(n, n.position.clone(), target, 0.5).then(function () {
              if (n.isValid) n.destroy();
            });
          };
          for (var i = 0; i < pieces; i++) {
            _loop();
          }
        };
        _proto2.updateGlow = function updateGlow(glow, worldPos) {
          var _colors$glow2;
          if (!this.viewNode) return;
          if (this.glowNode && this.glowNode.isValid) {
            this.glowNode.destroy();
            this.glowNode = null;
          }
          var colors = {
            white: new Color(255, 255, 255, 180),
            blue: new Color(100, 200, 255, 200),
            gold: new Color(255, 220, 80, 220),
            rainbow: new Color(255, 120, 255, 220)
          };
          var color = (_colors$glow2 = colors[glow]) != null ? _colors$glow2 : colors.white;
          this.glowNode = Art.makeVisual("glow_" + glow, 70, 70, color);
          this.glowNode.parent = this.viewNode;
          var local = this.viewNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
          this.glowNode.setPosition(local.x, local.y + 50, 0);
        };
        _proto2.clearHoldEffects = function clearHoldEffects() {
          if (this.glowNode && this.glowNode.isValid) {
            this.glowNode.destroy();
            this.glowNode = null;
          }
          if (this.edgeGlowOn) {
            Fx.edgeGlow(this.root, new Color(255, 255, 255, 255), false);
            this.edgeGlowOn = false;
          }
        }

        // ------------------------------------------------------------------
        // 挖盒子动画与结果处理
        // ------------------------------------------------------------------
        ;

        _proto2.performDig = /*#__PURE__*/
        function () {
          var _performDig = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(boxId, holdSec) {
            var _this8 = this;
            var boxNode, box, lidPop, result, boxWorld, hasRare, _loop2, _iterator2, _step2;
            return _regeneratorRuntime().wrap(function _callee$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  boxNode = this.boxNodes.get(boxId);
                  box = this.game.boxesAt(this.game.location).find(function (b) {
                    return b.id === boxId;
                  });
                  if (!(!boxNode || !box)) {
                    _context2.next = 4;
                    break;
                  }
                  return _context2.abrupt("return");
                case 4:
                  if (!(box.size === 'small')) {
                    _context2.next = 12;
                    break;
                  }
                  Fx.pulse(boxNode, 1.3, 0.15);
                  _context2.next = 8;
                  return Fx.freeze(0.2);
                case 8:
                  _context2.next = 10;
                  return Fx.fadeOut(boxNode, 0.2);
                case 10:
                  _context2.next = 27;
                  break;
                case 12:
                  Fx.pulse(boxNode, 1.5, 0.25);
                  _context2.next = 15;
                  return Fx.freeze(0.15);
                case 15:
                  if (!boxNode.parent) {
                    _context2.next = 23;
                    break;
                  }
                  lidPop = Art.makeVisual('lid_pop', BIG_BOX, BIG_BOX, new Color(200, 180, 120, 255));
                  lidPop.parent = boxNode.parent;
                  lidPop.setPosition(boxNode.position.x, boxNode.position.y, 0);
                  Art.play(lidPop, 'lid_pop', 10, false);
                  _context2.next = 22;
                  return Fx.freeze(0.6);
                case 22:
                  if (lidPop.isValid) lidPop.destroy();
                case 23:
                  _context2.next = 25;
                  return Fx.freeze(0.2);
                case 25:
                  _context2.next = 27;
                  return Fx.fadeOut(boxNode, 0.3);
                case 27:
                  boxNode.active = false;
                  result = this.game.dig(boxId, holdSec);
                  if (result.ok) {
                    _context2.next = 33;
                    break;
                  }
                  if (result.reason) {
                    Fx.floatText(this.viewNode, result.reason, new Vec3(0, 200, 0), new Color(255, 80, 80, 255));
                  }
                  this.onChanged();
                  return _context2.abrupt("return");
                case 33:
                  // 事故
                  if (result.mishap) {
                    this.spawnMishapEffect();
                    Fx.screenShake(this.root);
                  }

                  // 物品飞入待选区；每件稀有/史诗单独高亮 + 真冻结 0.3s
                  boxWorld = this.getBoxWorldPos(boxId);
                  hasRare = false;
                  _loop2 = /*#__PURE__*/_regeneratorRuntime().mark(function _loop2() {
                    var item, node, def;
                    return _regeneratorRuntime().wrap(function _loop2$(_context) {
                      while (1) switch (_context.prev = _context.next) {
                        case 0:
                          item = _step2.value;
                          _context.next = 3;
                          return _this8.spawnItemToFloor(item, boxWorld);
                        case 3:
                          node = _context.sent;
                          def = ITEMS.find(function (i) {
                            return i.id === item.itemId;
                          });
                          if (!(node && def && (def.rarity === 'rare' || def.rarity === 'epic'))) {
                            _context.next = 9;
                            break;
                          }
                          hasRare = true;
                          _context.next = 9;
                          return _this8.showRareReveal(node, def);
                        case 9:
                        case "end":
                          return _context.stop();
                      }
                    }, _loop2);
                  });
                  _iterator2 = _createForOfIteratorHelperLoose(result.items);
                case 38:
                  if ((_step2 = _iterator2()).done) {
                    _context2.next = 42;
                    break;
                  }
                  return _context2.delegateYield(_loop2(), "t0", 40);
                case 40:
                  _context2.next = 38;
                  break;
                case 42:
                  this.layoutFloor();

                  // 稀有/史诗开奖特效（冻结已在每件物品上做过）
                  if (result.glow === 'gold' || result.glow === 'rainbow') {
                    Fx.flash(this.root, result.glow === 'gold' ? new Color(255, 220, 150, 180) : new Color(255, 150, 255, 180));
                    Fx.screenShake(this.root);
                  }
                  if (!hasRare && result.quip) {
                    Fx.floatText(this.viewNode, result.quip, new Vec3(0, -40, 0));
                  }
                  this.onChanged();
                  if (result.event) {
                    this.onEvent(result.event);
                  } else if (result.collapsed) {
                    this.onChanged();
                  }
                case 47:
                case "end":
                  return _context2.stop();
              }
            }, _callee, this);
          }));
          function performDig(_x, _x2) {
            return _performDig.apply(this, arguments);
          }
          return performDig;
        }();
        _proto2.getBoxWorldPos = function getBoxWorldPos(boxId) {
          var node = this.boxNodes.get(boxId);
          if (!node) return new Vec3(0, 0, 0);
          return node.getWorldPosition();
        };
        _proto2.spawnMishapEffect = function spawnMishapEffect() {
          if (!this.viewNode) return;
          var isCat = Math.random() > 0.5;
          var node = Art.makeVisual(isCat ? 'npc_cat' : 'ev_rain', 80, 80, isCat ? new Color(120, 120, 120, 220) : new Color(100, 200, 100, 200), isCat ? '喵' : '绿烟');
          node.parent = this.viewNode;
          node.setPosition(0, 80, 0);
          Fx.shake(node, 12, 0.5);
          tween(node).delay(1.2).call(function () {
            return node.destroy();
          }).start();
        };
        _proto2.createPopFlash = function createPopFlash(parent, pos) {
          if (Art.frames('pop_flash').length > 0) {
            var fx = Art.makeVisual('pop_flash', 64, 64, Color.WHITE);
            fx.parent = parent;
            fx.setPosition(pos.x, pos.y, 0);
            Art.play(fx, 'pop_flash', 14, false);
            tween(fx).delay(0.45).call(function () {
              if (fx.isValid) fx.destroy();
            }).start();
            return;
          }
          var flash = uiNode('pop_flash_placeholder');
          flash.parent = parent;
          var ft = flash.addComponent(UITransform);
          ft.setContentSize(60, 60);
          var g = flash.addComponent(Graphics);
          g.fillColor = new Color(255, 255, 255, 220);
          g.circle(0, 0, 30);
          g.fill();
          flash.setPosition(pos.x, pos.y, 0);
          var op = flash.addComponent(UIOpacity);
          op.opacity = 255;
          tween(flash).to(0.15, {
            scale: new Vec3(1.5, 1.5, 1)
          }).start();
          tween(op).to(0.2, {
            opacity: 0
          }).call(function () {
            if (flash.isValid) flash.destroy();
          }).start();
        };
        _proto2.spawnItemToFloor = /*#__PURE__*/function () {
          var _spawnItemToFloor = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(item, fromWorld) {
            var _def$rarity, _this$floorRotated$ge;
            var def, color, node, floorLocalFrom, target, flashLocalPos;
            return _regeneratorRuntime().wrap(function _callee2$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  if (!(!this.floorContainer || !this.viewNode)) {
                    _context3.next = 2;
                    break;
                  }
                  return _context3.abrupt("return", null);
                case 2:
                  def = ITEMS.find(function (i) {
                    return i.id === item.itemId;
                  });
                  color = this.rarityColor((_def$rarity = def == null ? void 0 : def.rarity) != null ? _def$rarity : 'common');
                  node = this.createItemNode(item, def, color, 'floor');
                  floorLocalFrom = this.floorContainer.getComponent(UITransform).convertToNodeSpaceAR(fromWorld);
                  target = this.getFloorSlotPosition(this.game.floor.indexOf(item));
                  node.parent = this.floorContainer;
                  node.setPosition(floorLocalFrom.x, floorLocalFrom.y, 0);
                  node.angle = ((_this$floorRotated$ge = this.floorRotated.get(item.uid)) != null ? _this$floorRotated$ge : false) ? 90 : 0;
                  this.floorNodes.set(item.uid, node);
                  this.attachFloorTouch(node, item.uid);
                  _context3.next = 14;
                  return Fx.popArc(node, floorLocalFrom, target, 0.5);
                case 14:
                  // 物品弹出闪光 pop_flash（fx_item_pop 序列帧，缺图时退回代码闪光）
                  flashLocalPos = new Vec3(target.x, target.y, 0);
                  this.createPopFlash(this.floorContainer, flashLocalPos);
                  return _context3.abrupt("return", node);
                case 17:
                case "end":
                  return _context3.stop();
              }
            }, _callee2, this);
          }));
          function spawnItemToFloor(_x3, _x4) {
            return _spawnItemToFloor.apply(this, arguments);
          }
          return spawnItemToFloor;
        }() /** 稀有物品开奖：放大高亮 + 名称/吐槽面板 + 真冻结 0.3s。 */;
        _proto2.showRareReveal = /*#__PURE__*/
        function () {
          var _showRareReveal = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(node, def) {
            var viewUt, local, oldScale, color, panel, put, maxX, panelX, pg, textNode, tut, lb;
            return _regeneratorRuntime().wrap(function _callee3$(_context4) {
              while (1) switch (_context4.prev = _context4.next) {
                case 0:
                  if (!(!this.viewNode || !node.isValid)) {
                    _context4.next = 2;
                    break;
                  }
                  return _context4.abrupt("return");
                case 2:
                  viewUt = this.viewNode.getComponent(UITransform);
                  if (viewUt) {
                    _context4.next = 5;
                    break;
                  }
                  return _context4.abrupt("return");
                case 5:
                  local = viewUt.convertToNodeSpaceAR(node.getWorldPosition());
                  oldScale = node.scale.clone();
                  node.setScale(oldScale.x * 1.3, oldScale.y * 1.3, oldScale.z);
                  color = this.rarityColor(def.rarity);
                  panel = uiNode('rare_reveal');
                  panel.parent = this.viewNode;
                  put = panel.addComponent(UITransform);
                  put.setContentSize(360, 86);
                  maxX = Math.max(0, UILayout.halfW - 190);
                  panelX = Math.max(-maxX, Math.min(maxX, local.x));
                  panel.setPosition(panelX, local.y + 72, 0);
                  pg = panel.addComponent(Graphics);
                  pg.fillColor = new Color(0, 0, 0, 220);
                  pg.roundRect(-180, -43, 360, 86, 10);
                  pg.fill();
                  pg.lineWidth = 2;
                  pg.strokeColor = color;
                  pg.roundRect(-180, -43, 360, 86, 10);
                  pg.stroke();
                  textNode = uiNode('rare_text');
                  textNode.parent = panel;
                  tut = textNode.addComponent(UITransform);
                  tut.setContentSize(344, 78);
                  lb = textNode.addComponent(Label);
                  lb.string = def.name + "\n" + def.desc;
                  lb.fontSize = 20;
                  lb.lineHeight = 24;
                  lb.color = new Color(255, 250, 230, 255);
                  lb.horizontalAlign = Label.HorizontalAlign.CENTER;
                  lb.verticalAlign = Label.VerticalAlign.CENTER;
                  lb.overflow = Label.Overflow.SHRINK;
                  lb.enableWrapText = true;
                  textNode.setPosition(0, 0, 0);
                  _context4.next = 40;
                  return Fx.sceneFreeze(this.viewNode, 0.3);
                case 40:
                  if (panel.isValid) panel.destroy();
                  if (node.isValid) node.setScale(oldScale);
                case 42:
                case "end":
                  return _context4.stop();
              }
            }, _callee3, this);
          }));
          function showRareReveal(_x5, _x6) {
            return _showRareReveal.apply(this, arguments);
          }
          return showRareReveal;
        }();
        _proto2.createItemNode = function createItemNode(item, def, color, context) {
          var _def$rarity2, _def$rarity3, _glow$getComponent, _def$name;
          if (context === void 0) {
            context = 'floor';
          }
          var fallbackColor = color != null ? color : this.rarityColor((_def$rarity2 = def == null ? void 0 : def.rarity) != null ? _def$rarity2 : 'common');
          var isFloor = context === 'floor';
          var iconSize = isFloor ? FLOOR_ICON : BAG_ICON;
          var plateSize = isFloor ? FLOOR_PLATE : BAG_PLATE;
          var glowSize = isFloor ? FLOOR_GLOW : BAG_GLOW;
          var rarity = (_def$rarity3 = def == null ? void 0 : def.rarity) != null ? _def$rarity3 : 'common';
          var root = uiNode("item_" + item.itemId);
          var rut = root.addComponent(UITransform);
          rut.setContentSize(plateSize, plateSize);
          rut.setAnchorPoint(0.5, 0.5);
          // 透明命中层：保证容器本身可接收触摸
          var hit = root.addComponent(Graphics);
          hit.fillColor = new Color(0, 0, 0, 1);
          hit.rect(-plateSize / 2, -plateSize / 2, plateSize, plateSize);
          hit.fill();

          // 外围稀有度色光环，地面和背包统一复用 fx/glow_* 序列帧
          var glowInfo = this.rarityGlow(rarity);
          var glow = Art.makeVisual(glowInfo.name, glowSize, glowSize, glowInfo.color);
          glow.parent = root;
          glow.setPosition(0, 0, 0);
          var gsp = glow.getComponent(Sprite);
          if (gsp) gsp.color = glowInfo.color;
          var gop = (_glow$getComponent = glow.getComponent(UIOpacity)) != null ? _glow$getComponent : glow.addComponent(UIOpacity);
          gop.opacity = 220;

          // #000 alpha 0.55 的圆角底板
          var plate = uiNode('plate');
          plate.parent = root;
          var put = plate.addComponent(UITransform);
          put.setContentSize(plateSize, plateSize);
          var pg = plate.addComponent(Graphics);
          pg.fillColor = new Color(0, 0, 0, 140);
          pg.roundRect(-plateSize / 2, -plateSize / 2, plateSize, plateSize, 9);
          pg.fill();
          var icon = Art.makeVisual("icon_" + item.itemId, iconSize, iconSize, fallbackColor, (_def$name = def == null ? void 0 : def.name) != null ? _def$name : item.itemId);
          icon.parent = root;
          icon.setPosition(0, 0, 0);
          var iut = icon.getComponent(UITransform);
          if (iut) iut.setAnchorPoint(0.5, 0.5);

          // 1px 深色描边，压在图标边缘
          var outline = uiNode('outline');
          outline.parent = root;
          var outUt = outline.addComponent(UITransform);
          outUt.setContentSize(iconSize, iconSize);
          var og = outline.addComponent(Graphics);
          og.strokeColor = new Color(0, 0, 0, 220);
          og.lineWidth = 1;
          og.rect(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
          og.stroke();
          return root;
        };
        _proto2.rarityGlow = function rarityGlow(rarity) {
          switch (rarity) {
            case 'good':
              return {
                name: 'glow_blue',
                color: new Color(110, 190, 255, 255)
              };
            case 'rare':
              return {
                name: 'glow_gold',
                color: new Color(255, 210, 90, 255)
              };
            case 'epic':
              return {
                name: 'glow_rainbow',
                color: new Color(255, 255, 255, 255)
              };
            case 'mishap':
              return {
                name: 'glow_white',
                color: new Color(255, 130, 130, 255)
              };
            case 'common':
            default:
              return {
                name: 'glow_white',
                color: new Color(255, 255, 255, 255)
              };
          }
        };
        _proto2.rarityColor = function rarityColor(rarity) {
          switch (rarity) {
            case 'common':
              return new Color(170, 170, 170, 255);
            case 'good':
              return new Color(100, 200, 120, 255);
            case 'rare':
              return new Color(80, 160, 255, 255);
            case 'epic':
              return new Color(200, 100, 255, 255);
            case 'mishap':
              return new Color(220, 100, 100, 255);
            default:
              return new Color(200, 200, 200, 255);
          }
        };
        _proto2.getFloorSlotPosition = function getFloorSlotPosition(index) {
          var n = Math.max(1, this.game.floor.length);
          var perRow = 6;
          var row = Math.floor(index / perRow);
          var col = index % perRow;
          var inRow = Math.min(perRow, Math.max(1, n - row * perRow));
          var safeW = Math.min(720, UILayout.visibleW) - 56;
          // 地面图标 64 + 72 底板 + 88 光环，间距至少 92，避免相邻物品叠在一起
          var spacing = Math.max(92, Math.min(100, safeW / Math.max(1, inRow)));
          var x = (col - (inRow - 1) / 2) * spacing;
          return new Vec3(x, 50 - row * 88, 0);
        };
        _proto2.layoutFloor = function layoutFloor() {
          if (!this.floorContainer) return;
          var items = this.game.floor;
          for (var i = 0; i < items.length; i++) {
            var uid = items[i].uid;
            var node = this.floorNodes.get(uid);
            if (node) {
              var target = this.getFloorSlotPosition(i);
              tween(node).to(0.2, {
                position: target
              }).start();
            }
          }
        }

        // ------------------------------------------------------------------
        // 渲染待选区与背包
        // ------------------------------------------------------------------
        ;

        _proto2.renderFloor = function renderFloor() {
          var _this9 = this;
          if (!this.floorContainer) return;
          this.floorContainer.children.forEach(function (child) {
            return child.destroy();
          });
          this.floorNodes.clear();
          this.game.floor.forEach(function (item, idx) {
            var _this9$floorRotated$g;
            var def = ITEMS.find(function (i) {
              return i.id === item.itemId;
            });
            var node = _this9.createItemNode(item, def, undefined, 'floor');
            node.parent = _this9.floorContainer;
            var target = _this9.getFloorSlotPosition(idx);
            node.setPosition(target.x, target.y, 0);
            node.angle = ((_this9$floorRotated$g = _this9.floorRotated.get(item.uid)) != null ? _this9$floorRotated$g : false) ? 90 : 0;
            _this9.floorNodes.set(item.uid, node);
            _this9.attachFloorTouch(node, item.uid);
          });
        };
        _proto2.renderBag = function renderBag() {
          var _this10 = this;
          if (!this.bagContainer) return;
          this.bagContainer.children.forEach(function (child) {
            return child.destroy();
          });
          this.bagNodes.clear();

          // 创建格子背景节点（放在最底层）
          this.bagGridNode = uiNode('bag_grid');
          this.bagGridGraphics = this.bagGridNode.addComponent(Graphics);
          this.bagGridNode.parent = this.bagContainer;
          this.bagGridNode.setPosition(0, 0, 0);
          this.redrawBagCells();

          // 添加物品节点
          this.game.bag.forEach(function (placed) {
            var def = ITEMS.find(function (i) {
              return i.id === placed.itemId;
            });
            var node = _this10.createItemNode(placed, def, undefined, 'bag');
            node.parent = _this10.bagContainer;
            // 按实际占用方向旋转图标：1×2 竖放转 90°，2×1 横放保持 0°
            node.angle = (def == null ? void 0 : def.cells) === 2 && placed.h > placed.w ? 90 : 0;
            _this10.placeBagNode(node, placed.x, placed.y, placed.w, placed.h);
            _this10.bagNodes.set(placed.uid, node);
            _this10.attachBagTouch(node, placed.uid);
          });
        }

        /** 被抓等事件清空背包时，同步销毁 UI 里的物品节点。 */;
        _proto2.clearBagView = function clearBagView() {
          if (!this.bagContainer) return;
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.bagNodes.values()), _step3; !(_step3 = _iterator3()).done;) {
            var node = _step3.value;
            if (node && node.isValid) node.destroy();
          }
          this.bagNodes.clear();
          this.redrawBagCells();
        };
        _proto2.redrawBagCells = function redrawBagCells() {
          var _this11 = this;
          if (!this.bagGridGraphics || !this.bagGridNode) return;
          var g = this.bagGridGraphics;
          g.clear();
          var w = this.game.bagW;
          var h = this.game.bagH;
          var totalW = w * CELL;
          var totalH = h * CELL;
          var _loop3 = function _loop3(j) {
            var _loop4 = function _loop4(i) {
              var cx = -totalW / 2 + i * CELL + CELL / 2;
              var cy = totalH / 2 - j * CELL - CELL / 2;
              var state = 'normal';
              if (_this11.hoverCell && _this11.hoverCell.x === i && _this11.hoverCell.y === j) {
                state = 'hover';
              } else if (_this11.badCells.some(function (c) {
                return c.x === i && c.y === j;
              })) {
                state = 'bad';
              } else if (_this11.isCellOccupied(i, j)) {
                state = 'filled';
              }
              Art.drawCell(g, cx, cy, CELL, state, _this11.badCellAlpha);
            };
            for (var i = 0; i < w; i++) {
              _loop4(i);
            }
          };
          for (var j = 0; j < h; j++) {
            _loop3(j);
          }
        };
        _proto2.isCellOccupied = function isCellOccupied(cellX, cellY) {
          for (var _iterator4 = _createForOfIteratorHelperLoose(this.game.bag), _step4; !(_step4 = _iterator4()).done;) {
            var p = _step4.value;
            if (cellX >= p.x && cellX < p.x + p.w && cellY >= p.y && cellY < p.y + p.h) {
              return true;
            }
          }
          return false;
        };
        _proto2.placedToLocal = function placedToLocal(x, y, w, h) {
          var center = bagCellCenter(this.game.bagW, this.game.bagH, CELL, x, y, w, h);
          return new Vec3(center.x, center.y, 0);
        }

        /** 把节点放到占用格矩形的中心；按节点实际锚点和尺寸修正 position。 */;
        _proto2.placeBagNode = function placeBagNode(node, x, y, w, h) {
          var center = bagCellCenter(this.game.bagW, this.game.bagH, CELL, x, y, w, h);
          var ut = node.getComponent(UITransform);
          var anchor = ut ? ut.anchorPoint : {
            x: 0.5,
            y: 0.5
          };
          var size = ut ? ut.contentSize : {
            width: 48,
            height: 48
          };
          var pos = positionForAnchor(center, {
            x: anchor.x,
            y: anchor.y
          }, {
            width: size.width,
            height: size.height
          });
          node.setPosition(pos.x, pos.y, 0);
        };
        _proto2.attachFloorTouch = function attachFloorTouch(node, uid) {
          var _this12 = this;
          node.on(Node.EventType.TOUCH_START, function (event) {
            return _this12.onFloorTouchStart(event, uid);
          }, this);
          node.on(Node.EventType.TOUCH_MOVE, function (event) {
            return _this12.onFloorTouchMove(event, uid);
          }, this);
          node.on(Node.EventType.TOUCH_END, function (event) {
            return _this12.onFloorTouchEnd(event, uid);
          }, this);
          node.on(Node.EventType.TOUCH_CANCEL, function (event) {
            return _this12.onFloorTouchCancel(event, uid);
          }, this);
        };
        _proto2.attachBagTouch = function attachBagTouch(node, uid) {
          var _this13 = this;
          node.on(Node.EventType.TOUCH_START, function (event) {
            return _this13.onBagTouchStart(event, uid);
          }, this);
          node.on(Node.EventType.TOUCH_END, function (event) {
            return _this13.onBagTouchEnd(event, uid);
          }, this);
          node.on(Node.EventType.TOUCH_CANCEL, function (event) {
            return _this13.onBagTouchCancel(event, uid);
          }, this);
        }

        // ------------------------------------------------------------------
        // 待选区拖拽
        // ------------------------------------------------------------------
        ;

        _proto2.onFloorTouchStart = function onFloorTouchStart(event, uid) {
          var _this$viewNode;
          if (this.draggingUid !== null || this.holdBoxId) return;
          var node = this.floorNodes.get(uid);
          var viewUt = (_this$viewNode = this.viewNode) == null ? void 0 : _this$viewNode.getComponent(UITransform);
          if (!node || !this.viewNode || !viewUt) return;
          this.potentialDrag = true;
          this.isDragging = false;
          this.touchStartPos = this.getTouchLocal(event, this.viewNode);
          this.touchStartTime = Date.now();
          this.draggingUid = uid;
          this.draggingNode = node;

          // 偏移量统一在 viewNode 坐标系里算，避免拖拽时因父节点切换而跳位
          var nodeView = viewUt.convertToNodeSpaceAR(node.getWorldPosition());
          this.dragOffset = new Vec3(nodeView.x - this.touchStartPos.x, nodeView.y - this.touchStartPos.y, 0);
        };
        _proto2.onFloorTouchMove = function onFloorTouchMove(event, uid) {
          if (this.draggingUid !== uid || !this.potentialDrag && !this.isDragging || !this.viewNode || !this.draggingNode) return;
          var viewUt = this.viewNode.getComponent(UITransform);
          if (!viewUt) return;
          var touchView = this.getTouchLocal(event, this.viewNode);
          if (!this.isDragging && Vec3.distance(this.touchStartPos, touchView) > 16) {
            this.isDragging = true;
            this.potentialDrag = false;
            // 提升到 viewNode，避免被 floor 容器的位置/裁剪影响
            var local = viewUt.convertToNodeSpaceAR(this.draggingNode.getWorldPosition());
            this.draggingNode.setParent(this.viewNode);
            this.draggingNode.setPosition(local.x, local.y, 0);
            this.draggingNode.setSiblingIndex(this.viewNode.children.length - 1);
          }
          if (this.isDragging) {
            this.draggingNode.setPosition(touchView.x + this.dragOffset.x, touchView.y + this.dragOffset.y, 0);
            var cell = this.cellFromViewTouch(touchView);
            if (cell) {
              if (!this.hoverCell || this.hoverCell.x !== cell.x || this.hoverCell.y !== cell.y) {
                this.hoverCell = cell;
                this.redrawBagCells();
              }
            } else if (this.hoverCell) {
              this.hoverCell = null;
              this.redrawBagCells();
            }
          }
        };
        _proto2.onFloorTouchEnd = function onFloorTouchEnd(event, uid) {
          var _this14 = this;
          if (this.draggingUid !== uid) return;
          var wasDragging = this.isDragging;
          var node = this.draggingNode;
          this.draggingUid = null;
          this.draggingNode = null;
          this.potentialDrag = false;
          this.isDragging = false;
          this.hoverCell = null;
          this.redrawBagCells();
          if (!wasDragging) {
            // 单击打开菜单（菜单里有「放入背包」备用操作）
            this.showItemMenu(uid, false);
            return;
          }
          if (!node || !this.viewNode || !this.bagContainer) {
            this.renderFloor();
            return;
          }
          var touchView = this.getTouchLocal(event, this.viewNode);
          var dropResult = this.tryPlaceToBag(uid, touchView);
          if (dropResult.success) {
            Sfx.play('snap');
            if (node.isValid) node.destroy();
            Fx.floatText(this.viewNode, '咔', dropResult.pos, new Color(255, 255, 180, 255));
            this.renderFloor();
            this.renderBag();
            this.onChanged();
          } else {
            // 失败：目标格填红 0.4s，再淡出；物品弹回原位
            Sfx.play('bounce');
            this.badCells = dropResult.cells;
            this.badCellAlpha = 1;
            this.redrawBagCells();
            if (this.floorContainer) {
              node.setParent(this.floorContainer);
              tween(node).to(0.25, {
                position: dropResult.originalFloorPos
              }).start();
            }
            var fade = {
              v: 1
            };
            tween(fade).delay(0.4).to(0.2, {
              v: 0
            }, {
              onUpdate: function onUpdate() {
                _this14.badCellAlpha = fade.v;
                _this14.redrawBagCells();
              }
            }).call(function () {
              _this14.badCells = [];
              _this14.badCellAlpha = 1;
              _this14.redrawBagCells();
              _this14.renderFloor();
            }).start();
          }
        };
        _proto2.onFloorTouchCancel = function onFloorTouchCancel(event, uid) {
          if (this.draggingUid !== uid) return;
          this.cancelDrag();
        };
        _proto2.cancelDrag = function cancelDrag() {
          if (this.draggingNode && this.floorContainer) {
            this.draggingNode.setParent(this.floorContainer);
            var uid = this.draggingUid;
            if (uid != null) {
              var idx = this.game.floor.findIndex(function (i) {
                return i.uid === uid;
              });
              if (idx >= 0) {
                var target = this.getFloorSlotPosition(idx);
                tween(this.draggingNode).to(0.2, {
                  position: target
                }).start();
              }
            }
          }
          this.draggingUid = null;
          this.draggingNode = null;
          this.potentialDrag = false;
          this.isDragging = false;
          this.hoverCell = null;
          this.redrawBagCells();
        };
        _proto2.tryPlaceToBag = function tryPlaceToBag(uid, touchView) {
          var _this$floorRotated$ge2;
          var item = this.game.floor.find(function (i) {
            return i.uid === uid;
          });
          if (!item) return {
            success: false,
            cell: null,
            cells: [],
            pos: new Vec3(),
            originalFloorPos: new Vec3()
          };
          var def = ITEMS.find(function (i) {
            return i.id === item.itemId;
          });
          if (!def) return {
            success: false,
            cell: null,
            cells: [],
            pos: new Vec3(),
            originalFloorPos: new Vec3()
          };
          var rotated = (_this$floorRotated$ge2 = this.floorRotated.get(uid)) != null ? _this$floorRotated$ge2 : false;
          var cell = this.cellFromViewTouch(touchView);
          if (!cell) return {
            success: false,
            cell: null,
            cells: [],
            pos: new Vec3(),
            originalFloorPos: new Vec3()
          };
          var success = this.game.placeFromFloor(uid, cell.x, cell.y, rotated);
          if (!success && def.cells === 2) {
            // 大件拖到只放得下另一个方向的格子时，自动换方向再试一次
            success = this.game.placeFromFloor(uid, cell.x, cell.y, !rotated);
          }
          var placed = this.game.bag.find(function (p) {
            return p.uid === uid;
          });
          var pos = placed ? this.placedToLocal(placed.x, placed.y, placed.w, placed.h) : new Vec3();
          var originalIdx = this.game.floor.findIndex(function (i) {
            return i.uid === uid;
          });
          var originalFloorPos = originalIdx >= 0 ? this.getFloorSlotPosition(originalIdx) : new Vec3();
          var cells = this.placementCells(cell.x, cell.y, def.cells, rotated);
          return {
            success: success,
            cell: cell,
            cells: cells,
            pos: pos,
            originalFloorPos: originalFloorPos
          };
        };
        _proto2.placementCells = function placementCells(x, y, itemCells, rotated) {
          var w = itemCells === 2 ? rotated ? 1 : 2 : 1;
          var h = itemCells === 2 ? rotated ? 2 : 1 : 1;
          var cells = [];
          for (var dy = 0; dy < h; dy++) {
            for (var dx = 0; dx < w; dx++) {
              var cx = x + dx;
              var cy = y + dy;
              if (cx >= 0 && cy >= 0 && cx < this.game.bagW && cy < this.game.bagH) {
                cells.push({
                  x: cx,
                  y: cy
                });
              }
            }
          }
          return cells;
        }

        /** 备用操作：自动找第一个能放下的格子（优先当前旋转方向）。 */;
        _proto2.autoPlaceToBag = function autoPlaceToBag(uid) {
          var _this$floorRotated$ge3;
          var item = this.game.floor.find(function (i) {
            return i.uid === uid;
          });
          if (!item) return {
            ok: false,
            pos: new Vec3()
          };
          var def = ITEMS.find(function (i) {
            return i.id === item.itemId;
          });
          if (!def) return {
            ok: false,
            pos: new Vec3()
          };
          var preferred = (_this$floorRotated$ge3 = this.floorRotated.get(uid)) != null ? _this$floorRotated$ge3 : false;
          var rotations = def.cells === 2 ? [preferred, !preferred] : [false];
          for (var y = 0; y < this.game.bagH; y++) {
            for (var x = 0; x < this.game.bagW; x++) {
              for (var _iterator5 = _createForOfIteratorHelperLoose(rotations), _step5; !(_step5 = _iterator5()).done;) {
                var rotated = _step5.value;
                if (this.game.placeFromFloor(uid, x, y, rotated)) {
                  var placed = this.game.bag.find(function (p) {
                    return p.uid === uid;
                  });
                  var pos = placed ? this.placedToLocal(placed.x, placed.y, placed.w, placed.h) : new Vec3();
                  return {
                    ok: true,
                    pos: pos
                  };
                }
              }
            }
          }
          return {
            ok: false,
            pos: new Vec3()
          };
        };
        _proto2.cellFromViewTouch = function cellFromViewTouch(touchView) {
          if (!this.viewNode || !this.bagContainer) return null;
          var viewUt = this.viewNode.getComponent(UITransform);
          var bagUt = this.bagContainer.getComponent(UITransform);
          if (!viewUt || !bagUt) return null;
          var world = viewUt.convertToWorldSpaceAR(new Vec3(touchView.x, touchView.y, 0));
          var bagLocal = bagUt.convertToNodeSpaceAR(world);
          var totalW = this.game.bagW * CELL;
          var totalH = this.game.bagH * CELL;
          var startX = -totalW / 2;
          var startY = totalH / 2;
          var relX = bagLocal.x - startX;
          var relY = startY - bagLocal.y;
          if (relX < 0 || relY < 0 || relX >= totalW || relY >= totalH) return null;
          var x = Math.floor(relX / CELL);
          var y = Math.floor(relY / CELL);
          if (x < 0 || x >= this.game.bagW || y < 0 || y >= this.game.bagH) return null;
          return {
            x: x,
            y: y
          };
        }

        // ------------------------------------------------------------------
        // 背包物品点击
        // ------------------------------------------------------------------
        ;

        _proto2.onBagTouchStart = function onBagTouchStart(event, uid) {
          // 留空，避免事件穿透
        };
        _proto2.onBagTouchEnd = function onBagTouchEnd(event, uid) {
          if (this.draggingUid !== null) return;
          this.showItemMenu(uid, true);
        };
        _proto2.onBagTouchCancel = function onBagTouchCancel(event, uid) {
          // 留空
        }

        // ------------------------------------------------------------------
        // 物品菜单
        // ------------------------------------------------------------------
        ;

        _proto2.showItemMenu = function showItemMenu(uid, isBag) {
          var _this15 = this;
          this.closeMenu();
          if (!this.viewNode) return;
          var def;
          if (isBag) {
            var placed = this.game.bag.find(function (p) {
              return p.uid === uid;
            });
            def = placed ? ITEMS.find(function (i) {
              return i.id === placed.itemId;
            }) : undefined;
          } else {
            var item = this.game.floor.find(function (i) {
              return i.uid === uid;
            });
            def = item ? ITEMS.find(function (i) {
              return i.id === item.itemId;
            }) : undefined;
          }
          if (!def) return;
          var actions = [];
          if (isBag) {
            if (def.edible) {
              actions.push({
                text: '吃掉',
                tap: function tap() {
                  _this15.game.eat(uid);
                  _this15.closeMenu();
                  _this15.renderFloor();
                  _this15.renderBag();
                  _this15.onChanged();
                }
              });
            }
            actions.push({
              text: '拿出',
              tap: function tap() {
                _this15.game.moveToFloor(uid);
                _this15.closeMenu();
                _this15.renderFloor();
                _this15.renderBag();
                _this15.onChanged();
              }
            });
          } else {
            // 点击放入背包的备用操作：自动找第一个空格
            actions.push({
              text: '放入背包',
              tap: function tap() {
                var result = _this15.autoPlaceToBag(uid);
                if (result.ok) {
                  Sfx.play('snap');
                  _this15.closeMenu();
                  _this15.renderFloor();
                  _this15.renderBag();
                  _this15.onChanged();
                  Fx.floatText(_this15.viewNode, '咔', result.pos, new Color(255, 255, 180, 255));
                } else {
                  Sfx.play('bounce');
                  Fx.floatText(_this15.viewNode, '背包满了', new Vec3(0, 120, 0), new Color(255, 80, 80, 255));
                }
              }
            });
            if (def.edible) {
              actions.push({
                text: '吃掉',
                tap: function tap() {
                  _this15.game.eat(uid);
                  _this15.closeMenu();
                  _this15.renderFloor();
                  _this15.renderBag();
                  _this15.onChanged();
                }
              });
            }
            actions.push({
              text: '扔掉',
              tap: function tap() {
                _this15.game.discard(uid);
                _this15.closeMenu();
                _this15.renderFloor();
                _this15.onChanged();
              }
            });
            if (def.cells === 2) {
              var _this$floorRotated$ge4;
              var rotated = (_this$floorRotated$ge4 = this.floorRotated.get(uid)) != null ? _this$floorRotated$ge4 : false;
              actions.push({
                text: rotated ? '取消旋转' : '旋转',
                tap: function tap() {
                  _this15.floorRotated.set(uid, !rotated);
                  _this15.closeMenu();
                  _this15.renderFloor();
                }
              });
            }
          }
          var panelW = 280;
          var panelH = Math.max(200, 100 + actions.length * 56);
          var menu = uiNode('item_menu');
          menu.parent = this.viewNode;
          var mut = menu.addComponent(UITransform);
          mut.setContentSize(720, 1280);
          menu.setPosition(0, 0, 0);
          var dim = uiNode('dim');
          dim.parent = menu;
          var dut = dim.addComponent(UITransform);
          dut.setContentSize(720, 1280);
          var dg = dim.addComponent(Graphics);
          dg.fillColor = new Color(0, 0, 0, 130);
          dg.rect(-360, -640, 720, 1280);
          dg.fill();
          dim.on(Node.EventType.TOUCH_START, function () {
            return _this15.closeMenu();
          }, this);
          var panel = uiNode('panel');
          panel.parent = menu;
          var put = panel.addComponent(UITransform);
          put.setContentSize(panelW, panelH);
          panel.setPosition(0, 40, 0);
          var pg = panel.addComponent(Graphics);
          pg.fillColor = new Color(40, 40, 40, 240);
          pg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
          pg.fill();
          pg.strokeColor = new Color(200, 200, 200, 255);
          pg.lineWidth = 2;
          pg.stroke();
          var title = uiNode('title');
          var tut = title.addComponent(UITransform);
          tut.setContentSize(panelW - 20, 40);
          var tl = title.addComponent(Label);
          tl.string = def.name;
          tl.fontSize = 24;
          tl.lineHeight = 28;
          tl.color = new Color(255, 255, 255, 255);
          tl.horizontalAlign = Label.HorizontalAlign.CENTER;
          tl.verticalAlign = Label.VerticalAlign.CENTER;
          title.parent = panel;
          title.setPosition(0, panelH / 2 - 34, 0);
          var y = panelH / 2 - 84;
          for (var _i = 0, _actions = actions; _i < _actions.length; _i++) {
            var action = _actions[_i];
            var btn = Art.makeButton(action.text, 210, 44, action.tap, 20);
            btn.parent = panel;
            btn.setPosition(0, y, 0);
            y -= 56;
          }
          menu.setSiblingIndex(this.viewNode.children.length - 1);
          this.menuNode = menu;
        };
        _proto2.addMenuButton = function addMenuButton(parent, text, pos, onClick) {
          var btn = Art.makeButton(text, 210, 44, onClick, 20);
          btn.parent = parent;
          btn.setPosition(pos.x, pos.y, 0);
        };
        _proto2.closeMenu = function closeMenu() {
          if (this.menuNode && this.menuNode.isValid) {
            this.menuNode.destroy();
          }
          this.menuNode = null;
        }

        // ------------------------------------------------------------------
        // 工具方法
        // ------------------------------------------------------------------
        ;

        _proto2.getTouchLocal = function getTouchLocal(event, target) {
          var _target$getComponent;
          var uiLoc = event.getUILocation();
          var local = (_target$getComponent = target.getComponent(UITransform)) == null ? void 0 : _target$getComponent.convertToNodeSpaceAR(new Vec3(uiLoc.x, uiLoc.y, 0));
          return local != null ? local : new Vec3(0, 0, 0);
        }

        /** 按高度适配背景 Sprite（如果存在），保持宽高比并居中 */;
        _proto2.adaptBackgroundToHeight = function adaptBackgroundToHeight(bgNode, height) {
          var sprite = bgNode.getComponent(Sprite);
          if (!sprite || !sprite.spriteFrame) return;
          var frame = sprite.spriteFrame;
          var origSize = frame.originalSize;
          var origW = origSize.width;
          var origH = origSize.height;
          if (origW <= 0 || origH <= 0) return;
          var scale = height / origH;
          var newW = origW * scale;
          var ut = bgNode.getComponent(UITransform);
          if (ut) {
            ut.setContentSize(newW, height);
          }
          // 保持中心锚点不变，位置不变
        };

        return LocationView;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./GameRoot.ts', './config.ts', './game.ts', './placement.ts', './Art.ts', './ArtMap.ts', './EventView.ts', './Fx.ts', './LocationView.ts', './Sfx.ts', './UI.ts'], function () {
  return {
    setters: [null, null, null, null, null, null, null, null, null, null, null],
    execute: function () {}
  };
});

System.register("chunks:///_virtual/placement.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports({
        bagCellCenter: bagCellCenter,
        positionForAnchor: positionForAnchor
      });
      cclegacy._RF.push({}, "367c94ocGNMOZ03pZKFwWgw", "placement", undefined);
      /**
       * 背包格子摆放的纯数学工具（不依赖 Cocos，方便单测）。
       * 坐标系与 LocationView 的 bagContainer 本地坐标一致：原点在背包中心，y 向上。
       */
      /** 背包中 (x,y) 起、占 w×h 格的矩形中心。 */
      function bagCellCenter(bagW, bagH, cellSize, x, y, w, h) {
        var totalW = bagW * cellSize;
        var totalH = bagH * cellSize;
        return {
          x: -totalW / 2 + x * cellSize + w * cellSize / 2,
          y: totalH / 2 - y * cellSize - h * cellSize / 2
        };
      }

      /**
       * 已知节点锚点和节点尺寸时，把「视觉中心」对准 target 所需的节点 position。
       * Cocos 中 anchor=(0.5,0.5) 时 position 就是视觉中心；
       * anchor=(0,0) 时需要把节点往左下挪半个尺寸。
       */
      function positionForAnchor(target, anchor, size) {
        return {
          x: target.x + (anchor.x - 0.5) * size.width,
          y: target.y + (anchor.y - 0.5) * size.height
        };
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Sfx.ts", ['cc', './UI.ts'], function (exports) {
  var cclegacy, AudioSource, resources, AudioClip, uiNode;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      AudioSource = module.AudioSource;
      resources = module.resources;
      AudioClip = module.AudioClip;
    }, function (module) {
      uiNode = module.uiNode;
    }],
    execute: function () {
      cclegacy._RF.push({}, "9d41ayyKuVNspIYNmGQ7o3b", "Sfx", undefined);
      /** 极简音效播放器：AudioSource + resources/sfx/*.wav，失败时静默。 */
      var Sfx = exports('Sfx', /*#__PURE__*/function () {
        function Sfx() {}
        Sfx.init = function init(root) {
          if (this.source && this.source.isValid) return;
          var node = uiNode('sfx');
          node.parent = root;
          this.source = node.addComponent(AudioSource);
          this.load('snap');
          this.load('bounce');
        };
        Sfx.play = function play(name) {
          this.load(name);
          var clip = this.clips.get(name);
          if (!clip || !this.source || !this.source.isValid) return;
          try {
            this.source.playOneShot(clip, name === 'snap' ? 0.85 : 0.7);
          } catch (e) {
            // 某些平台首次触摸前播放会失败，忽略
          }
        };
        Sfx.load = function load(name) {
          var _this = this;
          if (this.clips.has(name) || this.loading.has(name)) return;
          this.loading.add(name);
          resources.load("sfx/" + name, AudioClip, function (err, clip) {
            _this.loading["delete"](name);
            if (!err && clip) _this.clips.set(name, clip);
          });
        };
        return Sfx;
      }());
      Sfx.source = null;
      Sfx.clips = new Map();
      Sfx.loading = new Set();
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/UI.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _createClass, cclegacy, Node, Layers, Widget, UITransform, view, sys;
  return {
    setters: [function (module) {
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
      Node = module.Node;
      Layers = module.Layers;
      Widget = module.Widget;
      UITransform = module.UITransform;
      view = module.view;
      sys = module.sys;
    }],
    execute: function () {
      exports({
        alignBottom: alignBottom,
        alignTop: alignTop,
        alignTopSide: alignTopSide,
        setSize: setSize,
        uiNode: uiNode
      });
      cclegacy._RF.push({}, "66080jO4ZhBebnRoSdUtS1I", "UI", undefined);

      /**
       * 新建 UI 节点：默认层是 DEFAULT，而 UI 相机只渲染 UI_2D，
       * 所有代码创建的节点都必须显式设置到 UI_2D 层，否则会黑屏/不可见。
       */
      function uiNode(name) {
        if (name === void 0) {
          name = 'node';
        }
        var node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        return node;
      }

      /** 竖屏安全区（设计分辨率 720×1280，Fit Height）换算。 */
      var UILayout = exports('UILayout', /*#__PURE__*/function () {
        function UILayout() {}
        UILayout.refresh = function refresh() {
          this.visibleW = 720;
          this.visibleH = 1280;
          this.safeTop = 0;
          this.safeBottom = 0;
          this.safeLeft = 0;
          this.safeRight = 0;
          this.capsuleBottom = 0;
          var vsW = 720;
          var vsH = 1280;
          var frameW = 720;
          var frameH = 1280;
          try {
            var vs = view.getVisibleSize();
            var frame = view.getFrameSize();
            if (vs && vs.width > 0 && vs.height > 0) {
              vsW = Math.min(720, vs.width);
              vsH = Math.min(1280, vs.height);
            }
            if (frame && frame.width > 0 && frame.height > 0) {
              frameW = frame.width;
              frameH = frame.height;
              // 项目设置为 720×1280 + Fit Height：
              // 实际可视宽度 = 屏幕宽 × 设计高 / 屏幕高，两侧会被裁掉
              var fitScale = frameH / 1280;
              if (fitScale > 0) {
                vsW = Math.min(720, frameW / fitScale);
                vsH = 1280;
              }
            }
            this.visibleW = vsW;
            this.visibleH = vsH;
          } catch (e) {
            // 非运行环境（如 tsc/单测）使用设计分辨率
          }

          // 微信右上角胶囊会挡住顶栏，取它的底部位置，把顶栏内容压到胶囊下方
          try {
            var wxAny = globalThis.wx;
            if (wxAny && typeof wxAny.getMenuButtonBoundingClientRect === 'function' && frameH > 0) {
              var rect = wxAny.getMenuButtonBoundingClientRect();
              if (rect && rect.bottom > 0) {
                // 胶囊 rect 是窗口 CSS 像素，用 wx 的窗口高度换算最稳
                var winH = frameH;
                try {
                  var info = typeof wxAny.getWindowInfo === 'function' ? wxAny.getWindowInfo() : wxAny.getSystemInfoSync == null ? void 0 : wxAny.getSystemInfoSync();
                  if (info && info.windowHeight > 0) winH = info.windowHeight;
                } catch (e) {
                  // 取不到就用 frameH
                }
                var scale = winH > 0 ? 1280 / winH : 1;
                this.capsuleBottom = Math.max(0, rect.bottom * scale);
              }
            }
          } catch (e) {
            // 非微信环境：忽略，顶栏按安全区排
          }
          try {
            // getSafeAreaRect 已经是设计分辨率单位，不要再乘屏幕像素比例
            var safe = sys.getSafeAreaRect();
            if (safe && safe.width > 0 && safe.height > 0) {
              var sw = Math.min(vsW, safe.width);
              var sh = Math.min(vsH, safe.height);
              this.safeTop = Math.max(0, vsH - (safe.y + sh));
              this.safeBottom = Math.max(0, safe.y);
              this.safeLeft = Math.max(0, safe.x);
              this.safeRight = Math.max(0, vsW - (safe.x + sw));
            }
          } catch (e) {
            // 忽略，按 0 安全区处理
          }
        }

        /** 设计坐标下的可视半宽（Fit Height 时两侧会被裁掉）。 */;
        _createClass(UILayout, null, [{
          key: "halfW",
          get: function get() {
            return Math.min(360, this.visibleW / 2);
          }
        }, {
          key: "top",
          get: function get() {
            return this.visibleH / 2 - this.safeTop;
          }

          /** 顶栏顶部需要避让的边距：刘海安全区与微信胶囊取较大值。 */
        }, {
          key: "headerTop",
          get: function get() {
            return Math.max(this.safeTop, this.capsuleBottom);
          }

          /** 顶栏起始 y（设计坐标，屏幕中心为 0）。 */
        }, {
          key: "headerY",
          get: function get() {
            return this.visibleH / 2 - this.headerTop;
          }
        }, {
          key: "bottom",
          get: function get() {
            return -this.visibleH / 2 + this.safeBottom;
          }
        }]);
        return UILayout;
      }());

      /** 贴底对齐（自动避开底部安全区），用于「换地点/回家/睡觉」等按钮。 */
      UILayout.visibleW = 720;
      UILayout.visibleH = 1280;
      UILayout.safeTop = 0;
      UILayout.safeBottom = 0;
      UILayout.safeLeft = 0;
      UILayout.safeRight = 0;
      /** 微信胶囊按钮底部（设计坐标，从屏幕顶部算）；非微信环境为 0 */
      UILayout.capsuleBottom = 0;
      function alignBottom(node, margin) {
        var _node$getComponent;
        if (margin === void 0) {
          margin = 20;
        }
        var widget = (_node$getComponent = node.getComponent(Widget)) != null ? _node$getComponent : node.addComponent(Widget);
        widget.isAlignBottom = true;
        widget.isAbsoluteBottom = true;
        widget.bottom = UILayout.safeBottom + margin;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        widget.updateAlignment();
        return widget;
      }

      /** 贴顶对齐，用于顶部状态栏。 */
      function alignTop(node, margin, xOffset) {
        var _node$getComponent2;
        if (margin === void 0) {
          margin = 12;
        }
        if (xOffset === void 0) {
          xOffset = 0;
        }
        var widget = (_node$getComponent2 = node.getComponent(Widget)) != null ? _node$getComponent2 : node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAbsoluteTop = true;
        widget.top = UILayout.headerTop + margin;
        widget.isAlignHorizontalCenter = true;
        widget.horizontalCenter = xOffset;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        widget.updateAlignment();
        return widget;
      }

      /** 顶部状态栏左/右贴边（自动避开刘海和可视区裁切）。 */
      function alignTopSide(node, side, margin) {
        var _node$getComponent3;
        if (margin === void 0) {
          margin = 12;
        }
        var widget = (_node$getComponent3 = node.getComponent(Widget)) != null ? _node$getComponent3 : node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAbsoluteTop = true;
        widget.top = UILayout.headerTop + margin;
        var crop = Math.max(0, (720 - UILayout.visibleW) / 2);
        if (side === 'left') {
          widget.isAlignLeft = true;
          widget.isAbsoluteLeft = true;
          widget.left = crop + UILayout.safeLeft + margin;
        } else {
          widget.isAlignRight = true;
          widget.isAbsoluteRight = true;
          widget.right = crop + UILayout.safeRight + margin;
        }
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        widget.updateAlignment();
        return widget;
      }

      /** 给节点补一个 UITransform 并设置尺寸（代码建节点常用）。 */
      function setSize(node, w, h) {
        var _node$getComponent4;
        var ut = (_node$getComponent4 = node.getComponent(UITransform)) != null ? _node$getComponent4 : node.addComponent(UITransform);
        ut.setContentSize(w, h);
        return ut;
      }
      cclegacy._RF.pop();
    }
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});