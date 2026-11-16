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
    /** bg 分包里的序列帧数量（目录内 0.png..N-1.png）。 */
    frames?: number;
};

export const ART_ALIAS: Record<string, ArtAlias> = {
    // ---------- 主角 ----------
    hero_idle: { src: 'res', path: 'hero_idle' },
    hero_walk: { src: 'bg', path: 'hero_walk', frames: 6 },
    hero_dig: { src: 'res', path: 'hero_dig' },
    hero_fall: { src: 'bg', path: 'hero_fall_sleep', frames: 4 },
    hero_pant: { src: 'res', path: 'hero_pant' },
    hero_hungry: { src: 'res', path: 'hero_hungry' },
    hero_sleep: { src: 'bg', path: 'hero_sleep', frames: 4 },
    hero_move: { src: 'bg', path: 'hero_move', frames: 4 },

    // r31 下雨事件：40x40 主角+伞，雨滴为同画布 2 帧叠加层（4fps = 0.25s/帧）。
    hero_rain: { src: 'res', path: 'hero_rain' },
    rain_drops: { src: 'res', path: 'rain_drops', fps: 4 },

    // ---------- 盒子 ----------
    box_small: { src: 'res', path: 'box_bag_shake' },
    box_big: { src: 'res', path: 'box_bin_shake' },
    box_big_alt: { src: 'res', path: 'box_scrap_shake' },

    // ---------- 光效 ----------
    glow_white: { src: 'bg', path: 'glow_white', frames: 6 },
    glow_blue: { src: 'bg', path: 'glow_blue', frames: 6 },
    glow_gold: { src: 'bg', path: 'glow_gold', frames: 6 },
    glow_rainbow: { src: 'bg', path: 'glow_rainbow', frames: 6 },

    // ---------- 开盖特效 ----------
    lid_pop: { src: 'res', path: 'fx_lidpop' },
    pop_flash: { src: 'res', path: 'fx_item_pop' },
    fx_flashlight: { src: 'bg', path: 'fx_flashlight', frames: 4 },
    fx_clash: { src: 'bg', path: 'fx_clash', frames: 4 },

    // ---------- NPC / 事件 ----------
    npc_patrol: { src: 'bg', path: 'npc_patrol_uncle', frames: 4 },
    ev_patrol: { src: 'bg', path: 'npc_patrol_uncle', frames: 4 },

    npc_guard: { src: 'bg', path: 'npc_guard', frames: 4 },
    ev_guard: { src: 'bg', path: 'npc_guard', frames: 4 },

    npc_rival: { src: 'bg', path: 'npc_rival', frames: 4 },
    ev_rival: { src: 'bg', path: 'npc_rival', frames: 4 },

    npc_cat: { src: 'res', path: 'npc_cat' },
    ev_cat: { src: 'res', path: 'npc_cat' },

    npc_auntie: { src: 'bg', path: 'npc_kind_auntie', frames: 4 },
    ev_auntie: { src: 'bg', path: 'npc_kind_auntie', frames: 4 },

    npc_courier: { src: 'bg', path: 'npc_delivery_rider', frames: 3 },
    ev_delivery: { src: 'bg', path: 'npc_delivery_rider', frames: 3 },

    // r35：失主 NPC 与钱包（icons/wallet.png）分开；钱包画面不再用失主代替。
    npc_wallet_owner: { src: 'bg', path: 'npc_wallet_owner', frames: 3 },
    ev_wallet: { src: 'bg', path: 'npc_wallet_owner', frames: 3 },
    icon_wallet: { src: 'res', path: 'icons/wallet' },

    npc_sanitation: { src: 'bg', path: 'npc_sanitation_auntie', frames: 3 },
    ev_night_warmth: { src: 'bg', path: 'npc_sanitation_auntie', frames: 3 },

    // ---------- 地图图标（bg 分包，48x48） ----------
    map_icon_baishizhou: { src: 'bg', path: 'map_icons/baishizhou' },
    map_icon_baishizhou_locked: { src: 'bg', path: 'map_icons/baishizhou_locked' },
    map_icon_dongmen: { src: 'bg', path: 'map_icons/dongmen' },
    map_icon_dongmen_locked: { src: 'bg', path: 'map_icons/dongmen_locked' },
    map_icon_huaqiangbei: { src: 'bg', path: 'map_icons/huaqiangbei' },
    map_icon_huaqiangbei_locked: { src: 'bg', path: 'map_icons/huaqiangbei_locked' },
    map_icon_futian_cbd: { src: 'bg', path: 'map_icons/futian_cbd' },
    map_icon_futian_cbd_locked: { src: 'bg', path: 'map_icons/futian_cbd_locked' },
    map_icon_nanshan_tech: { src: 'bg', path: 'map_icons/nanshan_tech' },
    map_icon_nanshan_tech_locked: { src: 'bg', path: 'map_icons/nanshan_tech_locked' },
    map_icon_sz_bay: { src: 'bg', path: 'map_icons/sz_bay' },
    map_icon_sz_bay_locked: { src: 'bg', path: 'map_icons/sz_bay_locked' },
    map_icon_window_world: { src: 'bg', path: 'map_icons/window_world' },
    map_icon_window_world_locked: { src: 'bg', path: 'map_icons/window_world_locked' },
    map_icon_university_town: { src: 'bg', path: 'map_icons/university_town' },
    map_icon_university_town_locked: { src: 'bg', path: 'map_icons/university_town_locked' },

    // ---------- 地点 NPC（bg 分包，32x32 x4） ----------
    npc_baishizhou: { src: 'bg', path: 'npc_baishizhou', frames: 4 },
    npc_dongmen: { src: 'bg', path: 'npc_dongmen', frames: 4 },
    npc_huaqiangbei: { src: 'bg', path: 'npc_huaqiangbei', frames: 4 },
    npc_futian_cbd: { src: 'bg', path: 'npc_futian_cbd', frames: 4 },
    npc_nanshan_tech: { src: 'bg', path: 'npc_nanshan_tech', frames: 4 },
    npc_sz_bay: { src: 'bg', path: 'npc_sz_bay', frames: 4 },
    npc_window_world: { src: 'bg', path: 'npc_window_world', frames: 4 },
    npc_university_town: { src: 'bg', path: 'npc_university_town', frames: 4 },
    npc_recycle_station: { src: 'bg', path: 'npc_recycle_station', frames: 4 },

    // ---------- 摇签 / 卡片 ----------
    fortune_tube: { src: 'res', path: 'fortune_cup', fps: 10, loopFrom: 1 },
    // r33 签纸：96×160，九宫格 L18/R18/T32/B33；文字区源像素 (21,35)-(74,123)。
    fortune_paper: { src: 'res', path: 'fortune_paper', insets: [18, 18, 32, 33] },
    fortune_slip: { src: 'res', path: 'fortune_slip', insets: [18, 18, 32, 33] },

    card_daily: { src: 'bg', path: 'card_daily', frames: 1 },
    card_day: { src: 'bg', path: 'card_daily', frames: 1 },
    card_fail: { src: 'bg', path: 'card_fail', frames: 1 },
    card_cert: { src: 'bg', path: 'card_cert', frames: 1 },

    // ---------- 分享底图 ----------
    share_death_bg: { src: 'bg', path: 'share/share_death_bg' },
    share_cert_bg: { src: 'bg', path: 'share/share_cert_bg' },
    share_qr: { src: 'res', path: 'share/qr' },

    // ---------- UI 条 / 按钮 / 面板 ----------
    bar_hunger: { src: 'res', path: 'bar_frame_yellow', insets: [3, 3, 3, 3] },
    bar_stamina: { src: 'res', path: 'bar_frame_red', insets: [3, 3, 3, 3] },
    bar_mood: { src: 'res', path: 'bar_frame_blue', insets: [2, 2, 2, 2] },

    button: { src: 'res', path: 'button_normal', insets: [2, 2, 2, 4] },
    button_pressed: { src: 'res', path: 'button_pressed', insets: [5, 5, 4, 5] },
    panel: { src: 'res', path: 'panel_frame', insets: [5, 3, 5, 5] },

    // ---------- r9 地图可读性 UI（bg 分包，9-slice 数值与 .meta 一致） ----------
    label_plate: { src: 'bg', path: 'label_plate', insets: [8, 8, 5, 5] },
    label_plate_locked: { src: 'bg', path: 'label_plate_locked', insets: [8, 8, 5, 5] },
    icon_lock_16: { src: 'bg', path: 'icon_lock_16' },
    bottom_bar: { src: 'bg', path: 'bottom_bar', insets: [8, 8, 4, 4] },
    badge: { src: 'bg', path: 'badge' },

    // r29：睡觉按钮文字区备用素材（主包 ui 目录，体积很小）。
    icon_moon: { src: 'res', path: 'ui/icon_moon' },

    // ---------- r8 日结算卡 / 功能格 / 睡觉按钮 ----------
    settle_card: { src: 'bg', path: 'settle_card', insets: [4, 4, 4, 4] },
    stat_income: { src: 'bg', path: 'stat_income' },
    stat_fullness: { src: 'bg', path: 'stat_fullness' },
    stat_stamina: { src: 'bg', path: 'stat_stamina' },
    slot_food: { src: 'bg', path: 'slot_food' },
    slot_food_gray: { src: 'bg', path: 'slot_food_gray' },
    slot_bag: { src: 'bg', path: 'slot_bag' },
    slot_bag_gray: { src: 'bg', path: 'slot_bag_gray' },
    slot_home: { src: 'bg', path: 'slot_home' },
    slot_home_gray: { src: 'bg', path: 'slot_home_gray' },
    btn_sleep: { src: 'bg', path: 'btn_sleep', insets: [24, 12, 3, 3] },
    btn_sleep_pressed: { src: 'bg', path: 'btn_sleep_pressed', insets: [24, 12, 3, 3] },

    // ---------- 事件页背景 ----------
    // r29 通用夜景；r33 四个事件改用专属背景，其余事件继续 event_night。
    // 文件缺失时 EventView 会退到 event_night / 当前地点 bg_*，再退到通用场景。
    event_night: { src: 'bg', path: 'event_night' },
    event_night_fallback: { src: 'bg', path: 'loc_night_market' },
    event_rain: { src: 'bg', path: 'event_rain' },
    event_patrol: { src: 'bg', path: 'event_patrol' },
    event_guard: { src: 'bg', path: 'event_guard' },
    event_auntie: { src: 'bg', path: 'event_auntie' },

    // ---------- 背景（bg 分包，r7 像素地点背景） ----------
    bg_huaqiangbei: { src: 'bg', path: 'huaqiangbei' },
    bg_dongmen: { src: 'bg', path: 'dongmen' },
    bg_baishizhou: { src: 'bg', path: 'baishizhou' },
    bg_futian_cbd: { src: 'bg', path: 'futian_cbd' },
    bg_nanshan_tech: { src: 'bg', path: 'nanshan_tech' },
    bg_sz_bay: { src: 'bg', path: 'sz_bay' },
    bg_window_world: { src: 'bg', path: 'window_world' },
    bg_university_town: { src: 'bg', path: 'university_town' },

    map: { src: 'bg', path: 'map_shenzhen_px' },

    // r8 三档落脚点：天桥底纸皮铺 / 城中村握手楼床位 / 带窗户和风扇的小单间
    home_0: { src: 'bg', path: 'home_lv1' },
    home_1: { src: 'bg', path: 'home_lv2' },
    home_2: { src: 'bg', path: 'home_lv3' },
    home_lv1: { src: 'bg', path: 'home_lv1' },
    home_lv2: { src: 'bg', path: 'home_lv2' },
    home_lv3: { src: 'bg', path: 'home_lv3' },
    home_lv1_lights: { src: 'bg', path: 'home_lv1_lights' },
    home_lv3_lights: { src: 'bg', path: 'home_lv3_lights' },

    // 露宿地点映射：bench→公园长椅、diner（通宵堡）→24h 汉堡店、netcafe→星河网咖
    sleep_bench: { src: 'bg', path: 'sleep_park' },
    sleep_diner: { src: 'bg', path: 'sleep_burger' },
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
    wallet: 'wallet',
};

/**
 * locationId → 地图 360x640 像素坐标（原点左上）。
 * Art.ts 中换算为 Cocos 坐标：
 *   cx = (x - 180) * 2
 *   cy = (320 - y) * 2
 */
export const MAP_POINTS: Record<string, { x: number; y: number }> = {
    university_town: { x: 63, y: 61 },
    nanshan_tech: { x: 81, y: 231 },
    baishizhou: { x: 221, y: 153 },
    sz_bay: { x: 122, y: 347 },
    window_world: { x: 242, y: 471 },
    futian_cbd: { x: 281, y: 394 },
    huaqiangbei: { x: 300, y: 274 },
    dongmen: { x: 301, y: 72 },
};