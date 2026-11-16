import { assetManager, AssetManager, ImageAsset, SpriteFrame, resources } from 'cc';
import { wrapTextToLines } from './WordBreak';
import { bgImageCandidates, bgSpriteFrameCandidates } from './BgAssetPath';
import { pxFont } from './PixelFontMetrics';

export interface DeathShareData {
  days: number;
  boxes: number;
  bestItem: string;
  bestValue: number;
  deathLine: string;
}

export interface CertShareData {
  title: string;
  titleDesc: string;
  days: number;
  boxes: number;
  bestItem: string;
  bestValue: number;
  totalIncome: number;
  certId: string;
  date: string;
}

export type ShareResult = 'shared' | 'preview' | 'unsupported';

/**
 * 竖版分享图：720×1280，底图来自 resources/art/share，二维码来自 resources/art/share/qr。
 * 微信里用离屏 canvas → wx.canvasToTempFilePath → wx.shareAppMessage(imageUrl)；
 * 编辑器/浏览器预览里退化为页面预览，所有 wx.* 调用都有存在性判断。
 */
export class Share {
  private static readonly W = 720;
  private static readonly H = 1280;
  private static _bgBundlePromise: Promise<AssetManager.Bundle | null> | null = null;
  /**
   * 分享图是 canvas 绘制，不走 Label/BMFont。直接使用系统中文黑体：
   * 微信上 wx.loadFont 注册的 TTF family 不可靠，系统字体至少尺寸/换行正确。
   */
  private static setFont(ctx: CanvasRenderingContext2D, size: number, bold: boolean = false): void {
    ctx.font = `${bold ? 'bold ' : ''}${size}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Heiti SC",sans-serif`;
  }

  // 美术给的像素矩形（原点左上），见 /workspace/lingyuan_art/README.md。
  private static readonly DEATH_STATS = { x: 2, y: 998, w: 715, h: 279 };
  private static readonly DEATH_QR = { x: 589, y: 1146, w: 98, h: 98 };
  private static readonly CERT_TITLE = { x: 113, y: 84, w: 494, h: 142 };
  private static readonly CERT_STATS = { x: 84, y: 622, w: 552, h: 322 };
  private static readonly CERT_QR = { x: 481, y: 1045, w: 168, h: 150 };

  public static async shareDeath(data: DeathShareData): Promise<ShareResult> {
    return Share.share('death', data);
  }

  public static async shareCert(data: CertShareData): Promise<ShareResult> {
    return Share.share('cert', data);
  }

  private static async share(kind: 'death' | 'cert', data: DeathShareData | CertShareData): Promise<ShareResult> {
    let canvas: any | null = null;
    try {
      canvas = await (kind === 'death'
        ? Share.renderDeath(data as DeathShareData)
        : Share.renderCert(data as CertShareData));
    } catch (e) {
      return 'unsupported';
    }
    if (!canvas) return 'unsupported';

    const imageUrl = await Share.toImageUrl(canvas);
    if (!imageUrl) return 'unsupported';

    const wxAny: any = (globalThis as any).wx;
    if (wxAny && typeof wxAny.shareAppMessage === 'function') {
      try {
        const title = kind === 'death'
          ? `我在深圳只活了 ${(data as DeathShareData).days} 天`
          : `我拿到了深圳生存认证：${(data as CertShareData).title}`;
        wxAny.shareAppMessage({ title, imageUrl });
        return 'shared';
      } catch (e) {
        return 'unsupported';
      }
    }

    // 非微信环境：能拿到 dataURL 就在网页里预览，不调用任何 wx.*。
    if (typeof imageUrl === 'string' && imageUrl.indexOf('data:') === 0) {
      Share.preview(imageUrl);
      return 'preview';
    }
    return 'unsupported';
  }

  // ------------------------------------------------------------------
  // 绘制
  // ------------------------------------------------------------------
  private static async renderDeath(data: DeathShareData): Promise<any | null> {
    const canvas = Share.createCanvas();
    const ctx = canvas ? (canvas.getContext('2d') as CanvasRenderingContext2D | null) : null;
    if (!canvas || !ctx) return null;
    try { (ctx as any).imageSmoothingEnabled = false; } catch (e) { /* ignore */ }

    ctx.fillStyle = '#101426';
    ctx.fillRect(0, 0, Share.W, Share.H);
    const bg = await Share.loadImage('share/share_death_bg', true);
    if (bg) {
      try { ctx.drawImage(bg, 0, 0, Share.W, Share.H); } catch (e) { /* keep fallback */ }
    }
    const qr = await Share.loadImage('art/share/qr');

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // 分享图叠在照片上：白字 + 1 源像素 #1a1020 外侧描边（等价 pixel_outline）。
    ctx.fillStyle = '#fff6df';
    Share.setFont(ctx, pxFont(24), true);
    Share.fillTextOutlined(ctx, '深圳生存失败', 40, 40);

    ctx.fillStyle = '#ffffff';
    Share.setFont(ctx, pxFont(12), true);
    let y = 112;
    y = Share.drawWrapped(ctx, data.deathLine, 40, y, 640, 42, true);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const stats = Share.DEATH_STATS;
    ctx.fillStyle = '#4a3524';
    Share.setFont(ctx, pxFont(18), true);
    const lines = [
      `存活天数：${data.days} 天`,
      `开箱数：${data.boxes} 个`,
      `最值钱的货：${data.bestItem}${data.bestValue > 0 ? `（¥\u00A0${Share.money(data.bestValue)}）` : ''}`,
    ];
    let sy = stats.y + 20;
    for (const line of lines) {
      sy = Share.drawWrapped(ctx, line, stats.x + 22, sy, 540, pxFont(18) + Share.pxSpacingLine());
    }

    Share.drawQr(ctx, qr, Share.DEATH_QR);
    return canvas;
  }

  private static async renderCert(data: CertShareData): Promise<any | null> {
    const canvas = Share.createCanvas();
    const ctx = canvas ? (canvas.getContext('2d') as CanvasRenderingContext2D | null) : null;
    if (!canvas || !ctx) return null;
    try { (ctx as any).imageSmoothingEnabled = false; } catch (e) { /* ignore */ }

    ctx.fillStyle = '#f7e6bd';
    ctx.fillRect(0, 0, Share.W, Share.H);
    const bg = await Share.loadImage('share/share_cert_bg', true);
    if (bg) {
      try { ctx.drawImage(bg, 0, 0, Share.W, Share.H); } catch (e) { /* keep fallback */ }
    }
    const qr = await Share.loadImage('art/share/qr');

    const titleRect = Share.CERT_TITLE;
    const cx = titleRect.x + titleRect.w / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#5c3b16';
    Share.setFont(ctx, pxFont(24), true);
    ctx.fillText('深圳生存认证', cx, titleRect.y + 14);
    ctx.fillStyle = '#8a4a12';
    Share.setFont(ctx, pxFont(18), true);
    ctx.fillText(data.title, cx, titleRect.y + 76);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a3524';
    Share.setFont(ctx, pxFont(12), true);
    const stats = Share.CERT_STATS;
    const lines = [
      `称号：${data.title}`,
      `存活 ${data.days} 天 · 开箱 ${data.boxes} 个`,
      `最值钱的货：${data.bestItem}${data.bestValue > 0 ? `（¥\u00A0${Share.money(data.bestValue)}）` : ''}`,
      `总收入：¥\u00A0${Share.money(data.totalIncome)}`,
      `编号：${data.certId}  日期：${data.date}`,
      data.titleDesc,
    ];
    // 数据区上 60% 给文字，下方留给人像。
    let sy = stats.y + 12;
    for (const line of lines) {
      sy = Share.drawWrapped(ctx, line, stats.x + 24, sy, stats.w - 48, pxFont(12) + Share.pxSpacingLine());
    }

    Share.drawQr(ctx, qr, Share.CERT_QR);
    return canvas;
  }

  /** 深色照片上的白字：先描 #1a1020 外轮廓再填色，避免糊在背景里。 */
  private static fillTextOutlined(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
  ): void {
    const previousJoin = ctx.lineJoin;
    ctx.lineJoin = 'miter';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1020';
    ctx.strokeText(text, x, y);
    ctx.lineJoin = previousJoin;
    ctx.fillText(text, x, y);
  }

  private static drawWrapped(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    outlined: boolean = false,
  ): number {
    const lines = Share.wrap(ctx, text, maxWidth);
    let cursor = y;
    for (const line of lines) {
      if (outlined) Share.fillTextOutlined(ctx, line, x, cursor);
      else ctx.fillText(line, x, cursor);
      cursor += lineHeight;
    }
    return cursor;
  }

  private static wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    // 与游戏内共用同一套词边界/避头尾/平衡断行；画布只负责测量像素宽度。
    return wrapTextToLines(text, maxWidth, (line) => ctx.measureText(line).width, {
      minLast: 4,
      protectHeader: false,
    });
  }

  private static drawQr(ctx: CanvasRenderingContext2D, qr: any, rect: { x: number; y: number; w: number; h: number }): void {
    if (qr) {
      try {
        ctx.drawImage(qr, rect.x, rect.y, rect.w, rect.h);
        return;
      } catch (e) {
        // fall through
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = '#5c3b16';
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.fillStyle = '#5c3b16';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    Share.setFont(ctx, pxFont(12), true);
    ctx.fillText('二维码', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  private static money(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }

  /** 分享图行距：像素字用 1.25 倍整数行距，避免上下行粘在一起。 */
  private static pxSpacingLine(): number {
    return pxFont(4);
  }

  // ------------------------------------------------------------------
  // 平台适配
  // ------------------------------------------------------------------
  private static createCanvas(): any | null {
    const wxAny: any = (globalThis as any).wx;
    if (wxAny && typeof wxAny.createOffscreenCanvas === 'function') {
      try {
        return wxAny.createOffscreenCanvas({ type: '2d', width: Share.W, height: Share.H });
      } catch (e) {
        // try simpler signature below
      }
      try {
        return wxAny.createOffscreenCanvas({ width: Share.W, height: Share.H });
      } catch (e) {
        return null;
      }
    }
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        const canvas = document.createElement('canvas');
        canvas.width = Share.W;
        canvas.height = Share.H;
        return canvas;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  private static async toImageUrl(canvas: any): Promise<string | null> {
    const wxAny: any = (globalThis as any).wx;
    if (wxAny && typeof wxAny.canvasToTempFilePath === 'function') {
      const path = await new Promise<string | null>((resolve) => {
        try {
          wxAny.canvasToTempFilePath({
            canvas,
            x: 0,
            y: 0,
            width: Share.W,
            height: Share.H,
            destWidth: Share.W,
            destHeight: Share.H,
            fileType: 'png',
            success: (res: any) => resolve(res && res.tempFilePath ? res.tempFilePath : null),
            fail: () => resolve(null),
          });
        } catch (e) {
          resolve(null);
        }
      });
      if (path) return path;
    }
    try {
      if (canvas && typeof canvas.toDataURL === 'function') return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
    return null;
  }

  private static fromImageAsset(asset: ImageAsset | null): any | null {
    if (!asset) return null;
    const native: any = (asset as any)._nativeAsset;
    if (native && typeof native === 'object' && typeof native.width === 'number') {
      return native;
    }
    const data: any = (asset as any).data;
    if (data && typeof data === 'object' && typeof data.width === 'number') {
      return data;
    }
    return data ?? native ?? null;
  }

  private static spriteFrameImage(sf: SpriteFrame | null): any | null {
    if (!sf || !sf.texture) return null;
    const image: any = (sf.texture as any).image;
    return image ? (image.data ?? image._nativeAsset ?? null) : null;
  }

  private static getBgBundle(): Promise<AssetManager.Bundle | null> {
    const loaded = assetManager.getBundle('bg');
    if (loaded) return Promise.resolve(loaded);
    if (Share._bgBundlePromise) return Share._bgBundlePromise;
    Share._bgBundlePromise = new Promise<AssetManager.Bundle | null>((resolve) => {
      try {
        assetManager.loadBundle('bg', (err: Error | null, bundle: AssetManager.Bundle | null) => {
          resolve(err ? null : bundle);
        });
      } catch (e) {
        resolve(null);
      }
    });
    return Share._bgBundlePromise;
  }

  private static loadFromResources(path: string): Promise<any | null> {
    return new Promise<any | null>((resolve) => {
      let settled = false;
      const done = (value: any | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const trySpriteFrame = () => {
        try {
          resources.load(`${path}/spriteFrame`, SpriteFrame, (err: Error | null, sf: SpriteFrame | null) => {
            done(err ? null : Share.spriteFrameImage(sf));
          });
        } catch (e) {
          done(null);
        }
      };

      try {
        resources.load(path, ImageAsset, (err: Error | null, asset: ImageAsset | null) => {
          if (!err && asset) {
            done(Share.fromImageAsset(asset));
            return;
          }
          try {
            resources.load(`${path}/texture`, ImageAsset, (err2: Error | null, tex: ImageAsset | null) => {
              if (!err2 && tex) {
                done(Share.fromImageAsset(tex));
                return;
              }
              trySpriteFrame();
            });
          } catch (e) {
            trySpriteFrame();
          }
        });
      } catch (e) {
        trySpriteFrame();
      }
    });
  }

  private static loadFromBundle(
    bundle: AssetManager.Bundle,
    path: string,
  ): Promise<any | null> {
    return new Promise<any | null>((resolve) => {
      let settled = false;
      const done = (value: any | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const tryImage = (index: number) => {
        const imagePaths = bgImageCandidates(path);
        if (index >= imagePaths.length) {
          done(null);
          return;
        }
        try {
          bundle.load(
            imagePaths[index],
            ImageAsset,
            (err: Error | null, asset: ImageAsset | null) => {
              if (err || !asset) {
                tryImage(index + 1);
                return;
              }
              done(Share.fromImageAsset(asset));
            },
          );
        } catch (e) {
          tryImage(index + 1);
        }
      };

      const spriteFramePaths = bgSpriteFrameCandidates(path);
      const trySpriteFrame = (index: number) => {
        if (index >= spriteFramePaths.length) {
          tryImage(0);
          return;
        }
        try {
          bundle.load(
            spriteFramePaths[index],
            SpriteFrame,
            (err: Error | null, sf: SpriteFrame | null) => {
              if (err || !sf) {
                trySpriteFrame(index + 1);
                return;
              }
              done(Share.spriteFrameImage(sf));
            },
          );
        } catch (e) {
          trySpriteFrame(index + 1);
        }
      };
      trySpriteFrame(0);
    });
  }

  /** 分享底图在 bg 分包里；加载失败时回退到旧的主包路径，保证预览不白屏。 */
  private static async loadImage(path: string, fromBg: boolean = false): Promise<any | null> {
    if (fromBg) {
      const bundle = await Share.getBgBundle();
      if (bundle) {
        const fromSub = await Share.loadFromBundle(bundle, path);
        if (fromSub) return fromSub;
      }
      return Share.loadFromResources(`art/${path}`);
    }
    const fromMain = await Share.loadFromResources(path);
    if (fromMain) return fromMain;
    // 兼容：二维码等仍在主包，但旧构建/演练环境可能已经把它挪进 bg。
    const bundle = await Share.getBgBundle();
    if (bundle) return Share.loadFromBundle(bundle, path.replace(/^art\//, ''));
    return null;
  }

  private static preview(dataUrl: string): void {
    try {
      if (typeof document === 'undefined' || !document.body) return;
      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = 'max-width:92vw;max-height:92vh;box-shadow:0 0 32px rgba(0,0,0,.8);';
      mask.appendChild(img);
      mask.onclick = () => {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
      };
      document.body.appendChild(mask);
    } catch (e) {
      // 预览失败不影响游戏
    }
  }
}
