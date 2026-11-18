// Run with node smoke-tests.cjs. Uses an isolated temporary database.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { spawn } = require("node:child_process");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "northstar-test-")),
  port = Number(process.env.TEST_PORT || 3400),
  base = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, [path.join(__dirname, "server.cjs")], {
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: path.join(dir, "test.sqlite"),
  },
  stdio: "ignore",
});
async function request(route, method = "GET", body, headers = {}) {
  const r = await fetch(base + route, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie"),
  };
}
(async () => {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base);
      ready = true;
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "Test server did not start");
  const sample = {
    name: "Isha",
    department: "Engineering",
    role: "Developer",
    salary: 600000,
    joinDate: "2026-10-01",
  };
  let r = await request("/api/employees", "POST", sample);
  assert.equal(r.status, 201);
  const id = r.data.id;
  assert.equal((await request("/api/employees/" + id)).data.name, "Isha");
  assert.equal(
    (
      await request("/api/employees/" + id, "PUT", {
        ...sample,
        role: "Senior Developer",
      })
    ).data.role,
    "Senior Developer",
  );
  assert.equal(
    (await request("/api/employees", "POST", { ...sample, salary: -1 })).status,
    400,
  );
  assert.equal(
    (
      await request("/api/employees", "POST", {
        ...sample,
        joinDate: "2026-02-30",
      })
    ).status,
    400,
  );
  assert.equal((await request("/api/employees/" + id, "DELETE")).status, 200);
  assert.equal((await request("/api/employees/" + id)).status, 404);
  console.log(
    "PASS: create, read, update, validation, delete and missing-record checks",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.kill();
    await new Promise((r) => server.once("exit", r));
    fs.rmSync(dir, { recursive: true, force: true });
  });
