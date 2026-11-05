import { Color, Graphics, Label, Node, Tween, UIOpacity, UITransform, Vec3, tween, view } from 'cc';
import { Game, PendingEvent } from '../core/game';
import { Art } from './Art';
import { uiNode } from './UI';
import { Fx } from './Fx';

const COLORS: Record<string, Color> = {
  patrol: new Color(255, 210, 80, 255),
  guard: new Color(170, 180, 190, 255),
  rival: new Color(255, 90, 90, 255),
  auntie: new Color(255, 170, 90, 255),
  delivery: new Color(120, 200, 255, 255),
  wallet: new Color(250, 220, 100, 255),
  cat: new Color(180, 150, 120, 255),
  rain: new Color(120, 160, 220, 255),
};

export class EventView {
  public static show(root: Node, game: Game, ev: PendingEvent, done: () => void): void {
    const size = this.rootSize(root);
    // 遮罩先加、事件容器后加：遮罩在最底层，立绘/标题/选项都在它上面
    const dim = Fx.dimOverlay(root, 178); // 约 70% 不透明，保留地点背景轮廓
    // 遮罩挡住地点页的点击（事件按钮在遮罩上层，不受影响）
    dim.on(Node.EventType.TOUCH_START, (e: any) => e?.stopPropagation?.());
    dim.on(Node.EventType.TOUCH_END, (e: any) => e?.stopPropagation?.());
    const container = uiNode('EventView');
    container.parent = root;
    const ut = container.addComponent(UITransform);
    ut.setContentSize(size.width, size.height);
    container.setPosition(0, 0, 0);

    const stage = uiNode('ev_stage');
    stage.parent = container;
    const sut = stage.addComponent(UITransform);
    sut.setContentSize(size.width, size.height);
    stage.setPosition(0, 0, 0);

    this.playIntro(stage, game, ev, root)
      .then(async () => {
        const choice = await this.showOptions(stage, root, ev, game);
        // 关键：选项确定后立刻结算游戏状态，再播结果动画
        game.resolveEvent(choice.optionIndex, choice.minigameWin);
        await this.playResult(stage, root, game, ev, choice.optionIndex, choice.minigameWin, game.lastEventNotice);
        this.cleanup(dim, container);
        done();
      })
      .catch(() => {
        this.cleanup(dim, container);
        done();
      });
  }

  private static cleanup(dim: Node, container: Node): void {
    if (dim && dim.isValid) dim.destroy();
    if (container && container.isValid) container.destroy();
  }

  private static rootSize(root: Node): { width: number; height: number } {
    const ut = root.getComponent(UITransform);
    if (ut) return { width: ut.width, height: ut.height };
    const vs = view.getVisibleSize();
    return { width: vs.width, height: vs.height };
  }

  // ---------------- 开场 ----------------
  private static async playIntro(stage: Node, game: Game, ev: PendingEvent, root: Node): Promise<void> {
    const frames = Art.frames(`ev_${ev.id}`);
    if (frames.length > 0) {
      const stageUt = stage.getComponent(UITransform)!;
      const frame = frames[0];
      const fw = Math.max(1, frame.originalSize.width);
      const fh = Math.max(1, frame.originalSize.height);
      // 固定尺寸 + 整数倍放大，居中显示，禁止把 NPC 像素图拉满全屏
      const maxSide = Math.min(stageUt.width * 0.55, stageUt.height * 0.4, 256);
      const scale = Math.max(1, Math.floor(Math.min(maxSide / fw, maxSide / fh)));
      const visW = fw * scale;
      const visH = fh * scale;
      const vis = Art.makeVisual(`ev_${ev.id}`, visW, visH, COLORS[ev.id] || Color.WHITE);
      vis.parent = stage;
      vis.setPosition(0, 250, 0);
      // 事件名放在图上方的空白区，避免和下面的选项按钮叠在一起
      this.label(stage, ev.name, 28, 0, 250 + visH / 2 + 24);
      await Fx.freeze(1.5);
      return;
    }
    await this.handmadeIntro(stage, game, ev, root);
  }

  private static async handmadeIntro(stage: Node, game: Game, ev: PendingEvent, root: Node): Promise<void> {
    const w = stage.getComponent(UITransform)!.width;
    const h = stage.getComponent(UITransform)!.height;
    switch (ev.id) {
      case 'patrol': {
        this.block(stage, 'hero', 80, 120, new Color(90, 170, 255, 255), 0, -160);
        let light: Node;
        if (Art.frames('fx_flashlight').length > 0) {
          light = Art.makeVisual('fx_flashlight', 192, 192, Color.WHITE);
          light.parent = stage;
          Art.play(light, 'fx_flashlight', 8, true);
        } else {
          light = this.triangle(stage, 'torch', 180, 140, new Color(255, 235, 130, 220));
        }
        light.setPosition(-w / 2 - 200, 160, 0);
        tween(light).to(1.1, { position: new Vec3(w / 2 + 200, 160, 0) }).start();
        await Fx.freeze(0.2);
        const hero = stage.getChildByName('hero');
        if (hero) Fx.shake(hero, 6, 0.4);
        await Fx.freeze(1.1);
        this.label(stage, '手电光扫过', 30, -w / 2 + 20, h / 2 - 80);
        break;
      }
      case 'guard': {
        const gate = this.block(stage, 'gate', w - 160, 90, new Color(140, 150, 160, 255), 0, h / 2 + 100);
        tween(gate).to(0.6, { position: new Vec3(0, -80, 0) }, { easing: 'quadIn' }).call(() => Fx.screenShake(stage)).start();
        this.label(stage, '闸门落下「咔」', 30, 0, -220);
        await Fx.freeze(0.8);
        break;
      }
      case 'rival': {
        this.block(stage, 'player', 90, 130, new Color(90, 170, 255, 255), -180, -150);
        this.block(stage, 'rivalNpc', 90, 130, new Color(255, 110, 110, 255), 180, -150);
        if (Art.frames('fx_clash').length > 0) {
          const clash = Art.makeVisual('fx_clash', 192, 192, Color.WHITE);
          clash.parent = stage;
          clash.setPosition(0, -150, 0);
          Art.play(clash, 'fx_clash', 10, true);
        }
        const vs = this.label(stage, '对决', 42, 0, 60);
        const op = vs.addComponent(UIOpacity);
        op.opacity = 255;
        tween(op).to(0.25, { opacity: 60 }).to(0.25, { opacity: 255 }).union().repeat(4).start();
        await Fx.freeze(1.2);
        break;
      }
      case 'auntie': {
        const warmth = this.block(stage, 'warm_overlay', w, h, new Color(255, 180, 80, 200), 0, 0);
        warmth.setPosition(0, 0, 0);
        const op = warmth.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op).to(0.5, { opacity: 255 }).start();
        this.block(stage, 'lunchbox', 140, 100, new Color(220, 150, 90, 255), 0, -80);
        this.label(stage, '饭盒', 24, 0, -80);
        const steam = this.stripe(stage, 'steam', 8, 30, new Color(255, 255, 255, 220));
        steam.setPosition(0, 60, 0);
        tween(steam).by(0.8, { position: new Vec3(0, 60, 0) }, { easing: 'quadOut' }).start();
        this.block(stage, 'hero_face', 90, 100, new Color(90, 170, 255, 255), 0, -230);
        this.label(stage, '★_★', 32, 0, -230);
        await Fx.freeze(1.3);
        break;
      }
      case 'delivery': {
        const bike = this.block(stage, 'ebike', 150, 100, new Color(80, 150, 240, 255), w / 2 + 200, -100);
        tween(bike).to(0.7, { position: new Vec3(-120, -100, 0) }, { easing: 'quadOut' }).call(() => Fx.shake(bike, 8, 0.25)).start();
        await Fx.freeze(0.75);
        const bag = this.block(stage, 'deliv_bag', 100, 80, new Color(200, 160, 80, 255), -120, -100);
        bag.setPosition(-120, -100, 0);
        this.label(stage, '这单算你的', 28, 0, 120);
        await Fx.freeze(0.9);
        break;
      }
      case 'wallet': {
        const wallet = this.block(stage, 'wallet', 120, 100, new Color(220, 180, 70, 255), 0, -80);
        const op = wallet.addComponent(UIOpacity);
        op.opacity = 255;
        tween(op).to(0.2, { opacity: 100 }).to(0.2, { opacity: 255 }).union().repeat(3).start();
        await Fx.freeze(1.0);
        this.label(stage, '钱包闪光', 26, 0, 80);
        break;
      }
      case 'cat': {
        this.block(stage, 'box', 110, 90, new Color(150, 100, 70, 255), 0, -120);
        const cat = this.block(stage, 'cat', 80, 80, new Color(180, 150, 120, 255), 0, -120);
        cat.setPosition(0, -180, 0);
        tween(cat).to(0.5, { position: new Vec3(0, -80, 0) }, { easing: 'quadOut' }).start();
        await Fx.freeze(0.55);
        this.label(stage, '喵？', 26, 0, 30);
        await Fx.freeze(0.5);
        break;
      }
      case 'rain': {
        const bag = this.block(stage, 'plastic_bag', 90, 60, new Color(200, 220, 240, 180), 0, -230);
        const op = bag.addComponent(UIOpacity);
        op.opacity = 255;
        tween(op).to(0.4, { opacity: 180 }).to(0.4, { opacity: 255 }).repeat(2).start();
        this.label(stage, '下雨了', 28, 0, 120);
        await Fx.freeze(1.2);
        break;
      }
    }
  }

  // ---------------- 选项 ----------------
  private static async showOptions(stage: Node, root: Node, ev: PendingEvent, game: Game): Promise<{ optionIndex: number; minigameWin: boolean }> {
    const w = stage.getComponent(UITransform)!.width;
    const h = stage.getComponent(UITransform)!.height;
    const layer = uiNode('option_layer');
    layer.parent = stage;
    const lut = layer.addComponent(UITransform);
    lut.setContentSize(w, h);
    layer.setPosition(0, 0, 0);

    const buttons: Node[] = [];
    const numberOfOptions = ev.options.length;
    const btnW = 260;
    const btnH = 72;
    const gap = 28;
    const totalH = numberOfOptions * btnH + (numberOfOptions - 1) * gap;
    let y = totalH / 2 - btnH / 2;

    for (let i = 0; i < numberOfOptions; i++) {
      const idx = i;
      const btn = this.makeButton(layer, ev.options[i], btnW, btnH, () => {});
      btn.setPosition(0, y, 0);
      y -= (btnH + gap);
      buttons.push(btn);
    }

    return new Promise((resolve) => {
      buttons.forEach((btn, i) => {
        // 移除之前的占位回调后重新监听
        btn.off(Node.EventType.TOUCH_END);
        btn.on(Node.EventType.TOUCH_END, async (e: any) => {
          if (e && e.stopPropagation) e.stopPropagation();
          // 选项出现后先整层隐藏，避免结果文字压在按钮上
          layer.active = false;
          let minigameWin = false;
          if (ev.id === 'rival' && i === 1) {
            minigameWin = await this.runMinigame(stage, root);
          }
          resolve({ optionIndex: i, minigameWin });
        });
      });
    });
  }

  private static async runMinigame(stage: Node, root: Node): Promise<boolean> {
    const w = stage.getComponent(UITransform)!.width;
    const h = stage.getComponent(UITransform)!.height;
    const layer = uiNode('minigame');
    layer.parent = stage;
    const lut = layer.addComponent(UITransform);
    lut.setContentSize(w, h);
    layer.setPosition(0, 0, 0);

    const bg = this.rect(layer, 'mg_bg', w, h, new Color(20, 20, 30, 230));
    bg.setPosition(0, 0, 0);

    const title = this.label(layer, '狂点！', 40, 0, 150);
    const counter = this.label(layer, '0 次', 32, 0, 60);
    let count = 0;

    layer.on(Node.EventType.TOUCH_END, (e: any) => {
      if (e && e.stopPropagation) e.stopPropagation();
      count++;
      counter.getComponent(Label)!.string = `${count} 次`;
    });

    const start = Date.now();
    const duration = 3000;
    return new Promise<boolean>((resolve) => {
      const tick = setInterval(() => {
        const elapsed = Date.now() - start;
        if (elapsed >= duration) {
          clearInterval(tick);
          layer.active = false;
          layer.destroy();
          resolve(count >= 15);
        }
      }, 100);
    });
  }

  // ---------------- 结果动画 ----------------
  private static async playResult(stage: Node, root: Node, game: Game, ev: PendingEvent, optionIndex: number, minigameWin: boolean, notice?: string): Promise<void> {
    const w = stage.getComponent(UITransform)!.width;
    const artName = `ev_${ev.id}`;
    const artNode = stage.getChildByName(artName);

    switch (ev.id) {
      case 'patrol': {
        if (optionIndex === 0) {
          if (artNode) {
            tween(artNode).to(0.8, { position: new Vec3(-w / 2 - 160, artNode.position.y, 0) }).start();
          }
          this.showResult(stage, '礼貌离开');
          await Fx.freeze(1.0);
        } else {
          const success = Math.random() < 0.5;
          if (artNode) {
            tween(artNode)
              .to(0.7, { position: new Vec3(success ? w / 2 + 160 : 0, artNode.position.y, 0) })
              .start();
          }
          this.showResult(stage, notice || (success ? '大叔笑着走了' : '大叔指路请你走'));
          await Fx.freeze(0.9);
        }
        break;
      }
      case 'guard': {
        this.showResult(stage, notice || '被请出小区，背包被没收');
        await Fx.freeze(1.0);
        break;
      }
      case 'rival': {
        if (optionIndex === 0) {
          this.showResult(stage, '你认怂了');
          await Fx.freeze(1.0);
        } else if (minigameWin) {
          if (artNode) {
            tween(artNode).to(0.7, { position: new Vec3(w / 2 + 160, artNode.position.y, 0) }).start();
          }
          this.showResult(stage, '对方耸肩离开');
          await Fx.freeze(0.9);
        } else {
          if (artNode) {
            tween(artNode).to(0.3, { scale: new Vec3(0.7, 0.7, 1) }).start();
          }
          this.showResult(stage, '被压扁了');
          await Fx.freeze(1.0);
        }
        break;
      }
      case 'auntie': {
        this.showResult(stage, '吃饱了，心情也好了');
        await Fx.freeze(1.0);
        break;
      }
      case 'delivery': {
        this.showResult(stage, '收下外卖，饱腹恢复');
        await Fx.freeze(0.9);
        break;
      }
      case 'wallet': {
        if (artNode) {
          tween(artNode).to(0.3, { scale: new Vec3(1.2, 1.2, 1) }).to(0.3, { scale: Vec3.ONE }).start();
        }
        this.showResult(stage, '归还钱包，¥20 到手');
        await Fx.freeze(1.2);
        break;
      }
      case 'cat': {
        if (optionIndex === 0) {
          if (notice) {
            // 包里没有可喂的食物
            this.showResult(stage, notice);
          } else {
            if (artNode) {
              tween(artNode).to(0.4, { position: new Vec3(0, -60, 0) }).start();
            }
            this.showResult(stage, '猫跟着你，幸运 +3 次');
          }
        } else {
          this.showResult(stage, '喵~');
        }
        await Fx.freeze(1.0);
        break;
      }
      case 'rain': {
        this.showResult(stage, '下雨了，猫都躲起来了');
        await Fx.freeze(1.0);
        break;
      }
    }
  }

  /** 结果区：独立的底板 + 唯一一行文字，出现时选项和小游戏层已经隐藏/销毁。 */
  private static showResult(stage: Node, text: string): void {
    const panel = this.rect(stage, 'result_panel', 380, 66, new Color(18, 20, 28, 235));
    panel.setPosition(0, 60, 0);
    const lb = this.label(stage, text, 30, 0, 60);
    lb.setSiblingIndex(stage.children.length - 1);
  }

  // ---------------- 工具 ----------------
  private static block(parent: Node, name: string, w: number, h: number, color: Color, x: number, y: number): Node {
    const n = this.rect(parent, name, w, h, color);
    n.setPosition(x, y, 0);
    return n;
  }

  private static rect(parent: Node, name: string, w: number, h: number, color: Color): Node {
    const n = uiNode(name);
    n.parent = parent;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = color.clone();
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    return n;
  }

  private static triangle(parent: Node, name: string, w: number, h: number, color: Color): Node {
    const n = uiNode(name);
    n.parent = parent;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = color.clone();
    g.moveTo(-w / 2, -h / 2);
    g.lineTo(w / 2, 0);
    g.lineTo(-w / 2, h / 2);
    g.close();
    g.fill();
    return n;
  }

  private static stripe(parent: Node, name: string, w: number, h: number, color: Color): Node {
    const n = this.rect(parent, name, w, h, color);
    return n;
  }

  private static label(parent: Node, text: string, fontSize: number, x: number, y: number): Node {
    const n = uiNode('label');
    n.parent = parent;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(300, fontSize + 12);
    n.setPosition(x, y, 0);
    const lb = n.addComponent(Label);
    lb.string = text;
    lb.fontSize = fontSize;
    lb.lineHeight = fontSize + 6;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.color = new Color(255, 255, 255, 255);
    lb.overflow = Label.Overflow.SHRINK;
    return n;
  }

  private static makeButton(parent: Node, text: string, w: number, h: number, onClick: () => void): Node {
    const n = uiNode('ev_btn');
    n.parent = parent;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    const g = n.addComponent(Graphics);
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

    const lbNode = uiNode('lb');
    lbNode.parent = n;
    const lut = lbNode.addComponent(UITransform);
    lut.setContentSize(w, h);
    lbNode.setPosition(0, 0, 0);
    const lb = lbNode.addComponent(Label);
    lb.string = text;
    lb.fontSize = 30;
    lb.lineHeight = 34;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.color = new Color(255, 255, 255, 255);
    return n;
  }
}

export function playNightWarmth(root: Node): Promise<void> {
  return new Promise<void>((resolve) => {
    const size = EventView['rootSize'] ? (EventView as any).rootSize(root) : { width: view.getVisibleSize().width, height: view.getVisibleSize().height };
    const w = size.width;
    const h = size.height;
    const overlay = uiNode('warmth_overlay');
    overlay.parent = root;
    const out = overlay.addComponent(UITransform);
    out.setContentSize(w, h);
    overlay.setPosition(0, 0, 0);
    const g = overlay.addComponent(Graphics);
    g.fillColor = new Color(255, 180, 100, 220);
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    const op = overlay.addComponent(UIOpacity);
    op.opacity = 0;
    tween(op).to(0.6, { opacity: 255 }).start();

    const auntie = uiNode('auntie');
    auntie.parent = overlay;
    const aut = auntie.addComponent(UITransform);
    aut.setContentSize(120, 120);
    auntie.setPosition(0, -80, 0);
    const ag = auntie.addComponent(Graphics);
    ag.fillColor = new Color(230, 130, 70, 255);
    ag.rect(-60, -60, 120, 120);
    ag.fill();

    const bun = uiNode('bun');
    bun.parent = overlay;
    const but = bun.addComponent(UITransform);
    but.setContentSize(50, 40);
    bun.setPosition(0, 80, 0);
    const bg = bun.addComponent(Graphics);
    bg.fillColor = new Color(230, 200, 150, 255);
    bg.rect(-25, -20, 50, 40);
    bg.fill();

    const text = uiNode('warm_text');
    text.parent = overlay;
    const tut = text.addComponent(UITransform);
    tut.setContentSize(500, 80);
    text.setPosition(0, 160, 0);
    const tl = text.addComponent(Label);
    tl.string = '环卫阿姨塞给你一个热包子';
    tl.fontSize = 30;
    tl.lineHeight = 36;
    tl.horizontalAlign = Label.HorizontalAlign.CENTER;
    tl.verticalAlign = Label.VerticalAlign.CENTER;
    tl.color = new Color(255, 255, 255, 255);

    tween(op)
      .delay(1.8)
      .to(0.5, { opacity: 0 })
      .call(() => {
        overlay.destroy();
        resolve();
      })
      .start();
  });
}