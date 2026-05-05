# Historical validation

This project validates the Historical Legitimacy Stress Model against presidential outcomes from 1944 through 2024.

Run:

```sh
npm run validate
```

The validation script extracts the app's embedded historical presets from `historical_legitimacy_stress_model_site.html`, computes:

- headline incumbent stress: `A+B+C+D+E+F-G`
- converted outcome: `headline + H*0.35`
- machinery risk tier from section I

It then compares the converted-outcome winner role against the historical White House party result.

## Current result

As calibrated, the model fits 21 of 21 encoded historical outcomes on the converted-outcome call. The popular-mandate track fits 17 of 21, with intended divergence cases in 1960, 2000, 2016, and 2024.

Those divergence cases are important. They are the reason the model reports both:

- popular-mandate stress
- Electoral College converted outcome

## Historical source baseline

Use official records when updating the outcome table:

- Federal Election Commission: official presidential popular vote results and federal election result reports.
- National Archives Electoral College: official Electoral College results by year.

## Guardrails

A perfect in-sample historical fit is not proof of future predictive accuracy. It can mean the model is well-calibrated, but it can also mean the presets were overfit to known outcomes.

Future predictions should be treated as valid only if:

- slider values are set before the election result is known
- the timestamp is preserved
- the falsifiability conditions are exported with the prediction
- confidence is allowed to fall when nominees are unknown, the election is far away, machinery risk is high, or mandate and converted tracks diverge

For serious future use, keep a locked pre-election prediction archive and score it after the election without changing the original slider vector.
