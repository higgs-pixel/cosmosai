# COSMOS AI Scholarly Retrieval Evaluation

Generated: 2026-07-26T09:15:29.549Z

This repeatable evaluation uses clearly labeled fixtures, including tangential, highly cited, wrong-type, out-of-range, duplicate, and retracted records. It makes no model or paid API calls.

- Benchmarks: 8
- Passed: 8
- Failed: 0

| Result | Intent | Selected | Filtered | Citations | Query |
| --- | --- | ---: | ---: | --- | --- |
| PASS | recent | 5 | 2 | PASS | Give me five recent papers on exoplanet atmospheric biosignatures. |
| PASS | foundational | 5 | 5 | PASS | Give me five foundational papers on the black hole information paradox. |
| PASS | review | 3 | 1 | PASS | Give me the best review papers on gravitational lensing. |
| PASS | recent | 5 | 3 | PASS | Give me five peer-reviewed papers published after 2023 on dark-matter direct detection. |
| PASS | recent | 5 | 1 | PASS | Give me recent papers about Mars biosignatures. |
| PASS | general | 5 | 1 | PASS | Give me papers on JWST observations of early galaxies. |
| PASS | systematic-review | 5 | 1 | PASS | Give me systematic reviews on astronomy education. |
| PASS | latest-developments | 5 | 1 | PASS | Give me the latest important papers on quantum gravity and black-hole entropy. |

## PASS: Give me five recent papers on exoplanet atmospheric biosignatures.

- Topic: exoplanet atmospheric biosignatures
- Selected: Exoplanet atmospheric biosignature gases under stellar activity; Exoplanet atmospheric biosignatures in temperate worlds; Atmospheric biosignatures and false positives on exoplanets; Statistical evidence for atmospheric biosignatures on exoplanets; Detecting exoplanet atmospheric biosignatures with transmission spectra
- Rejections: A highly cited machine-learning classifier (below_direct_relevance_threshold); A retracted result with broad astronomy keywords (retracted, below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me five foundational papers on the black hole information paradox.

- Topic: black hole information paradox
- Selected: Particle Creation by Black Holes; Information in Black Hole Radiation; The Stretched Horizon and Black Hole Complementarity; The Large N Limit of Superconformal Field Theories and Supergravity; Replica Wormholes and the Black Hole Interior
- Rejections: A highly cited machine-learning classifier (foundational_authority_required, below_direct_relevance_threshold); A retracted result with broad astronomy keywords (retracted, foundational_authority_required, below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me the best review papers on gravitational lensing.

- Topic: gravitational lensing
- Selected: A review of gravitational lensing in cosmology; Gravitational lensing: a review of strong and weak regimes; Gravitational lensing methods and applications: a review
- Rejections: A gravitational lensing measurement in one cluster (paper_type_mismatch, review_required, below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me five peer-reviewed papers published after 2023 on dark-matter direct detection.

- Topic: dark-matter direct detection
- Selected: Dark-matter direct detection with xenon nuclear recoils; Dark-matter direct detection using electronic recoils; Combined constraints from dark-matter direct-detection experiments; Dark-matter direct-detection limits from cryogenic sensors; A low-threshold dark-matter direct-detection experiment
- Rejections: Dark-matter direct detection in an older experiment (outside_requested_date_range); A highly cited machine-learning classifier (below_direct_relevance_threshold); A retracted result with broad astronomy keywords (retracted, below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me recent papers about Mars biosignatures.

- Topic: Mars biosignatures
- Selected: Assessing organic Mars biosignatures under radiation; Mars biosignatures in Jezero crater sediments; Preservation of Mars biosignatures in sulfate minerals; Mars biosignature detection in returned samples; Mars biosignatures and rover sampling strategies
- Rejections: Recent sediment transport on Mars (below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me papers on JWST observations of early galaxies.

- Topic: JWST observations of early galaxies
- Selected: Early galaxies in deep JWST observations; Spectroscopic JWST observations of early galaxies; JWST observations of early galaxies at high redshift; JWST observations reveal early-galaxy star formation; JWST observational constraints on early galaxies
- Rejections: Calibration of a JWST detector (below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me systematic reviews on astronomy education.

- Topic: astronomy education
- Selected: Inclusive astronomy education: a systematic review; Digital tools in astronomy education: systematic evidence review; A systematic review of astronomy education research; Astronomy education interventions: a systematic review; A systematic review of misconceptions in astronomy education
- Rejections: One classroom study in astronomy education (paper_type_mismatch, review_required, below_direct_relevance_threshold)
- Hard failures: None

## PASS: Give me the latest important papers on quantum gravity and black-hole entropy.

- Topic: quantum gravity and black-hole entropy
- Selected: Recent quantum-gravity constraints from black-hole entropy; Quantum gravity corrections to black-hole entropy; Black-hole entropy microstates in quantum gravity; Black-hole entropy beyond semiclassical quantum gravity; Quantum gravity and the statistical origin of black-hole entropy
- Rejections: Quantum computing algorithms for optimisation (below_direct_relevance_threshold)
- Hard failures: None
