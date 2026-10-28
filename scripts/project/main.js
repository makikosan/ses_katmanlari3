// Giriş ekranındaki şemsiyeler, konumlarını koruyarak kendi merkezlerinde döner.
runOnStartup(async runtime => {
    const states = new Map();
    let elapsed = 0;
    runtime.addEventListener("beforeprojectstart", () => {
        runtime.addEventListener("tick", () => {
            if (runtime.layout.name !== "giris") {
                states.clear();
                elapsed = 0;
                return;
            }
            const dt = runtime.dt;
            elapsed += dt;
            for (const [index, name] of ["sem1", "sem3", "sem2"].entries()) {
                for (const instance of runtime.objects[name].getAllInstances()) {
                    let state = states.get(instance);
                    if (!state) {
                        state = {
                            direction: index === 1 ? -1 : 1,
                            speed: (18 + Math.random() * 16) * Math.PI / 180,
                            phase: Math.random() * Math.PI * 2,
                            period: 0.5 + Math.random() * 0.35
                        };
                        instance.angle = Math.random() * Math.PI * 2;
                        states.set(instance, state);
                    }
                    // Yumuşak hız değişimi; her karede rastgele sıçrama oluşturmaz.
                    const speed = state.speed * (1 + 0.25 * Math.sin(elapsed * state.period + state.phase));
                    instance.angle = ((instance.angle + state.direction * speed * dt) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                }
            }
        });
    });
});

// Görev 1: en az bir melodik çalgı. Görev 2: üç melodik çalgı birlikte.
// Görev 3: bağlama ve keman/viyolonselden en az biri (bendir kapalı olmalı).
runOnStartup(runtime => {
    let state = null;
    const get = name => runtime.objects[name].getFirstInstance();
    function burst() {
        const pieces = [];
        for (let i = 0; i < 180; ++i) {
            const x = runtime.layout.width * [0.24, 0.5, 0.76][i % 3];
            const y = runtime.layout.height * 0.48;
            const piece = runtime.objects.gorev1_konfeti.createInstance("gorev1_konfeti_katmani", x, y);
            piece.isVisible = true;
            piece.animationFrame = i % 3;
            piece.width = 9 + Math.random() * 8;
            piece.height = 16 + Math.random() * 12;
            piece.angle = Math.random() * Math.PI * 2;
            const theta = -Math.PI + Math.random() * Math.PI;
            const speed = 240 + Math.random() * 670;
            pieces.push({piece, vx: Math.cos(theta) * speed, vy: Math.sin(theta) * speed,
                spin: (Math.random() - 0.5) * 18, age: 0});
        }
        return pieces;
    }
    runtime.addEventListener("beforeprojectstart", () => {
        runtime.addEventListener("tick", () => {
            if (!["gorev1", "gorev2", "gorev3"].includes(runtime.layout.name)) { state = null; return; }
            const task = runtime.layout.name;
            const tik = get("tik"), carpi = get("carpi"), dene = get("dene");
            if (!state || state.tik !== tik || state.task !== task) {
                state = {tik, task, originalY: {tik: tik.y, carpi: carpi.y, dene: dene.y},
                    solved: false, elapsed: 0, pieces: []};
            }
            if (state.solved) {
                state.elapsed += runtime.dt;
                for (const p of state.pieces) {
                    p.age += runtime.dt;
                    p.vy += 720 * runtime.dt;
                    p.piece.x += p.vx * runtime.dt;
                    p.piece.y += p.vy * runtime.dt;
                    p.piece.angle += p.spin * runtime.dt;
                    p.piece.opacity = Math.max(0, Math.min(1, (2 - p.age) / 0.45));
                }
                if (state.elapsed >= 2 && state.pieces.length) {
                    for (const p of state.pieces) p.piece.destroy();
                    state.pieces = [];
                }
                return;
            }
            const melodic = ["btn1", "btn2", "btn3"].filter(name => get(name).animationFrame === 1).length;
            const required = task === "gorev1" ? 1 : 3;
            const bendir = get("btn4").animationFrame === 1;
            const task3Correct = !bendir && get("btn1").animationFrame === 1 &&
                (get("btn2").animationFrame === 1 || get("btn3").animationFrame === 1);
            const correct = task === "gorev3" ? task3Correct : melodic >= required;
            if (correct) {
                state.solved = true;
                tik.y = tik.instVars.ekran_y;
                carpi.y = state.originalY.carpi;
                dene.y = state.originalY.dene;
                state.pieces = burst();
                const advance = get(task === "gorev3" ? "tamamladim_transparan" : "yeni_gorev");
                advance.y = 1023;
                advance.isVisible = true;
            } else if (melodic > 0 || bendir) {
                carpi.y = carpi.instVars.ekran_y;
                dene.y = dene.instVars.ekran_y;
                tik.y = state.originalY.tik;
            } else {
                carpi.y = state.originalY.carpi;
                dene.y = state.originalY.dene;
                tik.y = state.originalY.tik;
            }
        });
    });
});

// Bilgi ekranı açıldığında, kapat düğmesinin dönüş sayfasını hatırla.
runOnStartup(runtime => {
    let previousLayout = "";
    runtime.addEventListener("beforeprojectstart", () => {
        if (!previousLayout) previousLayout = runtime.layout.name;
    });
    runtime.addEventListener("afteranylayoutstart", ({layout}) => {
        if (layout.name === "bilgi") {
            const codes = {ilk_sayfa: 0, gorev1: 1, gorev2: 2, gorev3: 3};
            for (const close of runtime.objects.kapat.getAllInstances()) {
                close.instVars.donus_kodu = codes[previousLayout] ?? 0;
            }
        }
        previousLayout = layout.name;
    });
});
