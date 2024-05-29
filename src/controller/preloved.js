const { JWT } = require("google-auth-library");
const fs = require("fs");
const cloudinary = require("../cloudinary");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const redisClient = require("../redis");
const { default: axios } = require("axios");

const MailtrapClient = require("mailtrap").MailtrapClient;
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

        let requestBody = {};

        const uploadedFiles = {
            left_side_image: await cloudinary.uploadImageToCloudinary({
                path: files.left_side_image[0].path,
                fileName: files.left_side_image[0].filename,
                destinationPath: "klick_product_images",
            }),
            front_side_image: await cloudinary.uploadImageToCloudinary({
                path: files.front_side_image[0].path,
                fileName: files.front_side_image[0].filename,
                destinationPath: "klick_product_images",
            }),
            back_side_image: await cloudinary.uploadImageToCloudinary({
                path: files.back_side_image[0].path,
                fileName: files.back_side_image[0].filename,
                destinationPath: "klick_product_images",
            }),
            right_side_image: await cloudinary.uploadImageToCloudinary({
                path: files.right_side_image[0].path,
                fileName: files.right_side_image[0].filename,
                destinationPath: "klick_product_images",
            }),
            product_video: await cloudinary.uploadVideoToCloudinary({
                path: files.product_video[0].path,
                fileName: files.product_video[0].filename,
                destinationPath: "klick_product_videos",
            }),
        };

        // Delete the files after uploading
        Object.values(files).forEach((file) => {
            fs.unlinkSync(file[0].path);
        });
        requestBody = { ...formData, ...uploadedFiles };

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
        await sheet.setHeaderRow([...Object.keys(requestBody)]);

        await sheet.addRow(requestBody);
        await redisClient.set("lastTrackingNumber", trackingNumber.toString());

        await axios
            .post(
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
            )
            .catch((e) => console.log(e.response.data));
    }
}

module.exports = Preloved;
