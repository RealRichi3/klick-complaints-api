const { FORM_URL } = require("../config");
const axios = require('axios');

async function submitToGoogleForm(fullname, complaint, documentUrl) {
    const formData = {
        'entry.820165930': fullname,
        'entry.1992804102': complaint,
        'entry.1613862344': documentUrl
    };
    console.log(FORM_URL)
    await axios.post(FORM_URL, formData).catch(error => {
        console.log(error.response)
    })
}

module.exports = {
    submitToGoogleForm
}