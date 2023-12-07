const cloudinary = require('cloudinary');
const {
    CLOUDINARY_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
} = require('./config')

module.exports = {
    uploadImageToCloudinary: async function uploadImageToCloudinary(fileOptions) {
        cloudinary.v2.config({
            cloud_name: CLOUDINARY_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET
        })

        const {
            path, fileName, destinationPath
        } = fileOptions;

        if (!path || !fileName || !destinationPath) {
            throw new Error('Invalid file options');
        }

        const data = await cloudinary.v2.uploader.upload(path, {
            folder: destinationPath,
            public_id: fileName,
            resource_type: 'auto'
        });

        return data.secure_url
    }

} 