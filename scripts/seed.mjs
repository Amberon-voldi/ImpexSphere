// Seeds the marketplace with categories plus clearly-marked SAMPLE suppliers,
// listings, price history and buying requests, so the site has something to show.
//
//   npm run db:seed     add categories + sample data (safe to re-run)
//   npm run db:unseed   delete every row marked is_sample (categories stay)
//
// Only touches tables in the "impexsphere" schema.
import postgres from "postgres";

function databaseUrl() {
  const raw = process.env.RDS_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error("Set RDS_DATABASE_URL (production) or DATABASE_URL (local).");
  const url = new URL(raw);
  if (url.hostname.endsWith(".rds.amazonaws.com") && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

const sql = postgres(databaseUrl(), { max: 1, onnotice: () => {} });
const unseed = process.argv.includes("--remove");

// Deterministic PRNG so every seed run produces the same data.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const slugify = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const categories = [
  { slug: "turmeric", name: "Turmeric", hue: "#f0a81c", shape: "finger", blurb: "Fingers, bulbs and powder graded by curcumin." },
  { slug: "chillies", name: "Dried Chillies", hue: "#e0432b", shape: "pod", blurb: "Stemmed, stemless, crushed and powder across heat grades." },
  { slug: "cumin", name: "Cumin Seed", hue: "#a8743f", shape: "seed", blurb: "Machine-cleaned and sortex cumin in export purities." },
  { slug: "coriander", name: "Coriander", hue: "#b9a95a", shape: "round", blurb: "Eagle, scooter and split grades for grinders and packers." },
  { slug: "black-pepper", name: "Black Pepper", hue: "#6b5244", shape: "round", blurb: "Malabar and Tellicherry, garbled and ungarbled." },
  { slug: "cardamom", name: "Cardamom", hue: "#62a94f", shape: "pod", blurb: "Green cardamom from Idukki, sized from 6 to 8 mm+." },
  { slug: "fennel", name: "Fennel Seed", hue: "#8dbb5e", shape: "seed", blurb: "Lucknowi and Singapore-quality sortexed fennel." },
  { slug: "fenugreek", name: "Fenugreek", hue: "#d1a13c", shape: "seed", blurb: "Whole and powder, 99% purity for food processors." },
  { slug: "dry-ginger", name: "Dry Ginger", hue: "#d6b47c", shape: "finger", blurb: "Bleached and unbleached Cochin dry ginger." },
];

const suppliers = [
  ["Kaveri Valley Agro", "Erode", "Tamil Nadu", "trusted", 2009, ["turmeric", "coriander"]],
  ["Guntur Red Gold Traders", "Guntur", "Andhra Pradesh", "trusted", 2004, ["chillies"]],
  ["Unjha Seed Processors", "Unjha", "Gujarat", "verified", 2012, ["cumin", "fennel", "fenugreek"]],
  ["Malabar Coast Spices", "Kochi", "Kerala", "trusted", 1998, ["black-pepper", "dry-ginger", "cardamom"]],
  ["Idukki Highlands Estates", "Kumily", "Kerala", "verified", 2015, ["cardamom", "black-pepper"]],
  ["Deccan Harvest Exports", "Nizamabad", "Telangana", "verified", 2011, ["turmeric", "chillies"]],
  ["Marwar Agri Commodities", "Jodhpur", "Rajasthan", "listed", 2018, ["cumin", "coriander", "fenugreek"]],
  ["Byadgi Spice Collective", "Byadgi", "Karnataka", "verified", 2014, ["chillies"]],
  ["Sangli Turmeric House", "Sangli", "Maharashtra", "listed", 2019, ["turmeric"]],
  ["Kota Coriander Mills", "Kota", "Rajasthan", "verified", 2010, ["coriander", "fennel"]],
];

const templates = {
  turmeric: [
    ["Salem Finger Turmeric", "Salem", "Polished fingers", 128, [["Curcumin", "3.5–4%"], ["Moisture", "≤ 10%"], ["Lead (Pb)", "< 2.5 ppm"]]],
    ["Erode Bulb Turmeric", "Erode", "Bulbs", 112, [["Curcumin", "2.5–3%"], ["Moisture", "≤ 10%"], ["Foreign matter", "< 1%"]]],
    ["Rajapuri Turmeric Powder", "Sangli", "Powder", 168, [["Curcumin", "3%"], ["Mesh", "60–80"], ["Moisture", "≤ 9%"]]],
    ["Nizamabad Double-Polished", "Nizamabad", "Double-polished fingers", 121, [["Curcumin", "3–3.5%"], ["Moisture", "≤ 10%"], ["Sortex", "Yes"]]],
  ],
  chillies: [
    ["S4 Sannam Stem Chilli", "Guntur", "Whole, with stem", 212, [["ASTA colour", "40–60"], ["Pungency", "25k–35k SHU"], ["Moisture", "≤ 11%"]]],
    ["Teja Stemless Chilli", "Khammam", "Whole, stemless", 248, [["ASTA colour", "50–70"], ["Pungency", "75k–100k SHU"], ["Moisture", "≤ 11%"]]],
    ["Byadgi KDL Chilli", "Byadgi", "Whole, with stem", 312, [["ASTA colour", "120–160"], ["Pungency", "8k–15k SHU"], ["Moisture", "≤ 12%"]]],
    ["341 Crushed Chilli Flakes", "Guntur", "Crushed 2–4 mm", 236, [["Pungency", "35k–45k SHU"], ["Seed content", "40%"], ["Moisture", "≤ 10%"]]],
  ],
  cumin: [
    ["Cumin Europe Quality 99%", "Unjha", "Whole, sortex", 268, [["Purity", "99%"], ["Moisture", "≤ 9%"], ["Admixture", "< 1%"]]],
    ["Cumin Singapore Quality 98%", "Unjha", "Whole, machine-cleaned", 252, [["Purity", "98%"], ["Moisture", "≤ 9%"], ["Volatile oil", "≥ 2.5%"]]],
    ["Cumin 99.5% Bold", "Jodhpur", "Whole, sortex, bold", 284, [["Purity", "99.5%"], ["Moisture", "≤ 8%"], ["Grain", "Bold"]]],
  ],
  coriander: [
    ["Coriander Eagle Quality", "Kota", "Whole, sortex", 96, [["Purity", "99%"], ["Split", "< 5%"], ["Moisture", "≤ 10%"]]],
    ["Coriander Split (Dal)", "Kota", "Split", 112, [["Purity", "99%"], ["Moisture", "≤ 9%"], ["Colour", "Green-yellow"]]],
    ["Coriander Scooter Grade", "Ramganj Mandi", "Whole", 88, [["Purity", "98%"], ["Split", "< 8%"], ["Moisture", "≤ 10%"]]],
  ],
  "black-pepper": [
    ["Malabar Garbled 550 GL", "Wayanad", "Whole, garbled", 612, [["Bulk density", "550 g/L"], ["Moisture", "≤ 12%"], ["Light berries", "< 5%"]]],
    ["Tellicherry Extra Bold 4.75 mm", "Kannur", "Whole, TGSEB", 688, [["Size", "≥ 4.75 mm"], ["Bulk density", "570 g/L"], ["Moisture", "≤ 11%"]]],
    ["Black Pepper 500 GL FAQ", "Idukki", "Whole, ungarbled", 586, [["Bulk density", "500 g/L"], ["Moisture", "≤ 12%"], ["Pinheads", "< 2%"]]],
  ],
  cardamom: [
    ["Green Cardamom 8 mm+", "Kumily", "Whole pods", 2480, [["Size", "8 mm+"], ["Colour", "Bold green"], ["Moisture", "≤ 10%"]]],
    ["Green Cardamom 7–8 mm", "Bodinayakanur", "Whole pods", 2210, [["Size", "7–8 mm"], ["Colour", "Green"], ["Litre weight", "≥ 435 g"]]],
    ["Cardamom 6–7 mm Mixed", "Kumily", "Whole pods", 1890, [["Size", "6–7 mm"], ["Colour", "Light green"], ["Moisture", "≤ 11%"]]],
  ],
  fennel: [
    ["Lucknowi Fennel Fine", "Unjha", "Whole, sortex", 196, [["Purity", "99%"], ["Colour", "Bright green"], ["Moisture", "≤ 10%"]]],
    ["Fennel Singapore Quality", "Kota", "Whole, machine-cleaned", 142, [["Purity", "98%"], ["Moisture", "≤ 10%"], ["Admixture", "< 2%"]]],
  ],
  fenugreek: [
    ["Fenugreek Seed 99%", "Unjha", "Whole, sortex", 74, [["Purity", "99%"], ["Moisture", "≤ 9%"], ["Saponins", "Low"]]],
    ["Fenugreek Powder", "Jodhpur", "Powder", 92, [["Mesh", "60"], ["Moisture", "≤ 8%"], ["Purity", "99%"]]],
  ],
  "dry-ginger": [
    ["Cochin Dry Ginger, Unbleached", "Kochi", "Whole, limed", 318, [["Moisture", "≤ 12%"], ["Oleoresin", "≥ 4%"], ["Extraneous", "< 1%"]]],
    ["Dry Ginger Bleached Split", "Kochi", "Split, bleached", 342, [["Moisture", "≤ 11%"], ["Fibre", "< 6%"], ["Colour", "Off-white"]]],
  ],
};

const rfqs = [
  ["Turmeric fingers, 3% curcumin", "turmeric", "2 × 20' FCL (≈ 36 MT)", "Rotterdam, Netherlands", "CIF", "USD 1,650 / MT", "Steam-sterilised, EU MRL compliant, 25 kg PP bags"],
  ["Teja chilli, stemless", "chillies", "1 × 40' HC (≈ 14 MT)", "Port Klang, Malaysia", "CFR", null, "ASTA 60+, aflatoxin < 10 ppb, bales"],
  ["Cumin seed 99% Europe quality", "cumin", "50 MT, monthly for 6 months", "Jebel Ali, UAE", "FOB", "USD 3,050 / MT", "Sortex, 25 kg paper bags with liner"],
  ["Green cardamom 7–8 mm", "cardamom", "2 MT", "Dammam, Saudi Arabia", "CIF", null, "Bold green colour, 10 kg vacuum packs"],
  ["Black pepper 550 GL", "black-pepper", "1 × 20' FCL", "Hamburg, Germany", "CIF", "USD 7,200 / MT", "ASTA cleaned, steam-sterilised"],
  ["Coriander seed, eagle quality", "coriander", "25 MT", "Colombo, Sri Lanka", "CFR", null, "Machine-cleaned, split under 5%"],
  ["Fennel seed, Lucknowi", "fennel", "5 MT", "Houston, USA", "FOB", null, "FDA-registered packer, 25 kg bags"],
  ["Dry ginger, unbleached", "dry-ginger", "10 MT", "Casablanca, Morocco", "CIF", "USD 3,700 / MT", "Moisture ≤ 12%"],
];

async function main() {
  if (unseed) {
    const r = await sql`delete from impexsphere.rfqs where is_sample`;
    const l = await sql`delete from impexsphere.listings where is_sample`;
    const sp = await sql`delete from impexsphere.suppliers where is_sample`;
    console.log(`Removed sample data: ${sp.count} suppliers, ${l.count} listings, ${r.count} buying requests.`);
    return;
  }

  const catId = {};
  for (const [i, c] of categories.entries()) {
    const [row] = await sql`
      insert into impexsphere.categories (slug, name, blurb, hue, shape, sort_order)
      values (${c.slug}, ${c.name}, ${c.blurb}, ${c.hue}, ${c.shape}, ${i})
      on conflict (slug) do update set name = excluded.name
      returning id`;
    catId[c.slug] = row.id;
  }

  const incotermSets = [["FOB", "CIF"], ["FOB", "CFR", "CIF"], ["EXW", "FOB"], ["FOB"], ["CIF", "CFR"]];
  const certPool = ["FSSAI", "APEDA", "Spices Board", "ISO 22000", "HACCP", "Organic (NPOP)", "Halal", "Kosher", "BRCGS"];
  const capPool = ["Sortex cleaning", "Steam sterilisation", "Grinding", "Cold storage", "Private labelling", "In-house lab", "Bulk & retail packing"];
  let listingCount = 0;

  for (const [name, city, state, level, since, cats] of suppliers) {
    const slug = slugify(name);
    const certs = [...new Set([pick(certPool), pick(certPool), "FSSAI", "Spices Board"])];
    const caps = [...new Set([pick(capPool), pick(capPool), pick(capPool)])];
    const [sup] = await sql`
      insert into impexsphere.suppliers
        (slug, name, city, state, about, level, since_year, rating, response_hours, completed_trades,
         capabilities, certifications, is_sample)
      values (${slug}, ${name}, ${city}, ${state},
        ${`${name} is a ${level === "trusted" ? "long-standing" : "growing"} ${categories.find((c) => c.slug === cats[0]).name.toLowerCase()} specialist based in ${city}, ${state}, supplying processors, packers and exporters since ${since}.`},
        ${level}, ${since}, ${(4 + rand() * 0.9).toFixed(1)}, ${pick([2, 4, 6, 12, 24])}, ${Math.floor(rand() * 180) + 8},
        ${caps}, ${certs}, true)
      on conflict (slug) do update set name = excluded.name
      returning id`;

    for (const cat of cats) {
      const pool = templates[cat];
      const count = cats.length === 1 ? 3 : 2;
      for (let k = 0; k < count; k++) {
        const [title, origin, form, base, specs] = pool[(k + suppliers.findIndex((x) => x[0] === name)) % pool.length];
        const lslug = slugify(`${title}-${city}`);
        const price = Math.round(base * (0.94 + rand() * 0.12) * 100) / 100;
        const moq = pick([500, 1000, 2000, 5000, 10000]);
        const [lst] = await sql`
          insert into impexsphere.listings
            (slug, supplier_id, category_id, title, variety, grade, form, origin, summary, price_inr_kg,
             moq_kg, stock_kg, lead_time_days, packing, incoterms, certifications, specs, lab_report,
             status, featured, views, is_sample)
          values (${lslug}, ${sup.id}, ${catId[cat]}, ${title}, ${title.split(" ")[0]}, ${specs[0][1]}, ${form}, ${origin},
            ${`${form} ${title.toLowerCase()} from ${origin}, ${specs.map(([a, b]) => `${a.toLowerCase()} ${b}`).join(", ")}. Lots inspected against spec before dispatch.`},
            ${price}, ${moq}, ${moq * (Math.floor(rand() * 40) + 6)}, ${pick([7, 10, 14, 21])},
            ${pick(["25 kg PP bags", "50 kg jute bags", "25 kg paper bags with liner", "10 kg vacuum cartons"])},
            ${pick(incotermSets)}, ${certs.slice(0, 3)}, ${sql.json(specs)}, ${rand() > 0.25},
            'active', ${rand() > 0.72}, ${Math.floor(rand() * 900) + 40}, true)
          on conflict (slug) do nothing
          returning id`;
        if (!lst) continue;
        listingCount++;

        // 60 days of price history, random walk ending at the current price.
        let p = price;
        const points = [];
        for (let d = 0; d < 60; d++) {
          const day = new Date();
          day.setUTCHours(0, 0, 0, 0);
          day.setUTCDate(day.getUTCDate() - d);
          points.push({ listing_id: lst.id, price_inr_kg: Math.round(p * 100) / 100, recorded_on: day });
          p = p * (1 + (rand() - 0.52) * 0.035);
        }
        await sql`insert into impexsphere.listing_prices ${sql(points)} on conflict do nothing`;
      }
    }
  }

  let rfqCount = 0;
  for (const [i, [commodity, cat, qty, dest, inco, target, specs]] of rfqs.entries()) {
    const created = new Date(Date.now() - (i * 19 + 3) * 3600 * 1000);
    const r = await sql`
      insert into impexsphere.rfqs
        (ref, status, category_id, commodity, specs, quantity, destination, incoterm, target_price,
         delivery_by, buyer_name, buyer_company, buyer_email, is_sample, created_at, updated_at)
      values (${`RFQ-S${String(i + 1).padStart(3, "0")}`}, 'open', ${catId[cat]}, ${commodity}, ${specs}, ${qty},
        ${dest}, ${inco}, ${target}, ${pick(["Within 30 days", "Within 45 days", "Next quarter", "Flexible"])},
        'Sample buyer', 'Sample importer', 'sample@example.com', true, ${created}, ${created})
      on conflict (ref) do nothing`;
    rfqCount += r.count;
  }

  console.log(`Seeded ${categories.length} categories, ${suppliers.length} sample suppliers, ${listingCount} new sample listings, ${rfqCount} new sample buying requests.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
