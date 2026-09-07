import type { GameState, ModRegistry, Department } from "../types.js";

const DEPT_LABELS: Record<Department, string> = {
  info: "情報部", safety: "安全部", training: "訓練部",
  welfare: "福祉部", record: "記録部", hq: "中央本部",
};

const LAYOUT: { dept: Department; x: number; y: number; w: number; h: number }[] = [
  { dept: "hq", x: 280, y: 20, w: 160, h: 90 },
  { dept: "info", x: 40, y: 140, w: 150, h: 90 },
  { dept: "safety", x: 210, y: 140, w: 150, h: 90 },
  { dept: "training", x: 380, y: 140, w: 150, h: 90 },
  { dept: "welfare", x: 40, y: 260, w: 150, h: 90 },
  { dept: "record", x: 210, y: 260, w: 150, h: 90 },
];

let pulseT = 0;

export function drawFacilityMap(canvas: HTMLCanvasElement, state: GameState, reg: ModRegistry) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  pulseT += 0.15;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, w, h);

  const breachByDept = new Set<Department>();
  const breaching = state.abnormalities.filter((a) => a.inBreach);
  // 収容違反中の異常存在を部署にランダム(だが安定した)割り当てで表示
  breaching.forEach((a, i) => {
    const depts: Department[] = ["info", "safety", "training", "welfare", "record", "hq"];
    breachByDept.add(depts[i % depts.length]);
  });

  for (const block of LAYOUT) {
    const isBreach = breachByDept.has(block.dept);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isBreach ? `rgba(200,40,40,${0.6 + 0.4 * Math.sin(pulseT)})` : "#3a3f4b";
    ctx.fillStyle = isBreach ? "rgba(120,20,20,0.35)" : "#15171d";
    ctx.beginPath();
    ctx.rect(block.x, block.y, block.w, block.h);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBreach ? "#ff6b6b" : "#c9cdd6";
    ctx.font = "13px monospace";
    ctx.fillText(DEPT_LABELS[block.dept], block.x + 10, block.y + 22);

    const head = state.facility.departments[block.dept]?.headStaffId;
    const headName = head ? state.staff.find((s) => s.id === head)?.name : null;
    ctx.font = "11px monospace";
    ctx.fillStyle = "#7d8291";
    ctx.fillText(headName ? `部長: ${headName}` : "部長: 未任命", block.x + 10, block.y + 42);

    if (isBreach) {
      ctx.fillStyle = "#ff4444";
      ctx.font = "11px monospace";
      ctx.fillText("収容違反中", block.x + 10, block.y + 62);
    }
  }

  ctx.strokeStyle = "#2a2d35";
  ctx.beginPath();
  ctx.moveTo(360, 110); ctx.lineTo(360, 140);
  ctx.moveTo(115, 110); ctx.lineTo(280, 65); ctx.lineTo(280, 140);
  ctx.stroke();
}
