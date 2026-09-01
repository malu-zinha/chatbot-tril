import {
  MORNING_NOTIFICATION_CRON,
  NIGHT_NOTIFICATION_CRON,
  WORKER_NOTIFICATION_CRON,
} from '../integrations/cron/cronJobs.ts';

let pass = 0;
let fail = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    pass++;
    console.log(`OK ${name}`);
  } else {
    fail++;
    console.error(`FAIL ${name}`);
  }
}

assert(MORNING_NOTIFICATION_CRON === '20 11 * * 1-5', 'cron matinal roda 11:20 seg-sex');
assert(NIGHT_NOTIFICATION_CRON === '30 16 * * 1-5', 'cron noturno roda 16:30 seg-sex');
assert(WORKER_NOTIFICATION_CRON === '*/1 * * * *', 'worker de notificacoes permanece a cada 1 minuto');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
