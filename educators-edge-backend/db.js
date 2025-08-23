// src/db.js (Corrected CommonJS version)
const pg = require('pg');
require('dotenv').config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Use module.exports to export a flat object.
module.exports = {
  // The query function is now a top-level property.
  query: (text, params) => pool.query(text, params),
  // The pool is also a top-level property for transactions.
  pool: pool,
};

// // src/db/index.js (Corrected to expose the Pool)
// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// // We now export the entire pool object, along with our query function.
// // This gives us access to pool.query() for simple queries AND
// // pool.connect() for complex transactions.
// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   connect: () => pool.connect(), // Helper to get a client
//   pool: pool, // Export the whole pool for more advanced use cases
// };

// /*
//  * =================================================================
//  * FILE: db.js
//  * =================================================================
//  * DESCRIPTION: This file configures and exports our connection to the
//  * PostgreSQL database, making it available to other parts of our application.
//  */
// // src/db/index.js (Corrected for DATABASE_URL Connection String)
// const { Pool } = require('pg');

// // This configuration is simpler and more standard.
// // The Pool constructor will parse the single DATABASE_URL string to get all
// // the necessary connection details (user, password, host, database, etc.).
// const pool = new Pool({
//   // The connectionString property reads the single URL from your .env file.
//   connectionString: process.env.DATABASE_URL,
  
//   // We still need to explicitly configure SSL for cloud providers like Neon.
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// // We export a query function that we can use to interact with the DB.
// module.exports = {
//   query: (text, params) => pool.query(text, params),
// };
// const { Pool } = require('pg');
// const isProduction = process.env.NODE_ENV === 'production';


// // A "Pool" is more efficient than a single client connection. It manages a
// // set of connections that can be shared and reused by different requests,
// // which is essential for a web server handling concurrent users.
// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_DATABASE,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
//   ssl: {
//         rejectUnauthorized: false
//     }
// });

// // We export a query function that we can use to interact with the DB.
// module.exports = {
//   query: (text, params) => pool.query(text, params),
// };