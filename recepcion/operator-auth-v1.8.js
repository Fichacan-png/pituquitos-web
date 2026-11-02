'use strict';
// Server-only identity boundary. verifySession MUST validate signature, issuer,
// audience, expiry, and revocation with the chosen identity provider.
function createOperatorAuthenticator({verifySession,allowedSubjects}) {
  if (typeof verifySession !== 'function' || !Array.isArray(allowedSubjects) || !allowedSubjects.length || allowedSubjects.some(x=>typeof x!=='string'||!x.trim())) throw Error('Authentication configuration incomplete');
  const allow = new Set(allowedSubjects);
  return async function authenticate(request) {
    const header = request?.headers?.authorization || request?.headers?.Authorization;
    if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(header)) return {authorized:false};
    const token = header.slice(7);
    try {
      const identity = await verifySession(token);
      if (!identity || identity.verified !== true || identity.emailVerified !== true || typeof identity.subject !== 'string' || !allow.has(identity.subject)) return {authorized:false};
      return {authorized:true,subject:identity.subject};
    } catch { return {authorized:false}; }
  };
}
module.exports={createOperatorAuthenticator};
