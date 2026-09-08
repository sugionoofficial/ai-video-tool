class VideoTimeline {
  constructor(container) {
    this.container = container;
    this.scenes = [];
    this.onChange = null;
    this.render();
  }
  addScene(data = {}) {
    this.scenes.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      prompt: data.prompt || "",
      duration: Number(data.duration || 5)
    });
    this.render();
    this.changed();
  }
  removeScene(id) {
    this.scenes = this.scenes.filter(s => s.id !== id);
    this.render();
    this.changed();
  }
  update(id, key, value) {
    const scene = this.scenes.find(s => s.id === id);
    if (!scene) return;
    scene[key] = key === "duration" ? Number(value) : value;
    this.changed();
  }
  changed() {
    if (typeof this.onChange === "function") this.onChange(this.scenes);
  }
  render() {
    this.container.innerHTML = "";
    this.scenes.forEach((scene, i) => {
      const row = document.createElement("div");
      row.className = "scene";
      row.draggable = true;
      row.dataset.id = scene.id;

      const index = document.createElement("div");
      index.className = "scene-index";
      index.textContent = `Scene ${i + 1}`;

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Scene prompt";
      input.value = scene.prompt;
      input.addEventListener("input", e => this.update(scene.id, "prompt", e.target.value));

      const controls = document.createElement("div");
      const duration = document.createElement("input");
      duration.type = "number";
      duration.min = "1";
      duration.max = "60";
      duration.value = scene.duration;
      duration.title = "Duration in seconds";
      duration.style.width = "80px";
      duration.addEventListener("change", e => this.update(scene.id, "duration", e.target.value));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => this.removeScene(scene.id));

      controls.append(duration, remove);
      row.append(index, input, controls);

      row.addEventListener("dragstart", () => row.classList.add("dragging"));
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        this.syncOrder();
      });
      row.addEventListener("dragover", e => e.preventDefault());
      row.addEventListener("drop", e => {
        e.preventDefault();
        const dragging = this.container.querySelector(".dragging");
        if (!dragging || dragging === row) return;
        const nodes = [...this.container.children];
        const from = nodes.indexOf(dragging);
        const to = nodes.indexOf(row);
        if (from < to) this.container.insertBefore(dragging, row.nextSibling);
        else this.container.insertBefore(dragging, row);
        this.syncOrder();
      });

      this.container.appendChild(row);
    });
  }
  syncOrder() {
    const ids = [...this.container.children].map(x => x.dataset.id);
    this.scenes.sort((a,b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    this.render();
    this.changed();
  }
  getScenes() { return structuredClone(this.scenes); }
}
