const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const publicDir = path.join(__dirname, "public");
function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let s = "";
  for await (const c of req) {
    s += c;
    if (Buffer.byteLength(s) > 16384)
      throw Object.assign(new Error("Request too large"), { status: 413 });
  }
  try {
    return JSON.parse(s || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function staticFile(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { error: "Invalid URL" });
  }
  const file = path.resolve(
    publicDir,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!file.startsWith(publicDir + path.sep))
    return json(res, 403, { error: "Forbidden" });
  if (!["GET", "HEAD"].includes(req.method))
    return json(res, 405, { error: "Method not allowed" });
  fs.readFile(file, (e, data) => {
    if (e) return json(res, 404, { error: "Not found" });
    res.writeHead(200, {
      "Content-Type":
        {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css",
          ".js": "text/javascript",
          ".svg": "image/svg+xml",
        }[path.extname(file)] || "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}
function headers(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
}
function sameOrigin(req) {
  if (
    req.headers.origin &&
    req.headers.origin !== new URL("http://" + req.headers.host).origin &&
    req.headers.origin !== new URL("https://" + req.headers.host).origin
  )
    fail("Cross-origin request blocked", 403);
  if (req.headers["sec-fetch-site"] === "cross-site")
    fail("Cross-site request blocked", 403);
}
const { DatabaseSync } = require("node:sqlite");
const dbPath =
  process.env.DB_PATH || path.join(__dirname, "data", "employees.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
db.exec("PRAGMA journal_mode=WAL");
const departments = [
  "Engineering",
  "Design",
  "Operations",
  "Human Resources",
  "Finance",
  "Marketing",
];
function validate(x) {
  if (!x || typeof x !== "object") fail("An employee object is required");
  for (const k of ["name", "role"])
    if (
      typeof x[k] !== "string" ||
      x[k].trim().length < 2 ||
      x[k].trim().length > 80 ||
      /[<>\x00-\x1f]/.test(x[k])
    )
      fail(k + " must contain 2–80 characters without markup");
  if (!departments.includes(x.department)) fail("Choose a valid department");
  if (
    typeof x.salary !== "number" ||
    !Number.isFinite(x.salary) ||
    x.salary <= 0 ||
    x.salary > 1e8 ||
    Math.abs(x.salary * 100 - Math.round(x.salary * 100)) > 0.00001
  )
    fail("Salary must be positive with up to two decimals");
  if (
    typeof x.joinDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(x.joinDate) ||
    !Number.isFinite(Date.parse(x.joinDate)) ||
    new Date(x.joinDate).toISOString().slice(0, 10) !== x.joinDate ||
    x.joinDate < "1900-01-01" ||
    x.joinDate > "2100-12-31"
  )
    fail("Enter a valid join date");
  return [x.name.trim(), x.department, x.role.trim(), x.salary, x.joinDate];
}
const server = http.createServer(async (req, res) => {
  headers(res);
  try {
    const u = new URL(req.url, "http://localhost");
    if (!u.pathname.startsWith("/api/")) return staticFile(req, res, u);
    if (!["GET", "HEAD"].includes(req.method)) {
      sameOrigin(req);
      if (
        req.method !== "DELETE" &&
        !req.headers["content-type"]?.startsWith("application/json")
      )
        fail("Use application/json", 415);
    }
    if (u.pathname === "/api/employees" && req.method === "GET")
      return json(
        res,
        200,
        db.prepare("SELECT * FROM employees ORDER BY id DESC").all(),
      );
    if (u.pathname === "/api/employees" && req.method === "POST") {
      const values = validate(await body(req));
      const r = db
        .prepare(
          "INSERT INTO employees(name,department,role,salary,joinDate) VALUES(?,?,?,?,?)",
        )
        .run(...values);
      return json(
        res,
        201,
        db
          .prepare("SELECT * FROM employees WHERE id=?")
          .get(Number(r.lastInsertRowid)),
      );
    }
    const m = u.pathname.match(/^\/api\/employees\/([1-9]\d*)$/);
    if (m) {
      const id = Number(m[1]);
      if (!db.prepare("SELECT id FROM employees WHERE id=?").get(id))
        fail("Employee not found", 404);
      if (req.method === "GET")
        return json(
          res,
          200,
          db.prepare("SELECT * FROM employees WHERE id=?").get(id),
        );
      if (req.method === "PUT") {
        db.prepare(
          "UPDATE employees SET name=?,department=?,role=?,salary=?,joinDate=? WHERE id=?",
        ).run(...validate(await body(req)), id);
        return json(
          res,
          200,
          db.prepare("SELECT * FROM employees WHERE id=?").get(id),
        );
      }
      if (req.method === "DELETE") {
        db.prepare("DELETE FROM employees WHERE id=?").run(id);
        return json(res, 200, { message: "Employee deleted" });
      }
      fail("Method not allowed", 405);
    }
    fail("API route not found", 404);
  } catch (e) {
    json(res, e.status || 500, {
      error: e.status ? e.message : "An unexpected server error occurred",
    });
  }
});
server.listen(process.env.PORT || 3002, "127.0.0.1", () =>
  console.log("People: http://localhost:" + (process.env.PORT || 3002)),
);
