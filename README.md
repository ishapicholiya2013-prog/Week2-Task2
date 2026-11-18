# Employee management system

**Isha | WeIntern Week 2**

Northstar People is an employee directory. Add a fictional employee, search for the record, edit it, and confirm deletion. SQLite saves the records between runs.

## Run

1. Install Node.js 24 LTS or newer. Confirm with `node --version`.
2. Open a terminal in this folder.
3. Run `node server.cjs` (or double-click START_WINDOWS.cmd on Windows).
4. Open http://localhost:3002. Stop with Ctrl+C.

No dependency installation is needed. All frontend assets are local and the project works offline. If the port is busy, set PORT to another port before starting. Windows PowerShell example: `$env:PORT=3100`, then `node server.cjs`.

## Files

- public/: HTML, CSS and browser JavaScript
- server.cjs: local HTTP server and API where applicable
- docs/: design, endpoint or security notes
- evidence/: screenshots and recorded browser demonstration
- WALKTHROUGH.md: explanation for the review session

## Validation

See evidence/TEST_RESULTS.md for the checks actually performed. Demonstrations use sample data only.

## Database

The server applies schema.sql automatically to data/employees.sqlite. SQLite is a relational SQL database bundled with Node.js. MySQL/PostgreSQL/MongoDB in the handbook are recommendations; SQLite keeps this submission self-contained. DB_PATH can point to another database file. To reset, stop the server and remove the data folder.

## Scope

This HR demonstration runs on loopback only and has no authentication. Use fictional employee details. Add access control before exposing real HR data on a network. Task 3 demonstrates authentication separately.

## API testing

Import docs/Employees.postman_collection.json into Postman. Use its requests in order. See docs/API.md for validation and status codes.

## Repeat the API checks

Run `node smoke-tests.cjs` or `npm test`. Tests start a separate server on port 3400, use a temporary database and remove it afterwards. Set TEST_PORT if that port is occupied. Your application database is untouched.
