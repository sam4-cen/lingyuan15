import {
  Color,
  Graphics,
  Label,
  Node,
  Tween,
  UIOpacity,
  UITransform,
  Vec3,
  tween,
  view,
  director,
} from 'cc';
import { uiNode } from './UI';

/**
 * Fx —— 纯代码缓动 / 特效工具。
 * 所有节点都是 uiNode() 现造，父节点由调用方（GameRoot / 各 View）传入。
 * 不依赖 prefab、不依赖场景里预先摆放的任何东西。
 */
export class Fx {
  // ---------------------------------------------------------------- 抖动
  /** 小幅左右/上下抖动 */
  static shake(node: Node, strength: number = 10, duration: number = 0.3): void {
    if (!node || !node.isValid) return;
    Tween.stopAllByTarget(node);
    const base = node.position.clone();
    const steps = 6;
    const seg = Math.max(0.016, duration / (steps + 1));
    let tw = tween(node);
    for (let i = 0; i < steps; i++) {
      const k = strength * (1 - i / steps);
      tw = tw.to(seg, {
        position: new Vec3(
          base.x + (Math.random() * 2 - 1) * k,
          base.y + (Math.random() * 2 - 1) * k,
          base.z,
        ),
      });
    }
    tw.to(seg, { position: base }).start();
  }

  /** 整屏震一下（一般给 Canvas 根节点） */
  static screenShake(root: Node): void {
    if (!root || !root.isValid) return;
    Fx.shake(root, 18, 0.4);
  }

  /** 鼓一下再回来 */
  static pulse(node: Node, scale: number = 1.12, duration: number = 0.12): void {
    if (!node || !node.isValid) return;
    Tween.stopAllByTarget(node);
    const base = node.scale.clone();
    const half = Math.max(0.03, duration / 2);
    tween(node)
      .to(half, { scale: new Vec3(base.x * scale, base.y * scale, base.z) })
      .to(half, { scale: base })
      .start();
  }

  // ---------------------------------------------------------------- 抛物线
  /** 从 from 抛物线飞到 to（x 线性、y 叠加一个正弦拱高） */
  static popArc(node: Node, from: Vec3, to: Vec3, duration: number = 0.45): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      // 节点被销毁时 tween 可能不再回调，超时兜底避免 async 流程卡住
      setTimeout(finish, Math.max(0.05, duration) * 1000 + 120);
      if (!node || !node.isValid) {
        finish();
        return;
      }
      const fz = from.z || 0;
      const tz = to.z || 0;
      node.setPosition(from.x, from.y, fz);
      const arc = Math.max(60, Math.min(240, Math.abs(to.x - from.x) * 0.35 + 60));
      const state = { t: 0 };
      tween(state)
        .to(
          Math.max(0.05, duration),
          { t: 1 },
          {
            onUpdate: () => {
              if (!node || !node.isValid) return;
              const t = state.t;
              const x = from.x + (to.x - from.x) * t;
              const y = from.y + (to.y - from.y) * t + Math.sin(Math.PI * t) * arc;
              node.setPosition(x, y, fz + (tz - fz) * t);
            },
          },
        )
        .call(() => {
          if (node && node.isValid) node.setPosition(to.x, to.y, tz);
          finish();
        })
        .start();
    });
  }

  // ---------------------------------------------------------------- 时间
  /** 普通等待（不暂停场景），用于动画节奏。 */
  static freeze(seconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const state = { t: 0 };
      tween(state)
        .delay(Math.max(0, seconds))
        .call(() => resolve())
        .start();
    });
  }

  /**
   * 真冻结：暂停 director 的 tween/scheduler，并盖一层输入拦截 0.3s。
   * 用 setTimeout 计时，避免 tween 被自己暂停。
   */
  static sceneFreeze(root: Node, seconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!root || !root.isValid) {
        resolve();
        return;
      }
      const block = uiNode('fx_freeze_block');
      block.parent = root;
      const ut = block.addComponent(UITransform);
      const size = root.getComponent(UITransform);
      const w = size ? size.width : view.getVisibleSize().width;
      const h = size ? size.height : view.getVisibleSize().height;
      ut.setContentSize(w, h);
      const g = block.addComponent(Graphics);
      g.fillColor = new Color(0, 0, 0, 1);
      g.rect(-w / 2, -h / 2, w, h);
      g.fill();
      block.setPosition(0, 0, 0);
      block.on(Node.EventType.TOUCH_START, (e: any) => e?.stopPropagation?.());
      block.on(Node.EventType.TOUCH_END, (e: any) => e?.stopPropagation?.());
      block.setSiblingIndex(root.children.length - 1);

      try {
        director.pause();
      } catch (e) {
        if (block && block.isValid) block.destroy();
        director.resume();
        resolve();
        return;
      }
      setTimeout(() => {
        if (block && block.isValid) block.destroy();
        // 即使视图在冻结期间被销毁，也一定要恢复 director/输入
        director.resume();
        resolve();
      }, Math.max(0, seconds) * 1000);
    });
  }

  // ---------------------------------------------------------------- 闪屏 / 光晕
  /** 全屏闪一下颜色（默认白） */
  static flash(root: Node, color: Color = new Color(255, 255, 255, 150), duration: number = 0.35): void {
    if (!root || !root.isValid) return;
    const size = view.getVisibleSize();
    const w = size.width;
    const h = size.height;
    const n = uiNode('fx_flash');
    n.parent = root;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = color ? color.clone() : new Color(255, 255, 255, 150);
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    const op = n.addComponent(UIOpacity);
    op.opacity = 255;
    tween(op)
      .to(Math.max(0.05, duration), { opacity: 0 })
      .call(() => {
        if (n && n.isValid) n.destroy();
      })
      .start();
  }

  /** 屏幕四边呼吸光晕。on=false 时移除 */
  static edgeGlow(root: Node, color: Color, on: boolean): void {
    if (!root || !root.isValid) return;
    const NAME = 'fx_edge_glow';
    const old = root.getChildByName(NAME);
    if (old) {
      Tween.stopAllByTarget(old);
      old.destroy();
    }
    if (!on) return;

    const size = view.getVisibleSize();
    const w = size.width;
    const h = size.height;
    const t = 18;

    const n = uiNode(NAME);
    n.parent = root;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    n.setPosition(0, 0, 0);

    const g = n.addComponent(Graphics);
    g.fillColor = color ? color.clone() : new Color(255, 220, 120, 200);
    g.rect(-w / 2, h / 2 - t, w, t);
    g.fill();
    g.rect(-w / 2, -h / 2, w, t);
    g.fill();
    g.rect(-w / 2, -h / 2, t, h);
    g.fill();
    g.rect(w / 2 - t, -h / 2, t, h);
    g.fill();

    const op = n.addComponent(UIOpacity);
    op.opacity = 130;
    tween(op)
      .to(0.45, { opacity: 255 })
      .to(0.45, { opacity: 130 })
      .union()
      .repeatForever()
      .start();
  }

  // ---------------------------------------------------------------- 淡入淡出
  static fadeIn(node: Node, duration: number = 0.3): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!node || !node.isValid) {
        resolve();
        return;
      }
      const op = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
      op.opacity = 0;
      tween(op)
        .to(Math.max(0.01, duration), { opacity: 255 })
        .call(() => resolve())
        .start();
    });
  }

  static fadeOut(node: Node, duration: number = 0.3): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      setTimeout(finish, Math.max(0.01, duration) * 1000 + 120);
      if (!node || !node.isValid) {
        finish();
        return;
      }
      const op = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
      op.opacity = 255;
      tween(op)
        .to(Math.max(0.01, duration), { opacity: 0 })
        .call(finish)
        .start();
    });
  }

  // ---------------------------------------------------------------- 遮罩
  /** 全屏半透明黑遮罩，返回节点，用完自己 destroy */
  static dimOverlay(root: Node, alpha: number = 175): Node {
    const size = view.getVisibleSize();
    const w = size.width;
    const h = size.height;
    const n = uiNode('fx_dim');
    n.parent = root;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    n.setPosition(0, 0, 0);
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, Math.max(0, Math.min(255, Math.round(alpha))));
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    const op = n.addComponent(UIOpacity);
    op.opacity = 0;
    tween(op)
      .to(0.18, { opacity: 255 })
      .start();
    return n;
  }

  // ---------------------------------------------------------------- 漂浮文字
  /** 飘字：从 pos 向上飘并淡出 */
  static floatText(root: Node, text: string, pos: Vec3, color?: Color): Node {
    const n = uiNode('fx_float_text');
    n.parent = root;
    n.setPosition(pos ? pos.x : 0, pos ? pos.y : 0, pos ? pos.z || 0 : 0);

    const ut = n.addComponent(UITransform);
    ut.setContentSize(240, 40);
    ut.setAnchorPoint(0.5, 0.5);

    const label = n.addComponent(Label);
    label.string = text;
    label.fontSize = 28;
    label.lineHeight = 32;
    label.color = color ? color.clone() : new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    const op = n.addComponent(UIOpacity);
    op.opacity = 255;

    const rise = 70;
    tween(n)
      .by(1.0, { position: new Vec3(0, rise, 0) }, { easing: 'quadOut' })
      .start();
    tween(op)
      .delay(0.45)
      .to(0.55, { opacity: 0 })
      .call(() => {
        if (n && n.isValid) n.destroy();
      })
      .start();
    return n;
  }

  // ---------------------------------------------------------------- 进度条
  /**
   * 把 barNode 的显示比例设为 ratio(0~1)。
   * 支持两种条：
   *  - 节点带 Graphics：清空后按左对齐重画一个矩形（宽度按初始宽 * ratio）；
   *  - 节点无 Graphics（纯 Sprite/纯色块）：改 UITransform 宽度并补偿锚点位移。
   */
  static barTo(barNode: Node, ratio: number): void {
    if (!barNode || !barNode.isValid) return;
    const ut = barNode.getComponent(UITransform);
    if (!ut) return;

    let full: number = (barNode as any).__fxFull as number;
    let height: number = (barNode as any).__fxHeight as number;
    let baseX: number = (barNode as any).__fxBaseX as number;
    let baseY: number = (barNode as any).__fxBaseY as number;

    if (full == null) {
      full = ut.width;
      height = ut.height;
      baseX = barNode.position.x;
      baseY = barNode.position.y;
      (barNode as any).__fxFull = full;
      (barNode as any).__fxHeight = height;
      (barNode as any).__fxBaseX = baseX;
      (barNode as any).__fxBaseY = baseY;
    }

    const r = Math.max(0, Math.min(1, ratio));
    const w = Math.max(0.01, full * r);
    const anchor = ut.anchorPoint;
    const g = barNode.getComponent(Graphics);

    if (g) {
      if (!(barNode as any).__fxColor) {
        (barNode as any).__fxColor = g.fillColor ? g.fillColor.clone() : new Color(255, 255, 255, 255);
      }
      const c: Color = (barNode as any).__fxColor;
      const left = -anchor.x * full;
      const bottom = -anchor.y * height;
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
  /** 微信小游戏短震动；无 wx 环境直接跳过 */
  static vibrateShort(): void {
    try {
      const wxAny: any = (globalThis as any).wx;
      if (wxAny && typeof wxAny.vibrateShort === 'function') {
        wxAny.vibrateShort({ type: 'light' });
      }
    } catch (e) {
      // 忽略
    }
  }

  // ---------------------------------------------------------------- 雨
  /** 全屏像素雨，返回容器节点（需要停止时自己 destroy） */
  static rainOverlay(root: Node): Node {
    const size = view.getVisibleSize();
    const w = Math.max(720, size.width);
    const h = Math.max(1280, size.height);

    const holder = uiNode('fx_rain');
    holder.parent = root;
    const hut = holder.addComponent(UITransform);
    hut.setContentSize(w, h);
    holder.setPosition(0, 0, 0);

    for (let layer = 0; layer < 3; layer++) {
      const ln = uiNode('fx_rain_layer_' + layer);
      ln.parent = holder;
      const lut = ln.addComponent(UITransform);
      lut.setContentSize(w, h * 3);
      ln.setPosition(0, 0, 0);

      const g = ln.addComponent(Graphics);
      g.lineWidth = 1 + layer;
      g.strokeColor = new Color(150, 200, 255, 90 + layer * 55);

      const count = 22;
      for (let i = 0; i < count; i++) {
        const rx = ((i * 137 + layer * 61) % 1000) / 1000;
        const ry = ((i * 311 + layer * 173) % 1000) / 1000;
        const x = -w / 2 + rx * w;
        const y = -h + ry * h * 3;
        const len = 16 + ((i + layer * 5) % 3) * 9;
        g.moveTo(x, y);
        g.lineTo(x - 3, y - len);
        g.stroke();
      }

      const dur = 0.6 + layer * 0.2;
      tween(ln)
        .to(dur, { position: new Vec3(0, -h, 0) })
        .call(() => {
          if (ln && ln.isValid) ln.setPosition(0, 0, 0);
        })
        .union()
        .repeatForever()
        .start();
    }
    return holder;
  }

  // ---------------------------------------------------------------- 彩带
  /** 全屏彩纸喷洒（通关用） */
  static confetti(root: Node): Node {
    const size = view.getVisibleSize();
    const w = Math.max(720, size.width);
    const h = Math.max(1280, size.height);

    const holder = uiNode('fx_confetti');
    holder.parent = root;
    const hut = holder.addComponent(UITransform);
    hut.setContentSize(w, h);
    holder.setPosition(0, 0, 0);

    const palette: Color[] = [
      new Color(255, 92, 92, 255),
      new Color(255, 200, 60, 255),
      new Color(90, 210, 255, 255),
      new Color(120, 235, 130, 255),
      new Color(230, 130, 255, 255),
      new Color(255, 255, 255, 255),
    ];

    const count = 40;
    for (let i = 0; i < count; i++) {
      const n = uiNode('fx_cf_' + i);
      n.parent = holder;
      const nut = n.addComponent(UITransform);
      const cw = 8 + (i % 3) * 4;
      const ch = 5 + (i % 2) * 4;
      nut.setContentSize(cw, ch);

      const g = n.addComponent(Graphics);
      g.fillColor = palette[i % palette.length];
      g.rect(-cw / 2, -ch / 2, cw, ch);
      g.fill();

      const x0 = -w / 2 + Math.random() * w;
      const y0 = h / 2 + 40 + Math.random() * 260;
      n.setPosition(x0, y0, 0);

      const drift = (Math.random() * 2 - 1) * 130;
      const dur = 1.8 + Math.random() * 1.6;

      tween(n)
        .delay(Math.random() * 0.9)
        .by(dur, { position: new Vec3(drift, -(h + 340), 0) }, { easing: 'quadIn' })
        .start();

      tween(n)
        .by(dur, { angle: (Math.random() > 0.5 ? 1 : -1) * 540 })
        .start();
    }

    tween(holder)
      .delay(4.2)
      .call(() => {
        if (holder && holder.isValid) holder.destroy();
      })
      .start();

    return holder;
  }
}