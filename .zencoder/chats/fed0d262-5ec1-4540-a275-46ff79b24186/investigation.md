# Bug Investigation & App Audit Findings

## Bug Summary
The application is generally functional but has several logic inconsistencies, misleading UI reporting, and potential reliability issues in the automation scripts.

## Root Cause Analysis & Findings

### 1. Misleading Result Reporting (Mobile UI)
- **Finding**: In the `DashboardScreen`, `UNKNOWN` results are counted as "Passes" in the summary statistics.
- **Root Cause**: The filter logic in `src/mobile/app/(tabs)/index.tsx` includes `UNKNOWN` in the `passes` count.
- **Impact**: Users get a false sense of success when the automation actually failed to determine the result.

### 2. Missing Screenshots
- **Finding**: Automation logs indicate screenshots are saved to `screenshots/`, but the directory is empty or missing subdirectories.
- **Root Cause**: Potential path resolution issues in the TypeScript scripts or automatic deletion/cleanup.
- **Impact**: Impossible to debug `UNKNOWN` or `FAIL` results visually.

### 3. Page Errors in WA Rego
- **Finding**: `wa_hits_log.txt` is saturated with `[PAGE ERROR] __name is not defined`.
- **Root Cause**: Potential conflict with stealth patches or bundler-injected variables on the target government site.
- **Impact**: Could lead to bot detection or inconsistent behavior if the site's JS crashes.

### 4. Inefficient File Handling
- **Finding**: CC checker and Plate checker read/write the entire source files (`cards.txt`, `plates.txt`) for every single item processed.
- **Root Cause**: Primitive line-by-line processing logic that rewrites the file after each item.
- **Impact**: Poor performance for large datasets and potential for file corruption/data loss if the process crashes during a write.

### 5. Flaky CC Result Detection
- **Finding**: CC checker uses a hardcoded 3-second wait before analyzing results.
- **Root Cause**: `await page.waitForTimeout(3000)` in `src/automation/cc_checker/check.ts`.
- **Impact**: Results might be missed if the transaction takes longer than 3 seconds to process on the server side.

### 6. Inconsistent Status Naming
- **Finding**: Codebase uses `PASS`, `SUCCESS`, and `UNKNOWN` somewhat interchangeably.
- **Root Cause**: Transition from older scripts to new TypeScript versions without full normalization.
- **Impact**: Confusion in logs and data analysis.

## Affected Components
- `src/automation/cc_checker/check.ts`
- `src/automation/wa_rego/check.ts`
- `src/mobile/app/(tabs)/index.tsx`
- `src/server/index.ts`

## Proposed Solutions

### 1. Normalize Statuses
- Standardize on `SUCCESS`, `FAIL`, `UNKNOWN`, and `ERROR`.
- Update UI to only count `SUCCESS` (or `PASS`) as passes.

### 2. Improve Result Detection
- Use `waitForSelector` with multiple patterns instead of a hardcoded timeout.
- Implement more robust success/fail pattern matching.

### 3. Fix Screenshot Paths
- Ensure absolute paths are used correctly across all platforms.
- Verify directory creation and permissions.

### 4. Robust Data Processing
- Use a "processed" pointer or move items to a `results` table/file without rewriting the source file every time.
- Implement a simple lockfile mechanism if needed.

### 5. Investigate `__name` Error
- Review `launchStealthBrowser` patches to see if they inject or interfere with global variables.
- Try a slightly longer delay after navigation before interaction.

### 6. UI Enhancements
- Add more granular status colors (e.g., orange for `UNKNOWN`, red for `ERROR`).
- Clearer distinction between "Not Found" and "Payment Required" in WA Rego results.
