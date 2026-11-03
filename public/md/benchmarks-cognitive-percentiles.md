# Cognitive Benchmarks & Empirical Distributions

> Canonical URL: https://pulse-lab.in/benchmarks/cognitive-percentiles
> Description: Session-level empirical distributions and statistical methodology for browser-based reaction latency benchmarks.
> Publisher: PULSE Cognitive Research Team
> Content Signals: search=yes, ai-input=yes, ai-train=no

## Scientific methodology, sample thresholds, and preliminary reference distributions for browser-based reaction latency.

*Published: 2026-11-01*

### Session-Level Empirical Distribution Contract

PULSE reports session-level empirical distributions rather than claiming universal biological population norms.

Because browser tests are conducted without laboratory calibration or participant credential verification, single users may complete multiple sessions. Benchmarks describe verified session observations under real-world device conditions.

Distributions are strictly segregated by assessment protocol, metric derivation, and device input class (desktop keyboard vs touchscreen).

### Statistical Publication Criteria

To avoid misleading users with premature statistics, PULSE enforces strict publication gates. Benchmark tables remain in a verified dataPending state until cohorts meet our precision requirements.

Median (P50) and quartile (P25, P75) publication requires a minimum of 500 completed sessions per demographic group with bootstrap standard error under 2.5% of the median.

Extreme tail quantiles (P99) are unavailable in the initial release due to monitor refresh quantization and operating system task interruption variances.

### External Laboratory Reference Norms

While PULSE session data gathers to satisfy the statistical threshold, the following external peer-reviewed laboratory baselines provide general reference points.

In Woods et al. (2015), healthy adult visual reaction time under calibrated lab timers averaged 231 milliseconds (IQR: 215ms - 258ms). Browser-measured latency is typically 20ms to 40ms higher due to hardware polling intervals.

### Academic Citations & References

- Woods, D. L., Wyma, J. M., Yund, E. W., Herron, T. J., & Reed, B. (2015). *Factors influencing the latency of simple reaction time*. Frontiers in Human Neuroscience [DOI: 10.3389/fnhum.2015.00131](https://doi.org/10.3389/fnhum.2015.00131)
- Hyndman, R. J., & Fan, Y. (1996). *Sample quantiles in statistical packages*. The American Statistician [DOI: 10.1080/00031305.1996.10473566](https://doi.org/10.1080/00031305.1996.10473566)

---

*Machine discovery: This document is served automatically when requesting with `Accept: text/markdown`. For global project documentation see [llms.txt](https://pulse-lab.in/llms.txt).*