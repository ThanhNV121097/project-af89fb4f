/**
 * Two directions for the owner to choose between, one screen each, at 1440.
 * Desktop only, and deleted as soon as the choice is made: local styles, raw
 * colours and literal words on purpose — none of this is the site, so none of
 * it goes through theme.css or content.json. It lives outside src/pages/ for
 * that reason.
 *
 * The products, descriptions and prices are SAMPLES: the owner supplied none.
 */
const FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500&display=swap');";

type Item = { name: string; note: string; price: string; img: string; pad: number };

/* Four goods, four photographs, one each. Nothing repeated. */
const items: Item[] = [
  { name: "Café cup, white", note: "Thick-walled porcelain, 180ml", price: "$18", img: "/images/mug.png", pad: 12 },
  { name: "Enamel pot, 2 litre", note: "Steel under enamel, printed lid", price: "$54", img: "/images/saucepan.png", pad: 6 },
  { name: "Wine glass, blush stem", note: "Hand-blown, sold singly", price: "$12", img: "/images/carafe.png", pad: 16 },
  { name: "Smoked almonds, 200g", note: "Salted, from the back counter", price: "$9", img: "/images/bowl.png", pad: 14 },
];

/* ─────────────────────────────  1 · Window display  ───────────────────────── */

export function DirectionsWindow() {
  return (
    <div style={{ minHeight: "100vh", background: "#121211", color: "#F2EFE8", fontFamily: "Archivo, sans-serif", display: "flex" }}>
      <style>{FONTS}</style>

      {/* the shop photograph, bled to the left edge of the viewport, full height */}
      <div style={{ flex: "0 0 430px", position: "relative", overflow: "hidden" }}>
        <img
          src="/images/shop-window.jpg"
          alt="Lamps lit in the shop after closing"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "62% 42%", filter: "brightness(0.8) saturate(0.9)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(18,18,17,0.45) 0%, rgba(18,18,17,0.05) 45%, rgba(18,18,17,0.9) 100%)" }} />
        <span
          style={{
            position: "absolute", left: 20, bottom: 36, writingMode: "vertical-rl", transform: "rotate(180deg)",
            fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#F2EFE8",
          }}
        >
          Open Tue – Sat · 10 – 6
        </span>
      </div>

      {/* the words and the shelf */}
      <div style={{ flex: 1, minWidth: 0, padding: "56px 0 44px 64px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingRight: 56 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "#A8A29A" }}>Shelf · this week</span>
          <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#121211", background: "#D98B3A", padding: "5px 10px" }}>
            Direction 1 — Window display
          </span>
        </div>

        <h1 style={{ margin: "44px 0 0", fontSize: 56, lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.025em" }}>
          Four things worth<br />carrying home.
        </h1>
        <p style={{ margin: "20px 0 0", maxWidth: 420, fontSize: 16, lineHeight: 1.6, color: "#A8A29A" }}>
          Everything on the shelf is here because we use it ourselves. Prices are what you pay at the counter.
        </p>

        {/* the shelf: cut-outs on the dark ground, the row running off the right edge */}
        <div style={{ marginTop: "auto", display: "flex", gap: 1, borderTop: "1px solid rgba(242,239,232,0.14)", marginRight: -110 }}>
          {items.map((it) => (
            <figure key={it.name} style={{ margin: 0, flex: "0 0 238px", background: "#1C1B19", paddingBottom: 18 }}>
              <div style={{ height: 206, display: "flex", alignItems: "center", justifyContent: "center", padding: it.pad }}>
                <img src={it.img} alt={it.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <figcaption style={{ padding: "0 18px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em" }}>{it.name.split(",")[0]}</span>
                  <span style={{ fontSize: 30, fontWeight: 500, color: "#D98B3A", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>{it.price}</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, color: "#A8A29A" }}>{it.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────  2 · The price board  ─────────────────────── */

export function DirectionsBoard() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#101010", fontFamily: "Inter, sans-serif", display: "flex" }}>
      <style>{FONTS}</style>

      <div style={{ flex: 1, minWidth: 0, padding: "48px 48px 32px 56px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6B6B6B" }}>Shelf · priced today</span>
            <h1 style={{ margin: "14px 0 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.03em" }}>
              What’s in, what it costs.
            </h1>
          </div>
          <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#FFFFFF", background: "#1F3CFF", padding: "5px 10px" }}>
            Direction 2 — The price board
          </span>
        </div>

        {/* the board: a hairline rule system, oversized numerals in the left margin */}
        <div style={{ marginTop: 34, borderTop: "1px solid rgba(16,16,16,0.12)" }}>
          {items.map((it, i) => (
            <div
              key={it.name}
              style={{
                display: "grid", gridTemplateColumns: "66px 108px 1fr auto", alignItems: "center", gap: 24,
                borderBottom: "1px solid rgba(16,16,16,0.12)", padding: "13px 0",
              }}
            >
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 400, color: "#D4D4D1", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ height: 100, background: "#F4F4F2", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
                <img src={it.img} alt={it.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: "-0.03em" }}>{it.name}</div>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B6B6B" }}>{it.note}</p>
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 500, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", textAlign: "right", minWidth: 140 }}>
                {it.price}
              </span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: "auto", paddingTop: 22, fontSize: 13, color: "#6B6B6B" }}>
          Four of four on the shelf · brian.ng.2305@gmail.com
        </p>
      </div>

      {/* one tall photograph locked to the right edge, full height */}
      <div style={{ flex: "0 0 300px", overflow: "hidden" }}>
        <img
          src="/images/shop-tall.jpg"
          alt="Shelves in the workshop at the back of the shop"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }}
        />
      </div>
    </div>
  );
}
