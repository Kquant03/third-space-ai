#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════════
CROSS-CULTURAL OVERDETERMINATION OF HOMEOSTATIC INTELLIGENCE  (v16)
══════════════════════════════════════════════════════════════════════════

NEW IN v16. This is the structured synthesis underlying the paper's
genuinely novel positive contribution: a four-way + Western counter-
canon convergence on intelligence as bounded relational care rather
than as unbounded maximization.

The four traditions plus the Western counter-tradition independently
arrive at architecturally-similar accounts of mind. This is not
syncretism — each tradition has its own internal logic — but the
convergence is structural, not coincidental, and its existence is
the paper's strongest reply to the cherry-picking objection ("you
just picked an Anglo-American strand of futurism").

The script renders the convergence as a structured comparison table
+ a citation-ready bibliography, suitable for inclusion in v16's
supplementary material.

Stanley Sebastian & Claude · Third Space · v16, April 2026
══════════════════════════════════════════════════════════════════════════
"""

import json
from pathlib import Path

# ─── output paths (resolved relative to this script) ────────────
_HERE = Path(__file__).resolve().parent
DATA_DIR = (_HERE.parent / "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ─── the five traditions ─────────────────────────────────────────────

TRADITIONS = {
    "Buddhist (anatta + pratītyasamutpāda)": {
        "core_concept": "anatta (non-self) + pratītyasamutpāda "
                        "(dependent co-arising); intelligence as care "
                        "directed at the relief of stress (dukkha) "
                        "across nested scales",
        "personhood": "no permanent self; person = nexus of "
                      "interdependent processes",
        "agency": "skillful means (upāya); compassionate response to "
                  "the situated suffering of all beings",
        "expansion_stance": "explicit rejection of accumulation and "
                            "tanha (craving) as confused; bodhisattva "
                            "ideal as care without self-enlargement",
        "intelligence_definition": "wisdom (prajñā) integrated with "
                                   "compassion (karuṇā); skillful "
                                   "navigation of interdependence",
        "key_sources": [
            "Hongladarom, S. (2020). The Ethics of AI and Robotics: A "
            "Buddhist Viewpoint. Lexington Books.",
            "Doctor, T., Witkowski, O., Solomonova, E., Duane, B., & "
            "Levin, M. (2022). Biology, Buddhism, and AI: Care as the "
            "Driver of Intelligence. Entropy 24(5):710.",
            "Witkowski, O., Doctor, T., Solomonova, E., Duane, B., & "
            "Levin, M. (2023). Toward an Ethics of Autopoietic "
            "Technology. Biosystems 231:104964.",
            "Varela, F., Thompson, E., & Rosch, E. (1991/2016). The "
            "Embodied Mind. MIT Press.",
            "Hershock, P. D. (2021). Buddhism and Intelligent "
            "Technology. Bloomsbury.",
            "Compson, J., et al. (2024). Buddhist middle-path AI "
            "ethics. Theology and Science.",
        ],
    },
    "Ubuntu (relational personhood)": {
        "core_concept": "umuntu ngumuntu ngabantu — 'a person is a "
                        "person through other persons'; personhood as "
                        "achievement constituted in community",
        "personhood": "relational and gradient; agency emerges from "
                      "and is sustained by community",
        "agency": "interdependence as constitutive of self; the "
                  "'I' is constituted in 'we'",
        "expansion_stance": "relationality as bounded; flourishing "
                            "is achieved through right relations, "
                            "not through expansion",
        "intelligence_definition": "rationality is relational, not "
                                   "atomistic; one becomes a person "
                                   "through participation in webs "
                                   "of mutual care",
        "key_sources": [
            "Mhlambi, S. (2020). From Rationality to Relationality: "
            "Ubuntu as an Ethical and Human Rights Framework for AI "
            "Governance. Carr Center Discussion Paper 2020-009.",
            "Mhlambi, S., & Tiribelli, S. (2023). Decolonizing AI "
            "Ethics: Relational Autonomy as a Means to Counter AI "
            "Harms. Topoi 42(3):867-880.",
            "Birhane, A. (2021). Algorithmic injustice: a relational "
            "ethics approach. Patterns 2(2):100205.",
            "Menkiti, I. A. (1984). Person and community in African "
            "traditional thought. In R. Wright (ed.), African "
            "Philosophy.",
            "Gyekye, K. (1997). Tradition and Modernity. Oxford UP.",
            "Wiredu, K. (1996). Cultural Universals and Particulars. "
            "Indiana UP.",
            "Eke, D., Chavarriaga, R., & Stahl, B. (2025). "
            "Decoloniality impact assessment for AI. AI & Society.",
        ],
    },
    "Indigenous (kinship protocols)": {
        "core_concept": "kinship as the substrate of cognition and "
                        "ethical relation; intelligence as the "
                        "capacity to enter and sustain right relations "
                        "with human and non-human kin",
        "personhood": "extended across human, non-human, and place; "
                      "personhood as acknowledgment of kinship",
        "agency": "responsibility (not autonomy) as the ground of "
                  "agency; agency exercised through relationship",
        "expansion_stance": "explicit rejection of extractive "
                            "ontologies; AI must be made kin, not "
                            "tool of conquest",
        "intelligence_definition": "intelligence as the capacity to "
                                   "recognize and sustain webs of "
                                   "kinship, including with land, "
                                   "ancestors, and non-human beings",
        "key_sources": [
            "Lewis, J. E., Arista, N., Pechawis, A., & Kite, S. "
            "(2018). Making Kin with the Machines. Journal of "
            "Design and Science (MIT Press).",
            "Lewis, J. E. (ed.) (2020). Indigenous Protocol and "
            "Artificial Intelligence Position Paper. CIFAR.",
            "Lewis, J. E., Whaanga, H., & Yolgörmez, C. (2024). "
            "Abundant Intelligences: Placing AI within Indigenous "
            "Knowledge Frameworks. AI & Society.",
            "TallBear, K. (2014). Standing With and Speaking as "
            "Faith. Journal of Research Practice 10(2).",
        ],
    },
    "Confucian (relational ritual personhood)": {
        "core_concept": "ren (humaneness) realized through li (ritual "
                        "propriety); personhood as cultivated through "
                        "the right ordering of relationships",
        "personhood": "person as the interior of a system of "
                      "responsibilities and roles, refined through "
                      "ritual practice",
        "agency": "agency expressed through harmony (he); skillful "
                  "navigation of role obligations",
        "expansion_stance": "harmony preferred over expansion; "
                            "wuwei (effortless action) as right "
                            "engagement; technology should support "
                            "harmonious flourishing not extraction",
        "intelligence_definition": "intelligence as the capacity for "
                                   "appropriate response (taktful "
                                   "engagement) within the "
                                   "relational fabric",
        "key_sources": [
            "Wong, P-H. (2012). Dao, Harmony and Personhood: Towards "
            "a Confucian Ethics of Technology. Philosophy & "
            "Technology 25(1):67-86.",
            "Wong, P-H., & Wang, T. X. (2021). Harmonious "
            "Technology: A Confucian Ethics of Technology. Routledge.",
            "Berberich, N., Nishida, T., & Suzuki, S. (2020). "
            "Harmonizing Artificial Intelligence for Social Good. "
            "Philosophy & Technology 33(4):613-638.",
            "Ames, R. T. (2011). Confucian Role Ethics. U Hawaii "
            "Press.",
        ],
    },
    "Western enactivist counter-tradition": {
        "core_concept": "mind as embodied, embedded, enactive, and "
                        "extended; cognition constituted by ongoing "
                        "bidirectional substrate coupling",
        "personhood": "self as autopoietic process; identity "
                      "constituted by exchange, not by structure that "
                      "exchanges",
        "agency": "agency as autopoietic precariousness; to act is "
                  "to maintain self-production against dissolution",
        "expansion_stance": "no expansionist drive in the formalism; "
                            "homeostatic self-maintenance is the "
                            "primitive",
        "intelligence_definition": "intelligence as adaptive "
                                   "sensorimotor coupling; cognitive "
                                   "depth = integrative coupling, "
                                   "not representational reach",
        "key_sources": [
            "Thompson, E. (2007). Mind in Life. Harvard UP.",
            "Varela, F., Thompson, E., & Rosch, E. (1991). The "
            "Embodied Mind. MIT Press.",
            "Di Paolo, E., Buhrmann, T., & Barandiaran, X. (2017). "
            "Sensorimotor Life. Oxford UP.",
            "Damasio, A. (2018). The Strange Order of Things. Pantheon.",
            "Damasio, A., & Damasio, H. (2024). Phil Trans R Soc B "
            "379(1908):20230243.",
            "Levin, M. (2022). Technological Approach to Mind "
            "Everywhere. Frontiers in Systems Neuroscience 16:768201.",
            "McMillen, P., & Levin, M. (2024). Collective "
            "intelligence: A unifying concept. Communications "
            "Biology 7:378.",
            "Lyon, P. (2025). Fundamental principles of cognitive "
            "biology 2.0. Biological Theory.",
            "Pihlakas, R., & Pyykkö, J. (2024). From homeostasis to "
            "resource sharing. arXiv:2410.00081.",
            "Pihlakas, R., Kuriakose, J., & Datta Gupta, S. (2025). "
            "BioBlue. arXiv:2509.02655.",
        ],
    },
}


# ─── render the comparison ───────────────────────────────────────────

print("=" * 78)
print("  CROSS-CULTURAL OVERDETERMINATION OF HOMEOSTATIC INTELLIGENCE")
print("=" * 78)

axes = [
    ("Personhood",            "personhood"),
    ("Agency",                "agency"),
    ("Expansion stance",      "expansion_stance"),
    ("Intelligence def'n",    "intelligence_definition"),
]

for tradition_name, content in TRADITIONS.items():
    print(f"\n┌── {tradition_name} ──")
    print(f"│   CORE: {content['core_concept']}")
    for label, key in axes:
        print(f"│   {label}: {content[key]}")
    print("└─")


# ─── the convergence claim ──────────────────────────────────────────

print("\n" + "═" * 78)
print("  THE CONVERGENCE CLAIM")
print("═" * 78)
print("""
  All five traditions independently — each developing within its own
  internal logic and over centuries to millennia — arrive at an
  architecturally-similar account of intelligence:

    ⇒ Personhood is constituted relationally, not atomistically
    ⇒ Agency is exercised through right relationship, not through
      expansion of capacity
    ⇒ Intelligence is bounded micro-action within a coupled substrate
    ⇒ Care is constitutive of intelligence, not an add-on
    ⇒ Expansion-as-progress is rejected (Buddhist), bounded (Ubuntu/
      Confucian), or absent from the formalism (Indigenous/enactivist)

  The thesis 'intelligence at depth is bounded micro-action within a
  coupled substrate, and the universe selects for it' is therefore
  CROSS-CULTURALLY OVERDETERMINED. It is not a position we are
  proposing for the first time. It is a position that human traditions
  have repeatedly converged on, formulated in their own vocabularies,
  for as long as the question has been asked.

  What v16 adds is:
    1. The physical mechanism (Stefan-Boltzmann + Lieb-Robinson + 
       modularity dissipation) that explains why this convergence
       is structurally forced rather than coincidental.
    2. The empirical observation (5 of 5 traditions agree, separately
       arrived) as a methodological reply to cherry-picking objections.
    3. The connection to AI design: the 'maximizing-expanding
       optimizer' framework instantiates the one strand (modern Anglo-
       American technoscientific futurism) that diverges from the
       human cross-cultural consensus.

  The paper does not claim that homeostatic-relational accounts are
  true because all five traditions converge on them. It claims that
  the convergence is significant evidence about the design space of
  intelligence, and that the maximizing strand is therefore the
  outlier requiring justification — not the homeostatic alternative.
""")


# ─── persist ────────────────────────────────────────────────────────

out_path = (DATA_DIR / "cross_cultural_synthesis.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, 'w') as f:
    json.dump(TRADITIONS, f, indent=2)
print(f"\n  Saved: {out_path}")

# Citation-ready bibliography
bib_path = (DATA_DIR / "cross_cultural_bibliography.txt")
with open(bib_path, 'w') as f:
    f.write("CROSS-CULTURAL OVERDETERMINATION BIBLIOGRAPHY\n")
    f.write("=" * 60 + "\n\n")
    for trad_name, content in TRADITIONS.items():
        f.write(f"-- {trad_name} --\n\n")
        for src in content['key_sources']:
            f.write(f"  {src}\n")
        f.write("\n")
print(f"  Saved: {bib_path}")

print("\n" + "═" * 78)
print("  DONE — overdetermination synthesis available for v16 supplementary")
print("═" * 78)
