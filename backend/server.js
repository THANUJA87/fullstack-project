require('dotenv').config();
const app = require('./src/app');
const { port, autoSeed } = require('./src/config');
const seedDatabase = require('./src/seed');

async function start() {
  if (autoSeed) {
    await seedDatabase();
  }

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
