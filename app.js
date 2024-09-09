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

// Create a MySQL connection using environment variables
const db = mysql.createConnection({
    host: 'junction.proxy.rlwy.net',
    user: 'root',
    password: 'WpdpvMdmHMNRJMZxAuFyniZBwdNYaJmC',
    port: 54417,
    database: 'railway'
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
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NULL,
    user_id INT NULL,
    password VARCHAR(100) NULL,
    email VARCHAR(100) NULL
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
        db.query(sql, values, (err, results) => {
            if (err) {
                console.log("Error inserting user into the database:", err.message);
                // Log the entire error object for more details
                console.error(err);
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
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const sql = 'SELECT * FROM Users WHERE username = ?';
        db.query(sql, [username], async (err, results) => {
            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }

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
        });
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

app.get('/api/test/connectivity', (req, res) => {
    db.query('SELECT 1', (err, results) => {
        if (err) {
            console.error('Database connection error:', err.message);
            return res.status(500).json({ success: false, message: 'Database connection failed' });
        }
        res.json({ success: true, message: 'Database connection successful' });
    });
});

app.get('/api/test/count', (req, res) => {
    const sql = 'SELECT COUNT(*) AS total FROM TestTable';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error counting records:', err.message);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ success: true, totalRecords: results[0].total });
    });
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
