const RANK_ORDER = ["I", "II", "III", "IV", "V", "EX"];
const RANK_UP_EXP = {
    I: 100, II: 250, III: 500, IV: 900, V: 1500, EX: Infinity,
};
const FIRST_NAMES = ["カイ", "レン", "ユキ", "ソラ", "アカリ", "ミナ", "トウマ", "リン", "セイ", "ノア", "ハル", "ツキ"];
const LAST_NAMES = ["黒井", "白鳥", "紅林", "灰原", "銀城", "藍川", "紫苑", "橙堂", "翠原", "琥珀"];
export function generateRecruitName(rng) {
    return `${rng.pick(LAST_NAMES)}${rng.pick(FIRST_NAMES)}`;
}
export function createStaff(id, jobId, department, rng, reg) {
    const job = reg.jobs[jobId];
    const base = 8;
    const weights = job?.statWeights ?? {};
    const stat = (key) => base + rng.int(0, 6) + Math.round((weights[key] ?? 0) * 3);
    return {
        id,
        name: generateRecruitName(rng),
        rank: "I",
        jobId,
        department,
        stats: {
            courage: stat("courage"),
            prudence: stat("prudence"),
            temperance: stat("temperance"),
            justice: stat("justice"),
        },
        exp: 0,
        hp: 100,
        maxHp: 100,
        sanity: 100,
        maxSanity: 100,
        status: "active",
        equippedGiftIds: [],
    };
}
export function gainExp(staff, amount, log) {
    if (staff.status === "dead")
        return;
    staff.exp += amount;
    const idx = RANK_ORDER.indexOf(staff.rank);
    if (idx < RANK_ORDER.length - 1) {
        const need = RANK_UP_EXP[staff.rank];
        if (staff.exp >= need) {
            staff.exp -= need;
            staff.rank = RANK_ORDER[idx + 1];
            staff.maxHp += 15;
            staff.hp = staff.maxHp;
            staff.maxSanity += 10;
            staff.sanity = staff.maxSanity;
            ["courage", "prudence", "temperance", "justice"].forEach((k) => {
                staff.stats[k] += 2;
            });
            log(`${staff.name} がランク ${staff.rank} に昇格した。`);
        }
    }
}
export function applyDamage(staff, hp, sanity, log) {
    staff.hp = Math.max(0, staff.hp - hp);
    staff.sanity = Math.max(0, staff.sanity - sanity);
    if (staff.hp <= 0 && staff.status === "active") {
        staff.status = "dead";
        log(`職員 ${staff.name} が死亡した。`);
    }
    else if (staff.sanity <= 0 && staff.status === "active") {
        staff.status = "broken";
        log(`職員 ${staff.name} が精神崩壊した。`);
    }
}
export function restStaff(state) {
    for (const s of state.staff) {
        if (s.status === "resting") {
            s.hp = Math.min(s.maxHp, s.hp + 25);
            s.sanity = Math.min(s.maxSanity, s.sanity + 20);
            if (s.hp >= s.maxHp * 0.6 && s.sanity >= s.maxSanity * 0.6) {
                s.status = "active";
            }
        }
    }
}
export function hireStaff(state, jobId, department, reg, rng, log) {
    const cost = 40;
    if (state.facility.energy < cost) {
        log("エネルギーが不足しているため雇用できない。");
        return false;
    }
    state.facility.energy -= cost;
    const id = `staff_${Date.now()}_${rng.int(0, 9999)}`;
    const s = createStaff(id, jobId, department, rng, reg);
    state.staff.push(s);
    log(`新しい職員 ${s.name}(${reg.jobs[jobId]?.name ?? jobId}) を ${department} に配属した。`);
    return true;
}
export function specialAbilityFor(staff, reg) {
    if (RANK_ORDER.indexOf(staff.rank) < RANK_ORDER.indexOf("IV"))
        return null;
    return reg.jobs[staff.jobId]?.ability ?? null;
}
