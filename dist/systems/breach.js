import { applyDamage, gainExp, specialAbilityFor } from "./staff.js";
export function suppressOrder(state, abnormalityDefId, staffIds) {
    const inst = state.abnormalities.find((a) => a.defId === abnormalityDefId);
    if (!inst || !inst.inBreach)
        return { ok: false, reason: "収容違反中ではない" };
    for (const id of staffIds) {
        const s = state.staff.find((x) => x.id === id);
        if (!s || s.status !== "active")
            return { ok: false, reason: "出動できない職員が含まれている" };
        s.assignedAbnormalityId = abnormalityDefId;
    }
    return { ok: true };
}
export function breachTick(state, reg, rng, log) {
    const resolved = [];
    for (const inst of state.abnormalities) {
        if (!inst.inBreach)
            continue;
        const def = reg.abnormalities[inst.defId];
        if (!def)
            continue;
        const dispatched = state.staff.filter((s) => s.status === "active" && s.assignedAbnormalityId === inst.defId);
        if (dispatched.length === 0) {
            // 未対応: 施設にじわじわ被害(エネルギー減少)
            state.facility.energy = Math.max(0, state.facility.energy - Math.round(def.breachDanger * 0.5));
            continue;
        }
        let totalDamage = 0;
        for (const s of dispatched) {
            const weapon = s.equippedWeaponId ? reg.weapons[s.equippedWeaponId] : undefined;
            const baseAtk = weapon?.baseDamage ?? 10;
            const statBonus = (s.stats.courage + s.stats.justice) * 0.4;
            let dmg = baseAtk + statBonus + rng.int(0, 8);
            const ability = specialAbilityFor(s, reg);
            if (ability === "処刑人")
                dmg *= 1.5; // 収容違反対象へ追加ダメージ
            if (weapon && weapon.triggerRate && rng.chance(weapon.triggerRate)) {
                dmg *= 2;
                log(`${s.name} の「${weapon.name}」特殊能力『${weapon.specialName}』が発動!`);
            }
            totalDamage += dmg;
        }
        inst.breachHp = Math.max(0, inst.breachHp - totalDamage);
        // 異常存在の反撃
        for (const s of dispatched) {
            if (rng.chance(35)) {
                const armor = s.equippedArmorId ? reg.armors[s.equippedArmorId] : undefined;
                const resist = armor?.resistances[def.damageAttr] ?? 0;
                const rawHp = def.breachDanger * 1.5;
                const rawSan = def.breachDanger * 0.8;
                const hpDmg = Math.max(0, Math.round(rawHp * (1 - resist / 100)));
                const sanDmg = Math.max(0, Math.round(rawSan * (1 - resist / 100)));
                applyDamage(s, hpDmg, sanDmg, log);
                const heal = specialAbilityFor(s, reg) === "医療班";
                if (heal) {
                    for (const ally of dispatched) {
                        ally.hp = Math.min(ally.maxHp, ally.hp + 5);
                    }
                }
            }
        }
        if (inst.breachHp <= 0) {
            inst.inBreach = false;
            inst.containedCounter = Math.max(1, Math.round(def.maxCounter * 0.5));
            for (const s of dispatched) {
                gainExp(s, 40, log);
                s.assignedAbnormalityId = undefined;
            }
            log(`✅ 「${def.name}」の収容違反を鎮圧した。`);
            resolved.push(inst.defId);
        }
    }
    return { resolved };
}
