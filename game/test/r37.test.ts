import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ART_ALIAS } from '../cocos/assets/scripts/ui/ArtMap';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  setFontScreenMetrics,
} from '../cocos/assets/scripts/ui/PixelFontMetrics';
import {
  EVENT_NPC_ANCHOR_X,
  EVENT_NPC_ANCHOR_Y,
  EVENT_NPC_FOOT_X,
  EVENT_NPC_FOOT_Y,
  computeEventLayout,
  eventRoleAnchor,
} from '../cocos/assets/scripts/ui/EventLayout';

type Group = {
  dir: string;
  eventIds: Array<'patrol' | 'auntie' | 'wallet'>;
  frames: number;
  /** r36 时的 uuid 基线；覆盖图后必须原样保留。 */
  uuids: string[];
};

const GROUPS: Group[] = [
  {
    dir: 'npc_kind_auntie',
    eventIds: ['auntie'],
    frames: 4,
    uuids: [
      '76e14df8-8da4-5607-bb07-522989c2cf76',
      'a51e71f0-3007-5e00-b4a8-42128fbf0667',
      '0474edee-25a2-5b0b-87e1-cf1b9f9fd62e',
      'd9261222-f725-5ac4-98ba-93d30a68cce7',
    ],
  },
  {
    dir: 'npc_patrol_uncle',
    eventIds: ['patrol'],
    frames: 4,
    uuids: [
      '99801b92-aad2-5fc7-b57d-3982e1e80395',
      '1dce6010-9dc3-56ae-83f3-02ce0b103c56',
      '2c9545d6-3ca7-5aaa-8889-8f806cf832d4',
      '66a5c615-3de7-5225-8be8-da583f55299e',
    ],
  },
  {
    dir: 'npc_wallet_owner',
    eventIds: ['wallet'],
    frames: 3,
    uuids: [
      '7a4e53dd-b5b8-584e-82f7-46279c479874',
      '0f6d2073-98be-5513-9826-3170c457a0e0',
      'ae8c9050-29dc-5000-a136-bc3ff9a44ff6',
    ],
  },
];

const BG_ROOT = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');

function pngSize(file: string): { w: number; h: number } {
  const b = fs.readFileSync(file);
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} 不是 PNG`);
  assert.equal(b.subarray(12, 16).toString('ascii'), 'IHDR', `${file} 缺少 IHDR`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('r37 阿姨/巡逻/失主 NPC：11 张源图均为 32×32，帧数与 ART_ALIAS 一致', () => {
  let total = 0;
  for (const group of GROUPS) {
    for (let i = 0; i < group.frames; i++) {
      const file = path.join(BG_ROOT, group.dir, `${i}.png`);
      assert.ok(fs.existsSync(file), `缺少 ${group.dir}/${i}.png`);
      const { w, h } = pngSize(file);
      assert.equal(w, 32, `${group.dir}/${i}.png 宽度不是 32`);
      assert.equal(h, 32, `${group.dir}/${i}.png 高度不是 32`);
      total++;
    }
    // 多一帧或少一帧都会让 Art.play 加载到旧图/空帧。
    const metaFiles = fs.readdirSync(path.join(BG_ROOT, group.dir)).filter((f) => f.endsWith('.png'));
    assert.equal(metaFiles.length, group.frames, `${group.dir} 帧数不是 ${group.frames}`);
    for (const eventId of group.eventIds) {
      const alias = ART_ALIAS[`ev_${eventId}`];
      assert.equal(alias?.src, 'bg', `ev_${eventId} 不在 bg 分包`);
      assert.equal(alias?.path, group.dir, `ev_${eventId} 路径不是 ${group.dir}`);
      assert.equal(alias?.frames, group.frames, `ev_${eventId} 帧数不是 ${group.frames}`);
    }
  }
  assert.equal(total, 11, '三组 NPC 不是 4+4+3 张');
});

test('r37 meta：Point/nearest、不预乘、无 mipmap、trim none，uuid 保持 r36 基线', () => {
  for (const group of GROUPS) {
    assert.equal(group.uuids.length, group.frames, `${group.dir} uuid 基线数量不对`);
    for (let i = 0; i < group.frames; i++) {
      const png = path.join(BG_ROOT, group.dir, `${i}.png`);
      const metaPath = `${png}.meta`;
      assert.ok(fs.existsSync(metaPath), `缺少 ${group.dir}/${i}.png.meta`);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const tex = meta.subMetas?.['6c48a']?.userData;
      const sf = meta.subMetas?.['f9941']?.userData;
      assert.ok(tex && sf, `${group.dir}/${i}.png.meta 缺少 texture/spriteFrame`);

      // 覆盖图只替换 png，.meta 不重新导入；uuid 必须还是 r36 的那一个。
      assert.equal(meta.uuid, group.uuids[i], `${group.dir}/${i}.png uuid 变了`);
      assert.equal(meta.subMetas['6c48a'].uuid, `${group.uuids[i]}@6c48a`, `${group.dir}/${i}.png 纹理 uuid 变了`);
      assert.equal(meta.subMetas['f9941'].uuid, `${group.uuids[i]}@f9941`, `${group.dir}/${i}.png 精灵 uuid 变了`);
      assert.equal(meta.userData?.redirect, `${group.uuids[i]}@f9941`, `${group.dir}/${i}.png redirect 不对`);
      assert.equal(meta.userData?.premultiplyAlpha, false, `${group.dir}/${i}.png 顶层仍预乘`);

      assert.equal(tex.minfilter, 'nearest', `${group.dir}/${i}.png minfilter 不是 Point`);
      assert.equal(tex.magfilter, 'nearest', `${group.dir}/${i}.png magfilter 不是 Point`);
      assert.equal(tex.mipfilter, 'none', `${group.dir}/${i}.png 仍启用 mipmap`);
      assert.equal(tex.premultiplyAlpha, false, `${group.dir}/${i}.png 纹理仍预乘`);
      assert.equal(tex.wrapModeS, 'clamp-to-edge', `${group.dir}/${i}.png wrapModeS 不对`);
      assert.equal(tex.wrapModeT, 'clamp-to-edge', `${group.dir}/${i}.png wrapModeT 不对`);

      assert.equal(sf.trimType, 'none', `${group.dir}/${i}.png 仍被 trim`);
      assert.equal(sf.premultiplyAlpha, false, `${group.dir}/${i}.png 精灵仍预乘`);
      assert.equal(sf.generateMipmap, false, `${group.dir}/${i}.png 精灵仍生成 mipmap`);
      assert.equal(sf.packable, false, `${group.dir}/${i}.png 仍进自动图集`);
      assert.equal(sf.width, 32, `${group.dir}/${i}.png SpriteFrame 宽度不是 32`);
      assert.equal(sf.height, 32, `${group.dir}/${i}.png SpriteFrame 高度不是 32`);
      assert.equal(sf.rawWidth, 32, `${group.dir}/${i}.png rawWidth 不是 32`);
      assert.equal(sf.rawHeight, 32, `${group.dir}/${i}.png rawHeight 不是 32`);
    }
  }
});

test('r37 锚点 (16,30) 与 r36 物理像素整数倍规则：三组事件、四尺寸', () => {
  assert.equal(EVENT_NPC_FOOT_X, 16, '脚底锚点 X 不是 16');
  assert.equal(EVENT_NPC_FOOT_Y, 30, '脚底锚点 Y 不是 30');
  assert.ok(Math.abs(EVENT_NPC_ANCHOR_X - 16 / 32) < 1e-9, '锚点 X 不是 16/32');
  assert.ok(Math.abs(EVENT_NPC_ANCHOR_Y - (1 - 30 / 32)) < 1e-9, '锚点 Y 不是 1-30/32');

  const viewports = [
    { name: '320x568', cssW: 320, cssH: 568, dpr: 2 },
    { name: '375x667', cssW: 375, cssH: 667, dpr: 2 },
    { name: '390x844', cssW: 390, cssH: 844, dpr: 3 },
    { name: '428x926', cssW: 428, cssH: 926, dpr: 3 },
  ];
  const eventIds = ['auntie', 'patrol', 'wallet'] as const;
  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const visibleW = vp.cssW * visibleH / vp.cssH;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      for (const eventId of eventIds) {
        const anchor = eventRoleAnchor(eventId);
        assert.ok(Math.abs(anchor.x - EVENT_NPC_ANCHOR_X) < 1e-9, `${eventId} 锚点 X 不是 16/32`);
        assert.ok(Math.abs(anchor.y - EVENT_NPC_ANCHOR_Y) < 1e-9, `${eventId} 锚点 Y 不是 1-30/32`);

        const layout = computeEventLayout({
          visibleW,
          visibleH,
          headerTop: 0,
          safeBottom: 0,
          titleText: eventId,
          options: ['继续'],
          desc: '测试描述',
          eventId,
          dpr: vp.dpr,
        });
        const tag = `${vp.name} ${eventId}`;
        assert.ok(Math.abs(layout.role.anchorX - 16 / 32) < 1e-9, `${tag} 节点锚点 X 不对`);
        assert.ok(Math.abs(layout.role.anchorY - (1 - 30 / 32)) < 1e-9, `${tag} 节点锚点 Y 不对`);
        assert.equal(layout.role.width % 32, 0, `${tag} 宽度不是 32 的整数倍`);
        assert.equal(layout.role.height, layout.role.width, `${tag} 角色被单轴拉伸`);
        assert.equal(layout.role.scale, Math.floor(layout.role.scale), `${tag} 缩放不是整数`);
        assert.equal(layout.role.sourcePixelScale, Math.floor(layout.role.sourcePixelScale),
          `${tag} 每源像素物理像素不是整数`);
        assert.equal(layout.role.nodeScale * vp.dpr, layout.role.sourcePixelScale,
          `${tag} nodeScale ≠ k/dpr`);
      }
    }
  } finally {
    setFontScreenMetrics({
      physicalWidth: DESIGN_WIDTH,
      physicalHeight: DESIGN_HEIGHT,
      visibleWidth: DESIGN_WIDTH,
      visibleHeight: DESIGN_HEIGHT,
      devicePixelRatio: 1,
    });
  }
});
