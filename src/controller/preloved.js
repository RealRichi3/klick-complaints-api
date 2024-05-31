const { JWT } = require("google-auth-library");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const cloudinary = require("../cloudinary");
const redisClient = require("../redis");
const axios = require("axios");
const fs = require("fs").promises; // Use promises for async file operations
const { MailtrapClient } = require("mailtrap");
const { default: logger } = require("../logger");
const { randomUUID } = require("crypto");

const mailTrapClient = new MailtrapClient({
    endpoint: "https://send.api.mailtrap.io/",
    token: process.env.EMAIL_PASS,
});

class Preloved {
    logId = "";
    startTime = new Date();

    constructor({ logId }) {
        this.logId = logId;
        this.startTime = new Date();
    }

    async logTimeTaken(logName, meta) {
        const endTime = new Date().getTime();
        const timeTaken = endTime - this.startTime;
        const logIdentifier = randomUUID();
        logger.info(`[START]-${logName}-${this.logId}: ${timeTaken / 1000}s`, {
            meta: {
                logId: this.logId,
                ...(meta ?? {}),
                identifier: logIdentifier,
            },
        });

        return () => {
            const endTime = new Date().getTime();
            const timeTaken = endTime - this.startTime;
            logger.info(
                `[END]-${logName}-${this.logId}: ${timeTaken / 1000}s`,
                {
                    meta: {
                        logId: this.logId,
                        ...(meta ?? {}),
                        identifier: logIdentifier,
                    },
                },
            );
        };
    }

    async submitForm({ formData }, files) {
        const { seller_email } = formData;

        this.logTimeTaken("FORM_RECEIVED");
        // console.log({ files });

        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: atob(process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
                /\\n/g,
                "\n",
            ),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        this.logTimeTaken("SETUP_SEVICE_ACCOUNT");

        const uploadFile = async (file, destinationPath) => {
            const relog = this.logTimeTaken("UPLOADING_IMAGE", {
                meta: { file },
            });
            const res = cloudinary.uploadImageToCloudinary({
                path: file.path,
                fileName: file.filename,
                destinationPath,
            });
            relog();
            return res;
        };

        const uploadVideo = async (file, destinationPath) => {
            const relog = this.logTimeTaken("UPLOADING_VIDEO", { meta: file });
            const res = cloudinary.uploadVideoToCloudinary({
                path: file.path,
                fileName: file.filename,
                destinationPath,
            });
            relog();
            return res;
        };

        // Upload files in parallel
        const relog = this.logTimeTaken("INITIATING_FILE_UPLOAD");
        const uploadedFiles = await Promise.all([
            uploadFile(files.left_side_image[0], "klick_product_images"),
            uploadFile(files.front_side_image[0], "klick_product_images"),
            uploadFile(files.back_side_image[0], "klick_product_images"),
            uploadFile(files.right_side_image[0], "klick_product_images"),
            uploadVideo(files.product_video[0], "klick_product_videos"),
        ]);
        relog();

        // Map uploaded files to formData keys
        const filesMapping = {
            left_side_image: uploadedFiles[0],
            front_side_image: uploadedFiles[1],
            back_side_image: uploadedFiles[2],
            right_side_image: uploadedFiles[3],
            product_video: uploadedFiles[4],
        };

        // Delete the files after uploading
        const logDeleteFile = this.logTimeTaken("DELETING_FILES");
        await Promise.all(
            Object.values(files).map((file) => fs.unlink(file[0].path)),
        );
        logDeleteFile();

        const requestBody = { ...formData, ...filesMapping };
        console.log({ requestBody });

        const logGSheetSetup = this.logTimeTaken("SETTING_UP_GOOGLE_SHEET");
        const doc = new GoogleSpreadsheet(
            process.env.GOOGLE_SHEET_ID,
            serviceAccountAuth,
        );
        logGSheetSetup();

        const logLoadingInfo = this.logTimeTaken("LOADING_GOOGLE_SHEET");
        await doc.loadInfo();
        logLoadingInfo();

        const logGetLTN = this.logTimeTaken("GETTING_LAST_TRACKING_NUMBER");
        const lastTrackingNumber = await redisClient.get("lastTrackingNumber");
        logGetLTN();

        const trackingNumber = lastTrackingNumber
            ? parseInt(lastTrackingNumber) + 1
            : 1;

        requestBody.tracking_number = trackingNumber;
        const sheet = doc.sheetsByIndex[0];

        const logAddRow = this.logTimeTaken("SETTING_HEADER_ROW");
        await sheet.setHeaderRow(Object.keys(requestBody));
        logAddRow();

        const logAddingRow = this.logTimeTaken("ADDING_ROW_TO_SHEET");
        await sheet.addRow(requestBody);
        logAddingRow();

        const logSettingTN = this.logTimeTaken("SETTING_LAST_TRACKING_NUMBER");
        await redisClient.set("lastTrackingNumber", trackingNumber.toString());
        logSettingTN();

        try {
            const logSendEmail = this.logTimeTaken("SENDING_EMAIL");
            await axios.post(
                "https://send.api.mailtrap.io/api/send",
                {
                    from: {
                        email: "mailtrap@klick.africa",
                        name: "Klick Preloved",
                    },
                    to: [{ email: seller_email }],
                    template_uuid: "45290ebf-7550-46e1-b266-820424f488fe",
                    template_variables: {
                        tracking_number: trackingNumber.toString(),
                    },
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.EMAIL_PASS}`,
                    },
                },
            );
            logSendEmail();
        } catch (error) {
            console.error(
                "Error sending email:",
                error.response?.data || error.message,
            );
        }
    }
}

module.exports = Preloved;
