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
    origin: 'https://jacob-production.up.railway.app', // Your frontend URL
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

// Create a MySQL connection pool using environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'junction.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'WpdpvMdmHMNRJMZxAuFyniZBwdNYaJmC',
    port: process.env.DB_PORT || 54417,
    database: process.env.DB_NAME || 'railway',
    waitForConnections: true,
    connectionLimit: 10, // Adjust the number of connections based on your needs
    queueLimit: 0
});

// Use pooled connections for queries
const db = pool.promise(); // Use promise-based queries

// Function to initialize database tables
async function initializeDatabase() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS Users (
            user_id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(100) NULL,
            password VARCHAR(100) NULL,
            email VARCHAR(100) NULL
        )
    `;
    
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

    try {
        // Create Users Table
        await db.query(createUsersTable);
        console.log("Users table created or already exists.");

        // Create Expenses Table
        await db.query(createExpensesTable);
        console.log("Expenses table created or already exists.");
    } catch (err) {
        console.error("Error creating tables:", err.message);
    }
}

initializeDatabase();

// Handle user registration (POST /register)
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check for missing fields
        if (!username || !email || !password) {
            return res.status(400).send('All fields are required');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // SQL query to insert the new user
        const sql = 'INSERT INTO Users (username, email, password) VALUES (?, ?, ?)';
        const values = [username, email, hashedPassword];

        // Insert the user into the database
        await db.query(sql, values);
        res.redirect('login.html');
    } catch (error) {
        console.error("Error during registration:", error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Handle user login (POST /api/users/login)
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const sql = 'SELECT * FROM Users WHERE username = ?';
        const [results] = await db.query(sql, [username]);

        if (results.length > 0) {
            const match = await bcrypt.compare(password, results[0].password);
            if (match) {
                req.session.user_id = results[0].user_id;
                res.json({ success: true });
            } else {
                res.status(401).json({ success: false, message: 'Invalid Username or Password!' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid Username or Password!' });
        }
    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
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
app.post('/api/expenses/add', isAuthenticated, async (req, res) => {
    const { name, amount, date, category } = req.body;
    const user_id = req.session.user_id;

    if (!name || !amount || !date || !category) {
        return res.status(400).send('All fields are required');
    }

    try {
        await db.query('INSERT INTO expenses (user_id, name, amount, date, category) VALUES (?, ?, ?, ?, ?)', 
            [user_id, name, amount, date, category]);
        res.status(201).send('Expense added');
    } catch (err) {
        console.error('Error adding expense:', err);
        res.status(500).send('Server error');
    }
});

// Serve the home page if the user is authenticated (GET /home)
app.get('/home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/trial.html'));
});

app.get('/api/test/connectivity', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ success: true, message: 'Database connection successful' });
    } catch (err) {
        console.error('Database connection error:', err.message);
        res.status(500).json({ success: false, message: 'Database connection failed' });
    }
});

app.get('/api/test/count', async (req, res) => {
    const sql = 'SELECT COUNT(*) AS total FROM TestTable';

    try {
        const [results] = await db.query(sql);
        res.json({ success: true, totalRecords: results[0].total });
    } catch (err) {
        console.error('Error counting records:', err.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Route to view expenses by user ID (GET /api/expenses/view)
app.get('/api/expenses/view', isAuthenticated, async (req, res) => {
    const user_id = req.session.user_id;

    const query = 'SELECT * FROM expenses WHERE user_id = ?';
    try {
        const [results] = await db.query(query, [user_id]);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
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
