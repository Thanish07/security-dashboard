const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    multipleStatements: true
});

const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('Connected to MySQL server.');

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing SQL script:', err.message);
            process.exit(1);
        } else {
            console.log('Database setup completed successfully.');
        }
        connection.end();
    });
});
