#!/usr/bin/env python3
"""Compute weighted ranking totals for AI video makers.

Reads ONLY these three files and nothing else:
  src/data/tools.csv     (tool names and source page URLs)
  src/data/scores.csv    (criterion scores 0/3/5 with evidence_url and evidence_quote)
  src/data/rubric.json   (criteria, weights, anchors)
Also reads src/data/evidence.csv to confirm each quoted score evidence is a real recorded snippet.

Writes src/data/ranking.json, which the ranking pages render.
Order: total score (unrounded) descending, ties alphabetical by tool name.
Equal totals share a rank (competition ranking: 1, 1, 3 ...).

Run:  python3 scripts/score.py        (add --check to fail if ranking.json is out of date)
"""
import csv, json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "src" / "data"
ALLOWED = {0, 3, 5}


def read_csv(name):
    with open(D / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    rubric = json.load(open(D / "rubric.json", encoding="utf-8"))
    crit = rubric["criteria"]
    assert sum(c["weight"] for c in crit) == 100, "weights must add up to 100"
    tools = read_csv("tools.csv")
    scores = read_csv("scores.csv")
    evidence = read_csv("evidence.csv")
    ev_set = {(e["tool_id"], e["evidence_snippet"]) for e in evidence}
    tool_ids = {t["tool_id"] for t in tools}
    crit_ids = {c["id"] for c in crit}

    by = {}
    errors = []
    for s in scores:
        tid, cid = s["tool_id"], s["criterion"]
        if tid not in tool_ids:
            errors.append(f"unknown tool {tid}")
            continue
        if cid not in crit_ids:
            errors.append(f"unknown criterion {cid}")
            continue
        if (tid, cid) in by:
            errors.append(f"duplicate score {tid}/{cid}")
        sc = int(s["score"])
        if sc not in ALLOWED:
            errors.append(f"{tid}/{cid}: score {sc} not in 0/3/5")
        quote = s["evidence_quote"].strip()
        unverified = quote.startswith("UNVERIFIED")
        if sc > 0:
            if unverified or not s["evidence_url"].strip() or not quote:
                errors.append(f"{tid}/{cid}: score {sc} needs evidence_url and a verbatim evidence_quote")
            elif (tid, quote) not in ev_set:
                errors.append(f"{tid}/{cid}: quote is not a recorded evidence snippet for this tool")
        else:
            if not quote:
                errors.append(f"{tid}/{cid}: score 0 needs a quote or UNVERIFIED note")
        by[(tid, cid)] = {"score": sc, "evidence_url": s["evidence_url"].strip(), "evidence_quote": quote,
                          "checked": (not unverified)}
    for t in tools:
        for c in crit:
            if (t["tool_id"], c["id"]) not in by:
                errors.append(f"missing score {t['tool_id']}/{c['id']}")
    if errors:
        print("\n".join("ERROR: " + e for e in errors))
        sys.exit(1)

    def page_url(t, kind):
        if kind == "pricing":
            return t["starting_price_plan_source_url"]
        if kind == "terms":
            return t["terms_url"]
        return None

    labels = {"pricing": "pricing page", "terms": "terms of service", "help": "help center article",
              "product": "product or features page", "changelog": "changelog or release notes"}

    out_tools = []
    for t in tools:
        total = 0.0
        rows = []
        needs = []
        for c in crit:
            r = by[(t["tool_id"], c["id"])]
            pts = r["score"] / 5 * c["weight"]
            total += pts
            rows.append({"criterion": c["id"], "name": c["name"], "weight": c["weight"], "score": r["score"],
                         "points": round(pts, 4), "checked": r["checked"],
                         "evidence_url": r["evidence_url"], "evidence_quote": r["evidence_quote"]})
            if not r["checked"]:
                pages = []
                for kind in c["pages"]:
                    u = page_url(t, kind)
                    pages.append({"kind": labels[kind], "url": u})
                needs.append({"criterion": c["id"], "name": c["name"], "pages": pages})
        out_tools.append({"tool_id": t["tool_id"], "tool_name": t["tool_name"], "total": total,
                          "criteria": rows, "checked_count": sum(1 for r in rows if r["checked"]),
                          "criteria_count": len(rows), "needs": needs})

    out_tools.sort(key=lambda x: (-round(x["total"], 9), x["tool_name"].lower()))
    rank = 0
    prev = None
    for i, t in enumerate(out_tools, 1):
        key = round(t["total"], 9)
        if key != prev:
            rank = i
            prev = key
        t["rank"] = rank
        t["total_display"] = f"{t['total']:.1f}"

    complete = all(t["checked_count"] == t["criteria_count"] for t in out_tools)
    result = {"category": rubric["category"], "title": rubric["title"], "rubric_version": rubric["version"],
              "complete": complete,
              "status": "READY" if complete else "DRAFT - not ready to publish: scores incomplete",
              "criteria": [{"id": c["id"], "name": c["name"], "weight": c["weight"], "where": c["where"]} for c in crit],
              "total_checked": sum(t["checked_count"] for t in out_tools),
              "total_cells": sum(t["criteria_count"] for t in out_tools),
              "tools": out_tools}
    text = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    target = D / "ranking.json"
    if "--check" in sys.argv:
        if not target.exists() or target.read_text(encoding="utf-8") != text:
            print("ranking.json is out of date: run python3 scripts/score.py")
            sys.exit(1)
        print("ranking.json is up to date")
        return
    target.write_text(text, encoding="utf-8")
    print(f"wrote {target.relative_to(ROOT)}: {len(out_tools)} tools, {result['total_checked']}/{result['total_cells']} criteria checked, status: {result['status']}")


if __name__ == "__main__":
    main()
