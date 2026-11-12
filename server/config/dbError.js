const diagnostics = {
  ENOTFOUND: 'Database host did not resolve; verify the Supabase hostname and DNS configuration.',
  EAI_AGAIN: 'DNS resolution temporarily failed; check the configured DNS resolver.',
  ENETUNREACH: 'The network cannot reach the database address; verify network routing.',
  EHOSTUNREACH: 'The network cannot reach the database host.',
  ETIMEDOUT: 'The connection timed out; check network reachability and database availability.',
  ECONNREFUSED: 'The database host refused the connection; verify the hostname and port.',
  ECONNRESET: 'The database connection was reset by the remote host.',
  '28P01': 'PostgreSQL rejected the username or password.',
  '28000': 'PostgreSQL rejected the authentication configuration.',
  '3D000': 'The configured PostgreSQL database does not exist.',
  '42501': 'The database role lacks permission for this operation.',
  ERR_TLS_CERT_ALTNAME_INVALID: 'TLS certificate hostname validation failed.',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'The TLS certificate is not trusted.',
  SELF_SIGNED_CERT_IN_CHAIN: 'The TLS certificate chain is not trusted by the configured CA.',
  CERT_HAS_EXPIRED: 'The TLS certificate has expired.',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'TLS certificate chain validation failed.',
};

function logDatabaseError(error, operation) {
  const rawCode = error && (error.code || (error.cause && error.cause.code));
  const code =
    typeof rawCode === 'string' && /^[A-Z0-9_]{2,40}$/.test(rawCode)
      ? rawCode
      : 'UNKNOWN';
  const message =
    diagnostics[code] ||
    'PostgreSQL operation failed; check the error code and database configuration.';

  console.error(`PostgreSQL ${operation} failed [${code}]: ${message}`);
}

module.exports = logDatabaseError;
