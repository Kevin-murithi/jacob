CREATE TABLE Users (
    user_id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NULL,
    password VARCHAR(100) NULL,
    email VARCHAR(100) NULL
);

CREATE TABLE expenses (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    name VARCHAR(255) NULL,
    amount DECIMAL(10, 2) NULL,
    date DATE NULL,
    category ENUM('Income', 'Expense') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

// Create the 'users' table if it does not already exist
const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE
    )
`;
db.query(createUsersTable, (err) => {
    if (err) {
        console.log("Error creating users table!", err.message);
    } else {
        console.log("Users table created or already exists.");
    }
});

// Create the 'expenses' table if it does not already exist
const createExpensesTable = `
    CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        category ENUM('Income', 'Expense') NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`;
db.query(createExpensesTable, (err) => {
    if (err) {
        console.log("Error creating expenses table!", err.message);
    } else {
        console.log("Expenses table created or already exists.");
    }
});

