const env = require('./config/env');
const app = require('./app');

const server = app.listen(env.PORT, () => {
  console.log(`JobTrackr backend listening on port ${env.PORT}`);
});

module.exports = server;
