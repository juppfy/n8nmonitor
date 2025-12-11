const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
});

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users);
  
  const sessions = await prisma.session.findMany();
  console.log('Sessions in DB:', sessions);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

