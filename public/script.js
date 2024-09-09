document.addEventListener('DOMContentLoaded', () => {
    // Function to fetch balance, income, and expenses
    async function fetchData() {
        try {
            // Fetch expenses for the logged-in user
            const expensesResponse = await fetch(`https://jacob-production.up.railway.app/api/expenses/view`);
            const expenses = await expensesResponse.json();

            // Calculate total balance, income, and expense
            let totalIncome = 0;
            let totalExpense = 0;
            expenses.forEach(expense => {
                if (expense.category === 'Income') {
                    totalIncome += parseFloat(expense.amount);
                } else {
                    totalExpense += parseFloat(expense.amount);
                }
            });

            const totalBalance = totalIncome - totalExpense;

            // Update HTML with the fetched data
            document.getElementById('balance').textContent = `$${totalBalance.toFixed(2)}`;
            document.getElementById('income').textContent = `$${totalIncome.toFixed(2)}`;
            document.getElementById('expense').textContent = `$${totalExpense.toFixed(2)}`;

            // Fetch and display transactions
            const transactionList = document.getElementById('transactionList');
            transactionList.innerHTML = '';
            expenses.forEach(expense => {
                const item = document.createElement('li');
                item.textContent = `${expense.date}: ${expense.name} - $${expense.amount}`;
                transactionList.appendChild(item);
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            document.getElementById('status').textContent = 'Failed to load data';
        }
    }

    // Fetch data when the page loads
    fetchData();

    // Handle form submission
    const form = document.getElementById('transactionForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.elements['name'].value;
        const amount = form.elements['amount'].value;
        const date = form.elements['date'].value;
        const category = form.elements['type'].checked ? 'Income' : 'Expense';

        const transaction = {
            name: name,
            amount: amount,
            date: date,
            category: category
        };

        try {
            const response = await fetch('https://jacob-production.up.railway.app/api/expenses/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transaction)
            });

            if (response.ok) {
                document.getElementById('status').textContent = 'Transaction added successfully';
                form.reset();
                fetchData(); // Refresh the data after adding
            } else {
                document.getElementById('status').textContent = 'Failed to add transaction';
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('status').textContent = 'An error occurred';
        }
    });
});
