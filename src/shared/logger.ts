import pino from 'pino';
import pinoPretty from 'pino-pretty';
import config from '../config';

const logger = pino(
  {
    level: config.env === 'development' ? 'debug' : 'info',
    base: {
      pid: process.pid,
      hostname: undefined,
    },
    serializers: pino.stdSerializers,
  },
  pinoPretty({
    colorize: true,
    ignore: 'pid,hostname',
    translateTime: 'SYS:standard',
  })
);

export default logger;
