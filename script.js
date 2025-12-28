let members = [];
let expenses = [];

/* =========================
   UI HANDLERS
========================= */

function handleAddMember() {
  let name = document.getElementById("memberName").value.trim();
  if (!name || members.includes(name)) return;

  members.push(name);
  document.getElementById("memberName").value = "";
  renderMembers();
  updatePaidByDropdown();
}

function handleAddExpense() {
  let select = document.getElementById("paidBy");
  let paidBy = select.value;
  let amountInput = document.getElementById("amount");
  let amount = Number(amountInput.value);

  if (!paidBy || amount <= 0) return;

  expenses.push({
    paidBy,
    amount,
    splitAmong: [...members]
  });

  // Reset inputs
  amountInput.value = "";
  select.selectedIndex = 0;              // Reset to placeholder
  select.classList.add("placeholder");   // Make it grey again

  renderExpenses();
}


/* =========================
   RENDER FUNCTIONS
========================= */

function renderMembers() {
  let list = document.getElementById("memberList");
  list.innerHTML = "";

  members.forEach((member, index) => {
    let li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    li.innerHTML = `
      <span>${member}</span>
      <i class="fa-solid fa-trash icon-btn"
         style="color:red"
         onclick="deleteMember(${index})"></i>
    `;

    list.appendChild(li);
  });
}

function deleteMember(index) {
  const memberToRemove = members[index];

  // 1️⃣ Remove member from members list
  members.splice(index, 1);

  // 2️⃣ Remove expenses PAID BY this member
  expenses = expenses.filter(e => e.paidBy !== memberToRemove);

  // 3️⃣ Remove member from splitAmong of remaining expenses
  expenses.forEach(e => {
    e.splitAmong = e.splitAmong.filter(m => m !== memberToRemove);
  });

  // 4️⃣ Re-render UI
  renderMembers();
  updatePaidByDropdown();
  renderExpenses();
}

function updatePaidByDropdown() {
  let select = document.getElementById("paidBy");

  select.innerHTML = `
    <option value="" disabled selected hidden>
      Select member who paid
    </option>
  `;

  select.classList.add("placeholder");

  members.forEach(member => {
    let option = document.createElement("option");
    option.value = member;
    option.innerText = member;
    select.appendChild(option);
  });

  // Change color when real value selected
  select.onchange = function () {
    if (this.value) {
      this.classList.remove("placeholder");
    }
  };
}


function renderExpenses() {
  let list = document.getElementById("expenseList");
  list.innerHTML = "";

  expenses.forEach((e, index) => {
    let li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    li.innerHTML = `
      <div id="expense-text-${index}">
        ${e.paidBy} paid ₹${e.amount}
      </div>

      <div>
        <i class="fa-solid fa-pen icon-btn" onclick="enableExpenseEdit(${index})"></i>
        <i class="fa-solid fa-trash icon-btn" style="color:red" onclick="deleteExpense(${index})"></i>
      </div>
    `;

    list.appendChild(li);
  });
}


function deleteExpense(index) {
  expenses.splice(index, 1);
  renderExpenses();
}

function editExpense(index) {
  let newAmount = prompt("Enter correct amount:", expenses[index].amount);
  if (newAmount && !isNaN(newAmount)) {
    expenses[index].amount = Number(newAmount);
    renderExpenses();
  }
}

/* =========================
   CORE LOGIC
========================= */

function calculateBalances() {
  let balance = {};
  members.forEach(m => balance[m] = 0);

  expenses.forEach(e => {
    let split = e.amount / e.splitAmong.length;
    balance[e.paidBy] += e.amount;
    e.splitAmong.forEach(p => balance[p] -= split);
  });

  return balance;
}

function getRawTransactions() {
  let raw = [];
  expenses.forEach(e => {
    let split = e.amount / e.splitAmong.length;
    e.splitAmong.forEach(p => {
      if (p !== e.paidBy) {
        raw.push({ from: p, to: e.paidBy, amount: split });
      }
    });
  });
  return raw;
}

function netPairwiseTransactions(raw) {
  let net = {};
  raw.forEach(t => {
    net[t.from] = net[t.from] || {};
    net[t.to] = net[t.to] || {};
    net[t.from][t.to] = (net[t.from][t.to] || 0) + t.amount;
  });

  let result = [];
  let people = Object.keys(net);

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      let A = people[i], B = people[j];
      let AtoB = net[A][B] || 0;
      let BtoA = net[B][A] || 0;

      if (AtoB > BtoA)
        result.push({ from: A, to: B, amount: (AtoB - BtoA).toFixed(2) });
      else if (BtoA > AtoB)
        result.push({ from: B, to: A, amount: (BtoA - AtoB).toFixed(2) });
    }
  }
  return result;
}

function settlePayments(balance) {
  let debtors = [], creditors = [];

  for (let p in balance) {
    if (balance[p] < 0) debtors.push({ p, amt: -balance[p] });
    if (balance[p] > 0) creditors.push({ p, amt: balance[p] });
  }

  let res = [], i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    let pay = Math.min(debtors[i].amt, creditors[j].amt);
    res.push({ from: debtors[i].p, to: creditors[j].p, amount: pay.toFixed(2) });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return res;
}

/* =========================
   RUN APP
========================= */

function runApp() {
  let container = document.getElementById("output");
  container.innerHTML = "";

  // RAW
  let raw = getRawTransactions();
  container.appendChild(createResultCard(
    "Raw Transactions",
    "fa-list",
    raw.map(t => `${t.from} → ${t.to} ₹${t.amount.toFixed(2)}`)
  ));

  // PAIRWISE
  let pairwise = netPairwiseTransactions(raw);
  container.appendChild(createResultCard(
    "Pairwise Net",
    "fa-code-branch",
    pairwise.map(t => `${t.from} → ${t.to} ₹${t.amount}`)
  ));

  // OPTIMIZED
  let optimized = settlePayments(calculateBalances());
  container.appendChild(createResultCard(
    "Optimized Settlement",
    "fa-check-circle",
    optimized.map(t => `${t.from} → ${t.to} ₹${t.amount}`)
  ));
}

function createResultCard(title, icon, lines) {
  let card = document.createElement("div");
  card.className = "result-card";

  let heading = document.createElement("h3");
  heading.innerHTML = `<i class="fa-solid ${icon}"></i> ${title}`;

  card.appendChild(heading);

  lines.forEach(text => {
    let div = document.createElement("div");
    div.className = "result-item";
    div.innerText = text;
    card.appendChild(div);
  });

  return card;
}

function enableExpenseEdit(index) {
  let container = document.getElementById(`expense-text-${index}`);
  let expense = expenses[index];

  container.innerHTML = `
    ${expense.paidBy} paid ₹
    <input 
      type="number" 
      id="edit-amount-${index}" 
      value="${expense.amount}" 
      style="width:80px"
    />
    <i class="fa-solid fa-check icon-btn" style="color:green"
       onclick="saveExpenseEdit(${index})"></i>
    <i class="fa-solid fa-xmark icon-btn" style="color:gray"
       onclick="renderExpenses()"></i>
  `;
}

function saveExpenseEdit(index) {
  let input = document.getElementById(`edit-amount-${index}`);
  let newAmount = Number(input.value);

  if (!newAmount || newAmount <= 0) return;

  expenses[index].amount = newAmount;
  renderExpenses();
}

