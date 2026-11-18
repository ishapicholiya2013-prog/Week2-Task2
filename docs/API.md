# Employee REST API

Base URL: http://localhost:3002. JSON requests use Content-Type: application/json.

| Method | Route              | Result                        |
| ------ | ------------------ | ----------------------------- |
| GET    | /api/employees     | 200 array of all employees    |
| GET    | /api/employees/:id | 200 employee, 404 missing     |
| POST   | /api/employees     | 201 created employee          |
| PUT    | /api/employees/:id | 200 complete replacement      |
| DELETE | /api/employees/:id | 200 confirmation, 404 missing |

Example request body:

```json
{
  "name": "Isha",
  "department": "Engineering",
  "role": "Web Developer",
  "salary": 600000,
  "joinDate": "2026-10-01"
}
```

Names and roles: trimmed, 2–80 characters, no control characters or angle brackets. Department must match one of the UI options. Salary is numeric, greater than zero, no more than 100000000, and up to two decimals. Join date must be a real date from 1900-01-01 through 2100-12-31.

Errors return {"error":"message"}. Validation/malformed JSON: 400; oversized request: 413; wrong content type: 415; wrong method on an existing detail: 405. Unexpected server errors: 500 with no stack trace. SQL queries use bound parameters. IDs must be positive integers.

Search and sort run in the browser after fetching records. Suitable for a small internship dataset; production scale would need server pagination, filtering and access control. Monetary values use SQLite REAL with two-decimal input checks; an accounting system should use integer minor units.
