# BUG: Importing current_framework in sample.json does not populate domains/attributes

## Summary
When importing a `sample.json` file that contains a `current_framework` section (with domains and attributes), the import completes successfully but **no new domains or attributes are created** in the database. Only the domain from the `gap_analysis` section (e.g., "Generative AI Enablement") appears, and the main framework domains are missing.

## Symptoms
- Import reports: `Import completed successfully! 0 new domains, 0 new attributes.`
- Only the domain from `gap_analysis` (e.g., "Generative AI Enablement") is present in the database for the capability.
- None of the domains from `current_framework.domains` (e.g., "Data Management & Integration", "Data Engineering") are imported.

## Steps to Reproduce
1. Use a `sample.json` file with the following structure:
   ```json
   {
     "capability": "Data Analytics and Machine Learning",
     "current_framework": {
       "domains": [
         { "domain_name": "Data Management & Integration", ... },
         { "domain_name": "Data Engineering", ... }
       ]
     },
     "gap_analysis": {
       "missing_domains": [ { "domain_name": "Generative AI Enablement", ... } ]
     },
     ...
   }
   ```
2. Import this file via the Domain Management import UI or API.
3. Observe that only "Generative AI Enablement" is present in the database, and the main framework domains are missing.

## Investigation & Findings
- The file format detection correctly identifies the file as `current_framework`:
  - `ImportService.detect_file_format(data)` returns `current_framework`.
- The import logic in `process_research_import` is supposed to prioritize `current_framework` over `gap_analysis`.
- The code for extracting domains from `current_framework` is being executed, but **no new domains are created**.
- Only the domain from `gap_analysis` is present in the database after import.
- The hash-based deduplication logic is not the cause (the missing domains do not exist in the DB).
- The issue is not with file format detection, but with the actual import/processing logic for `current_framework` domains.

## Root Cause Hypothesis
- The `process_research_import` method is supposed to extract and import domains from `current_framework` if present, but for some reason, these domains are not being persisted to the database.
- The logic for domain creation may be skipped or not executed as expected, or the transaction may not be committed for these domains.
- The presence of both `current_framework` and `gap_analysis` in the same file may be causing the import to only process the `gap_analysis` section, or the `domains_data` array is not being populated correctly.

## Next Steps
- Add debugging/logging to `process_research_import` and `process_domain_import` to verify if the domains from `current_framework` are being processed and passed to the DB layer.
- Check if the DB transaction is being committed after domain creation.
- Ensure that the import logic does not skip `current_framework` domains when both `current_framework` and `gap_analysis` are present.

---

**Status:** Open
**Priority:** High (blocks framework import)
**Owner:** [Unassigned]