const { JWT } = require("google-auth-library");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const cloudinary = require("../cloudinary");
const redisClient = require("../redis");
const axios = require("axios");
const fs = require("fs").promises; // Use promises for async file operations
const { MailtrapClient } = require("mailtrap");

const mailTrapClient = new MailtrapClient({
    endpoint: "https://send.api.mailtrap.io/",
    token: process.env.EMAIL_PASS,
});

class Preloved {
    async submitForm({ formData }, files) {
        const { seller_email } = formData;

        console.log({ files });

        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: atob(process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
                /\\n/g,
                "\n",
            ),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const uploadFile = async (file, destinationPath) => {
            return cloudinary.uploadImageToCloudinary({
                path: file.path,
                fileName: file.filename,
                destinationPath,
            });
        };

        const uploadVideo = async (file, destinationPath) => {
            return cloudinary.uploadVideoToCloudinary({
                path: file.path,
                fileName: file.filename,
                destinationPath,
            });
        };

        // Upload files in parallel
        const uploadedFiles = await Promise.all([
            uploadFile(files.left_side_image[0], "klick_product_images"),
            uploadFile(files.front_side_image[0], "klick_product_images"),
            uploadFile(files.back_side_image[0], "klick_product_images"),
            uploadFile(files.right_side_image[0], "klick_product_images"),
            uploadVideo(files.product_video[0], "klick_product_videos"),
        ]);

        // Map uploaded files to formData keys
        const filesMapping = {
            left_side_image: uploadedFiles[0],
            front_side_image: uploadedFiles[1],
            back_side_image: uploadedFiles[2],
            right_side_image: uploadedFiles[3],
            product_video: uploadedFiles[4],
        };

        // Delete the files after uploading
        await Promise.all(
            Object.values(files).map((file) => fs.unlink(file[0].path)),
        );

        const requestBody = { ...formData, ...filesMapping };
        console.log({ requestBody });

        const doc = new GoogleSpreadsheet(
            process.env.GOOGLE_SHEET_ID,
            serviceAccountAuth,
        );
        await doc.loadInfo();

        const lastTrackingNumber = await redisClient.get("lastTrackingNumber");
        const trackingNumber = lastTrackingNumber
            ? parseInt(lastTrackingNumber) + 1
            : 1;

        requestBody.tracking_number = trackingNumber;
        const sheet = doc.sheetsByIndex[0];
        await sheet.setHeaderRow(Object.keys(requestBody));
        await sheet.addRow(requestBody);
        await redisClient.set("lastTrackingNumber", trackingNumber.toString());

        try {
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
        } catch (error) {
            console.error(
                "Error sending email:",
                error.response?.data || error.message,
            );
        }
    }
}

module.exports = Preloved;
