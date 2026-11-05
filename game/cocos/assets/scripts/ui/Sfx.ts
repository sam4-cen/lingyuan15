import { AudioClip, AudioSource, Node, resources } from 'cc';
import { uiNode } from './UI';

export type SfxName = 'snap' | 'bounce';

/** 极简音效播放器：AudioSource + resources/sfx/*.wav，失败时静默。 */
export class Sfx {
  private static source: AudioSource | null = null;
  private static clips: Map<string, AudioClip> = new Map();
  private static loading: Set<string> = new Set();

  public static init(root: Node): void {
    if (this.source && this.source.isValid) return;
    const node = uiNode('sfx');
    node.parent = root;
    this.source = node.addComponent(AudioSource);
    this.load('snap');
    this.load('bounce');
  }

  public static play(name: SfxName): void {
    this.load(name);
    const clip = this.clips.get(name);
    if (!clip || !this.source || !this.source.isValid) return;
    try {
      this.source.playOneShot(clip, name === 'snap' ? 0.85 : 0.7);
    } catch (e) {
      // 某些平台首次触摸前播放会失败，忽略
    }
  }

  private static load(name: string): void {
    if (this.clips.has(name) || this.loading.has(name)) return;
    this.loading.add(name);
    resources.load(`sfx/${name}`, AudioClip, (err: Error | null, clip: AudioClip | null) => {
      this.loading.delete(name);
      if (!err && clip) this.clips.set(name, clip);
    });
  }
}
