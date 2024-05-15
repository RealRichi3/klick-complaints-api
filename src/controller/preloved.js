const { JWT } = require("google-auth-library");
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
    async submitForm({ formData }) {
        try {
            const {
                category,
                name,
                product_age_group,
                original_price,
                selling_price,
                condition,
                year_of_purchase,
                front_side_image,
                left_side_image,
                back_side_image,
                right_side_image,
                product_video,
                seller_first_name,
                seller_last_name,
                seller_email,
                seller_phone_number,
                seller_address,
                seller_city,
                seller_state,
            } = formData;

            const emptyFields = Object.keys(formData).filter(
                (key) => !formData[key] || formData[key] === "",
            );
            if (emptyFields.length) {
                throw new Error(
                    `The following fields are required: ${emptyFields.join(", ")}`,
                );
            }

            const serviceAccountAuth = new JWT({
                email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                key: atob(process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
                    /\\n/g,
                    "\n",
                ),
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });

            let requestBody = {};

            const images = {
                left_side_image: await cloudinary
                    .uploadBase64FileToCloudinary(
                        left_side_image,
                        "left_side_image",
                        "image",
                    )
                    .catch((error) =>
                        console.error(
                            `Error in uploadBase64FileToCloudinary  (left_side_image): ${error}`,
                        ),
                    ),
                front_side_image: await cloudinary
                    .uploadBase64FileToCloudinary(
                        front_side_image,
                        "front_side_image",
                        "image",
                    )
                    .catch((error) =>
                        console.error(
                            `Error in uploadBase64FileToCloudinary (front_side_image): ${error}`,
                        ),
                    ),
                back_side_image: await cloudinary
                    .uploadBase64FileToCloudinary(
                        back_side_image,
                        "back_side_image",
                        "image",
                    )
                    .catch((error) =>
                        console.error(
                            `Error in uploadBase64FileToCloudinary (back_side_image): ${error}`,
                        ),
                    ),
                right_side_image: await cloudinary
                    .uploadBase64FileToCloudinary(
                        right_side_image,
                        "right_side_image",
                        "image",
                    )
                    .catch((error) =>
                        console.error(
                            `Error in uploadBase64FileToCloudinary (right_side_image): ${error}`,
                        ),
                    ),
            };

            requestBody = { ...formData, ...images };

            const video = await cloudinary
                .uploadVideoFromDataURI(product_video)
                .catch((error) => {
                    console.error(`Error in uploadVideoFromDataURI: ${error}`);
                    console.error(error);
                });
            requestBody["product_video"] = video;

            console.log({ requestBody });
            const doc = new GoogleSpreadsheet(
                process.env.GOOGLE_SHEET_ID,
                serviceAccountAuth,
            );

            await doc
                .loadInfo()
                .catch((error) => console.error(`Error in loadInfo: ${error}`));

            const lastTrackingNumber = await redisClient
                .get("lastTrackingNumber")
                .catch((error) =>
                    console.error(`Error in redisClient.get: ${error}`),
                );
            const trackingNumber = lastTrackingNumber
                ? parseInt(lastTrackingNumber) + 1
                : 1;

            requestBody.tracking_number = trackingNumber;
            const sheet = doc.sheetsByIndex[0];
            await sheet
                .setHeaderRow([...Object.keys(requestBody)])
                .catch((error) =>
                    console.error(`Error in setHeaderRow: ${error}`),
                );

            await sheet
                .addRow(requestBody)
                .catch((error) => console.error(`Error in addRow: ${error}`));
            await redisClient
                .set("lastTrackingNumber", trackingNumber.toString())
                .catch((error) =>
                    console.error(`Error in redisClient.set: ${error}`),
                );

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
                .then(console.log)
                .catch((e) =>
                    console.error(`Error in axios post: ${e.response.data}`),
                );
        } catch (error) {
            console.error(`Error in submitForm: ${error}`);
        }
    }
}

module.exports = Preloved;
