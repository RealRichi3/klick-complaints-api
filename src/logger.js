import winston, { format } from "winston";
import winstonMongoDB from "winston-mongodb";
import { MONGO_URI_LOG } from "../config";
import util from "util";
import { NODE_ENV } from "../config";

const { combine, timestamp, printf, colorize } = format;
const logFormat = printf((info) => {
    let message = info.message;

    if (typeof message === "object") {
        message = util.inspect(message, { depth: null });
    }

    return `${info.timestamp} [${info.level}]: ${message}`;
});

const enumerateErrorFormat = format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

const devLogger = winston.createLogger({
    level: "info",
    format: combine(
        enumerateErrorFormat(),
        colorize({
            colors: { info: "cyan", error: "red" },
        }),
        timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        logFormat,
    ),
    transports: [new winston.transports.Console()],
});

const transports =
    NODE_ENV === "prod"
        ? [
              new winston.transports.Console({
                  level: "info",
                  format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.colorize({
                          colors: { info: "cyan", error: "red" },
                      }),
                      logFormat,
                      enumerateErrorFormat(),
                  ),
              }),
              new winstonMongoDB.MongoDB({
                  level: "error",
                  db: MONGO_URI_LOG,
                  format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.simple(),
                  ),
                  options: {
                      useUnifiedTopology: true,
                      useNewUrlParser: true,
                  },
                  collection: "error_logs",
                  metaKey: "meta",
                  storeHost: true,
                  capped: true,
              }),
              new winstonMongoDB.MongoDB({
                  level: "info",
                  db: MONGO_URI_LOG,
                  format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.simple(),
                  ),
                  options: {
                      useUnifiedTopology: true,
                      useNewUrlParser: true,
                  },
                  collection: "info_logs",
                  metaKey: "meta",
                  storeHost: true,
                  capped: true,
              }),
              new winstonMongoDB.MongoDB({
                  level: "warn",
                  db: MONGO_URI_LOG,
                  format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.simple(),
                  ),
                  options: {
                      useUnifiedTopology: true,
                      useNewUrlParser: true,
                  },
                  collection: "warn_logs",
                  metaKey: "meta",
                  storeHost: true,
                  capped: true,
              }),
          ]
        : [
              new winston.transports.Console({
                  level: "info",
                  format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.colorize({
                          colors: { info: "cyan", error: "red" },
                      }),
                      logFormat,
                      enumerateErrorFormat(),
                  ),
              }),
          ];

const productionLogger = winston.createLogger({
    // level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
        enumerateErrorFormat(),
    ),
    transports,
});

const logger = productionLogger;

export default logger;
