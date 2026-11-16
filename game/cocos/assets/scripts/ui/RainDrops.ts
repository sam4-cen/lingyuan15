import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
import { EVENT_RAIN_DROP_FRAME_SECONDS } from './EventLayout';

const { ccclass } = _decorator;

/**
 * r31 下雨事件的雨滴叠加层播放器。
 *
 * rain_drops 只有 2 帧，固定 0.25s 切一帧并循环；不使用 ArtSpritePlayer 的
 * 整数 fps 是因为事件要求精确的 0.25s 间隔。节点隐藏/销毁（事件关闭）时
 * 必须 unschedule，避免计时器继续跑。
 */
@ccclass('RainDropPlayer')
export class RainDropPlayer extends Component {
  private _frames: SpriteFrame[] = [];
  private _interval: number = EVENT_RAIN_DROP_FRAME_SECONDS;
  private _index: number = 0;
  private _sprite: Sprite | null = null;

  public setFrames(frames: SpriteFrame[], interval: number = EVENT_RAIN_DROP_FRAME_SECONDS): void {
    this._frames = frames && frames.length > 0 ? frames.slice() : [];
    this._interval =
      Number.isFinite(interval) && interval > 0 ? interval : EVENT_RAIN_DROP_FRAME_SECONDS;
    this._index = 0;
    this.applyFrame();
    this.restartTimer();
  }

  /** 当前切帧间隔（秒），供运行时/单测检查。 */
  public get frameInterval(): number {
    return this._interval;
  }

  /** 事件关闭时显式停表；节点销毁/隐藏时 onDisable/onDestroy 也会兜底。 */
  public stop(): void {
    this.stopTimer();
  }

  protected onEnable(): void {
    this.restartTimer();
  }

  protected onDisable(): void {
    this.stopTimer();
  }

  protected onDestroy(): void {
    this.stopTimer();
  }

  private ensureSprite(): Sprite | null {
    if (!this._sprite || !this._sprite.isValid) {
      this._sprite = this.getComponent(Sprite);
    }
    return this._sprite;
  }

  private applyFrame(): void {
    const sprite = this.ensureSprite();
    if (!sprite) return;
    sprite.spriteFrame =
      this._frames.length > 0 ? this._frames[Math.min(this._index, this._frames.length - 1)] : null;
  }

  private restartTimer(): void {
    this.stopTimer();
    if (!this.node || !this.node.activeInHierarchy) return;
    if (this._frames.length <= 1) return;
    this.schedule(this.tick, this._interval);
  }

  private stopTimer(): void {
    this.unschedule(this.tick);
  }

  private tick(): void {
    if (this._frames.length <= 1) return;
    this._index = (this._index + 1) % this._frames.length;
    this.applyFrame();
  }
}
