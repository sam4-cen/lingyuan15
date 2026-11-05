/**
 * assets/scripts/ui/ArtMap.ts
 * 逻辑名 → 美术素材路径 映射表
 * 供 Art.ts 解析 frames / icons / 地图坐标使用
 */

export type ArtAlias = {
    src: 'res' | 'bg';
    path: string;
    fps?: number;
    loopFrom?: number;
    insets?: [number, number, number, number];
};

export const ART_ALIAS: Record<string, ArtAlias> = {
    // ---------- 主角 ----------
    hero_idle: { src: 'res', path: 'hero_idle' },
    hero_walk: { src: 'res', path: 'hero_walk' },
    hero_dig: { src: 'res', path: 'hero_dig' },
    hero_fall: { src: 'res', path: 'hero_fall_sleep' },

    // ---------- 盒子 ----------
    box_small: { src: 'res', path: 'box_bag_shake' },
    box_big: { src: 'res', path: 'box_bin_shake' },
    box_big_alt: { src: 'res', path: 'box_scrap_shake' },

    // ---------- 光效 ----------
    glow_white: { src: 'res', path: 'glow_white' },
    glow_blue: { src: 'res', path: 'glow_blue' },
    glow_gold: { src: 'res', path: 'glow_gold' },
    glow_rainbow: { src: 'res', path: 'glow_rainbow' },

    // ---------- 开盖特效 ----------
    lid_pop: { src: 'res', path: 'fx_lidpop' },
    pop_flash: { src: 'res', path: 'fx_item_pop' },
    fx_flashlight: { src: 'res', path: 'fx_flashlight' },
    fx_clash: { src: 'res', path: 'fx_clash' },

    // ---------- NPC / 事件 ----------
    npc_patrol: { src: 'res', path: 'npc_patrol_uncle' },
    ev_patrol: { src: 'res', path: 'npc_patrol_uncle' },

    npc_guard: { src: 'res', path: 'npc_guard' },
    ev_guard: { src: 'res', path: 'npc_guard' },

    npc_rival: { src: 'res', path: 'npc_rival' },
    ev_rival: { src: 'res', path: 'npc_rival' },

    npc_cat: { src: 'res', path: 'npc_cat' },
    ev_cat: { src: 'res', path: 'npc_cat' },

    npc_auntie: { src: 'res', path: 'npc_kind_auntie' },
    ev_auntie: { src: 'res', path: 'npc_kind_auntie' },

    npc_courier: { src: 'res', path: 'npc_delivery_rider' },
    ev_delivery: { src: 'res', path: 'npc_delivery_rider' },

    ev_wallet: { src: 'res', path: 'npc_wallet_owner' },

    npc_sanitation: { src: 'res', path: 'npc_sanitation_auntie' },
    ev_night_warmth: { src: 'res', path: 'npc_sanitation_auntie' },

    // ---------- 摇签 / 卡片 ----------
    fortune_tube: { src: 'res', path: 'fortune_cup', fps: 10, loopFrom: 1 },
    fortune_slip: { src: 'res', path: 'fortune_slip' },

    card_day: { src: 'res', path: 'card_daily' },
    card_fail: { src: 'res', path: 'card_fail' },
    card_cert: { src: 'res', path: 'card_cert' },

    // ---------- UI 条 / 按钮 / 面板 ----------
    bar_hunger: { src: 'res', path: 'bar_frame_yellow', insets: [3, 3, 3, 3] },
    bar_stamina: { src: 'res', path: 'bar_frame_red', insets: [3, 3, 3, 3] },
    bar_mood: { src: 'res', path: 'bar_frame_blue', insets: [2, 2, 2, 2] },

    button: { src: 'res', path: 'button_normal', insets: [2, 2, 2, 4] },
    button_pressed: { src: 'res', path: 'button_pressed', insets: [5, 5, 4, 5] },
    panel: { src: 'res', path: 'panel_frame', insets: [5, 3, 5, 5] },

    // ---------- 背景（bg 分包） ----------
    bg_huaqiangbei: { src: 'bg', path: 'loc_huaqiangbei' },
    bg_dongmen: { src: 'bg', path: 'loc_dongmen' },
    bg_baishizhou: { src: 'bg', path: 'loc_baishizhou' },
    bg_futian_cbd: { src: 'bg', path: 'loc_futian_cbd' },
    bg_nanshan_tech: { src: 'bg', path: 'loc_nanshan_tech' },

    // 以下逻辑名没有背景素材，Art.ts 中走占位：
    // bg_sz_bay / bg_window_world / bg_university_town

    map: { src: 'bg', path: 'map_shenzhen' },

    home_0: { src: 'bg', path: 'shelter_bed' },
    home_1: { src: 'bg', path: 'shelter_recycle' },
    home_2: { src: 'bg', path: 'shelter_recycle_up' },

    sleep_bench: { src: 'bg', path: 'sleep_park' },
    sleep_diner: { src: 'bg', path: 'sleep_fastfood' },
    sleep_netcafe: { src: 'bg', path: 'sleep_netcafe' },
};

/**
 * itemId → iconName
 * icon 文件位于 assets/resources/art/icons/<iconName>.png
 * 没有登记的 itemId 由 Art.ts 使用占位色块 + 名字首字。
 */
export const ICON_MAP: Record<string, string> = {
    empty_water_bottle: 'plastic_bottle',
    crushed_can: 'soda_can',
    cardboard_box: 'cardboard',
    left_slipper: 'left_slipper',
    broken_umbrella: 'umbrella',
    half_cup_milk_tea: 'milk_tea',
    cold_bun: 'buns',
    half_egg_tart: 'egg_tart',
    expired_bread: 'bread',
    charging_cable: 'charger_cable',
    energy_drink: 'tin_can',
    delivery_set_meal: 'rice_box',
    exam_materials: 'old_book',
    mechanical_keyboard: 'keyboard',
    old_phone: 'old_phone',
    scratch_card: 'scratch_card',
    dead_mouse: 'dead_mouse',

    // 新增的 17 个专属图标（items_atlas 第 34~50 格）
    old_newspaper: 'old_newspaper',
    disposable_chopsticks: 'chopsticks',
    plastic_flower: 'plastic_flower',
    old_clothes: 'old_clothes',
    unopened_rice_ball: 'onigiri_sealed',
    old_rice_cooker: 'old_rice_cooker',
    half_bag_rice: 'half_rice_bag',
    plaid_shirt: 'plaid_shirt',
    metro_card: 'metro_card',
    kite: 'kite',
    power_bank: 'power_bank',
    unopened_mooncake: 'mooncake_sealed',
    brand_briefcase: 'brand_briefcase',
    off_season_tshirt: 'trendy_tshirt',
    graphics_card: 'gpu',
    golden_koi: 'gold_koi',
    cat_hair: 'cat_hair',
};

/**
 * locationId → 地图 360x640 像素坐标（原点左上）。
 * Art.ts 中换算为 Cocos 坐标：
 *   cx = (x - 180) * 2
 *   cy = (320 - y) * 2
 */
export const MAP_POINTS: Record<string, { x: number; y: number }> = {
    university_town: { x: 210, y: 154 },
    huaqiangbei: { x: 301, y: 216 },
    nanshan_tech: { x: 43, y: 264 },
    baishizhou: { x: 178, y: 301 },
    window_world: { x: 106, y: 311 },
    dongmen: { x: 329, y: 357 },
    futian_cbd: { x: 244, y: 403 },
    sz_bay: { x: 59, y: 421 },
};