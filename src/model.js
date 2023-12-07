const { Schema, model } = require('mongoose');

const complaintSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    orderNumber: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    image: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending'
    },
}, {
    timestamps: true
});

const Complaint = model('Complaint', complaintSchema);

module.exports = Complaint;