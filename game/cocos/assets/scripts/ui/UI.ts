import { Layers, Node, UITransform, Widget, screen, view, sys } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH, setFontScreenMetrics } from './PixelFontMetrics';

/**
 * 新建 UI 节点：默认层是 DEFAULT，而 UI 相机只渲染 UI_2D，
 * 所有代码创建的节点都必须显式设置到 UI_2D 层，否则会黑屏/不可见。
 */
export function uiNode(name: string = 'node'): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  return node;
}

/** 竖屏安全区：设计分辨率 720×1280，项目设置为 Fixed Height（Fit Height）。 */
export class UILayout {
  public static designW: number = DESIGN_WIDTH;
  public static designH: number = DESIGN_HEIGHT;
  public static visibleW: number = DESIGN_WIDTH;
  public static visibleH: number = DESIGN_HEIGHT;
  /** 真实物理像素与 DPR（Cocos 3.8 screen.windowSize 已是物理像素）。 */
  public static physicalW: number = DESIGN_WIDTH;
  public static physicalH: number = DESIGN_HEIGHT;
  public static dpr: number = 1;
  public static safeTop: number = 0;
  public static safeBottom: number = 0;
  public static safeLeft: number = 0;
  public static safeRight: number = 0;
  /** 微信胶囊按钮底部（设计坐标，从屏幕顶部算）；非微信环境为 0 */
  public static capsuleBottom: number = 0;

  public static refresh(): void {
    this.designW = DESIGN_WIDTH;
    this.designH = DESIGN_HEIGHT;
    this.visibleW = DESIGN_WIDTH;
    this.visibleH = DESIGN_HEIGHT;
    this.physicalW = DESIGN_WIDTH;
    this.physicalH = DESIGN_HEIGHT;
    this.dpr = 1;
    this.safeTop = 0;
    this.safeBottom = 0;
    this.safeLeft = 0;
    this.safeRight = 0;
    this.capsuleBottom = 0;

    let vsW = DESIGN_WIDTH;
    let vsH = DESIGN_HEIGHT;
    let frameW = DESIGN_WIDTH;
    let frameH = DESIGN_HEIGHT;
    let physicalW = DESIGN_WIDTH;
    let physicalH = DESIGN_HEIGHT;
    let dpr = 1;
    try {
      const design = view.getDesignResolutionSize();
      if (design && design.width > 0 && design.height > 0) {
        this.designW = design.width;
        this.designH = design.height;
      }
      // Fixed Height 下 getVisibleSize() 的高度 = 设计高，宽度 = 真实屏幕宽 × 设计高 / 屏幕高。
      // 直接使用它，不再 min(720)/min(1280)：否则高屏/DevTools 上底部会被裁掉。
      const vs = view.getVisibleSize();
      if (vs && vs.width > 0 && vs.height > 0) {
        vsW = vs.width;
        vsH = vs.height;
      } else if (this.designW > 0 && this.designH > 0) {
        vsW = this.designW;
        vsH = this.designH;
      }
      const frame = view.getFrameSize();
      if (frame && frame.width > 0 && frame.height > 0) {
        frameW = frame.width;
        frameH = frame.height;
      }
      this.visibleW = Math.max(1, vsW);
      this.visibleH = Math.max(1, vsH);
      dpr = Math.max(1, screen.devicePixelRatio || 1);
      // Cocos 3.8 windowSize 是物理像素；若某平台仍返回 CSS 尺寸，用 frame × DPR 兜底。
      const win = screen.windowSize;
      physicalW = win && win.width > 0 ? win.width : frameW * dpr;
      physicalH = win && win.height > 0 ? win.height : frameH * dpr;
      if (frameW > 0 && dpr > 1 && Math.abs(physicalW - frameW) < 0.5) {
        physicalW = frameW * dpr;
        physicalH = frameH * dpr;
      }
      this.physicalW = Math.max(1, physicalW);
      this.physicalH = Math.max(1, physicalH);
      this.dpr = dpr;
    } catch (e) {
      // 非运行环境（如 tsc/单测）使用设计分辨率
    }

    // 微信右上角胶囊会挡住顶栏，取它的底部位置，把顶栏内容压到胶囊下方
    try {
      const wxAny: any = (globalThis as any).wx;
      if (wxAny && typeof wxAny.getMenuButtonBoundingClientRect === 'function') {
        const rect = wxAny.getMenuButtonBoundingClientRect();
        if (rect && rect.bottom > 0) {
          // 胶囊 rect 是窗口 CSS 像素；设计坐标按当前 visibleH / 窗口高度换算。
          let winH = frameH;
          try {
            const info = typeof wxAny.getWindowInfo === 'function'
              ? wxAny.getWindowInfo()
              : wxAny.getSystemInfoSync?.();
            if (info && info.windowHeight > 0) winH = info.windowHeight;
          } catch (e) {
            // 取不到就用 frameH
          }
          const scale = winH > 0 ? this.visibleH / winH : 1;
          this.capsuleBottom = Math.max(0, rect.bottom * scale);
        }
      }
    } catch (e) {
      // 非微信环境：忽略，顶栏按安全区排
    }

    // 字号按物理像素定整数倍：Fit Height 下 9:20 屏的可视设计宽更窄。
    setFontScreenMetrics({
      physicalWidth: this.physicalW,
      physicalHeight: this.physicalH,
      visibleWidth: this.visibleW,
      visibleHeight: this.visibleH,
      devicePixelRatio: this.dpr,
    });

    try {
      // getSafeAreaRect 返回设计分辨率单位；仅限制在可视区内，避免安全区把整屏推走。
      const safe = sys.getSafeAreaRect();
      if (safe && safe.width > 0 && safe.height > 0) {
        const left = Math.max(0, safe.x);
        const bottom = Math.max(0, safe.y);
        const right = Math.max(0, this.visibleW - (safe.x + safe.width));
        const top = Math.max(0, this.visibleH - (safe.y + safe.height));
        this.safeLeft = left;
        this.safeRight = right;
        this.safeBottom = bottom;
        this.safeTop = top;
      }
    } catch (e) {
      // 忽略，继续尝试微信 safeArea；网页版取不到时按 0 处理。
    }

    try {
      // 微信部分基础库/开发者工具里 getSafeAreaRect 不返回底部安全区，
      // 再按 wx.getSystemInfoSync().safeArea 与窗口高的差值兜底。
      const wxAny: any = (globalThis as any).wx;
      const info = wxAny && (typeof wxAny.getWindowInfo === 'function'
        ? wxAny.getWindowInfo()
        : wxAny.getSystemInfoSync?.());
      if (info && info.safeArea) {
        const winH = info.windowHeight > 0 ? info.windowHeight : info.screenHeight;
        if (winH > 0) {
          const scale = this.visibleH / winH;
          const area = info.safeArea;
          const bottomInset = Math.max(0, winH - area.bottom) * scale;
          const topInset = Math.max(0, area.top) * scale;
          const winW = info.windowWidth > 0 ? info.windowWidth : info.screenWidth;
          const leftInset = Math.max(0, area.left || 0) * (winW > 0 ? this.visibleW / winW : 1);
          const rightInset = Math.max(0, winW - area.right) * (winW > 0 ? this.visibleW / winW : 1);
          // 取较大值，避免 Cocos 已经算过的安全区被更小的值覆盖。
          this.safeBottom = Math.max(this.safeBottom, bottomInset);
          this.safeTop = Math.max(this.safeTop, topInset);
          this.safeLeft = Math.max(this.safeLeft, leftInset);
          this.safeRight = Math.max(this.safeRight, rightInset);
        }
      }
    } catch (e) {
      // 非微信/取不到 safeArea：网页版按 0 安全区处理。
    }
  }

  /** 设计坐标下的可视半宽（Fit Height 时两侧会被裁掉）。 */
  public static get halfW(): number {
    return this.visibleW / 2;
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
  const crop = Math.max(0, (UILayout.designW - UILayout.visibleW) / 2);
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
