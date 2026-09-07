// mulberry32 による軽量シード付き乱数(セーブ再現性のため)
export class RNG {
    constructor(seed) {
        this.state = seed >>> 0;
    }
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    pick(arr) {
        return arr[this.int(0, arr.length - 1)];
    }
    chance(percent) {
        return this.next() * 100 < percent;
    }
}
