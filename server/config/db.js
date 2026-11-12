const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logDatabaseError = require('./dbError');

const certificatePath = path.resolve(
  __dirname,
  '..',
  'certs',
  'prod-supabase.cer',
);
let ca;

try {
  ca = fs.readFileSync(certificatePath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }

  const missingCertificateError = new Error(
    `Required Supabase root CA certificate is missing at ${certificatePath}. Download the official database root certificate from the Supabase Dashboard and save it at this path.`,
  );
  missingCertificateError.code = 'SUPABASE_CA_CERT_MISSING';
  throw missingCertificateError;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
  connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
  logDatabaseError(error, 'idle client');
});

module.exports = pool;
