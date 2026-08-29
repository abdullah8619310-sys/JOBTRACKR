const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance across nodemon reloads / test reruns
// instead of opening a new connection pool every time this module is required.
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
