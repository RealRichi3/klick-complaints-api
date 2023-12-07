const { FORM_URL } = require("./config");
const axios = require('axios');

async function submitToGoogleForm(fullname, complaint, documentUrl) {
    const entryIds = {
        fullname: 'entry.820165930',
        complaint: 'entry.1992804102',
        documentUrl: 'entry.1613862344'
    };

    const encodedFullname = encodeURIComponent(fullname);
    const encodedComplaint = encodeURIComponent(complaint);
    const encodedDocumentUrl = encodeURIComponent(documentUrl);

    const url = `${FORM_URL}/formResponse?usp=pp_url&${entryIds.fullname}=${encodedFullname}&${entryIds.complaint}=${encodedComplaint}&${entryIds.documentUrl}=${encodedDocumentUrl}`;

    await axios.post(url).catch(error => {
        console.log(error.response)
    })
}

module.exports = {
    submitToGoogleForm
}