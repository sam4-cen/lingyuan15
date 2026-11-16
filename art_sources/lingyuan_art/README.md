# 0元深圳15天 像素素材（muse.ai 原图后处理）

PNG only, transparent bg, ≤32 colors/sprite, nearest-neighbor previews 4x in preview/.
Frames: bottom-aligned (1px pad), horizontally centered; strips are horizontal, left→right.

| files | frame size | frames | anim |
|---|---|---|---|
| sprites/hero_idle_strip.png + hero_idle_0..5.png | 32x32 | 6 | hero_idle |
| sprites/hero_walk_strip.png + hero_walk_0..5.png | 32x32 | 6 | hero_walk |
| sprites/hero_dig_strip.png + hero_dig_0..5.png | 32x32 | 6 | hero_dig |
| sprites/hero_fall_sleep_strip.png + hero_fall_sleep_0..3.png | 32x32 | 4 | hero_fall_sleep |
| sprites/box_bag_shake_strip.png + box_bag_shake_0..2.png | 32x32 | 3 | box_bag_shake |
| sprites/box_bin_shake_strip.png + box_bin_shake_0..2.png | 48x48 | 3 | box_bin_shake |
| sprites/box_scrap_shake_strip.png + box_scrap_shake_0..2.png | 48x48 | 3 | box_scrap_shake |
| fx/glow_blue_strip.png + glow_blue_0..5.png | 48x48 | 6 | glow_blue |
| fx/glow_gold_strip.png + glow_gold_0..5.png | 48x48 | 6 | glow_gold |
| fx/glow_rainbow_strip.png + glow_rainbow_0..5.png | 48x48 | 6 | glow_rainbow |
| icons/items_atlas.png + .json + icons/<name>.png | 16x16 | 51 | items (atlas 128x112; +17 extra icons appended at index 34-50) |
| npc/npc_patrol_uncle_strip.png + npc_patrol_uncle_0..3.png | 32x32 | 4 | npc_patrol_uncle |
| npc/npc_guard_strip.png + npc_guard_0..3.png | 32x32 | 4 | npc_guard |
| npc/npc_rival_strip.png + npc_rival_0..3.png | 32x32 | 4 | npc_rival |
| npc/npc_cat_strip.png + npc_cat_0..3.png | 32x32 | 4 | npc_cat |
| npc/npc_kind_auntie_strip.png + npc_kind_auntie_0..3.png | 32x32 | 4 | npc_kind_auntie |
| npc/npc_delivery_rider_strip.png + npc_delivery_rider_0..2.png | 32x32 | 3 | npc_delivery_rider |
| npc/npc_sanitation_auntie_strip.png + npc_sanitation_auntie_0..2.png | 32x32 | 3 | npc_sanitation_auntie |
| npc/npc_wallet_owner_strip.png + npc_wallet_owner_0..2.png | 32x32 | 3 | npc_wallet_owner |
| bg/loc_bg_compound.png | 180x320 | 1 | loc_compound (64 colors, opaque) |
| fx/glow_white_strip.png + glow_white_0..5.png | 48x48 | 6 | glow_white |
| fx/fx_lidpop_strip.png + fx_lidpop_0..4.png | 48x48 | 5 | fx_lidpop |
| fortune/fortune_cup_strip.png + fortune_cup_0..6.png | 64x96 | 7 | fortune_cup (frame 0 = rest pose, 1-6 = shake loop) |
| fortune/fortune_slip.png | 64x96 | 1 | fortune_slip (blank) |
| bg/loc_huaqiangbei.png | 180x320 | 1 | loc_huaqiangbei (64 colors, opaque) |
| bg/loc_dongmen.png | 180x320 | 1 | loc_dongmen (64 colors, opaque) |
| bg/loc_baishizhou.png | 180x320 | 1 | loc_baishizhou (64 colors, opaque) |
| bg/loc_futian_cbd.png | 180x320 | 1 | loc_futian_cbd (64 colors, opaque) |
| bg/loc_nanshan_tech.png | 180x320 | 1 | loc_nanshan_tech (64 colors, opaque) |
| bg/loc_night_market.png | 180x320 | 1 | loc_night_market (64 colors, opaque) |
| bg/loc_fastfood_back.png | 180x320 | 1 | loc_fastfood_back (64 colors, opaque) |
| bg/shelter_bed.png | 180x320 | 1 | shelter_bed (64 colors, opaque) |
| bg/shelter_bed_up.png | 180x320 | 1 | shelter_bed_up (64 colors, opaque) |
| bg/shelter_recycle.png | 180x320 | 1 | shelter_recycle (64 colors, opaque) |
| bg/shelter_recycle_up.png | 180x320 | 1 | shelter_recycle_up (v2: cot, no people; 64 colors) |
| bg/sleep_park.png | 180x320 | 1 | sleep_park (64 colors, opaque) |
| bg/sleep_fastfood.png | 180x320 | 1 | sleep_fastfood (64 colors, opaque) |
| bg/sleep_netcafe.png | 180x320 | 1 | sleep_netcafe (64 colors, opaque) |
| bg/map_shenzhen.png | 360x640 | 1 | map (64 colors) |
| ui/bar_frame_red.png | 43x18 | 1 | bar_frame_red 9-slice insets L/R/T/B=3/3/3/3 |
| ui/bar_frame_yellow.png | 43x18 | 1 | bar_frame_yellow 9-slice insets L/R/T/B=3/3/3/3 |
| ui/bar_frame_blue.png | 43x18 | 1 | bar_frame_blue 9-slice insets L/R/T/B=2/2/2/2 |
| ui/inv_grid_normal.png | 38x36 | 1 | inv_grid_normal (5x5 grid panel, not single cell) |
| ui/inv_grid_highlight.png | 38x36 | 1 | inv_grid_highlight (5x5 grid panel, not single cell) |
| ui/inv_grid_red.png | 37x36 | 1 | inv_grid_red (5x5 grid panel, not single cell) |
| ui/button_normal.png | 33x14 | 1 | button_normal 9-slice insets L/R/T/B=2/2/2/4 |
| ui/button_pressed.png | 33x14 | 1 | button_pressed 9-slice insets L/R/T/B=5/5/4/5 |
| ui/panel_frame.png | 130x20 | 1 | panel_frame 9-slice insets L/R/T/B=5/3/5/5 |
| cards/card_daily.png | 300x400 | 1 | card_daily (src 583x962 stretched) |
| cards/card_fail.png | 300x400 | 1 | card_fail (src 583x962 stretched) |
| cards/card_cert.png | 300x400 | 1 | card_cert (src 597x974 stretched) |
| fx/fx_item_pop_strip.png + fx_item_pop_0..4.png | 32x32 | 5 | fx_item_pop |
| fx/fx_flashlight_strip.png + fx_flashlight_0..3.png | 48x48 | 4 | fx_flashlight (v2; source frame 3 upward beam dropped; last frame clipped at source edge) |
| fx/fx_clash_strip.png + fx_clash_0..3.png | 48x48 | 4 | fx_clash |

## map_shenzhen marker ring centers (px in 360x640, approx)
- ring 1: x=210, y=154
- ring 2: x=301, y=216
- ring 3: x=43, y=264
- ring 4: x=178, y=301
- ring 5: x=106, y=311
- ring 6: x=329, y=357
- ring 7: x=244, y=403
- ring 8: x=59, y=421

## 9-slice
Insets measured to the first fill pixel; use as cap insets. ui/ assets are at native pixel scale (source /13). inv_grid_* are full 5x5 grid panels as drawn.

## landmarks (r6)
| files | size | frames | note |
|---|---|---|---|
| landmarks/huaqiangbei.png | 138x112 | 1 | huaqiangbei: electronics stall + cables (19.0KB) |
| landmarks/baishizhou.png | 125x112 | 1 | baishizhou: handshake buildings + laundry (18.7KB) |
| landmarks/window_world.png | 140x94 | 1 | window_world: shared-bike pile over subway (19.5KB) |
| landmarks/nanshan_tech.png | 206x165 | 1 | nanshan_tech: badge + lockers (17.8KB) |
| landmarks/dongmen.png | 131x112 | 1 | dongmen: dessert stall (HD) (17.5KB) |
| landmarks/futian_cbd.png | 49x192 | 1 | futian_cbd: glass tower (HD) (11.0KB) |
| landmarks/sz_bay.png | 155x154 | 1 | sz_bay: boardwalk+bamboo tower vignette+2px outline (HD) (18.8KB) |
| landmarks/university_town.png | 140x87 | 1 | university_town: library+bike shed (HD) (17.5KB) |

## share cards (r6, 720×1280)
Blank regions for overlay text/QR (coords in 720×1280). Death has no separate title ribbon — put title on the stats panel.
**Quality:** `lm_sheet_b` and `share_death` replaced with HD (`lm_sheet_b_hd` 1600×1600, `share_death_hd` 1152×2048). `sz_bay` kept as rectangular vignette with 2px dark outline (sky/sea are part of the scene).
- `share/share_death_bg.png` (171KB; src 1152×2048 HD)
  - title: (none — overlay on stats)
  - stats: x=2 y=998 w=715 h=279
  - qr: x=589 y=1146 w=98 h=98
- `share/share_cert_bg.png` (73KB; src 1152×2048)
  - title: x=113 y=84 w=494 h=142
  - stats: x=84 y=622 w=552 h=322
  - qr: x=481 y=1045 w=168 h=150

**Cert note:** stats panel sits behind the hero’s head/box — keep text in the upper ~60% of the stats rect.

## outlined icons / boxes (r7)
Dark outline `#1a1020`. Icons padded 16→18. Boxes: dark outline + outer light `#f4e8c8`.
| icons_outlined/<name>.png + items_outlined_atlas.png/.json | 18x18 | 51 | same order as items_atlas.json; atlas 144x126 (8 cols) |
| sprites/box_bag_shake_*_ol.png + box_bag_shake_strip_ol.png | 36x36 | 3 | padded +4 (margin was 1px) |
| sprites/box_bin_shake_*_ol.png + box_bin_shake_strip_ol.png | 52x52 | 3 | padded +4 (margin was 1px) |
| sprites/box_scrap_shake_*_ol.png + box_scrap_shake_strip_ol.png | 52x52 | 3 | padded +4 (margin was 1px) |

Possibly harder to read after outline: sunglasses (very dark content, dark outline may merge)

## r7 batch 1
Pixel map + map icons + tired hero + location NPCs. PNG only.

### MAP_POINTS (coords in `bg/map_shenzhen_px.png` 360×640)
Clearings detected as ~92px white disks; centres scaled to 360×640. Mapping by stylized Shenzhen geography (sea = west/south). **dongmen** sits NE on this art (stylized).
- university_town: x=63, y=61
- nanshan_tech: x=81, y=231
- baishizhou: x=221, y=153
- sz_bay: x=122, y=347
- window_world: x=242, y=471
- futian_cbd: x=281, y=394
- huaqiangbei: x=300, y=274
- dongmen: x=301, y=72

| files | size | frames | note |
|---|---|---|---|
| bg/map_shenzhen_px.png | 360x640 | 1 | 16 colours, 78KB (target ≤60KB not reached) |
| map_icons/huaqiangbei.png + huaqiangbei_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2450B) |
| map_icons/baishizhou.png + baishizhou_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (3764B) |
| map_icons/window_world.png + window_world_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2778B) |
| map_icons/nanshan_tech.png + nanshan_tech_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2787B) |
| map_icons/dongmen.png + dongmen_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2968B) |
| map_icons/futian_cbd.png + futian_cbd_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2050B) |
| map_icons/sz_bay.png + sz_bay_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2232B) |
| map_icons/university_town.png + university_town_locked.png | 48x48 | 1 | 1px dark outline; locked=desat×0.45 (2374B) |
| sprites/hero_pant_strip.png + _0..3 | 32x32 | 4 | content h matches hero_idle (29px); 4786B |
| sprites/hero_hungry_strip.png + _0..3 | 32x32 | 4 | +1px horizontal sway; 5041B |
| npc/npc_huaqiangbei_strip.png + _0..3 | 32x32 | 4 | |
| npc/npc_baishizhou_strip.png + _0..3 | 32x32 | 4 | |
| npc/npc_window_world_strip.png + _0..3 | 32x32 | 4 | |
| npc/npc_nanshan_tech_strip.png + _0..3 | 32x32 | 4 | |
| npc/npc_dongmen_strip.png + _0..3 | 32x32 | 4 | |
| npc/npc_futian_cbd_strip.png + _0..3 | 32x32 | 4 | |
| npc/npc_sz_bay_strip.png + _0..3 | 32x32 | 4 | r7_npc_c jogger; 4275B |
| npc/npc_university_town_strip.png + _0..3 | 32x32 | 4 | r7_npc_c student; 3813B |
| npc/npc_recycle_station_strip.png + _0..3 | 32x32 | 4 | |

**Weak / notes:**
- `futian_cbd` map icon: padded + re-outlined so bottom outline closes (1944B).
- `npc_sz_bay` / `npc_university_town`: replaced from r7_npc_c.webp (jogger/student, white-key, 29px, #1a1020 outline); old boardwalk blobs discarded.
- `npc_window_world`: subway grey strip removed; clean.
- `hero_hungry` wobble is subtle even with sway offsets.
- Map at 16 colours is ~78KB; further cuts hurt road/park readability.

## r7 backgrounds (180×320, opaque, indexed ≤20KB)
BOX downscale from 1152×2048, MEDIANCUT no dither, mode=P PNG.
| files | size | KB | colours | note |
|---|---|---|---|---|
| bg/huaqiangbei.png | 180x320 | 19.5 | 16 |  |
| bg/baishizhou.png | 180x320 | 19.5 | 16 |  |
| bg/window_world.png | 180x320 | 13.9 | 16 | no text/number marks at full-res (blank plaque only) |
| bg/nanshan_tech.png | 180x320 | 14.5 | 16 |  |
| bg/dongmen.png | 180x320 | 15.2 | 16 |  |
| bg/futian_cbd.png | 180x320 | 15.6 | 16 |  |
| bg/sz_bay.png | 180x320 | 9.1 | 16 |  |
| bg/university_town.png | 180x320 | 12.5 | 16 |  |
| bg/recycle_station.png | 180x320 | 9.4 | 16 |  |

## r8 assets
BOX downscale / white-key / MEDIANCUT no dither; lights overlays for blink.

### backgrounds (180×320 opaque ≤20KB)
| files | size | KB | note |
|---|---|---|---|
| bg/home_lv1.png | 180x320 | 8.65 | underpass home + distant city |
| bg/home_lv2.png | 180x320 | 10.34 | bunk / clothesline room |
| bg/home_lv3.png | 180x320 | 10.34 | apartment + window skyline |
| bg/home_lv1_lights.png | 180x320 | 1.12 | transparent city-light overlay (blink); RGBA |
| bg/home_lv3_lights.png | 180x320 | 4.6 | transparent window/city-light overlay (blink) |
| bg/sleep_park.png | 180x320 | 8.73 | r8 overwrite |
| bg/sleep_burger.png | 180x320 | 9.03 | new |
| bg/sleep_netcafe.png | 180x320 | 10.39 | r8 overwrite |
| bg/sleep_fastfood.png | 180x320 | (kept) | old asset retained |

### hero sprites
| files | size | frames | note |
|---|---|---|---|
| sprites/hero_sleep_0..3 + strip | 48x32 | 4 | lying; body length≈29 (=idle height); frames1-2 +1px chest rise; strip 2.78KB |
| sprites/hero_move_0..3 + strip | 32x32 | 4 | carrying bundle; h=29 matches idle; strip 4.82KB |

### UI (native ≈ source/13)
| files | size | note |
|---|---|---|
| ui/settle_card.png | 34x45 | blank cream card; 9-slice L/R/T/B=4/4/4/4; 1.4KB |
| ui/stat_income.png + _24 | 16x16 / 24x24 | coins + 1px #1a1020 outline |
| ui/stat_fullness.png + _24 | 16x16 / 24x24 | rice bowl + outline |
| ui/stat_stamina.png + _24 | 16x16 / 24x24 | lightning + outline (source bolt crosses frame) |
| ui/slot_food.png + _gray | 48x48 | burger takeout; gray=desat+50% darker |
| ui/slot_bag.png + _gray | 48x48 | backpack+green cross |
| ui/slot_home.png + _gray | 48x48 | house+green up-arrow |
| ui/btn_sleep.png | 117x24 | moon+bed; 9-slice L/R/T/B=12/12/3/3; 1.68KB |
| ui/btn_sleep_pressed.png | 117x24 | content +2px down, darken 15% |

**Weak / notes:**
- `stat_*` at 16×16 are chunky; 24×24 preferred for readability.
- `stat_stamina` bolt crosses frame in source — kept overhang in crop.
- `hero_sleep` source frames nearly identical (~97% similar); artificial 1px chest rise on frames 1–2.
- Lights overlays: lv1 sparse distant band; lv3 dense window grid. Desk lamp in lv3 excluded (large CC).

## r9 map readability + UI chrome
- `bg/map_shenzhen_px.png` calmed (desat/lift buildings; soft water/roads); old → `bg/map_shenzhen_px_old.png`. Geometry/MAP_POINTS unchanged. ≤20 colours.
- `map_icons/<id>_locked.png` redone as light-gray silhouettes (outline kept); old → `map_icons/_old_locked/`.
- UI from `r9_ui_fix.webp`: `label_plate` / `label_plate_locked` 56×16 (9-slice L/R/T/B=8/8/5/5); `icon_lock` 12 + `_16`; `badge` 16×16; `bottom_bar` 360×56 (9-slice L/R/T/B=8/8/4/4).
- Compare: `/workspace/r9_map_compare.png`

## r9b chunky map + pixel font
- Map rebuilt from `map_shenzhen_px_old.png`: mode→180×320, 14 colours, NEAREST ×2 → 360×640 chunky 2×2 blocks. Warm tan/green/blue kept; buildings darkened ~60%. r9 gray wash → `bg/map_shenzhen_px_r9gray.png`.
- Font: Fusion Pixel 12px Proportional ZH Hans (OFL), subset → `font/pixel_cn.ttf` (~185KB) + `font/OFL.txt`.
- Mock: `r9b_map_mock.png` (2×); compare `r9b_compare.png`.
