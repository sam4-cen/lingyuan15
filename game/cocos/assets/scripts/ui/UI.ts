import { Layers, Node, UITransform, Widget, view, sys } from 'cc';

/**
 * 新建 UI 节点：默认层是 DEFAULT，而 UI 相机只渲染 UI_2D，
 * 所有代码创建的节点都必须显式设置到 UI_2D 层，否则会黑屏/不可见。
 */
export function uiNode(name: string = 'node'): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  return node;
}

/** 竖屏安全区（设计分辨率 720×1280，Fit Height）换算。 */
export class UILayout {
  public static visibleW: number = 720;
  public static visibleH: number = 1280;
  public static safeTop: number = 0;
  public static safeBottom: number = 0;
  public static safeLeft: number = 0;
  public static safeRight: number = 0;
  /** 微信胶囊按钮底部（设计坐标，从屏幕顶部算）；非微信环境为 0 */
  public static capsuleBottom: number = 0;

  public static refresh(): void {
    this.visibleW = 720;
    this.visibleH = 1280;
    this.safeTop = 0;
    this.safeBottom = 0;
    this.safeLeft = 0;
    this.safeRight = 0;
    this.capsuleBottom = 0;

    let vsW = 720;
    let vsH = 1280;
    let frameW = 720;
    let frameH = 1280;
    try {
      const vs = view.getVisibleSize();
      const frame = view.getFrameSize();
      if (vs && vs.width > 0 && vs.height > 0) {
        vsW = Math.min(720, vs.width);
        vsH = Math.min(1280, vs.height);
      }
      if (frame && frame.width > 0 && frame.height > 0) {
        frameW = frame.width;
        frameH = frame.height;
        // 项目设置为 720×1280 + Fit Height：
        // 实际可视宽度 = 屏幕宽 × 设计高 / 屏幕高，两侧会被裁掉
        const fitScale = frameH / 1280;
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
      const wxAny: any = (globalThis as any).wx;
      if (wxAny && typeof wxAny.getMenuButtonBoundingClientRect === 'function' && frameH > 0) {
        const rect = wxAny.getMenuButtonBoundingClientRect();
        if (rect && rect.bottom > 0) {
          // 胶囊 rect 是窗口 CSS 像素，用 wx 的窗口高度换算最稳
          let winH = frameH;
          try {
            const info = typeof wxAny.getWindowInfo === 'function'
              ? wxAny.getWindowInfo()
              : wxAny.getSystemInfoSync?.();
            if (info && info.windowHeight > 0) winH = info.windowHeight;
          } catch (e) {
            // 取不到就用 frameH
          }
          const scale = winH > 0 ? 1280 / winH : 1;
          this.capsuleBottom = Math.max(0, rect.bottom * scale);
        }
      }
    } catch (e) {
      // 非微信环境：忽略，顶栏按安全区排
    }

    try {
      // getSafeAreaRect 已经是设计分辨率单位，不要再乘屏幕像素比例
      const safe = sys.getSafeAreaRect();
      if (safe && safe.width > 0 && safe.height > 0) {
        const sw = Math.min(vsW, safe.width);
        const sh = Math.min(vsH, safe.height);
        this.safeTop = Math.max(0, vsH - (safe.y + sh));
        this.safeBottom = Math.max(0, safe.y);
        this.safeLeft = Math.max(0, safe.x);
        this.safeRight = Math.max(0, vsW - (safe.x + sw));
      }
    } catch (e) {
      // 忽略，按 0 安全区处理
    }
  }

  /** 设计坐标下的可视半宽（Fit Height 时两侧会被裁掉）。 */
  public static get halfW(): number {
    return Math.min(360, this.visibleW / 2);
  }

  public static get top(): number {
    return this.visibleH / 2 - this.safeTop;
  }

  /** 顶栏顶部需要避让的边距：刘海安全区与微信胶囊取较大值。 */
  public static get headerTop(): number {
    return Math.max(this.safeTop, this.capsuleBottom);
  }

  /** 顶栏起始 y（设计坐标，屏幕中心为 0）。 */
  public static get headerY(): number {
    return this.visibleH / 2 - this.headerTop;
  }

  public static get bottom(): number {
    return -this.visibleH / 2 + this.safeBottom;
  }
}

/** 贴底对齐（自动避开底部安全区），用于「换地点/回家/睡觉」等按钮。 */
export function alignBottom(node: Node, margin: number = 20): Widget {
  const widget = node.getComponent(Widget) ?? node.addComponent(Widget);
  widget.isAlignBottom = true;
  widget.isAbsoluteBottom = true;
  widget.bottom = UILayout.safeBottom + margin;
  widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
  widget.updateAlignment();
  return widget;
}

/** 贴顶对齐，用于顶部状态栏。 */
export function alignTop(node: Node, margin: number = 12, xOffset: number = 0): Widget {
  const widget = node.getComponent(Widget) ?? node.addComponent(Widget);
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
export function alignTopSide(node: Node, side: 'left' | 'right', margin: number = 12): Widget {
  const widget = node.getComponent(Widget) ?? node.addComponent(Widget);
  widget.isAlignTop = true;
  widget.isAbsoluteTop = true;
  widget.top = UILayout.headerTop + margin;
  const crop = Math.max(0, (720 - UILayout.visibleW) / 2);
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
export function setSize(node: Node, w: number, h: number): UITransform {
  const ut = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  ut.setContentSize(w, h);
  return ut;
}
