# DEVELOPERS.md

Entwickler‑Notizen & Konventionen

Ziel: Code verständlich und erweiterbar halten. Wichtige Hinweise:

- Architektur
  - src/core: Kernsysteme (Game, Audio, Assets, Input, Logger)
  - src/entities: alle Entities (Player, Enemy, Bullet, Particle, Powerup, Boss)
  - src/systems: Renderer & Physikhilfen
  - src/levels: LevelManager
  - src/utils: wiederverwendbare Utilities (Pool)

- Pools
  - Verwende Pool.obtain() um ein Objekt aus dem Pool zu bekommen
  - Nach Gebrauch Pool.release(obj) aufrufen (obj.reset() wird aufgerufen wenn vorhanden)
  - Pools haben eine maxSize in Pool-Konstruktor, damit sich der Pool nicht unendlich vergrößert

- Neue Entity hinzufügen
  - Lege eine Datei in src/entities an, implementiere init/update/reset
  - Falls viele Instanzen auftreten: verwende Pool und registriere im Game (z.B. enemyPool)

- Performance
  - Vermeide häufiges Erzeugen von Arrays/Objekten in der main loop
  - Nutze Pools für wiederkehrende, kurzlebige Objekte (Bullets, Particles, Enemies)
  - Verwende broad-phase (bspw. broadPhaseByX) bevor du teure Kollisionsprüfungen startest

- Audio
  - SFX werden als AudioBuffer geladen und über WebAudio abgespielt
  - Music ist ein <audio> element (wird nicht in WebAudio decodiert) um Speicher zu sparen
  - AudioManager.initOnUserGesture() muss nach Nutzerinteraktion aufgerufen werden

- Tests / Manual QA
  - Starte lokal via HTTP server
  - Testfälle:
    - Power-Up aufsammeln -> HUD zeigt Effekt; nach Timer endet Effekt
    - Boss spawnt (rare) -> attack patterns auslösen ohne Crash
    - Musik & SFX toggles in Options sollten persistent sein

- Coding Style
  - Verwende ES6 Module / Classes
  - Kurze, klare Funktionen; kommentiere public methods
  - Logger.info/debug/warn verwenden statt direkten console-Aufrufen

