# Learning-system connections

ADP is the model adaptation laboratory in the [aserdargun.com AI Learning System](https://aserdargun.com/). USL owns the adaptation foundation; ADP makes parameter scope, memory assumptions, data preparation and synthetic evaluation inspectable. App ownership and navigation do not imply a shared runtime or trained model.

## Routes and boundaries

| Connection           | Placement                                            | Contract                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root site            | Header, learning path and application map            | English `/`, `/journey/`, `/applications/`; Turkish `/tr/`, `/tr/journey/`, `/tr/applications/`.                                                                                                  |
| USL                  | Method explanations, learning path and related links | `/en/learn/lora/` or `/tr/learn/lora/`; theory and research remain in USL.                                                                                                                        |
| EVL                  | Evaluation contract and related links                | `/en/` or `/tr/`; ADP's synthetic pass is not an EVL evaluation.                                                                                                                                  |
| DCL navigation       | Memory panel and related links                       | Root `?lang=en/tr`; no workload is transferred through these ordinary links.                                                                                                                      |
| DCL workload handoff | Dedicated deployment-planning panel                  | Explicit link with validated `ils` metadata for 7B/14B profiles. Carries model class, adaptation method, base precision, sequence length, estimated training memory and source/return references. |
| TFL                  | Artifact explanation and related links               | Root `?lang=en/tr`; explores model serving, not training or automatic publication.                                                                                                                |
| GEX                  | Training explanation and related links               | `/gex/tensor?lang=en/tr`; GPU execution remains in GEX.                                                                                                                                           |

The shared shell's locale-specific links match the contextual links. Ordinary navigation carries language only. The dedicated DCL handoff opens in the same tab; contextual external links open a new tab with `noopener noreferrer` and accessible new-tab text. The header and learning path provide direct, localized access to the root site.

DCL requires an explicit training-to-inference comparison. It does not reuse training memory as inference memory. Unsupported model sizes open the ordinary DCL comparison without an `ils` payload. No weights, dataset records, scores, traces, credentials or telemetry are transferred. A return link identifies the source experiment; it does not restore exact custom settings. See [the cross-lab contract](CROSS-LAB-HANDOFF.md).

## Source and verification scope

Reviewed against current local app routes and the root catalog on 2026-09-21. HTTPS requests returned 200 for the root EN/TR pages, ADP, USL EN/TR LoRA routes, EVL EN/TR routes, DCL, TFL and the GEX tensor route. HTTP availability alone does not prove client-side locale selection or end-to-end handoff behavior. The older 2026-09-09 DCL DNS caveat is historical; it is not the current result of this check.

This content review does not assert a new production release. Publication requires the independent workflow, release-manifest and live-browser checks in [deployment.md](deployment.md).
