# Engine

Pure training-plan logic. Zero I/O, zero framework imports — data in, data out.

`planGenerator` orchestrates: `dateScaffold → blockOptimizer → mileageProgression → (per block: distanceAllocation → weeklySchedule → sessionSelector → paceEngine) → taperProtocol`.

Ported from an Excel/VBA workbook; the JSON property names in `../data/*.json` come straight from the workbook and must not be renamed (see `web/CLAUDE.md` for the full list).
