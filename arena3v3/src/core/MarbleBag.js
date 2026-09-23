function shuffle(array, random = Math.random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
export class MarbleBag {
  constructor(sourceItems, random = Math.random) {
    this.sourceItems = [...sourceItems];
    this.random = random;
    this.items = [];
    this.refill();
  }
  refill() { this.items = shuffle([...this.sourceItems], this.random); }
  draw() {
    if (this.items.length === 0) this.refill();
    return this.items.pop();
  }
}
function weightedItems(weights, size = 100) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  if (entries.length === 0) return ["none"];
  const raw = entries.map(([key, weight]) => ({ key, raw: weight * size }));
  const floors = raw.map(item => ({ ...item, count: Math.floor(item.raw) }));
  let used = floors.reduce((sum, item) => sum + item.count, 0);
  floors.sort((a, b) => (b.raw - b.count) - (a.raw - a.count)).forEach(item => {
    if (used < size) { item.count += 1; used += 1; }
  });
  const items = [];
  floors.forEach(item => { for (let i = 0; i < item.count; i += 1) items.push(item.key); });
  while (items.length < size) items.push(entries[0][0]);
  return items.slice(0, size);
}
export class MarbleBagPool {
  constructor() { this.bags = new Map(); }
  drawWeighted(key, weights, size = 100) {
    const signature = JSON.stringify(weights);
    const stored = this.bags.get(key);
    if (!stored || stored.signature !== signature) {
      this.bags.set(key, { signature, bag: new MarbleBag(weightedItems(weights, size)) });
    }
    return this.bags.get(key).bag.draw();
  }
  drawSequence(key, values) {
    let stored = this.bags.get(key);
    const signature = JSON.stringify(values);
    if (!stored || stored.signature !== signature) {
      stored = { signature, bag: new MarbleBag(values) };
      this.bags.set(key, stored);
    }
    return stored.bag.draw();
  }
  reset() { this.bags.clear(); }
}
