// ============================================================
// データ駆動ローダー
// data/*.json (本体) と mods/manifest.json に列挙された各MOD JSONを
// 同じ経路でマージする。IDが衝突した場合は後から読み込んだ方(MOD)が
// 上書きする -> MODによるバランス調整/追加が容易。
// ============================================================
function emptyRegistry() {
    return {
        abnormalities: {}, weapons: {}, armors: {}, gifts: {},
        jobs: {}, research: {}, sephirah: {}, events: {}, themes: {},
    };
}
async function fetchJson(path) {
    try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    catch {
        return null;
    }
}
function mergeById(target, list) {
    if (!list)
        return;
    for (const item of list)
        target[item.id] = item;
}
function applyBundle(reg, bundle) {
    mergeById(reg.abnormalities, bundle.abnormalities);
    mergeById(reg.weapons, bundle.weapons);
    mergeById(reg.armors, bundle.armors);
    mergeById(reg.gifts, bundle.gifts);
    mergeById(reg.jobs, bundle.jobs);
    mergeById(reg.research, bundle.research);
    mergeById(reg.sephirah, bundle.sephirah);
    mergeById(reg.events, bundle.events);
    mergeById(reg.themes, bundle.themes);
    if (bundle.generatorParts)
        reg.generatorParts = bundle.generatorParts;
}
const BASE_FILES = [
    "data/abnormalities.json",
    "data/ego_weapons.json",
    "data/ego_armors.json",
    "data/gifts.json",
    "data/jobs.json",
    "data/research.json",
    "data/sephirah.json",
    "data/events.json",
    "data/themes.json",
    "data/generator_parts.json",
];
export async function loadAllData(log) {
    const reg = emptyRegistry();
    for (const path of BASE_FILES) {
        const bundle = await fetchJson(path);
        if (bundle) {
            applyBundle(reg, bundle);
        }
        else {
            log(`[データ] ${path} の読み込みに失敗しました(スキップ)`);
        }
    }
    // MODマニフェストを読み込み、記載されているJSONを全て追加読み込みする。
    // file:// で直接開いている場合はfetchがCORSでブロックされることがあるため、
    // 失敗しても静かにスキップしローカルHTTPサーバでの起動時のみ有効とする。
    const manifest = await fetchJson("mods/manifest.json");
    if (manifest && Array.isArray(manifest.mods)) {
        for (const modPath of manifest.mods) {
            const bundle = await fetchJson(`mods/${modPath}`);
            if (bundle) {
                applyBundle(reg, bundle);
                log(`[MOD] ${modPath} を読み込みました`);
            }
            else {
                log(`[MOD] ${modPath} の読み込みに失敗しました`);
            }
        }
    }
    return reg;
}
// 手動MODインポート(file://環境やユーザーが個別に選んだファイル向け)
export async function importModFile(file, reg, log) {
    try {
        const text = await file.text();
        const bundle = JSON.parse(text);
        applyBundle(reg, bundle);
        log(`[MOD] ${file.name} を手動読み込みしました`);
    }
    catch (e) {
        log(`[MOD] ${file.name} の解析に失敗しました: ${e.message}`);
    }
}
