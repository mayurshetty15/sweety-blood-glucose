const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./app');

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Sweety API server is running on port ${port}`);
});

server.on('error', () => {
  console.error('Unable to start the Sweety API server.');
  process.exitCode = 1;
});
