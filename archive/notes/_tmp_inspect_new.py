"""Inspect expanded Pilot 4 fields for original vs new-session comparison."""
import json
from pathlib import Path
from pprint import pprint

OLD = Path(
    r"C:\Users\Achiel\Dropbox\Research\CASES\Papers\SM-CASES\Semantic learning\Pilots\semantic_learning_pilot4_star_completed.json"
)
NEW = Path(
    r"C:\Users\Achiel\Dropbox\Research\CASES\Papers\SM-CASES\Semantic learning\Pilots\semantic_learning_pilot4_star_expanded_completed.json"
)
old = json.loads(OLD.read_text(encoding="utf-8"))
new = json.loads(NEW.read_text(encoding="utf-8"))


def sid(r):
    return r.get("sessionId") or r.get("Document_ID") or ""


old_ids = {sid(r) for r in old}
r = next(x for x in new if any(ph.get("type") == "morph_task" for ph in (x.get("storedData") or [])))
print("top keys", sorted(r.keys()))
print("hba", r.get("hatBindingAssignment"))
print("morphAssignment", r.get("morphAssignment"))
print("colorAssignment keys", list((r.get("colorAssignment") or {}).keys())[:20] if isinstance(r.get("colorAssignment"), dict) else type(r.get("colorAssignment")))
fens = r.get("fennimals")
print("fennimals type", type(fens), "len", len(fens) if hasattr(fens, "__len__") else None)
if isinstance(fens, list) and fens:
    print("fen0 keys", fens[0].keys() if isinstance(fens[0], dict) else fens[0])
    pprint(fens[0] if isinstance(fens[0], dict) else fens[:2])
elif isinstance(fens, dict):
    k = next(iter(fens))
    print("fen dict sample", k, fens[k] if not isinstance(fens[k], dict) else list(fens[k].keys()))
    pprint({kk: fens[kk] for kk in list(fens)[:2]})
print("featureMap", r.get("featureMap"))
print("totalDuration", r.get("totalDuration"))
print("quiz fail flag", r.get("quiz_criterion_failed"))
# sorting phase
for ph in r["storedData"]:
    print("phase", ph.get("type"), "keys sample", list(ph.keys())[:15])
