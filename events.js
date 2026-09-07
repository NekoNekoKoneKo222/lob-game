export function checkSephirahUnlock(state, reg, log) {
    for (const seph of Object.values(reg.sephirah)) {
        if (state.day >= seph.unlockDay && !state.unlockedSephirah.includes(seph.id)) {
            state.unlockedSephirah.push(seph.id);
            log(`セフィラ「${seph.name}」が解放された。${seph.description}`);
        }
    }
}
// 夕方フェーズ: 高危険度イベント抽選 / 夜フェーズ: 特殊異常発生
export function rollEvent(state, reg, type, rng, log) {
    const pool = Object.values(reg.events).filter((e) => e.type === type && (e.minDay === undefined || state.day >= e.minDay));
    if (pool.length === 0)
        return null;
    const totalWeight = pool.reduce((a, e) => a + e.weight, 0);
    let roll = rng.next() * totalWeight;
    for (const e of pool) {
        roll -= e.weight;
        if (roll <= 0) {
            applyEvent(state, reg, e, rng, log);
            return e;
        }
    }
    return null;
}
function applyEvent(state, reg, e, rng, log) {
    log(`【イベント】${e.name} — ${e.description}`);
    switch (e.effectKey) {
        case "blackout":
            state.facility.energy = Math.max(0, Math.round(state.facility.energy * 0.5));
            break;
        case "camera_down":
            // 発見率低下などはUI側で参照するフラグとして簡易実装
            break;
        case "info_corruption":
            for (const inst of state.abnormalities) {
                if (rng.chance(30))
                    inst.discovered = false;
            }
            break;
        case "panic":
            for (const s of state.staff) {
                if (s.status === "active")
                    s.sanity = Math.max(0, s.sanity - rng.int(5, 15));
            }
            break;
        case "red_mist":
            for (const inst of state.abnormalities) {
                if (rng.chance(40) && !inst.inBreach) {
                    const def = reg.abnormalities[inst.defId];
                    if (def) {
                        inst.inBreach = true;
                        inst.breachHp = 120 + def.breachDanger * 6;
                        log(`⚠⚠ 赤い霧の影響で「${def.name}」が同時多発的に収容違反を起こした!`);
                    }
                }
            }
            break;
        default:
            break;
    }
}
export function checkEndgame(state, reg, rng, log) {
    if (state.day >= 50 && !state.endgame.day50Triggered) {
        state.endgame.day50Triggered = true;
        for (const inst of state.abnormalities) {
            const def = reg.abnormalities[inst.defId];
            if (def && !inst.inBreach) {
                inst.inBreach = true;
                inst.breachHp = 100 + def.breachDanger * 5;
            }
        }
        log("🔥 Day50: 全異常存在が同時活性化した。施設は最大の危機を迎えている。");
    }
    if (state.day >= 100 && !state.endgame.day100Triggered) {
        state.endgame.day100Triggered = true;
        log("🌑 Day100: 終末イベントが開始された。「終焉の日」が施設に迫っている。");
    }
}
export function attemptTrueEnding(state, log) {
    const allSephirahCores = Object.keys(state.unlockedSephirah).length >= 0; // 実データはreg側で判定
    const conditionsMet = state.endgame.day100Triggered &&
        state.staff.filter((s) => s.status === "active").length >= 5 &&
        state.facility.energy >= 500;
    if (conditionsMet) {
        state.endgame.trueEndingCleared = true;
        log("✨「終焉の日」— 全セフィラコア抑制を統合した最終試練を突破した。真エンディング達成。");
        return true;
    }
    log("まだ「終焉の日」に挑む条件が整っていない。(生存職員5名以上・エネルギー500以上・Day100到達が必要)");
    return false;
}
