const express = require('express')
const dotenv = require('dotenv')
dotenv.config()

const helmet = require('helmet')
const multer = require('multer')
const fs = require('fs')
const cors = require('cors')
const { uploadImageToCloudinary } = require('./cloudinary')
const Complaint = require('./model')
const mongoose = require('mongoose')

const multerUpload = multer({
    storage: multer.diskStorage({
        destination: 'src/uploads',
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
})


const app = express()

app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use('/upload', multerUpload.single('image'), async (req, res, next) => {
    const {
        name,
        orderNumber,
        complaint
    } = req.body

    try {
        const image = req.file
        const imageUrl = await uploadImageToCloudinary({
            path: image.path,
            fileName: image.filename,
            destinationPath: 'complaints'
        })

        const complaintRecord = await Complaint.create({
            name,
            orderNumber,
            description: complaint,
            image: imageUrl,
            status: 'pending',
        })

        fs.unlinkSync(image.path)

        res.status(201).json({
            message: 'Complaint created successfully',
            data: complaintRecord
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Unable to create complaint',
            error: error.message
        })
    }
})

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to database')
    } catch (error) {
        console.log('Unable to connect to database')
        process.exit(1)
    }
}

async function startServer() {
    try {
        await connectToDatabase()
        app.listen(process.env.PORT, () => {
            console.log(`Server started on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.log('Unable to start server')
        process.exit(1)
    }
}

startServer()