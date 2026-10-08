# Recruitment test fixtures

All files contain synthetic data, never a real applicant's CV.

- `cv-text.pdf`: one-page English text, generated with ReportLab.
- `cv-vietnamese.pdf`: Vietnamese text with an embedded font subset, generated with ReportLab.
- `cv-scan.pdf`: a drawn rectangle without a text layer; exercises manual-review handling.
- `pdf()` in `../recruitment-harness.cjs`: reproducible minimal PDF generated in memory for HTTP/browser uploads.

The tests also construct fake, corrupt, oversized files, duplicate requests, and SDK stubs in memory. AI outputs marked LIVE in contract tests are simulated provider envelopes, not actual Gemini responses.
