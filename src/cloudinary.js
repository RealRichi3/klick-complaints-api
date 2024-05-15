const cloudinary = require("cloudinary");
const {
    CLOUDINARY_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
} = require("./config");
const { uuid } = require("uuidv4");
const fs = require("fs");
module.exports = {
    uploadImageToCloudinary: async function uploadImageToCloudinary(
        fileOptions,
    ) {
        cloudinary.v2.config({
            cloud_name: CLOUDINARY_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
        });

        const { path, fileName, destinationPath } = fileOptions;

        if (!path || !fileName || !destinationPath) {
            throw new Error("Invalid file options");
        }

        const data = await cloudinary.v2.uploader.upload(path, {
            folder: destinationPath,
            public_id: fileName,
            resource_type: "auto",
        });

        return data.secure_url;
    },

    uploadBase64FileToCloudinary: async function uploadBase64FileToCloudinary(
        base64String,
        key,
        type,
    ) {
        {
            if (base64String.startsWith(`data:${type}/`)) {
                const [_, format, data] =
                    base64String.match(
                        new RegExp(`^data:${type}/(\\w+);base64,(.+)$`),
                    ) || [];
                if (!format || !data) {
                    throw new Error(`Invalid ${key} format`);
                }
                const response = await cloudinary.uploader.upload(
                    `data:${type}/${format};base64,${data}`,
                    {
                        resource_type: type,
                        folder: `klick_product_${type}s`,
                    },
                );
                return response.secure_url;
            } else {
                throw new Error(`Invalid ${key} format`);
            }
        }
    },

    uploadVideoFromDataURI: async function (dataURI) {
        return new Promise(async (resolve, reject) => {
            try {
                const matches = dataURI.match(/^data:(.+);base64/);
                if (!matches) {
                    throw new Error("Invalid data URI");
                }
                const mimeType = matches[1];
                const extensions = {
                    "image/jpeg": "jpg",
                    "image/png": "png",
                    "video/mp4": "mp4", // Add more mime types as needed
                };
                // Convert base64-encoded data to binary buffer
                const fileExtension = dataURI
                    .split("data:video/")[1]
                    .split(";base64")[0];
                // Write binary buffer to a temporary video file
                const dir = __dirname + "/temp";
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }

                const tempFilePath =
                    __dirname +
                    "/temp/" +
                    uuid().toString() +
                    "." +
                    fileExtension; // You can use any file name and extension

                let uri = dataURI.replace(/^data:(.*?);base64,/, "");
                uri = uri.replace(/ /g, "+");

                fs.writeFileSync(tempFilePath, uri, "base64");

                console.log({ tempFilePath, fileExtension });

                await cloudinary.v2.uploader
                    .upload(tempFilePath, {
                        resource_type: "video",
                        folder: "klick_product_videos",
                        public_id: uuid().toString(),
                        overwrite: true,
                        format: extensions[mimeType],
                    })
                    .then((res) => {
                        resolve(res.secure_url);
                        fs.unlinkSync(tempFilePath);
                    })
                    .catch(reject);
            } catch (error) {
                reject(error);
            }
        });

        // Extract base64-encoded video data from data URI
        // Create read stream from temporary video file and pipe it to Cloudinary upload stream
    },
    client: cloudinary,
};
