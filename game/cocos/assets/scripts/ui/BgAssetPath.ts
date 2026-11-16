/**
 * bg 分包资源路径解析（纯函数，便于单测）。
 *
 * bg 分包里同一张图有两种导入布局：
 *   - 单文件：`card.png`          → bundle 路径 `card`，SpriteFrame 子资源 `card/spriteFrame`
 *   - 目录帧：`card/0.png`        → bundle 路径 `card/0`，SpriteFrame 子资源 `card/0/spriteFrame`
 *
 * 逻辑名只写 `card`，由加载器依次尝试两种布局，不能只试 file.png。
 */
export type BgAssetLayout = 'file' | 'folder';

export interface ResolvedBgAsset {
  layout: BgAssetLayout;
  /** 传给 bundle.load(..., ImageAsset) 的路径。 */
  imagePath: string;
  /** 传给 bundle.load(..., SpriteFrame) 的路径。 */
  spriteFramePath: string;
  /** 用于测试/校验的 PNG 文件相对路径。 */
  filePath: string;
}

/** 运行时尝试顺序：先 file.png，失败后再试 folder/0.png。 */
export function bgSpriteFrameCandidates(path: string): string[] {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return [`${clean}/spriteFrame`, `${clean}/0/spriteFrame`];
}

/** ImageAsset 回退路径，顺序与 SpriteFrame 候选一致。 */
export function bgImageCandidates(path: string): string[] {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return [clean, `${clean}/0`];
}

/** 在已知资源根目录里判断逻辑名实际对应哪种布局（测试脚本使用）。 */
export function resolveBgAssetPath(
  path: string,
  exists: (relativePath: string) => boolean,
): ResolvedBgAsset | null {
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (!clean) return null;

  const filePath = `${clean}.png`;
  if (exists(filePath)) {
    return {
      layout: 'file',
      imagePath: clean,
      spriteFramePath: `${clean}/spriteFrame`,
      filePath,
    };
  }

  const folderFrame = `${clean}/0`;
  const folderPath = `${folderFrame}.png`;
  if (exists(folderPath)) {
    return {
      layout: 'folder',
      imagePath: folderFrame,
      spriteFramePath: `${folderFrame}/spriteFrame`,
      filePath: folderPath,
    };
  }

  return null;
}
