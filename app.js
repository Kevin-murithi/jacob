// Import necessary modules
const express = require('express'); 
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config(); 
const session = require('express-session');
const cors = require('cors');

// Create an Express application
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse URL-encoded and JSON request bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    origin: 'https://trialproject-wine.vercel.app', // Your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
}));

// Configure session middleware
app.use(session({
    key: 'session_cookie_name',
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // Session lasts for 1 day
}));

// Create a MySQL connection using environment variables
const db = mysql.createConnection({
   host: process.env.MYSQLHOST,
   user: process.env.MYSQLUSER,
   password: process.env.MYSQLPASSWORD,
   database: process.env.MYSQLDATABASE,
   port: process.env.MYSQLPORT
});

// Connect to the MySQL database
db.connect((err) => {
    if (err) {
        console.log("Error connecting to the database!", err.message);
    } else {
        console.log("Database connected successfully!");
    }
});

// Create 'users' and 'expenses' tables if they don't exist
const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
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

const createExpensesTable = `
    CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        category ENUM('Income', 'Expense') NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
`;
db.query(createExpensesTable, (err) => {
    if (err) {
        console.log("Error creating expenses table!", err.message);
    } else {
        console.log("Expenses table created or already exists.");
    }
});

// Handle user registration (POST /api/users/register)
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check for missing fields
        if (!username || !email || !password) {
            return res.status(400).send('All fields are required');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // SQL query to insert the new user
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        const values = [username, email, hashedPassword];

        // Insert the user into the database
        db.query(sql, values, (err, results) => {
            if (err) {
                console.log("Error inserting user into the database:", err.message);
                return res.status(500).send('Error registering user');
            }
            res.redirect('login.html');
        });
    } catch (error) {
        console.error("Error during registration:", error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Handle user login (POST /api/users/login)
app.post('https://jacob-production.up.railway.app/api/login', (req, res) => {
    res.json({ success: true, message: 'Test successful' });
});


// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user_id) {
        next();
    } else {
        res.status(401).send("Unauthorized access, please log in.");
    }
}

// Route to add an expense (POST /api/expenses/add)
app.post('/api/expenses/add', isAuthenticated, (req, res) => {
    const { name, amount, date, category } = req.body;
    const user_id = req.session.user_id;

    if (!name || !amount || !date || !category) {
        return res.status(400).send('All fields are required');
    }

    db.query('INSERT INTO expenses (user_id, name, amount, date, category) VALUES (?, ?, ?, ?, ?)', 
        [user_id, name, amount, date, category], (err, results) => {
        if (err) {
            console.error('Error adding expense:', err);
            return res.status(500).send('Server error');
        }
        res.status(201).send('Expense added');
    });
});

// Serve the home page if the user is authenticated (GET /home)
app.get('/home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/trial.html'));
});

// Route to view expenses by user ID (GET /api/expenses/view)
app.get('/api/expenses/view', isAuthenticated, (req, res) => {
    const user_id = req.session.user_id;

    const query = 'SELECT * FROM expenses WHERE user_id = ?';
    db.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching expenses:', err);
            return res.status(500).json({ error: 'Failed to fetch expenses' });
        }
        res.status(200).json(results);
    });
});

// Serve the index page (GET /)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
