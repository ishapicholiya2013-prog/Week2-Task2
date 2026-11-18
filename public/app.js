// Shared navigation exposes the menu state to assistive technology.
const menu = document.querySelector(".menu");
menu?.addEventListener("click", () => {
  const open = document.querySelector(".links").classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
let employees = [],
  editing = null,
  pending = null,
  sort = "name",
  direction = 1;
const $ = (s) => document.querySelector(s),
  editor = $("#editor"),
  form = $("#employee-form");
async function api(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
// Build cells with textContent so record values cannot inject HTML.
function render() {
  const q = $("#search").value.trim().toLowerCase(),
    shown = employees
      .filter((e) =>
        [e.name, e.department, e.role].some((v) => v.toLowerCase().includes(q)),
      )
      .sort(
        (a, b) =>
          direction *
          (typeof a[sort] === "number"
            ? a[sort] - b[sort]
            : a[sort].localeCompare(b[sort])),
      );
  $("#rows").replaceChildren();
  for (const e of shown) {
    const tr = document.createElement("tr");
    for (const k of ["name", "department", "role", "salary", "joinDate"]) {
      const td = document.createElement("td");
      td.textContent =
        k === "salary"
          ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 2,
            }).format(e[k])
          : e[k];
      tr.append(td);
    }
    const td = document.createElement("td");
    for (const action of ["Edit", "Delete"]) {
      const b = document.createElement("button");
      b.textContent = action;
      b.className = "secondary";
      b.setAttribute("aria-label", action + " " + e.name);
      b.onclick = () => (action === "Edit" ? open(e) : remove(e));
      td.append(b);
    }
    tr.append(td);
    $("#rows").append(tr);
  }
  $("#total").textContent = employees.length;
  $("#departments").textContent = new Set(
    employees.map((e) => e.department),
  ).size;
  $("#empty").classList.toggle("hidden", shown.length !== 0);
  document
    .querySelectorAll("[data-sort]")
    .forEach((b) =>
      b
        .closest("th")
        .setAttribute(
          "aria-sort",
          b.dataset.sort === sort
            ? direction === 1
              ? "ascending"
              : "descending"
            : "none",
        ),
    );
}
async function load(message = "") {
  try {
    $("#status").classList.remove("error");
    $("#status").textContent = "Loading employees…";
    employees = await api("/api/employees");
    render();
    $("#status").textContent = message;
  } catch (e) {
    $("#status").textContent = e.message + " Refresh to retry.";
    $("#status").classList.add("error");
  }
}
function open(e = null) {
  editing = e?.id || null;
  form.reset();
  $("#form-error").textContent = "";
  $("#form-title").textContent = e ? "Edit employee" : "Add employee";
  if (e)
    for (const k of ["name", "department", "role", "salary", "joinDate"])
      form.elements[k].value = e[k];
  editor.showModal();
}
function remove(e) {
  pending = e.id;
  $("#delete-label").textContent = "Remove " + e.name + " from the directory?";
  $("#delete-error").textContent = "";
  $("#delete-dialog").showModal();
}
$("#add").onclick = () => open();
$("#cancel").onclick = () => editor.close();
$("#keep").onclick = () => $("#delete-dialog").close();
$("#search").oninput = render;
document.querySelectorAll("[data-sort]").forEach(
  (b) =>
    (b.onclick = () => {
      direction = sort === b.dataset.sort ? -direction : 1;
      sort = b.dataset.sort;
      render();
    }),
);
// Persist first, then refresh the list; failures stay visible in the form.
form.onsubmit = async (e) => {
  e.preventDefault();
  $("#save").disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    data.salary = Number(data.salary);
    await api("/api/employees" + (editing ? "/" + editing : ""), {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    editor.close();
    await load(editing ? "Employee updated." : "Employee added.");
  } catch (e) {
    $("#form-error").textContent = e.message;
  } finally {
    $("#save").disabled = false;
  }
};
$("#confirm-delete").onclick = async () => {
  $("#confirm-delete").disabled = true;
  try {
    await api("/api/employees/" + pending, { method: "DELETE" });
    $("#delete-dialog").close();
    await load("Employee deleted.");
  } catch (e) {
    $("#delete-error").textContent = e.message;
  } finally {
    $("#confirm-delete").disabled = false;
  }
};
load();
