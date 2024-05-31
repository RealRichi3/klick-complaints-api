const winston = require("winston");
const { format } = winston;
const winstonMongoDB = require("winston-mongodb");
const MONGO_URI_LOG = process.env.MONGO_URI_LOG;
const util = require("util");

const { combine, timestamp, printf, colorize } = format;
const logFormat = printf((info) => {
    let message = info.message;

    if (typeof message === "object") {
        message = util.inspect(message, { depth: null });
    }

    return info.meta
        ? `${info.timestamp} [${info.level}]: ${message} ${util.inspect(info.meta)}`
        : `${info.timestamp} [${info.level}]: ${message}`;
});

const enumerateErrorFormat = format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

const transports = [
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

module.exports = { logger };
