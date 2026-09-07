import type { GameState, ModRegistry, StaffMember, WorkType, Department } from "../types.js";
import { el, clear, barWidth } from "./dom.js";
import { drawFacilityMap } from "./mapCanvas.js";

export interface UIActions {
  advancePhase(): void;
  hireStaff(jobId: string, dept: Department): void;
  assignWork(staffId: string, abId: string): void;
  doWork(staffId: string, workType: WorkType): void;
  suppressOrder(abId: string, staffIds: string[]): void;
  extractEGO(abId: string, kind: "weapon" | "armor"): void;
  equipWeapon(staffId: string, weaponId?: string): void;
  equipArmor(staffId: string, armorId?: string): void;
  equipGift(staffId: string, giftId: string): void;
  appointHead(dept: Department, staffId?: string): void;
  startResearch(id: string): void;
  investResearch(amount: number): void;
  generateOriginal(): void;
  attemptTrueEnding(): void;
  downloadSave(): void;
  loadSaveFile(file: File): void;
  importModFile(file: File): void;
  toggleRest(staffId: string): void;
}

const RISK_COLOR: Record<string, string> = {
  ZAYIN: "#8a8f9c", TETH: "#4f9ddb", HE: "#c9a13b", WAW: "#c9542f", ALEPH: "#a83250",
};
const PHASE_LABEL: Record<string, string> = { morning: "朝", day: "昼", evening: "夕方", night: "夜" };
const WORK_LABEL: Record<WorkType, string> = { instinct: "本能", insight: "洞察", attachment: "愛着", repression: "抑圧" };
const DEPTS: Department[] = ["info", "safety", "training", "welfare", "record", "hq"];
const DEPT_LABEL: Record<Department, string> = { info: "情報部", safety: "安全部", training: "訓練部", welfare: "福祉部", record: "記録部", hq: "中央本部" };

export function renderHeader(root: HTMLElement, state: GameState, actions: UIActions) {
  clear(root);
  root.append(
    el("div", { cls: "header-row" }, [
      el("div", { cls: "title-block" }, [
        el("h1", { text: "TSG Corporation" }),
        el("div", { cls: "sub", text: `Day ${state.day} — ${PHASE_LABEL[state.phase]}フェーズ` }),
      ]),
      el("div", { cls: "energy-block" }, [
        el("div", { cls: "energy-label", text: `energy ${Math.floor(state.facility.energy)} / ${state.facility.maxEnergy}` }),
        el("div", { cls: "bar-track" }, [
          el("div", { cls: "bar-fill energy", attrs: { style: `width:${barWidth(state.facility.energy, state.facility.maxEnergy)}` } }),
        ]),
      ]),
      el("div", { cls: "header-actions" }, [
        el("button", { cls: "btn primary", text: "次のフェーズへ ▶", onClick: () => actions.advancePhase() }),
        el("button", { cls: "btn", text: "セーブ (JSON)", onClick: () => actions.downloadSave() }),
        el("label", { cls: "btn file-btn", text: "ロード" }, [
          el("input", {
            attrs: { type: "file", accept: ".json", style: "display:none" },
          }),
        ]),
      ]),
    ])
  );
  const loadInput = root.querySelector('input[type="file"]') as HTMLInputElement;
  loadInput.addEventListener("change", () => {
    if (loadInput.files && loadInput.files[0]) actions.loadSaveFile(loadInput.files[0]);
  });
}

export function renderMap(canvas: HTMLCanvasElement, state: GameState, reg: ModRegistry) {
  drawFacilityMap(canvas, state, reg);
}

export function renderStaffPanel(root: HTMLElement, state: GameState, reg: ModRegistry, actions: UIActions) {
  clear(root);
  root.append(el("h2", { text: "職員" }));

  const hireBar = el("div", { cls: "hire-bar" });
  const jobSelect = el("select", {}, Object.values(reg.jobs).map((j) => el("option", { text: j.name, attrs: { value: j.id } })));
  const deptSelect = el("select", {}, DEPTS.map((d) => el("option", { text: DEPT_LABEL[d], attrs: { value: d } })));
  hireBar.append(
    jobSelect, deptSelect,
    el("button", {
      cls: "btn small", text: "雇用 (40E)",
      onClick: () => actions.hireStaff((jobSelect as HTMLSelectElement).value, (deptSelect as HTMLSelectElement).value as Department),
    })
  );
  root.append(hireBar);

  const list = el("div", { cls: "staff-list" });
  for (const s of state.staff) {
    list.append(renderStaffCard(s, state, reg, actions));
  }
  root.append(list);
}

function renderStaffCard(s: StaffMember, state: GameState, reg: ModRegistry, actions: UIActions): HTMLElement {
  const statusLabel: Record<string, string> = { active: "待機中", resting: "療養中", dead: "死亡", broken: "精神崩壊" };
  const job = reg.jobs[s.jobId];
  const card = el("div", { cls: `staff-card status-${s.status}` });

  card.append(
    el("div", { cls: "staff-top" }, [
      el("span", { cls: "staff-name", text: s.name }),
      el("span", { cls: "staff-rank", text: `Rank ${s.rank}` }),
    ]),
    el("div", { cls: "staff-sub", text: `${job?.name ?? s.jobId} ・ ${DEPT_LABEL[s.department]} ・ ${statusLabel[s.status]}` })
  );

  card.append(
    el("div", { cls: "mini-bar-row" }, [
      el("span", { cls: "mini-label", text: "HP" }),
      el("div", { cls: "bar-track small" }, [el("div", { cls: "bar-fill hp", attrs: { style: `width:${barWidth(s.hp, s.maxHp)}` } })]),
    ]),
    el("div", { cls: "mini-bar-row" }, [
      el("span", { cls: "mini-label", text: "SAN" }),
      el("div", { cls: "bar-track small" }, [el("div", { cls: "bar-fill san", attrs: { style: `width:${barWidth(s.sanity, s.maxSanity)}` } })]),
    ])
  );

  card.append(
    el("div", { cls: "stat-grid", text: "" }, [
      el("span", { text: `勇 ${s.stats.courage}` }),
      el("span", { text: `慎 ${s.stats.prudence}` }),
      el("span", { text: `自 ${s.stats.temperance}` }),
      el("span", { text: `正 ${s.stats.justice}` }),
    ])
  );

  if (s.status === "active" || s.status === "resting") {
    card.append(
      el("button", {
        cls: "btn tiny",
        text: s.status === "resting" ? "療養解除" : "療養させる",
        onClick: () => actions.toggleRest(s.id),
      })
    );
  }

  // 装備
  const weaponSel = el("select", { attrs: { title: "武器" } }, [
    el("option", { text: "(武器なし)", attrs: { value: "" } }),
    ...state.ownedEGO.weapons.map((id) => el("option", { text: reg.weapons[id]?.name ?? id, attrs: { value: id } })),
  ]) as HTMLSelectElement;
  weaponSel.value = s.equippedWeaponId ?? "";
  weaponSel.addEventListener("change", () => actions.equipWeapon(s.id, weaponSel.value || undefined));

  const armorSel = el("select", { attrs: { title: "防具" } }, [
    el("option", { text: "(防具なし)", attrs: { value: "" } }),
    ...state.ownedEGO.armors.map((id) => el("option", { text: reg.armors[id]?.name ?? id, attrs: { value: id } })),
  ]) as HTMLSelectElement;
  armorSel.value = s.equippedArmorId ?? "";
  armorSel.addEventListener("change", () => actions.equipArmor(s.id, armorSel.value || undefined));

  card.append(el("div", { cls: "equip-row" }, [weaponSel, armorSel]));

  if (state.ownedEGO.gifts.length > 0) {
    const giftRow = el("div", { cls: "gift-row" });
    for (const gid of state.ownedEGO.gifts) {
      const active = s.equippedGiftIds.includes(gid);
      giftRow.append(
        el("button", {
          cls: `chip ${active ? "chip-on" : ""}`,
          text: reg.gifts[gid]?.name ?? gid,
          onClick: () => actions.equipGift(s.id, gid),
        })
      );
    }
    card.append(giftRow);
  }

  return card;
}

export function renderAbnormalityPanel(root: HTMLElement, state: GameState, reg: ModRegistry, actions: UIActions) {
  clear(root);
  root.append(
    el("div", { cls: "panel-head-row" }, [
      el("h2", { text: "収容中の異常存在" }),
      el("button", { cls: "btn small", text: "未知の存在を調査する", onClick: () => actions.generateOriginal() }),
    ])
  );

  const list = el("div", { cls: "ab-list" });
  const activeStaff = state.staff.filter((s) => s.status === "active");

  for (const inst of state.abnormalities) {
    const def = reg.abnormalities[inst.defId];
    if (!def) continue;
    const card = el("div", { cls: `ab-card ${inst.inBreach ? "breach" : ""}` });
    card.append(
      el("div", { cls: "ab-top" }, [
        el("span", { cls: "ab-name", text: def.name }),
        el("span", { cls: "ab-risk", attrs: { style: `background:${RISK_COLOR[def.risk]}` }, text: def.risk }),
      ]),
      el("div", { cls: "ab-sub", text: `属性:${def.damageAttr} ／ カウンター ${inst.containedCounter}/${def.maxCounter}${def.isOriginal ? " ・ オリジナル" : ""}` })
    );
    if (def.description) card.append(el("div", { cls: "ab-desc", text: def.description }));

    if (!inst.inBreach) {
      const staffSel = el("select", {}, [
        el("option", { text: "職員を選択…", attrs: { value: "" } }),
        ...activeStaff.map((s) => el("option", { text: s.name, attrs: { value: s.id } })),
      ]) as HTMLSelectElement;
      const workSel = el("select", {}, (Object.keys(WORK_LABEL) as WorkType[]).map((w) =>
        el("option", { text: `${WORK_LABEL[w]} (適性 ${def.workAffinity[w]})`, attrs: { value: w } })
      )) as HTMLSelectElement;
      card.append(
        el("div", { cls: "ab-actions" }, [
          staffSel, workSel,
          el("button", {
            cls: "btn tiny",
            text: "作業実行",
            onClick: () => {
              if (!staffSel.value) return;
              actions.assignWork(staffSel.value, inst.defId);
              actions.doWork(staffSel.value, workSel.value as WorkType);
            },
          }),
        ])
      );
      if (def.egoReward?.weaponId || def.egoReward?.armorId) {
        const extractRow = el("div", { cls: "ab-actions" });
        if (def.egoReward.weaponId) {
          extractRow.append(el("button", { cls: "btn tiny", text: "E.G.O武器を抽出", onClick: () => actions.extractEGO(inst.defId, "weapon") }));
        }
        if (def.egoReward.armorId) {
          extractRow.append(el("button", { cls: "btn tiny", text: "E.G.O防具を抽出", onClick: () => actions.extractEGO(inst.defId, "armor") }));
        }
        card.append(extractRow);
      }
    } else {
      card.append(el("div", { cls: "breach-warning", text: `⚠ 収容違反中！ 残存HP: ${Math.ceil(inst.breachHp)}` }));
      const checks = activeStaff.map((s) => {
        const cb = el("input", { attrs: { type: "checkbox", value: s.id } }) as HTMLInputElement;
        return el("label", { cls: "check-label" }, [cb, el("span", { text: s.name })]);
      });
      const checkBoxRow = el("div", { cls: "check-row" }, checks);
      card.append(
        checkBoxRow,
        el("button", {
          cls: "btn tiny danger",
          text: "鎮圧命令",
          onClick: () => {
            const ids = Array.from(checkBoxRow.querySelectorAll("input:checked")).map((i) => (i as HTMLInputElement).value);
            if (ids.length > 0) actions.suppressOrder(inst.defId, ids);
          },
        })
      );
    }
    list.append(card);
  }
  root.append(list);
}

export function renderResearchPanel(root: HTMLElement, state: GameState, reg: ModRegistry, actions: UIActions) {
  clear(root);
  root.append(el("h2", { text: "研究" }));
  if (state.research.inProgress) {
    const def = reg.research[state.research.inProgress.id];
    root.append(
      el("div", { cls: "research-active" }, [
        el("div", { text: `進行中: ${def?.name ?? state.research.inProgress.id} (残り ${Math.ceil(state.research.inProgress.remainingCost)} E)` }),
        el("button", { cls: "btn tiny", text: "エネルギーを50投入", onClick: () => actions.investResearch(50) }),
      ])
    );
  }
  const list = el("div", { cls: "research-list" });
  for (const def of Object.values(reg.research)) {
    const done = state.research.completed.includes(def.id);
    const locked = !!def.prerequisite && !state.research.completed.includes(def.prerequisite);
    list.append(
      el("div", { cls: `research-card ${done ? "done" : ""}` }, [
        el("div", { cls: "research-name", text: `${def.name} ${done ? "✓完了" : ""}` }),
        el("div", { cls: "research-desc", text: `${def.description} (コスト ${def.cost}E)` }),
        ...(!done && !locked && !state.research.inProgress
          ? [el("button", { cls: "btn tiny", text: "開始", onClick: () => actions.startResearch(def.id) })]
          : []),
        ...(locked ? [el("div", { cls: "research-locked", text: "前提研究が必要" })] : []),
      ])
    );
  }
  root.append(list);
}

export function renderSephirahPanel(root: HTMLElement, state: GameState, reg: ModRegistry, actions: UIActions) {
  clear(root);
  root.append(el("h2", { text: "セフィラ / エンドゲーム" }));
  const list = el("div", { cls: "sephirah-list" });
  for (const id of state.unlockedSephirah) {
    const def = reg.sephirah[id];
    if (!def) continue;
    list.append(el("div", { cls: "sephirah-card" }, [el("div", { cls: "sephirah-name", text: def.name }), el("div", { cls: "sephirah-desc", text: def.description })]));
  }
  root.append(list);

  const eg = el("div", { cls: "endgame-block" });
  eg.append(el("div", { text: `Day50同時活性化: ${state.endgame.day50Triggered ? "発生済み" : "未発生"}` }));
  eg.append(el("div", { text: `Day100終末イベント: ${state.endgame.day100Triggered ? "発生済み" : "未発生"}` }));
  eg.append(el("div", { text: `真エンディング: ${state.endgame.trueEndingCleared ? "達成済み" : "未達成"}` }));
  if (state.endgame.day100Triggered && !state.endgame.trueEndingCleared) {
    eg.append(el("button", { cls: "btn danger", text: "「終焉の日」に挑む", onClick: () => actions.attemptTrueEnding() }));
  }
  root.append(eg);
}

export function renderLogPanel(root: HTMLElement, state: GameState) {
  clear(root);
  root.append(el("h2", { text: "記録" }));
  const box = el("div", { cls: "log-box" });
  for (const line of state.log.slice(-80).reverse()) {
    box.append(el("div", { cls: "log-line", text: line }));
  }
  root.append(box);
}

export function renderModPanel(root: HTMLElement, actions: UIActions) {
  clear(root);
  root.append(
    el("h2", { text: "MOD" }),
    el("div", { cls: "mod-desc", text: "JSON形式のMODファイルを読み込んで異常存在・E.G.O・イベント等を追加できます。" }),
    el("label", { cls: "btn small file-btn", text: "MOD JSONを読み込む" }, [
      el("input", { attrs: { type: "file", accept: ".json", style: "display:none", id: "mod-file-input" } }),
    ])
  );
  const input = root.querySelector("#mod-file-input") as HTMLInputElement;
  input.addEventListener("change", () => {
    if (input.files && input.files[0]) actions.importModFile(input.files[0]);
  });
}
