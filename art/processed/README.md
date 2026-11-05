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
