import { loadAllData, importModFile as importModFileData } from "./dataLoader.js";
import { RNG } from "./rng.js";
import { newGame } from "./systems/newGame.js";
import { hireStaff, restStaff } from "./systems/staff.js";
import { assignWork, resolveWork, decayCounters } from "./systems/work.js";
import { breachTick, suppressOrder as suppressOrderSys } from "./systems/breach.js";
import { extractEGO, equipWeapon, equipArmor, equipGift } from "./systems/ego.js";
import { startResearch, progressResearch } from "./systems/research.js";
import { checkSephirahUnlock, rollEvent, checkEndgame, attemptTrueEnding as attemptTrueEndingSys } from "./systems/events.js";
import { generateOriginalAbnormality } from "./systems/generator.js";
import { downloadSave, loadSaveFromFile, autoSave, loadAutoSave, hasAutoSave } from "./systems/save.js";
import { renderHeader, renderMap, renderStaffPanel, renderAbnormalityPanel, renderResearchPanel, renderSephirahPanel, renderLogPanel, renderModPanel, } from "./ui/render.js";
const $ = (id) => document.getElementById(id);
let reg;
let state;
let rng;
let genCounter = 0;
function log(msg) {
    state.log.push(msg);
    if (state.log.length > 500)
        state.log.splice(0, state.log.length - 500);
}
function renderAll() {
    renderHeader($("panel-header"), state, actions);
    renderMap($("facility-canvas"), state, reg);
    renderStaffPanel($("panel-staff"), state, reg, actions);
    renderAbnormalityPanel($("panel-abnormality"), state, reg, actions);
    renderResearchPanel($("panel-research"), state, reg, actions);
    renderSephirahPanel($("panel-sephirah"), state, reg, actions);
    renderLogPanel($("panel-log"), state);
}
const actions = {
    advancePhase() {
        const order = ["morning", "day", "evening", "night"];
        const idx = order.indexOf(state.phase);
        if (idx < order.length - 1) {
            state.phase = order[idx + 1];
            onEnterPhase(state.phase);
        }
        else {
            // night -> 翌朝
            state.day += 1;
            state.phase = "morning";
            restStaff(state);
            decayCounters(state, reg, log);
            checkSephirahUnlock(state, reg, log);
            checkEndgame(state, reg, rng, log);
            autoSave(state);
            onEnterPhase("morning");
        }
        renderAll();
    },
    hireStaff(jobId, dept) {
        hireStaff(state, jobId, dept, reg, rng, log);
        renderAll();
    },
    assignWork(staffId, abId) {
        assignWork(state, staffId, abId);
    },
    doWork(staffId, workType) {
        const staff = state.staff.find((s) => s.id === staffId);
        if (!staff)
            return;
        resolveWork(state, reg, staff, workType, rng, log);
        renderAll();
    },
    suppressOrder(abId, staffIds) {
        suppressOrderSys(state, abId, staffIds);
        renderAll();
    },
    extractEGO(abId, kind) {
        extractEGO(state, reg, abId, kind, rng, log);
        renderAll();
    },
    equipWeapon(staffId, weaponId) {
        equipWeapon(state, staffId, weaponId);
        renderAll();
    },
    equipArmor(staffId, armorId) {
        equipArmor(state, staffId, armorId);
        renderAll();
    },
    equipGift(staffId, giftId) {
        equipGift(state, staffId, giftId);
        renderAll();
    },
    appointHead(dept, staffId) {
        state.facility.departments[dept].headStaffId = staffId;
        renderAll();
    },
    startResearch(id) {
        startResearch(state, reg, id, log);
        renderAll();
    },
    investResearch(amount) {
        progressResearch(state, reg, amount, log);
        renderAll();
    },
    generateOriginal() {
        genCounter += 1;
        const def = generateOriginalAbnormality(reg, rng, genCounter);
        if (def) {
            state.abnormalities.push({ defId: def.id, containedCounter: def.maxCounter, discovered: true, inBreach: false, breachHp: 0 });
            log(`新たな異常存在「${def.name}」を発見・収容した。(${def.risk})`);
        }
        else {
            log("生成に必要なデータが読み込まれていない。");
        }
        renderAll();
    },
    attemptTrueEnding() {
        attemptTrueEndingSys(state, log);
        renderAll();
    },
    downloadSave() {
        downloadSave(state);
    },
    async loadSaveFile(file) {
        const loaded = await loadSaveFromFile(file);
        if (loaded) {
            state = loaded;
            log("セーブデータを読み込んだ。");
            renderAll();
        }
        else {
            alert("セーブデータの読み込みに失敗しました。");
        }
    },
    async importModFile(file) {
        await importModFileData(file, reg, log);
        renderAll();
    },
    toggleRest(staffId) {
        const s = state.staff.find((x) => x.id === staffId);
        if (!s)
            return;
        if (s.status === "active")
            s.status = "resting";
        else if (s.status === "resting")
            s.status = "active";
        renderAll();
    },
};
function onEnterPhase(phase) {
    if (phase === "evening") {
        rollEvent(state, reg, "disaster", rng, log);
    }
    if (phase === "night") {
        rollEvent(state, reg, "special", rng, log);
    }
}
let breachInterval;
function startBreachLoop() {
    if (breachInterval)
        window.clearInterval(breachInterval);
    breachInterval = window.setInterval(() => {
        const hasBreach = state.abnormalities.some((a) => a.inBreach);
        if (!hasBreach)
            return;
        breachTick(state, reg, rng, log);
        renderAll();
    }, 900);
}
async function boot() {
    const bootLog = [];
    reg = await loadAllData((m) => bootLog.push(m));
    const existing = hasAutoSave() ? loadAutoSave() : null;
    if (existing) {
        state = existing;
    }
    else {
        state = newGame(reg, Date.now() % 1000000);
    }
    for (const m of bootLog)
        log(m);
    rng = new RNG(state.seed + state.day);
    renderModPanel($("panel-mod"), actions);
    renderAll();
    startBreachLoop();
    window.addEventListener("beforeunload", () => autoSave(state));
    window.setInterval(() => autoSave(state), 20000);
}
boot();
