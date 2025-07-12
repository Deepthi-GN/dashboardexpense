document.addEventListener("DOMContentLoaded", () => {
  const balance = document.getElementById("balance");
  const money_plus = document.getElementById("money-plus");
  const money_minus = document.getElementById("money-minus");
  const list = document.getElementById("list");
  const form = document.getElementById("form");
  const text = document.getElementById("text");
  const amount = document.getElementById("amount");
  const type = document.getElementById("type");
  const category = document.getElementById("category");
  const dateInput = document.getElementById("date");
  const filterDate = document.getElementById("filterDate");
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearAll");
  const toggleMode = document.getElementById("toggleMode");
  const calendarEl = document.getElementById("calendar");
  const budgetForm = document.getElementById("budgetForm");
  const budgetCategory = document.getElementById("budgetCategory");
  const budgetAmount = document.getElementById("budgetAmount");
  const budgetList = document.getElementById("budgetList");

  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  let budgets = JSON.parse(localStorage.getItem("budgets")) || {};

  function addTransaction(e) {
    e.preventDefault();

    if (!text.value || !amount.value || !dateInput.value) {
      alert("Please fill all fields");
      return;
    }

    const signedAmount = type.value === "expense" ? -Math.abs(+amount.value) : Math.abs(+amount.value);

    const transaction = {
      id: Date.now(),
      text: text.value,
      amount: signedAmount,
      type: type.value,
      category: category.value,
      date: dateInput.value
    };

    transactions.push(transaction);
    updateLocalStorage();
    renderTransactions();
    renderCalendar();
    form.reset();
    checkBudgetLimit(transaction.category);
    renderBudgetList();
  }

  function renderTransactions() {
    list.innerHTML = "";
    const search = searchInput.value.toLowerCase();
    const dateFilter = filterDate.value;

    const filtered = transactions.filter(t => {
      return (
        (!search || t.text.toLowerCase().includes(search) || t.category.toLowerCase().includes(search)) &&
        (!dateFilter || t.date === dateFilter)
      );
    });

    filtered.forEach(t => addTransactionDOM(t));
    updateValues(filtered);
  }

  function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? "-" : "+";
    const item = document.createElement("li");
    item.classList.add(transaction.amount < 0 ? "minus" : "plus");

    const overBudget = isOverBudget(transaction.category);
    if (overBudget && transaction.amount < 0) {
      item.style.backgroundColor = "#ffebee";
      item.style.borderLeft = "6px solid red";
    }

    item.innerHTML = `
      <div>
        <strong>${transaction.text}</strong> (${transaction.category})<br>
        <small>${transaction.date}</small>
      </div>
      <div>
        ${sign}₹${Math.abs(transaction.amount)}
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})">×</button>
      </div>
    `;
    list.appendChild(item);
  }

  function updateValues(filteredData = transactions) {
    const amounts = filteredData.map(t => t.amount);
    const total = amounts.reduce((acc, val) => acc + val, 0).toFixed(2);
    const income = amounts.filter(v => v > 0).reduce((a, b) => a + b, 0).toFixed(2);
    const expense = (
      amounts.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1
    ).toFixed(2);

    balance.textContent = `₹${total}`;
    money_plus.textContent = `₹${income}`;
    money_minus.textContent = `₹${expense}`;
  }

  window.removeTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    renderTransactions();
    renderCalendar();
    renderBudgetList();
  }

  function updateLocalStorage() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("budgets", JSON.stringify(budgets));
  }

  function clearAllTransactions() {
    if (confirm("Are you sure you want to clear all transactions?")) {
      transactions = [];
      updateLocalStorage();
      renderTransactions();
      renderCalendar();
      renderBudgetList();
    }
  }

  function toggleDarkMode() {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  }

  function applySavedTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.body.classList.add("dark");
  }

  function setBudgetLimit(e) {
    e.preventDefault();
    const cat = budgetCategory.value;
    const amt = parseFloat(budgetAmount.value);
    if (!amt || amt <= 0) return alert("Enter valid amount");
    budgets[cat] = amt;
    updateLocalStorage();
    renderBudgetList();
    budgetForm.reset();
    checkBudgetLimit(cat);
  }

  function renderBudgetList() {
    budgetList.innerHTML = "";
    Object.entries(budgets).forEach(([cat, amt]) => {
      const totalSpent = transactions.filter(t => t.category === cat && t.amount < 0).reduce((a, b) => a + b.amount, 0) * -1;
      const over = totalSpent > amt;
      const li = document.createElement("li");
      li.textContent = `${cat}: ₹${totalSpent} / ₹${amt}`;
      li.style.color = over ? "red" : "green";
      budgetList.appendChild(li);
    });
  }

  function isOverBudget(category) {
    const limit = budgets[category];
    const spent = transactions.filter(t => t.category === category && t.amount < 0).reduce((a, b) => a + b.amount, 0) * -1;
    return limit && spent > limit;
  }

  function checkBudgetLimit(category) {
    if (isOverBudget(category)) {
      alert(`⚠️ You've exceeded the budget limit for ${category}!`);
    }
  }

  function renderCalendar() {
  const events = transactions.map(t => ({
    title: `${t.text} ₹${t.amount < 0 ? '-' : '+'}${Math.abs(t.amount)} (${t.category})`,
    date: t.date,
    color: t.amount < 0 ? '#e53935' : '#43a047'
  }));

  if (calendarEl._calendar) {
    calendarEl._calendar.removeAllEvents();
    calendarEl._calendar.addEventSource(events);
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 500,
    events: events
  });
  calendar.render();
  calendarEl._calendar = calendar;
}

  // Event Listeners
  form.addEventListener("submit", addTransaction);
  searchInput.addEventListener("input", renderTransactions);
  filterDate.addEventListener("change", renderTransactions);
  clearBtn.addEventListener("click", clearAllTransactions);
  toggleMode.addEventListener("click", toggleDarkMode);
  budgetForm.addEventListener("submit", setBudgetLimit);

  // Init
  applySavedTheme();
  renderTransactions();
  renderBudgetList();
  renderCalendar();
});
