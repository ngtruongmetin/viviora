const session = require('express-session');
const { get, run } = require('./database/db');

class PostgresSessionStore extends session.Store {
  get(sid, callback) {
    get('SELECT sess, expires FROM sessions WHERE sid = ?', [sid])
      .then((row) => {
        if (!row || Number(row.expires) < Date.now()) return callback(null, null);
        callback(null, row.sess);
      })
      .catch(callback);
  }
  set(sid, sess, callback) {
    const expires = sess.cookie?.expires
      ? new Date(sess.cookie.expires).getTime()
      : Date.now() + 86400000;
    run(
      'INSERT INTO sessions(sid, sess, expires) VALUES(?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess=EXCLUDED.sess, expires=EXCLUDED.expires',
      [sid, sess, expires],
    )
      .then(() => callback?.())
      .catch(callback);
  }
  destroy(sid, callback) {
    run('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback?.())
      .catch(callback);
  }
  touch(sid, sess, callback) {
    this.set(sid, sess, callback);
  }
}

module.exports = PostgresSessionStore;
