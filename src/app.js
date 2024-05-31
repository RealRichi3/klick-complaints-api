const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const morgan = require("morgan");
const helmet = require("helmet");
const multer = require("multer");
const fs = require("fs").promises; // Use promises for async file operations
const cors = require("cors");
const { uploadImageToCloudinary } = require("./cloudinary");
const Complaint = require("./model");
const mongoose = require("mongoose");
const { submitToGoogleForm } = require("./form");
const { randomUUID, randomInt } = require("crypto");
const Preloved = require("./controller/preloved");
const { default: logger } = require("./logger");

const multerUpload = multer({
    storage: multer.diskStorage({
        destination: "src/uploads",
        filename: (req, file, cb) => {
            cb(null, `${randomUUID()}-${file.originalname}`);
        },
    }),
});

const app = express();

// Middleware configuration
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true }));

const ORIGIN = process.env.ALLOWED_ORIGINS.split(",");
console.log({ ORIGIN });
app.use(
    cors({
        origin: ORIGIN,
    }),
);

app.use("/upload", multerUpload.single("image"), async (req, res) => {
    const { name, orderNumber, complaint } = req.body;

    try {
        const image = req.file;
        const imageUrl = await uploadImageToCloudinary({
            path: image.path,
            fileName: image.filename,
            destinationPath: "complaints",
        });

        await submitToGoogleForm(name, complaint, imageUrl, orderNumber);

        const complaintRecord = await Complaint.create({
            name,
            orderNumber,
            description: complaint,
            image: imageUrl,
            status: "pending",
        });

        await fs.unlink(image.path); // Use async file deletion

        res.status(201).json({
            message: "Complaint created successfully",
            data: complaintRecord,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Unable to create complaint",
            error: error.message,
        });
    }
});

app.use(
    "/preloved",
    multerUpload.fields([
        { name: "front_side_image", maxCount: 1 },
        { name: "left_side_image", maxCount: 1 },
        { name: "right_side_image", maxCount: 1 },
        { name: "back_side_image", maxCount: 1 },
        { name: "product_video", maxCount: 1 },
    ]),
    async (req, res) => {
        const requestId = randomUUID();
        const startTime = new Date().getTime();
        try {
            const files = req.files;
            const preloved = new Preloved({ logId: requestId, startTime });
            await preloved.submitForm({ formData: req.body }, files);
            console.log("Form submitted successfully");
            res.status(201).json({ message: "Form submitted successfully" });
            logger.info("Form submitted successfully", {
                meta: { logId: requestId },
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({
                status: "error",
                message: "An error occurred while submitting the form",
            });
        }
    },
);

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to database");
    } catch (error) {
        console.error("Unable to connect to database", error);
        process.exit(1);
    }
}

async function startServer() {
    try {
        await connectToDatabase();
        app.listen(process.env.PORT, () => {
            console.log(`Server started on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Unable to start server", error);
        process.exit(1);
    }
}

startServer();
