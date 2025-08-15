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
  const budgetForm = document.getElementById("budgetForm");
  const budgetCategory = document.getElementById("budgetCategory");
  const budgetAmount = document.getElementById("budgetAmount");
  const budgetList = document.getElementById("budgetList");

  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  let budgets = JSON.parse(localStorage.getItem("budgets")) || {};

  // Add Transaction
  function addTransaction(e) {
    e.preventDefault();
    if (!text.value || !amount.value || !dateInput.value) return alert("Please fill all fields");

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
    renderMonthlyChart();
    form.reset();
    checkBudgetLimit(transaction.category);
    renderBudgetList();
  }

  // Render Transactions
  function renderTransactions() {
    list.innerHTML = "";
    const search = searchInput.value.toLowerCase();
    const dateFilter = filterDate.value;

    const filtered = transactions.filter(t =>
      (!search || t.text.toLowerCase().includes(search) || t.category.toLowerCase().includes(search)) &&
      (!dateFilter || t.date === dateFilter)
    );

    filtered.forEach(addTransactionDOM);
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
      <div><strong>${transaction.text}</strong> (${transaction.category})<br><small>${transaction.date}</small></div>
      <div>${sign}₹${Math.abs(transaction.amount)}
      <button onclick="removeTransaction(${transaction.id})">×</button></div>
    `;
    list.appendChild(item);
  }

  // Update Balance
  function updateValues(filteredData = transactions) {
    const amounts = filteredData.map(t => t.amount);
    const total = amounts.reduce((a, b) => a + b, 0).toFixed(2);
    const income = amounts.filter(v => v > 0).reduce((a, b) => a + b, 0).toFixed(2);
    const expense = (amounts.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1).toFixed(2);

    balance.textContent = `₹${total}`;
    money_plus.textContent = `₹${income}`;
    money_minus.textContent = `₹${expense}`;
  }

  // Remove Transaction
  window.removeTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    renderTransactions();
    renderBudgetList();
    renderMonthlyChart();
  }

  // Local Storage
  function updateLocalStorage() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("budgets", JSON.stringify(budgets));
  }

  function clearAllTransactions() {
    if (!confirm("Are you sure you want to clear all transactions?")) return;
    transactions = [];
    updateLocalStorage();
    renderTransactions();
    renderBudgetList();
    renderMonthlyChart();
  }

  function toggleDarkMode() {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  }

  function applySavedTheme() {
    if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
  }

  // Budget
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

  window.removeBudget = function(category) {
    if (!confirm(`Remove budget for ${category}?`)) return;
    delete budgets[category];
    updateLocalStorage();
    renderBudgetList();
  }

  function renderBudgetList() {
    budgetList.innerHTML = "";
    Object.entries(budgets).forEach(([cat, amt]) => {
      const spent = transactions.filter(t => t.category === cat && t.amount < 0).reduce((a,b)=>a+b.amount,0)*-1;
      const over = spent > amt;
      const li = document.createElement("li");
      li.innerHTML = `${cat}: ₹${spent} / ₹${amt} <button onclick="removeBudget('${cat}')">Remove</button>`;
      li.style.color = over ? "red" : "green";
      li.style.marginBottom = "5px";
      budgetList.appendChild(li);
    });
  }

  function isOverBudget(category) {
    const limit = budgets[category];
    const spent = transactions.filter(t => t.category === category && t.amount < 0).reduce((a,b)=>a+b.amount,0)*-1;
    return limit && spent > limit;
  }

  function checkBudgetLimit(category) {
    if (isOverBudget(category)) alert(`⚠️ You've exceeded the budget limit for ${category}!`);
  }

  // Monthly Chart
  function renderMonthlyChart() {
    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (transactions.length === 0) {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.font = "16px Arial";
      ctx.fillText("No transactions to display", 10, 50);
      return;
    }

    const monthlyData = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d)) return;
      const monthKey = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income:0, expense:0 };
      if (t.amount<0) monthlyData[monthKey].expense += Math.abs(t.amount);
      else monthlyData[monthKey].income += t.amount;
    });

    const labels = Object.keys(monthlyData).sort();
    const incomeData = labels.map(m=>monthlyData[m].income);
    const expenseData = labels.map(m=>monthlyData[m].expense);

    if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();

    window.monthlyChartInstance = new Chart(ctx,{
      type:'bar',
      data:{
        labels: labels.map(l=>{
          const [y,m] = l.split("-");
          return new Date(y,m-1).toLocaleString('default',{month:'short',year:'numeric'});
        }),
        datasets:[
          {label:'Income (₹)', data:incomeData, backgroundColor:'#43a047'},
          {label:'Expenses (₹)', data:expenseData, backgroundColor:'#e53935'}
        ]
      },
      options:{
        responsive:true,
        plugins:{legend:{position:'top'}, tooltip:{mode:'index',intersect:false}},
        scales:{y:{beginAtZero:true}, x:{stacked:false}}
      }
    });
  }
  // Motivational Quotes
const quoteText = document.getElementById("quoteText");
const quotes = [
  "Do not save what is left after spending; spend what is left after saving.",
  "A small daily saving grows into a big future.",
  "Save money, and money will save you.",
  "Every penny saved is a step towards financial freedom.",
  "Budgeting isn’t about limiting yourself, it’s about making the things that excite you possible.",
  "Financial freedom is available to those who learn about it and work for it."
];

// Function to display a random quote
function displayRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  quoteText.textContent = `💡 "${quotes[randomIndex]}"`;
}

// Display a quote on page load
displayRandomQuote();


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
  renderMonthlyChart();
});
