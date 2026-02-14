import React, { useEffect, useMemo, useRef, useState } from "react";

const BUILD_MESSAGES = [
  "Hai Khalisa Zulfa, bentar ya...",
  "Nuansa pink-nya lagi disiapin.",
  "Cokelat virtualnya juga ikut hadir.",
  "Siap, kita masuk ke halaman utama.",
];

const PHOTO_FILES = [
  "/photos/khalisa-1.jpg",
  "/photos/khalisa-2.jpg",
  "/photos/khalisa-3.jpg",
  "/photos/khalisa-4.jpg",
];

const STORY_STEPS = [
  { id: "intro", label: "Pembuka" },
  { id: "photo", label: "Potret" },
  { id: "closing", label: "Penutup" },
];

const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function App() {
  const [phase, setPhase] = useState("gate");
  const [buildStep, setBuildStep] = useState(0);
  const [mainStep, setMainStep] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [bursts, setBursts] = useState([]);
  const [photos, setPhotos] = useState(PHOTO_FILES);
  const [photoIndex, setPhotoIndex] = useState(0);

  const burstIdRef = useRef(1);
  const audioRef = useRef({
    ctx: null,
    master: null,
    timer: null,
    step: 0,
  });

  const floaters = useMemo(() => {
    const count = PREFERS_REDUCED_MOTION ? 14 : 26;
    return Array.from({ length: count }, (_, idx) => {
      const type = idx % 3 === 0 ? "choco" : "heart";
      return {
        id: `f-${idx}`,
        type,
        left: rand(3, 96),
        size: rand(type === "heart" ? 14 : 16, type === "heart" ? 28 : 34),
        drift: rand(-70, 70),
        duration: rand(8.2, 13.8),
        delay: rand(0, 5.8),
        alpha: rand(0.45, 0.95),
      };
    });
  }, []);

  const activePhoto = photos.length > 0 ? photos[photoIndex % photos.length] : "";
  const progressPct = ((buildStep + 1) / BUILD_MESSAGES.length) * 100;
  const waLink =
    "https://wa.me/6282136815201?text=Hai%2C%20aku%20udah%20lihat%20halaman%20hadiahnya.%20Makasih%20ya%20%F0%9F%98%8A";

  const playTone = (freq, time, duration, type = "triangle", gainValue = 0.07) => {
    const { ctx, master } = audioRef.current;
    if (!ctx || !master) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(time);
    osc.stop(time + duration + 0.03);
  };

  const scheduleMusicStep = () => {
    const state = audioRef.current;
    if (!state.ctx) {
      return;
    }

    const now = state.ctx.currentTime + 0.05;
    const melody = [72, 74, 76, null, 76, 77, 79, null, 79, 77, 76, 74, 72, 71, 69, null];
    const bass = [36, 36, 33, 33, 29, 29, 31, 31];
    const chords = [
      [60, 64, 67, 71], // Cmaj7
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [55, 57, 62, 67], // Gsus2/G7sus vibe
    ];

    const melodyIdx = state.step % melody.length;
    const leadNote = melody[melodyIdx];

    if (leadNote !== null) {
      playTone(midiToFreq(leadNote), now, 0.42, "triangle", 0.046);
    }

    if (state.step % 2 === 0) {
      const bassIdx = Math.floor(state.step / 2) % bass.length;
      playTone(midiToFreq(bass[bassIdx]), now, 0.58, "sine", 0.03);
    }

    if (state.step % 4 === 0) {
      const chordIdx = Math.floor(state.step / 4) % chords.length;
      chords[chordIdx].forEach((note, i) => {
        playTone(midiToFreq(note), now + i * 0.015, 1.12, "sine", 0.017);
      });
    }

    if (state.step % 4 === 2 && leadNote !== null) {
      playTone(midiToFreq(leadNote + 12), now + 0.04, 0.22, "triangle", 0.02);
    }

    state.step += 1;
  };

  const startMusic = async () => {
    if (!audioRef.current.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.14;
      master.connect(ctx.destination);

      audioRef.current.ctx = ctx;
      audioRef.current.master = master;

      const bpm = 78;
      const intervalMs = (60 / bpm) * 1000;
      audioRef.current.timer = window.setInterval(scheduleMusicStep, intervalMs);
      scheduleMusicStep();
    }

    if (audioRef.current.ctx.state === "suspended") {
      await audioRef.current.ctx.resume();
    }
  };

  const toggleMusic = async () => {
    if (!audioRef.current.ctx) {
      await startMusic();
    }

    setMusicOn((prev) => {
      const next = !prev;
      if (audioRef.current.master) {
        audioRef.current.master.gain.value = next ? 0.14 : 0.001;
      }
      return next;
    });
  };

  const spawnBurst = (x, y) => {
    const items = Array.from({ length: 8 }, () => {
      const id = burstIdRef.current;
      burstIdRef.current += 1;

      return {
        id,
        x,
        y,
        dx: rand(-58, 58),
        dy: rand(-72, 26),
        size: rand(8, 16),
        delay: rand(0, 0.12),
      };
    });

    const ids = items.map((item) => item.id);
    setBursts((prev) => [...prev, ...items]);

    window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => !ids.includes(item.id)));
    }, 950);
  };

  const handleScenePointer = (event) => {
    if (phase !== "main") {
      return;
    }

    if (event.target.closest("button, a")) {
      return;
    }

    spawnBurst(event.clientX, event.clientY);
  };

  const handleStart = async () => {
    await startMusic();
    setPhase("buildup");
    setBuildStep(0);
    spawnBurst(window.innerWidth / 2, window.innerHeight / 2);
  };

  const handlePhotoError = (src) => {
    setPhotos((prev) => prev.filter((item) => item !== src));
    setPhotoIndex(0);
  };

  useEffect(() => {
    if (phase !== "buildup") {
      return undefined;
    }

    const stepDelay = PREFERS_REDUCED_MOTION ? 900 : 1400;

    const stepTimer = window.setInterval(() => {
      setBuildStep((prev) => {
        const next = prev + 1;
        return next >= BUILD_MESSAGES.length ? BUILD_MESSAGES.length - 1 : next;
      });
    }, stepDelay);

    const revealTimer = window.setTimeout(() => {
      setPhase("main");
    }, stepDelay * BUILD_MESSAGES.length + 350);

    return () => {
      window.clearInterval(stepTimer);
      window.clearTimeout(revealTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (
      phase !== "main" ||
      mainStep !== 1 ||
      photos.length <= 1 ||
      PREFERS_REDUCED_MOTION
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % photos.length);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [phase, photos.length, mainStep]);

  useEffect(() => {
    if (phase !== "main") {
      return undefined;
    }

    setMainStep(0);
    setPhotoIndex(0);

    const introDuration = PREFERS_REDUCED_MOTION ? 2600 : 3600;
    const photoSlideDuration = 2500;
    const photoDuration =
      photos.length > 1
        ? (photos.length - 1) * photoSlideDuration + 1800
        : 3600;

    const toPhotoTimer = window.setTimeout(() => {
      setMainStep(1);
    }, introDuration);

    const toClosingTimer = window.setTimeout(() => {
      setMainStep(2);
    }, introDuration + photoDuration);

    return () => {
      window.clearTimeout(toPhotoTimer);
      window.clearTimeout(toClosingTimer);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (audioRef.current.timer) {
        window.clearInterval(audioRef.current.timer);
      }
      if (audioRef.current.ctx) {
        audioRef.current.ctx.close();
      }
    };
  }, []);

  return (
    <main className={`app phase-${phase}`} onPointerDown={handleScenePointer}>
      <div className="ambient-field" aria-hidden="true">
        {floaters.map((floater) => (
          <span
            key={floater.id}
            className={`floater floater-${floater.type}`}
            style={{
              left: `${floater.left}vw`,
              width: `${floater.size}px`,
              height: `${floater.size}px`,
              opacity: floater.alpha,
              animationDuration: `${floater.duration}s`,
              animationDelay: `${floater.delay}s`,
              "--drift": `${floater.drift}px`,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        className="music-toggle"
        onClick={toggleMusic}
        aria-pressed={musicOn}
      >
        Musik: {musicOn ? "On" : "Off"}
      </button>

      {phase === "gate" && (
        <section className="gate-card">
          <p className="gate-tag">Valentine Motion</p>
          <h1>Untuk Khalisa Zulfa</h1>
          <p>Hadiah untukmu.</p>
          <button type="button" onClick={handleStart}>
            Mulai
          </button>
        </section>
      )}

      {phase === "buildup" && (
        <section className="build-card">
          <p className="build-tag">Lagi Disiapin</p>
          <div className="build-orb" aria-hidden="true">
            <span className="ring ring-a" />
            <span className="ring ring-b" />
            <span className="core" />
          </div>
          <p className="build-message">{BUILD_MESSAGES[buildStep]}</p>
          <div className="build-progress" aria-hidden="true">
            <span style={{ width: `${progressPct}%` }} />
          </div>
        </section>
      )}

      {phase === "main" && (
        <section className="main-card">
          <p className="main-tag">Cerita Kecil</p>
          <div className="story-track" aria-hidden="true">
            {STORY_STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={`story-dot ${idx <= mainStep ? "is-active" : ""}`}
                title={step.label}
              />
            ))}
          </div>

          {mainStep === 0 && (
            <div className="story-panel" key="intro">
              <h2>Khalisa Zulfa, ini halaman kecil buat kamu.</h2>
              <p className="main-copy">
                Bukan hal besar, cuma sedikit effort dari aku biar hari kamu
                terasa manis. Buat aku, kamu cantik dan imut.
              </p>
              <p className="panel-note">Lanjut pelan, nikmati animasinya dulu.</p>
            </div>
          )}

          {mainStep === 1 && (
            <div className="story-panel" key="photo">
              <h2>Bagian Favorit</h2>
              <div className="photo-frame">
                {activePhoto ? (
                  <img
                    src={activePhoto}
                    alt="Foto untuk Khalisa Zulfa"
                    onError={() => handlePhotoError(activePhoto)}
                  />
                ) : (
                  <div className="photo-placeholder">
                    Masukkan foto ke folder public/photos
                    <small>
                      Gunakan nama: khalisa-1.jpg, khalisa-2.jpg, khalisa-3.jpg,
                      khalisa-4.jpg
                    </small>
                  </div>
                )}
              </div>
              <p className="panel-note">
                Foto akan berganti otomatis, jadi kamu tinggal lihat aja.
              </p>
            </div>
          )}

          {mainStep === 2 && (
            <div className="story-panel closing-panel" key="closing">
              <h2>Kalau kamu berkenan...</h2>
              <p className="main-copy">
                Hubungi aku lagi ya. Aku senang banget kalau bisa lanjut ngobrol.
              </p>
              <a
                className="wa-cta"
                href={waLink}
                target="_blank"
                rel="noreferrer"
              >
                Chat Aku di WhatsApp
              </a>
            </div>
          )}

          <p className="main-note">Tap area kosong buat efek hati kecil.</p>
        </section>
      )}

      <div className="burst-layer" aria-hidden="true">
        {bursts.map((item) => (
          <span
            key={item.id}
            className="burst"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              "--dx": `${item.dx}px`,
              "--dy": `${item.dy}px`,
              animationDelay: `${item.delay}s`,
            }}
          />
        ))}
      </div>
    </main>
  );
}

export default App;
