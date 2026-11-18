# Review walkthrough

1. Start with an empty directory and add a sample employee.
2. Follow public/app.js: FormData becomes JSON and Fetch sends POST /api/employees.
3. In server.cjs, show validate(), the parameterised INSERT and returned record.
4. Explain schema.sql: primary key, required columns and name index.
5. Search by department, then click salary twice to change sort direction.
6. Edit a record: open(e) pre-fills the form and submits PUT with the ID.
7. Cancel a deletion, then confirm one. The row is only removed after API success.
8. Restart the server to demonstrate file-backed persistence.

Frontend validation improves feedback; backend validation remains necessary because clients can bypass the form. textContent prevents employee values from becoming HTML. The demo is intentionally local; it is not a production HR service.
