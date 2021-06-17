import mysql = require('mysql');
import dotenv = require('dotenv');
import ucf = require('ucf-parking');

dotenv.config();

let conn = mysql.createConnection({
   host:       process.env.DB_HOST,
   user:       process.env.DB_USER,
   password:   process.env.DB_PASSWORD,
   database:   process.env.DB_DATABASE
});

const JOB_SCHEDULE_MINUTES = 1;
const JOB_SCHEDULE_INTERVAL = JOB_SCHEDULE_MINUTES * 60 * 1000;

conn.connect(e => {
   if (e) throw e;

   console.log(`Raw data server running. Job scheduled every ${JOB_SCHEDULE_MINUTES} minutes.`);

   setInterval(async () => {
      for (const datum of await ucf.getParkingDataStatic()) {
         const sql = `
            select ID from GARAGES
               where NAME = ${mysql.escape(datum.name)};
         `;
         conn.query(sql, (e, res) => {
            if (e) throw e;

            const sql = `
               insert into GARAGE_MONITOR_DATA (GARAGEID, TIMESTAMP, AVAILABLE, CAPACITY)
               values
               (
                  ${res[0].ID},
                  from_unixtime(${mysql.escape(datum.timestamp)}),
                  ${mysql.escape(datum.available)},
                  ${mysql.escape(datum.capacity)}
               );
            `;
            conn.query(sql, (e, res) => {
               if (e) throw e;
            });
         });
      }

   }, JOB_SCHEDULE_INTERVAL);
});

