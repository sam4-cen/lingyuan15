# R40 两文件交接（不依赖 git）

## 唯一变更文件

只交接：

1. `cocos/assets/scripts/ui/MapLayout.ts` -> Mac `assets/scripts/ui/MapLayout.ts`
2. `cocos/assets/scripts/GameRoot.ts` -> Mac `assets/scripts/GameRoot.ts`

不交接 `test/r39.test.ts`；Mac 项目没有 test 目录。

## 父/新 hash（已核实）

| 文件 | 父 5ec8fde bytes/sha256 | 新 d3d65b6 bytes/sha256 |
|---|---|---|
| MapLayout.ts | 17067 / `a524788a16d9d6a1776989a0d34a6cfc24413e1dc70901ae6302c2b93b955198` | 18007 / `b7db7976c14324a7eb57835ee4daba74a36ad267e2e8ce29492b7d7e567fd134` |
| GameRoot.ts | 80139 / `1ffdf30c71e41a189ce5a19030045067519fef54a79c548c2229e2aa4b964471` | 80223 / `7fd8f57703f990b7e3327536dc084ff12daf20ec17eaac1030d7261a987b2ecf` |

## Box 导出新文件（新目录，不覆盖旧工具）

```bash
OUT=/workspace/ly15_r40_handoff_d3d65b6_20261116
/bin/test ! -e "$OUT"
/bin/mkdir "$OUT"

GIT_CONFIG_COUNT=0 /usr/bin/git -C /workspace/lingyuan15 show \
  d3d65b6:cocos/assets/scripts/ui/MapLayout.ts > "$OUT/MapLayout.ts"
GIT_CONFIG_COUNT=0 /usr/bin/git -C /workspace/lingyuan15 show \
  d3d65b6:cocos/assets/scripts/GameRoot.ts > "$OUT/GameRoot.ts"

/usr/bin/shasum -a 256 "$OUT/MapLayout.ts" "$OUT/GameRoot.ts"
/usr/bin/stat -f '%N %z' "$OUT/MapLayout.ts" "$OUT/GameRoot.ts"
```

期望：

```text
b7db7976c14324a7eb57835ee4daba74a36ad267e2e8ce29492b7d7e567fd134  MapLayout.ts
7fd8f57703f990b7e3327536dc084ff12daf20ec17eaac1030d7261a987b2ecf  GameRoot.ts
18007 MapLayout.ts
80223 GameRoot.ts
```

将 `R40_TWO_FILE_HANDOFF.md` 与两个文件一起经 CopyFromBox 传到 Mac。

## Mac 新建源码副本并替换

原件目录：

`/Users/[REDACTED]/Documents/lingyuan15`

全新源码副本：

`/Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116`

不得覆盖原件；不得删除旧 build。

```bash
SRC=/Users/[REDACTED]/Documents/lingyuan15
NEWSRC=/Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116
HANDOFF=/Users/[REDACTED]/Documents/ly15_r40_handoff_d3d65b6_20261116

/bin/test ! -e "$NEWSRC"
/usr/bin/ditto "$SRC" "$NEWSRC"

# 替换前：Mac 原件两文件必须等于父 5ec8fde
/usr/bin/shasum -a 256 \
  "$NEWSRC/assets/scripts/ui/MapLayout.ts" \
  "$NEWSRC/assets/scripts/GameRoot.ts"
```

父期望：

```text
a524788a16d9d6a1776989a0d34a6cfc24413e1dc70901ae6302c2b93b955198  assets/scripts/ui/MapLayout.ts
1ffdf30c71e41a189ce5a19030045067519fef54a79c548c2229e2aa4b964471  assets/scripts/GameRoot.ts
```

只替换**新副本**：

```bash
/bin/cp "$HANDOFF/MapLayout.ts" "$NEWSRC/assets/scripts/ui/MapLayout.ts"
/bin/cp "$HANDOFF/GameRoot.ts" "$NEWSRC/assets/scripts/GameRoot.ts"

/usr/bin/shasum -a 256 \
  "$NEWSRC/assets/scripts/ui/MapLayout.ts" \
  "$NEWSRC/assets/scripts/GameRoot.ts"
```

新期望：

```text
b7db7976c14324a7eb57835ee4daba74a36ad267e2e8ce29492b7d7e567fd134  assets/scripts/ui/MapLayout.ts
7fd8f57703f990b7e3327536dc084ff12daf20ec17eaac1030d7261a987b2ecf  assets/scripts/GameRoot.ts
```

原件 `/Users/[REDACTED]/Documents/lingyuan15` 始终不动。
